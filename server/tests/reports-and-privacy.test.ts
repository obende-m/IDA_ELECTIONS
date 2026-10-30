/** Every report/export type renders on real data, and voter identity never leaks outside the Vote Records module. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret';
process.env.TOKEN_ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.VOTING_LINK_BASE_URL = 'http://localhost:5173';

const dbName = (process.env.DATABASE_URL ?? '').split('?')[0].split('/').pop() ?? '';
if (!dbName.endsWith('_test')) throw new Error(`Refusing to run against database "${dbName}" - its name must end in "_test".`);

import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import * as voterService from '../src/modules/voters/voter.service';
import * as votingService from '../src/modules/voting/voting.service';

const PASSWORD = 'correct-horse-battery-staple';
const SECRET_NAME = 'Zyxwvut Qwertyuiop'; // a voter name that must never appear in any report
let server: Server;
let base: string;
let adminToken: string;
let committeeToken: string;
let electionId: string;

async function api(path: string, token?: string) {
  return fetch(`${base}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return ((await res.json()) as { accessToken: string }).accessToken;
}

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const hash = await hashPassword(PASSWORD);
  const stamp = Date.now();
  const admin = await prisma.user.create({ data: { email: `rep-admin-${stamp}@example.test`, fullName: 'Rep Admin', role: 'ADMIN', passwordHash: hash } });
  await prisma.user.create({ data: { email: `rep-committee-${stamp}@example.test`, fullName: 'Rep Committee', role: 'ELECTION_COMMITTEE', passwordHash: hash } });
  adminToken = await login(`rep-admin-${stamp}@example.test`);
  committeeToken = await login(`rep-committee-${stamp}@example.test`);

  // Created last, so it is the "current" election.
  const election = await prisma.election.create({ data: { title: 'Report election', year: 2026, status: 'ACTIVE' } });
  electionId = election.id;
  const position = await prisma.position.create({ data: { electionId, title: 'President', maxSelections: 1 } });
  await prisma.positionTally.create({ data: { electionId, positionId: position.id } });
  const candidates = [];
  for (const name of ['Alice', 'Bob']) {
    const c = await prisma.candidate.create({ data: { electionId, positionId: position.id, name } });
    await prisma.candidateTally.create({ data: { electionId, candidateId: c.id, positionId: position.id } });
    candidates.push(c);
  }
  const actor = { id: admin.id, fullName: 'Rep Admin', role: 'ADMIN' as const };
  for (let i = 0; i < 5; i++) {
    const voter = await prisma.voter.create({
      data: { electionId, membershipNumber: `R-${i}`, fullName: i === 0 ? SECRET_NAME : `Reporter ${i}` },
    });
    const { votingLink } = await voterService.issueToken(electionId, voter.id, actor);
    await votingService.castVote(votingLink.split('/vote/')[1], {
      selections: [{ positionId: position.id, candidateIds: [candidates[i % 2].id] }],
    });
  }
});

after(async () => {
  server.close();
  await prisma.$disconnect();
});

const TYPES = ['summary', 'positions', 'participation', 'audit'] as const;
const FORMATS = { pdf: 'application/pdf', xlsx: 'spreadsheetml', csv: 'text/csv' } as const;

for (const type of TYPES) {
  for (const [format, mime] of Object.entries(FORMATS)) {
    test(`report ${type}.${format} renders on real data`, async () => {
      const res = await api(`/reports/${type}/${format}`, adminToken);
      assert.equal(res.status, 200, `${type}.${format}`);
      assert.ok((res.headers.get('content-type') ?? '').includes(mime), `${type}.${format} content-type ${res.headers.get('content-type')}`);
      const body = Buffer.from(await res.arrayBuffer());
      assert.ok(body.length > (format === "csv" ? 40 : 200), `${type}.${format} body too small (${body.length})`);
      if (format === 'pdf') assert.equal(body.subarray(0, 4).toString(), '%PDF');
      if (format === 'xlsx') assert.equal(body.subarray(0, 2).toString(), 'PK');
      if (format === 'csv') assert.ok(!body.toString('utf8').includes(SECRET_NAME), `${type}.csv leaks a voter name`);
      assert.ok(!body.toString('latin1').includes(SECRET_NAME), `${type}.${format} leaks a voter name`);
    });
  }
}

test('results counts are correct for the synthetic ballots (3 vs 2)', async () => {
  const res = await api('/results', adminToken);
  const data = (await res.json()) as { ballotsCast: number; positions: Array<{ candidates: Array<{ name: string; voteCount: number }> }> };
  assert.equal(data.ballotsCast, 5);
  const byName = Object.fromEntries(data.positions[0].candidates.map((c) => [c.name, c.voteCount]));
  assert.deepEqual(byName, { Alice: 3, Bob: 2 });
});

test('audit log API and recent-activity feed never expose a voter name', async () => {
  const audit = await (await api('/audit?pageSize=200', adminToken)).text();
  assert.ok(!audit.includes(SECRET_NAME), 'audit viewer leaks voter name');
  const results = await (await api('/results', adminToken)).text();
  assert.ok(!results.includes(SECRET_NAME), 'results/dashboard feed leaks voter name');
  const search = await (await api(`/audit?search=${encodeURIComponent('Zyxwvut')}`, adminToken)).json() as { total: number };
  assert.equal(search.total, 0, 'audit search must not act as an oracle for voter names');
});

test('voter lists and exports contain no voting links or tokens', async () => {
  const csv = await (await api('/voters/export', adminToken)).text();
  assert.ok(!/\/vote\/[0-9a-f]{20,}/.test(csv));
  const list = await (await api('/voters?pageSize=50', adminToken)).text();
  assert.ok(!/tokenHash|tokenEncrypted/.test(list), 'voter list must not include token material');
});

test('individual vote records: committee only, and every read is audit-logged', async () => {
  assert.equal((await api('/voting/records', adminToken)).status, 403);
  const before = await prisma.auditLog.count({ where: { electionId, action: 'VOTE_RECORDS_VIEWED' } });
  const res = await api('/voting/records', committeeToken);
  assert.equal(res.status, 200);
  assert.equal(await prisma.auditLog.count({ where: { electionId, action: 'VOTE_RECORDS_VIEWED' } }), before + 1);
});
