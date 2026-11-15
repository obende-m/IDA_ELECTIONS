/** How typed receipt numbers are cleaned up before lookup. No database needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReference } from '../src/modules/voting/voting.service';

test('a whole receipt is recognised however it is typed', () => {
  for (const typed of ['IDA-7KQ4-M2XP-9HTA', 'ida-7kq4-m2xp-9hta', 'IDA 7KQ4 M2XP 9HTA', 'IDA7KQ4M2XP9HTA', ' ida_7kq4.m2xp-9hta ']) {
    assert.equal(normalizeReference(typed), 'IDA-7KQ4-M2XP-9HTA', typed);
  }
});

test('partial input is kept as typed (upper-cased, spaces removed) for searching', () => {
  assert.equal(normalizeReference('7kq4-m2xp'), '7KQ4-M2XP');
  assert.equal(normalizeReference('Ada Okoro'), 'ADAOKORO');
});
