import test from 'node:test';
import assert from 'node:assert/strict';
import common from '../infra/email/scripts/common.cjs';

const { buildSupabaseSmtpConfig } = common;

test('uses the first usable fallback provider when Tláo credentials are unavailable', () => {
  const keys = [
    'TLAO_SMTP_HOST',
    'TLAO_SMTP_PORT',
    'TLAO_SMTP_USERNAME',
    'TLAO_SMTP_PASSWORD',
    'ALTERNUN_NO_REPLY_EMAIL',
    'ALTERNUN_NO_REPLY_PASSWORD',
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USERNAME',
    'SUPABASE_SMTP_PASSWORD',
    'SUPABASE_SMTP_SENDER',
    'POSTMARK_SMTP_HOST',
    'POSTMARK_SMTP_PORT',
    'POSTMARK_SMTP_ACCESS_KEY',
    'POSTMARK_SMTP_SECRET_KEY',
    'POSTMARK_SMTP_USERNAME',
    'POSTMARK_SMTP_PASSWORD',
    'POSTMARK_SERVER_TOKEN',
    'POSTMARK_SERVER_API_TOKEN',
    'POSTMARK_API_TOKEN',
  ];
  const environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    delete process.env[key];
  }

  try {
    const result = buildSupabaseSmtpConfig({
      provider: 'tlao',
      fallbackProviders: ['postmark'],
      fromEmail: 'support@example.com',
      senderName: 'Example Support',
      tlao: {
        smtpHost: 'smtp.tlao.co',
        smtpPort: 587,
        username: '',
        password: '',
      },
      postmark: {
        smtpHost: 'smtp.postmarkapp.com',
        smtpPort: 587,
        username: 'postmark-server-token',
        password: 'postmark-server-token',
      },
    });

    assert.equal(result.provider, 'postmark');
    assert.equal(result.payload.smtp_host, 'smtp.postmarkapp.com');
    assert.equal(result.payload.smtp_port, '587');
    assert.equal(result.payload.smtp_user, 'postmark-server-token');
    assert.equal(result.payload.smtp_pass, 'postmark-server-token');
  } finally {
    for (const [key, value] of Object.entries(environment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
