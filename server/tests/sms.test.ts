/** Automatic SMS invites: length (cost), character set and config. Pure unit test: no database or Twilio needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import { getSmsConfig, inviteSmsText, SMS_MAX_CHARS, SMS_ONE_PART, toPlainSmsText } from '../src/lib/sms';
import { generateVotingToken } from '../src/lib/tokens';

const BASE = 'https://ida-elections.vercel.app/vote/';
const GSM_SAFE = /^[\x20-\x7E\n]*$/;
const closesAt = new Date('2026-11-28T17:00:00Z');

test('voting tokens are 43 URL-safe characters (256 bits) and unique', () => {
  const a = generateVotingToken();
  const b = generateVotingToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test('with current links the invite is ONE SMS part, whatever the name', () => {
  for (const fullName of ['Ada Obi', 'Chinedu Okafor', 'Oluwaseyifunmilayo Adebayo-Ogunleye', '']) {
    for (const endTime of [closesAt, null]) {
      const token = generateVotingToken();
      const text = inviteSmsText({ fullName, electionTitle: 'Igarra Development Association General Election', endTime, rawToken: token, votingLink: BASE + token });
      assert.ok(text.length <= SMS_ONE_PART, `${fullName || '(no name)'}: ${text.length} chars`);
      assert.ok(text.includes(BASE + token), 'link must be intact');
    }
  }
});

test('short names keep the name and the closing time (Lagos time)', () => {
  const token = generateVotingToken();
  const text = inviteSmsText({ fullName: 'Ada Obi', electionTitle: 'IDA Election', endTime: closesAt, rawToken: token, votingLink: BASE + token });
  assert.match(text, /^Ada, your IDA voting link:/);
  assert.match(text, /Closes 28 Nov, 18:00\.$/);
});

test('older 96-character links still fit in two parts', () => {
  const token = randomBytes(48).toString('hex');
  const text = inviteSmsText({ fullName: 'Oluwaseyifunmi Adebayo-Ogunleye', electionTitle: 'Igarra Development Association 2026 General Elections of Officers', endTime: closesAt, rawToken: token, votingLink: BASE + token });
  assert.ok(text.length <= SMS_MAX_CHARS, `too long: ${text.length} chars`);
  assert.ok(text.includes(BASE + token));
});

test('text stays in the plain GSM alphabet (no accents or curly quotes that double the cost)', () => {
  const token = generateVotingToken();
  const text = inviteSmsText({ fullName: 'Chídí Ọ́kàfọ̀', electionTitle: 'IDA “General” Election – 2026', endTime: null, rawToken: token, votingLink: BASE + token });
  assert.ok(GSM_SAFE.test(text), text);
  assert.equal(toPlainSmsText('Adé’s “vote” – now'), `Ade's "vote" - now`);
});

test('no brand names that Nigerian operators filter', () => {
  const token = generateVotingToken();
  const text = inviteSmsText({ fullName: 'Ada Obi', electionTitle: 'IDA Election', endTime: null, rawToken: token, votingLink: BASE + token });
  assert.ok(!/whatsapp|facebook|instagram/i.test(text));
});

test('SMS stays off unless explicitly enabled with a sender', () => {
  const full = { SMS_ENABLED: 'true', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_API_KEY_SID: 'SK1', TWILIO_API_KEY_SECRET: 'secret', TWILIO_SMS_FROM: 'IDAElection' };
  assert.equal(getSmsConfig({}), null);
  assert.equal(getSmsConfig({ ...full, SMS_ENABLED: 'false' }), null);
  assert.equal(getSmsConfig({ ...full, TWILIO_SMS_FROM: '' }), null);
  assert.equal(getSmsConfig(full)?.from, 'IDAElection');
});
