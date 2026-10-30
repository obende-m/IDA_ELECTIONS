/** Voting links must never reach the server logs. Pure unit test: no database needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import { redactPath } from '../src/middleware/errorHandler';

test('voting tokens in the URL path are masked', () => {
  const token = randomBytes(48).toString('base64url');
  for (const prefix of ['/ballot/', '/cast/', '/token/']) {
    const logged = redactPath(`${prefix}${token}`);
    assert.ok(!logged.includes(token), `${prefix} token leaked: ${logged}`);
    assert.equal(logged, `${prefix}:redacted`);
  }
  assert.equal(redactPath(`/token/${token}/resolve`), '/token/:redacted/resolve');
});

test('ordinary paths and record ids stay readable', () => {
  assert.equal(redactPath('/elections/current'), '/elections/current');
  assert.equal(redactPath('/voters/import'), '/voters/import');
  const id = '3f2b8c1e-5d4a-4b7e-9c2d-1a2b3c4d5e6f';
  assert.equal(redactPath(`/voters/${id}/token/issue`), `/voters/${id}/token/issue`);
});
