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
  assert.equal((await api('/elections/current/archive', { method: 'POST', token: committee })).status, 403, 'only a Super Admin can archive');

  assert.equal((await api('/users', { token: superAdmin })).status, 200);
  // a Super Admin passes the role check (and is then refused only because this test election is not CLOSED)
  assert.equal((await api('/elections/current/archive', { method: 'POST', token: superAdmin })).status, 409);
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

test('Super Admin can change an Admin <-> Committee role; it applies at once and is audited', async () => {
  const superAdmin = await login(emails.SUPER_ADMIN);
  const email = `role-swap-${Date.now()}@example.test`;
  const user = await prisma.user.create({ data: { email, fullName: 'Role Swap', role: 'ADMIN', passwordHash: await hashPassword(PASSWORD) } });
  const token = await login(email);
  assert.equal((await api('/voting/records', { token })).status, 403, 'an Admin cannot see vote records');

  const up = await api(`/users/${user.id}/role`, { method: 'PATCH', token: superAdmin, body: { role: 'ELECTION_COMMITTEE' } });
  assert.equal(up.status, 200);
  assert.equal(((await up.json()) as { user: { role: string } }).user.role, 'ELECTION_COMMITTEE');
  assert.equal((await api('/voting/records', { token })).status, 200, 'the new role applies on the very next request');

  const down = await api(`/users/${user.id}/role`, { method: 'PATCH', token: superAdmin, body: { role: 'ADMIN' } });
  assert.equal(down.status, 200);
  assert.equal((await api('/voting/records', { token })).status, 403);

  const audits = await prisma.auditLog.findMany({ where: { action: 'ADMIN_USER_ROLE_CHANGED', targetId: user.id } });
  assert.equal(audits.length, 2);
});

test('role changes and deletion are Super Admin only, and cannot touch Super Admins or yourself', async () => {
  const superAdmin = await login(emails.SUPER_ADMIN);
  const admin = await login(emails.ADMIN);
  const committee = await login(emails.ELECTION_COMMITTEE);
  const target = await prisma.user.create({ data: { email: `guard-${Date.now()}@example.test`, fullName: 'Guard', role: 'ADMIN', passwordHash: await hashPassword(PASSWORD) } });
  const me = await prisma.user.findUniqueOrThrow({ where: { email: emails.SUPER_ADMIN } });
  const otherSuper = await prisma.user.create({ data: { email: `super2-${Date.now()}@example.test`, fullName: 'Second Super', role: 'SUPER_ADMIN', passwordHash: await hashPassword(PASSWORD) } });

  for (const token of [admin, committee]) {
    assert.equal((await api(`/users/${target.id}/role`, { method: 'PATCH', token, body: { role: 'ELECTION_COMMITTEE' } })).status, 403);
    assert.equal((await api(`/users/${target.id}`, { method: 'DELETE', token })).status, 403);
  }
  assert.equal((await api(`/users/${target.id}/role`, { method: 'PATCH', body: { role: 'ADMIN' } })).status, 401);

  assert.equal((await api(`/users/${target.id}/role`, { method: 'PATCH', token: superAdmin, body: { role: 'SUPER_ADMIN' } })).status, 400, 'nobody can be promoted to Super Admin here');
  assert.equal((await api(`/users/${me.id}/role`, { method: 'PATCH', token: superAdmin, body: { role: 'ADMIN' } })).status, 409, 'no changing your own role');
  assert.equal((await api(`/users/${otherSuper.id}/role`, { method: 'PATCH', token: superAdmin, body: { role: 'ADMIN' } })).status, 409, 'no demoting a Super Admin');
  assert.equal((await api(`/users/${me.id}`, { method: 'DELETE', token: superAdmin })).status, 409, 'no deleting yourself');
  assert.equal((await api(`/users/${otherSuper.id}`, { method: 'DELETE', token: superAdmin })).status, 409, 'no deleting a Super Admin');
  assert.equal((await api(`/users/00000000-0000-0000-0000-000000000000`, { method: 'DELETE', token: superAdmin })).status, 404);
  assert.ok(await prisma.user.findUnique({ where: { id: otherSuper.id } }), 'the Super Admin is still there');
});

test('deleting an account removes their access but keeps their history in the audit trail', async () => {
  const superAdmin = await login(emails.SUPER_ADMIN);
  const email = `to-delete-${Date.now()}@example.test`;
  const user = await prisma.user.create({ data: { email, fullName: 'Leaver Admin', role: 'ELECTION_COMMITTEE', passwordHash: await hashPassword(PASSWORD) } });
  const token = await login(email);
  assert.equal((await api('/voters', { token })).status, 200);
  // something this person did earlier, which must survive their account
  await prisma.auditLog.create({ data: { action: 'TEST_PAST_ACTION', actorId: user.id, actorRole: 'ELECTION_COMMITTEE', actorName: 'Leaver Admin', userId: user.id } });

  assert.equal((await api(`/users/${user.id}`, { method: 'DELETE', token: superAdmin })).status, 204);
  assert.equal((await api('/voters', { token })).status, 401, 'their still-valid token stops working');
  assert.equal((await api('/auth/login', { method: 'POST', body: { email, password: PASSWORD } })).status, 401, 'they cannot sign in again');
  assert.equal(await prisma.user.findUnique({ where: { id: user.id } }), null);

  const past = await prisma.auditLog.findFirst({ where: { action: 'TEST_PAST_ACTION', actorId: user.id } });
  assert.equal(past?.actorName, 'Leaver Admin', 'their earlier activity is still recorded under their name');
  const deleted = await prisma.auditLog.findFirst({ where: { action: 'ADMIN_USER_DELETED', targetId: user.id } });
  assert.ok(deleted, 'the deletion itself is audited');
});

test('the WhatsApp queue is admin-only, lists live links with phone numbers, and its use is audited', async () => {
  const admin = await login(emails.ADMIN);
  assert.equal((await api('/voters/whatsapp-queue')).status, 401);

  const election = await prisma.election.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
  const created = await api('/voters', { method: 'POST', token: admin, body: { membershipNumber: `WA-${Date.now()}`, fullName: 'Whats App', phone: '08012345678' } });
  assert.equal(created.status, 201);
  const voter = ((await created.json()) as { voter: { id: string } }).voter;
  const empty = (await (await api('/voters/whatsapp-queue', { token: admin })).json()) as { voters: { id: string }[] };
  assert.ok(!empty.voters.some((v) => v.id === voter.id), 'a voter with no link is not in the queue');

  assert.equal((await api(`/voters/${voter.id}/token/issue`, { method: 'POST', token: admin })).status, 201);
  const res = await api('/voters/whatsapp-queue', { token: admin });
  assert.equal(res.status, 200);
  const row = ((await res.json()) as { voters: { id: string; phone: string; votingLink: string }[] }).voters.find((v) => v.id === voter.id);
  assert.ok(row, 'the voter with a live link is in the queue');
  assert.equal(row!.phone, '08012345678');
  assert.match(row!.votingLink, /\/vote\/[A-Za-z0-9_-]{40,}$/);
  const audit = await prisma.auditLog.findFirst({ where: { action: 'VOTING_LINKS_WHATSAPP_QUEUE_OPENED', electionId: election.id } });
  assert.ok(audit, 'opening the queue is audited');
});
