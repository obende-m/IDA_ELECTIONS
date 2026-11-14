/**
 * One-off check that the Twilio WhatsApp settings in server/.env work, without the database or the app.
 * Sends a harmless test message (no voting link) to TEST_WHATSAPP_TO.
 *
 *   npx ts-node scripts/whatsapp-smoke-test.ts
 *
 * Sandbox: the TEST_WHATSAPP_TO phone must have joined the sandbox and messaged it in the last 24 hours.
 */
import dotenv from 'dotenv';
import twilio from 'twilio';
import { getWhatsappConfig, toE164 } from '../src/lib/whatsapp';

dotenv.config();

async function main() {
  const config = getWhatsappConfig();
  if (!config) throw new Error('WhatsApp is not configured: check WHATSAPP_ENABLED=true and the TWILIO_* settings in server/.env');
  const to = toE164(process.env.TEST_WHATSAPP_TO);
  if (!to) throw new Error('Set TEST_WHATSAPP_TO in server/.env to the phone that joined the sandbox (e.g. 0801 234 5678)');

  const client = twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid });
  const message = await client.messages.create({
    from: config.from,
    to: `whatsapp:${to}`,
    body: 'IDA Elections: test message from the voting platform. If you can read this, automatic WhatsApp sending works.',
  });
  console.log(`Twilio accepted the message (SID ${message.sid}, status ${message.status}). Check the phone ending ${to.slice(-4)}.`);
}

main().catch((err) => {
  const code = err && typeof err === 'object' && 'code' in err ? ` (Twilio error ${err.code})` : '';
  console.error(`Failed${code}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
