/**
 * Integration tests for voting integrity. They run against a REAL Postgres database and create only
 * synthetic data. Refuses to run unless DATABASE_URL points at a database whose name ends in `_test`.
 *
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/ida_test \
 *   DIRECT_URL=postgresql://user:pass@localhost:5432/ida_test \
 *   npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ??= 'test-secret';
process.env.TOKEN_ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.VOTING_LINK_BASE_URL ??= 'http://localhost:5173';

const dbName = (process.env.DATABASE_URL ?? '').split('?')[0].split('/').pop() ?? '';
if (!dbName.endsWith('_test')) {
  throw new Error(`Refusing to run integration tests against database "${dbName}" - its name must end in "_test".`);
}

import { prisma } from '../src/lib/prisma';
import * as votingService from '../src/modules/voting/voting.service';
import * as voterService from '../src/modules/voters/voter.service';
import { getElectionAnalytics, reconcileTallies } from '../src/modules/analytics/analytics.service';
import { toCsv } from '../src/lib/csv';

let actorUser: { id: string };
const actor = () => ({ id: actorUser.id, fullName: 'Test Admin', role: 'SUPER_ADMIN' as const });

async function makeElection(opts: { status?: 'DRAFT' | 'ACTIVE' | 'PAUSED'; endTime?: Date; maxSelections?: number; candidates?: number } = {}) {
  const election = await prisma.election.create({
    data: { title: 'Synthetic', year: 2026, status: opts.status ?? 'ACTIVE', endTime: opts.endTime },
  });
  const position = await prisma.position.create({
    data: { electionId: election.id, title: 'Chair', maxSelections: opts.maxSelections ?? 1 },
  });
  await prisma.positionTally.create({ data: { electionId: election.id, positionId: position.id } });
  const candidates = [];
  for (let i = 0; i < (opts.candidates ?? 3); i++) {
    const c = await prisma.candidate.create({
      data: { electionId: election.id, positionId: position.id, name: `Candidate ${i + 1}`, displayOrder: i },
    });
    await prisma.candidateTally.create({ data: { electionId: election.id, candidateId: c.id, positionId: position.id } });
    candidates.push(c);
  }
  return { election, position, candidates };
}

async function makeVoterWithLink(electionId: string, n: number, isActive = true) {
  const voter = await prisma.voter.create({
    data: { electionId, membershipNumber: `M-${electionId.slice(0, 6)}-${n}`, fullName: `Voter ${n}`, isActive },
  });
  const { votingLink } = await voterService.issueToken(electionId, voter.id, actor());
  return { voter, rawToken: votingLink.split('/vote/')[1] };
}

before(async () => {
  actorUser = await prisma.user.create({
    data: { email: `tester-${Date.now()}@example.test`, passwordHash: 'x', fullName: 'Test Admin', role: 'SUPER_ADMIN' },
  });
});

after(async () => {
  await prisma.$disconnect();
});

test('concurrent double-submit with one token records exactly one ballot', async () => {
  const { election, position, candidates } = await makeElection();
  const { rawToken } = await makeVoterWithLink(election.id, 1);

  const attempts = await Promise.allSettled(
    Array.from({ length: 25 }, () =>
      votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] })
    )
  );

  assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
  assert.equal(await prisma.vote.count({ where: { electionId: election.id } }), 1);
  const tally = await prisma.electionTally.findUniqueOrThrow({ where: { electionId: election.id } });
  assert.equal(tally.ballotsCast, 1);
  assert.equal((await prisma.candidateTally.findUniqueOrThrow({ where: { candidateId: candidates[0].id } })).voteCount, 1);
});

test('100 concurrent voters: tallies equal the raw vote rows and survive reconcile', async () => {
  const { election, position, candidates } = await makeElection();
  const voters = [];
  for (let i = 0; i < 100; i++) voters.push(await makeVoterWithLink(election.id, i));

  const results = await Promise.allSettled(
    voters.map((v, i) =>
      votingService.castVote(v.rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[i % 3].id] }] })
    )
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 100, JSON.stringify(results.filter((r) => r.status === 'rejected')[0]));

  const before = await getElectionAnalytics(election.id);
  assert.equal(before.ballotsCast, 100);
  const counts = before.positions[0].candidates.map((c) => c.voteCount).sort();
  assert.deepEqual(counts, [33, 33, 34]);

  await reconcileTallies(election.id);
  const afterReconcile = await getElectionAnalytics(election.id);
  assert.deepEqual(
    afterReconcile.positions[0].candidates.map((c) => c.voteCount),
    before.positions[0].candidates.map((c) => c.voteCount)
  );
});

test('a position listed twice cannot be used to exceed maxSelections', async () => {
  const { election, position, candidates } = await makeElection({ maxSelections: 1 });
  const { rawToken } = await makeVoterWithLink(election.id, 1);

  await assert.rejects(
    votingService.castVote(rawToken, {
      selections: [
        { positionId: position.id, candidateIds: [candidates[0].id] },
        { positionId: position.id, candidateIds: [candidates[1].id] },
      ],
    }),
    /only appear once/
  );
  assert.equal(await prisma.vote.count({ where: { electionId: election.id } }), 0);
  // The token must still be usable after a rejected submission.
  await votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] });
});

test('selecting more than maxSelections or a foreign candidate is rejected', async () => {
  const { election, position, candidates } = await makeElection({ maxSelections: 1 });
  const other = await makeElection();
  const { rawToken } = await makeVoterWithLink(election.id, 1);

  await assert.rejects(
    votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id, candidates[1].id] }] }),
    /at most 1/
  );
  await assert.rejects(
    votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [other.candidates[0].id] }] }),
    /invalid/
  );
});

test('a deactivated voter cannot fetch a ballot or vote', async () => {
  const { election, position, candidates } = await makeElection();
  const { voter, rawToken } = await makeVoterWithLink(election.id, 1);
  await prisma.voter.update({ where: { id: voter.id }, data: { isActive: false } });

  await assert.rejects(votingService.getBallot(rawToken), /not active/);
  await assert.rejects(
    votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] }),
    /not active/
  );
  assert.equal(await prisma.vote.count({ where: { electionId: election.id } }), 0);
});

test('voting is refused after the scheduled end time, and the election is closed and certified', async () => {
  const { election, position, candidates } = await makeElection({ endTime: new Date(Date.now() - 60_000) });
  const { rawToken } = await makeVoterWithLink(election.id, 1);

  await assert.rejects(
    votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] }),
    /not currently open/
  );
  const closed = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
  assert.equal(closed.status, 'CLOSED');
  assert.equal(closed.isLocked, true);
  assert.ok(await prisma.electionResultSnapshot.findUnique({ where: { electionId: election.id } }), 'certified snapshot must exist');
  assert.equal(await prisma.vote.count({ where: { electionId: election.id } }), 0);
});

test('a locked or paused election rejects ballot and vote requests', async () => {
  const locked = await makeElection();
  const a = await makeVoterWithLink(locked.election.id, 1);
  await prisma.election.update({ where: { id: locked.election.id }, data: { isLocked: true } });
  await assert.rejects(votingService.getBallot(a.rawToken), /locked/);
  await assert.rejects(
    votingService.castVote(a.rawToken, { selections: [{ positionId: locked.position.id, candidateIds: [locked.candidates[0].id] }] }),
    /locked/
  );

  const paused = await makeElection({ status: 'PAUSED' });
  const b = await makeVoterWithLink(paused.election.id, 1);
  await assert.rejects(votingService.getBallot(b.rawToken), /not currently open/);
});

test('revoked and replaced tokens cannot vote; the replacement can', async () => {
  const { election, position, candidates } = await makeElection();
  const { voter, rawToken } = await makeVoterWithLink(election.id, 1);
  const { votingLink } = await voterService.replaceToken(election.id, voter.id, actor());
  const newToken = votingLink.split('/vote/')[1];

  await assert.rejects(
    votingService.castVote(rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] }),
    /revoked/
  );
  await votingService.castVote(newToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] });
  assert.equal(await prisma.vote.count({ where: { electionId: election.id, voterId: voter.id } }), 1);
});

test('ties are flagged and never produce a false single winner', async () => {
  const { election, position, candidates } = await makeElection({ candidates: 2 });
  const v1 = await makeVoterWithLink(election.id, 1);
  const v2 = await makeVoterWithLink(election.id, 2);
  await votingService.castVote(v1.rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[0].id] }] });
  await votingService.castVote(v2.rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[1].id] }] });
  const analytics = await getElectionAnalytics(election.id);
  assert.equal(analytics.positions[0].tied, true);
});

test('CSV export neutralises spreadsheet formulas', () => {
  const csv = toCsv([{ name: '=HYPERLINK("http://evil")' }, { name: '+1' }, { name: 'Normal' }, { name: -5 as unknown as string }], [
    { key: 'name', header: 'Name' },
  ]);
  const lines = csv.split('\r\n');
  assert.ok(lines[1].includes("'=HYPERLINK"));
  assert.equal(lines[2], "'+1");
  assert.equal(lines[3], 'Normal');
  assert.equal(lines[4], '-5');
});

test('closing during a burst of votes: every counted vote is inside the certified snapshot, none after', async () => {
  const { closeElection } = await import('../src/modules/elections/election.service');
  const { election, position, candidates } = await makeElection();
  const voters = [];
  for (let i = 0; i < 40; i++) voters.push(await makeVoterWithLink(election.id, i));

  const votes = voters.map((v, i) =>
    votingService.castVote(v.rawToken, { selections: [{ positionId: position.id, candidateIds: [candidates[i % 3].id] }] })
  );
  // Close part-way through the burst, once a few ballots have landed (election was created last, so it is the "current" election).
  const closing = (async () => {
    for (let i = 0; i < 200 && (await prisma.vote.count({ where: { electionId: election.id } })) < 5; i++) {
      await new Promise((r) => setTimeout(r, 5));
    }
    await closeElection(actor());
  })();
  const outcomes = await Promise.allSettled(votes);
  await closing;

  const accepted = outcomes.filter((o) => o.status === 'fulfilled').length;
  const rows = await prisma.vote.count({ where: { electionId: election.id } });
  const snapshot = await prisma.electionResultSnapshot.findUniqueOrThrow({ where: { electionId: election.id } });
  const snap = snapshot.data as unknown as { ballotsCast: number };
  const tally = await prisma.electionTally.findUniqueOrThrow({ where: { electionId: election.id } });

  assert.equal(rows, accepted, 'every accepted vote has a row and every row was accepted');
  assert.equal(tally.ballotsCast, accepted);
  assert.equal(snap.ballotsCast, accepted, 'certified snapshot must contain exactly the accepted ballots');
  for (const o of outcomes) {
    if (o.status === 'rejected') assert.match(String(o.reason?.message), /not currently open|locked|already been used/);
  }
});

test('closing the election waits for an in-flight ballot transaction (row lock) instead of racing past it', async () => {
  const { closeElection } = await import('../src/modules/elections/election.service');
  const { election } = await makeElection();

  let closeFinished = false;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let closing: Promise<unknown> = Promise.resolve();

  const inFlightBallot = prisma.$transaction(async (tx) => {
    // exactly what castVote does at the start of its transaction
    await tx.$queryRaw`SELECT id FROM elections WHERE id = ${election.id} FOR SHARE`;
    closing = closeElection(actor()).then(() => (closeFinished = true));
    await new Promise((r) => setTimeout(r, 600)); // ballot is "still being written"
    assert.equal(closeFinished, false, 'close must not complete while a ballot transaction holds the election row');
    release();
  });

  await inFlightBallot;
  await gate;
  await closing;
  assert.equal(closeFinished, true);
  assert.equal((await prisma.election.findUniqueOrThrow({ where: { id: election.id } })).status, 'CLOSED');
});
