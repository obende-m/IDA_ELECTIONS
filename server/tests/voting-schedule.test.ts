/** Wording voters see when they open their link before voting starts. No database needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notOpenMessage } from '../src/modules/voting/voting.service';

const now = new Date('2026-11-14T10:00:00Z');

test('before the scheduled start, the message says when voting opens, in Nigeria time', () => {
  const msg = notOpenMessage({ status: 'DRAFT', startTime: new Date('2026-11-20T08:00:00Z') }, now);
  assert.match(msg, /^Voting has not opened yet\./);
  assert.match(msg, /20 November 2026/);
  assert.match(msg, /9:00/); // 08:00 UTC is 09:00 in Lagos
  assert.match(msg, /Nigeria time/);
});

test('paused, closed or unscheduled elections keep the general message', () => {
  for (const e of [
    { status: 'PAUSED', startTime: new Date('2026-11-20T08:00:00Z') },
    { status: 'CLOSED', startTime: new Date('2026-11-01T08:00:00Z') },
    { status: 'DRAFT', startTime: null },
    { status: 'DRAFT', startTime: new Date('2026-11-13T08:00:00Z') },
  ]) {
    assert.equal(notOpenMessage(e, now), 'Voting is not currently open for this election.');
  }
});
