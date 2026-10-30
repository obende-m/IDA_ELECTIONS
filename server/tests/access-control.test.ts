/** HTTP-level access-control tests against the real Express app + a real `_test` Postgres database (synthetic data only). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret';
process.env.TOKEN_ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.CLIENT_URL = 'http://localhost:5173';

const dbName = (process.env.DATABASE_URL ?? '').split('?')[0].split('/').pop() ?? '';
if (!dbName.endsWith('_test')) throw new Error(`Refusing to run against database "${dbName}" - its name must end in "_test".`);

import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

let server: Server;
let base: string;
const PASSWORD = 'correct-horse-battery-staple';
const emails: Record<string, string> = {};

async function api(path: string, opts: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return fetch(`${base}/api${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

// Tokens are cached per account: the login endpoint is rate-limited (10 / 15 min per IP) by design.
const tokenCache = new Map<string, string>();
async function login(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;
  const token = await loginUncached(email);
  tokenCache.set(email, token);
  return token;
}
async function loginUncached(email: string): Promise<string> {
  const res = await api('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(res.status, 200, `login failed for ${email}`);
  return ((await res.json()) as { accessToken: string }).accessToken;
}

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const passwordHash = await hashPassword(PASSWORD);
  const stamp = Date.now();
  for (const role of ['ADMIN', 'ELECTION_COMMITTEE', 'SUPER_ADMIN'] as const) {
    emails[role] = `${role.toLowerCase()}-${stamp}@example.test`;
    await prisma.user.create({ data: { email: emails[role], fullName: `Test ${role}`, role, passwordHash } });
  }
  // a current (most recent, non-archived) election for the admin endpoints to operate on
  await prisma.election.create({ data: { title: 'ACL election', year: 2026, status: 'DRAFT' } });
});

after(async () => {
  server.close();
  await prisma.$disconnect();
});

test('unauthenticated requests to every admin area are rejected', async () => {
  for (const path of ['/elections/current', '/voters', '/candidates', '/positions', '/results', '/audit', '/users', '/voting/records', '/reports/summary/csv']) {
    assert.equal((await api(path)).status, 401, `${path} should require auth`);
  }
});

test('forged / tampered JWTs are rejected', async () => {
  const token = await login(emails.ADMIN);
  const [h, p, s] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 'x', role: 'SUPER_ADMIN', fullName: 'Evil' })).toString('base64url');
  assert.equal((await api('/users', { token: `${h}.${forgedPayload}.${s}` })).status, 401);
  assert.equal((await api('/users', { token: `${h}.${p}.AAAA` })).status, 401);
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${forgedPayload}.`;
  assert.equal((await api('/users', { token: none })).status, 401);
});

test('privilege boundaries: ADMIN < ELECTION_COMMITTEE < SUPER_ADMIN', async () => {
  const admin = await login(emails.ADMIN);
  const committee = await login(emails.ELECTION_COMMITTEE);
  const superAdmin = await login(emails.SUPER_ADMIN);

  assert.equal((await api('/voters', { token: admin })).status, 200);
  assert.equal((await api('/users', { token: admin })).status, 403);
  assert.equal((await api('/voting/records', { token: admin })).status, 403);
  assert.equal((await api('/elections/current/open', { method: 'POST', token: admin })).status, 403);
  assert.equal((await api('/elections/current/close', { method: 'POST', token: admin })).status, 403);
  assert.equal((await api('/elections/current/archive', { method: 'POST', token: admin })).status, 403);
  assert.equal((await api('/elections/current', { method: 'PATCH', token: admin, body: { title: 'hijack' } })).status, 403);
  assert.equal((await api('/elections/current/lock', { method: 'POST', token: admin, body: { reason: 'because I can' } })).status, 403);
  assert.equal((await api('/results/reconcile', { method: 'POST', token: admin })).status, 403);

  assert.equal((await api('/voting/records', { token: committee })).status, 200);
  assert.equal((await api('/users', { token: committee })).status, 403);
  assert.equal((await api('/elections/current/unlock', { method: 'POST', token: committee, body: { reason: 'not allowed to unlock' } })).status, 403);

  assert.equal((await api('/users', { token: superAdmin })).status, 200);
});

test('a deactivated admin loses access immediately, not after the JWT expires', async () => {
  const email = `to-deactivate-${Date.now()}@example.test`;
  const user = await prisma.user.create({ data: { email, fullName: 'Temp', role: 'ADMIN', passwordHash: await hashPassword(PASSWORD) } });
  const token = await login(email);
  assert.equal((await api('/voters', { token })).status, 200);
  await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
  assert.equal((await api('/voters', { token })).status, 401);
});

test('a role downgrade takes effect immediately', async () => {
  const email = `to-downgrade-${Date.now()}@example.test`;
  const user = await prisma.user.create({ data: { email, fullName: 'Temp', role: 'SUPER_ADMIN', passwordHash: await hashPassword(PASSWORD) } });
  const token = await login(email);
  assert.equal((await api('/users', { token })).status, 200);
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  assert.equal((await api('/users', { token })).status, 403);
});

test('refresh rejects a cross-site Origin (CSRF compensating control)', async () => {
  const res = await api('/auth/refresh', { method: 'POST', headers: { Origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
});

test('login: wrong password and unknown user are indistinguishable', async () => {
  const bad = await api('/auth/login', { method: 'POST', body: { email: emails.ADMIN, password: 'wrong-password-123' } });
  const unknown = await api('/auth/login', { method: 'POST', body: { email: 'nobody@example.test', password: 'wrong-password-123' } });
  assert.equal(bad.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await bad.json(), await unknown.json());
});

test('unknown voting tokens reveal nothing and API responses are not cacheable', async () => {
  const res = await api('/voting/ballot/' + 'f'.repeat(96));
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('SQL-injection style input in search parameters is treated as data', async () => {
  const admin = await login(emails.ADMIN);
  const res = await api(`/voters?search=${encodeURIComponent("x'; DROP TABLE voters; --")}`, { token: admin });
  assert.equal(res.status, 200);
  assert.equal((await api('/voters', { token: admin })).status, 200);
});

test('election schedule validation: end must be after start', async () => {
  const committee = await login(emails.ELECTION_COMMITTEE);
  const bad = await api('/elections/current', {
    method: 'PATCH',
    token: committee,
    body: { startTime: '2030-01-02T10:00:00Z', endTime: '2030-01-01T10:00:00Z' },
  });
  assert.equal(bad.status, 400);
  const ok = await api('/elections/current', {
    method: 'PATCH',
    token: committee,
    body: { startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-02T10:00:00Z' },
  });
  assert.equal(ok.status, 200);
});

test('readiness endpoint reports database connectivity', async () => {
  assert.equal((await api('/health/ready')).status, 200);
});

test('the schedule can be cleared (null) and a past end time is refused on an open election', async () => {
  const committee = await login(emails.ELECTION_COMMITTEE);
  const cleared = await api('/elections/current', { method: 'PATCH', token: committee, body: { startTime: null, endTime: null } });
  assert.equal(cleared.status, 200);
  const body = (await cleared.json()) as { election: { startTime: string | null; endTime: string | null } };
  assert.equal(body.election.startTime, null);
  assert.equal(body.election.endTime, null);
  const empty = await api('/elections/current', { method: 'PATCH', token: committee, body: { startTime: '', endTime: '' } });
  assert.equal(empty.status, 200);
});
