/** Automatic WhatsApp sending: config, phone formatting and template variables. Pure unit test: no database or Twilio needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatCloses, getWhatsappConfig, inviteTemplateVariables, toE164, whatsappMode } from '../src/lib/whatsapp';

test('Nigerian numbers in every common format become E.164', () => {
  for (const typed of ['08012345678', '+234 801 234 5678', '2348012345678', '8012345678', '00234-801-234-5678', '(0801) 234 5678']) {
    assert.equal(toE164(typed, '234'), '+2348012345678', typed);
  }
});

test('unusable numbers are rejected', () => {
  for (const typed of [null, undefined, '', '   ', 'n/a', '0801', '123']) {
    assert.equal(toE164(typed as string | null | undefined, '234'), null, String(typed));
  }
});

test('feature stays off unless explicitly enabled and fully configured', () => {
  const full = {
    WHATSAPP_ENABLED: 'true',
    TWILIO_ACCOUNT_SID: 'AC1',
    TWILIO_API_KEY_SID: 'SK1',
    TWILIO_API_KEY_SECRET: 'secret',
    TWILIO_WHATSAPP_FROM: '+14155238886',
  };
  assert.equal(whatsappMode(getWhatsappConfig({})), 'off');
  assert.equal(whatsappMode(getWhatsappConfig({ ...full, WHATSAPP_ENABLED: 'false' })), 'off');
  assert.equal(whatsappMode(getWhatsappConfig({ ...full, TWILIO_API_KEY_SECRET: '' })), 'off');

  const sandbox = getWhatsappConfig(full);
  assert.equal(whatsappMode(sandbox), 'sandbox');
  assert.equal(sandbox?.from, 'whatsapp:+14155238886');
  assert.equal(sandbox?.statusCallback, undefined);

  const prod = getWhatsappConfig({ ...full, TWILIO_INVITE_CONTENT_SID: 'HX1', PUBLIC_SERVER_URL: 'https://api.example.org/' });
  assert.equal(whatsappMode(prod), 'template');
  assert.equal(prod?.statusCallback, 'https://api.example.org/api/twilio/status');
});

test('template variables are single-line and the token goes only in the button variable', () => {
  const vars = inviteTemplateVariables({
    fullName: '  Chinedu   Okafor ',
    electionTitle: 'IDA\n2026   Election',
    endTime: new Date('2026-11-28T17:00:00Z'),
    rawToken: 'abc123',
    votingLink: 'https://example.org/vote/abc123',
  });
  assert.equal(vars['1'], 'Chinedu');
  assert.equal(vars['2'], 'IDA 2026 Election');
  assert.equal(vars['4'], 'abc123');
  for (const key of ['1', '2', '3']) {
    assert.ok(!/[\n\t]| {2,}/.test(vars[key]), `variable ${key} is not single-line`);
    assert.ok(!vars[key].includes('abc123'), `variable ${key} leaks the token`);
  }
});

test('closing time is shown in Lagos time, not the server time zone', () => {
  // 17:00 UTC is 18:00 in Lagos (UTC+1, no daylight saving); en-NG uses the 24-hour clock.
  assert.match(formatCloses(new Date('2026-11-28T17:00:00Z')) ?? '', /18:00/);
  assert.equal(formatCloses(null), null);
});
