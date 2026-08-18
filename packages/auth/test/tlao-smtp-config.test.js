import test from 'node:test';
import assert from 'node:assert/strict';
import smtpConfigModule from '../infra/email/scripts/common.cjs';

const { buildSupabaseSmtpConfig } = smtpConfigModule;

test('buildSupabaseSmtpConfig defaults to Tláo Mail with username-password credentials', () => {
  const keys = [
    'TLAO_SMTP_HOST',
    'TLAO_SMTP_PORT',
    'TLAO_SMTP_USERNAME',
    'TLAO_SMTP_PASSWORD',
    'ALTERNUN_NO_REPLY_EMAIL',
    'ALTERNUN_NO_REPLY_PASSWORD',
    'EMAIL_FROM',
    'SUPABASE_SMTP_ADMIN_EMAIL',
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USERNAME',
    'SUPABASE_SMTP_PASSWORD',
    'SUPABASE_SMTP_SENDER',
    'EMAIL_SENDER_NAME',
    'SUPABASE_SMTP_SENDER_NAME',
    'SUPABASE_SMTP_MAX_FREQUENCY',
    'EMAIL_SMTP_PROVIDER',
    'EMAIL_SMTP_FALLBACK_PROVIDERS',
  ];
  const environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    delete process.env[key];
  }

  try {
    const result = buildSupabaseSmtpConfig({
      senderName: 'Alternun',
      fromEmail: 'noreply@alternun.test',
      tlao: {
        host: 'mail.xn--tlo-fla.com',
        port: 587,
        username: 'smtp-user',
        password: 'smtp-password',
      },
    });

    assert.equal(result.provider, 'tlao');
    assert.equal(result.payload.smtp_host, 'mail.xn--tlo-fla.com');
    assert.equal(result.payload.smtp_port, '587');
    assert.equal(result.payload.smtp_user, 'smtp-user');
    assert.equal(result.payload.smtp_pass, 'smtp-password');
    assert.equal(result.meta.provider, 'tlao');
    assert.equal(result.meta.credentialMode, 'username-password');
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

test('buildSupabaseSmtpConfig uses the canonical no-reply credentials for Tláo', () => {
  const keys = [
    'TLAO_SMTP_HOST',
    'TLAO_SMTP_PORT',
    'TLAO_SMTP_USERNAME',
    'TLAO_SMTP_PASSWORD',
    'ALTERNUN_NO_REPLY_EMAIL',
    'ALTERNUN_NO_REPLY_PASSWORD',
    'EMAIL_FROM',
    'SUPABASE_SMTP_ADMIN_EMAIL',
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USERNAME',
    'SUPABASE_SMTP_PASSWORD',
    'SUPABASE_SMTP_SENDER',
    'EMAIL_SENDER_NAME',
    'SUPABASE_SMTP_SENDER_NAME',
    'SUPABASE_SMTP_MAX_FREQUENCY',
    'EMAIL_SMTP_PROVIDER',
    'EMAIL_SMTP_FALLBACK_PROVIDERS',
  ];
  const environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    delete process.env[key];
  }

  process.env.ALTERNUN_NO_REPLY_EMAIL = 'no-reply@alternun.test';
  process.env.ALTERNUN_NO_REPLY_PASSWORD = '<canonical-password>';

  try {
    const result = buildSupabaseSmtpConfig({
      senderName: 'Alternun',
      tlao: {},
    });

    assert.equal(result.provider, 'tlao');
    assert.equal(result.payload.smtp_host, 'mail.xn--tlo-fla.com');
    assert.equal(result.payload.smtp_port, '587');
    assert.equal(result.payload.smtp_user, 'no-reply@alternun.test');
    assert.equal(result.payload.smtp_pass, '<canonical-password>');
    assert.equal(result.payload.smtp_admin_email, 'no-reply@alternun.test');
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

test('buildSupabaseSmtpConfig accepts dedicated Supabase SMTP credentials for Tláo', () => {
  const keys = [
    'TLAO_SMTP_HOST',
    'TLAO_SMTP_PORT',
    'TLAO_SMTP_USERNAME',
    'TLAO_SMTP_PASSWORD',
    'ALTERNUN_NO_REPLY_EMAIL',
    'ALTERNUN_NO_REPLY_PASSWORD',
    'EMAIL_FROM',
    'SUPABASE_SMTP_ADMIN_EMAIL',
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USERNAME',
    'SUPABASE_SMTP_PASSWORD',
    'SUPABASE_SMTP_SENDER',
    'EMAIL_SENDER_NAME',
    'SUPABASE_SMTP_SENDER_NAME',
    'SUPABASE_SMTP_MAX_FREQUENCY',
    'EMAIL_SMTP_PROVIDER',
    'EMAIL_SMTP_FALLBACK_PROVIDERS',
  ];
  const environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    delete process.env[key];
  }

  process.env.SUPABASE_SMTP_HOST = 'mail.xn--tlo-fla.com';
  process.env.SUPABASE_SMTP_PORT = '587';
  process.env.SUPABASE_SMTP_USERNAME = 'transactional@alternun.test';
  process.env.SUPABASE_SMTP_PASSWORD = '<dedicated-smtp-password>';
  process.env.SUPABASE_SMTP_SENDER = 'transactional@alternun.test';

  try {
    const result = buildSupabaseSmtpConfig({ senderName: 'Alternun', tlao: {} });

    assert.equal(result.provider, 'tlao');
    assert.equal(result.payload.smtp_host, 'mail.xn--tlo-fla.com');
    assert.equal(result.payload.smtp_port, '587');
    assert.equal(result.payload.smtp_user, 'transactional@alternun.test');
    assert.equal(result.payload.smtp_pass, '<dedicated-smtp-password>');
    assert.equal(result.payload.smtp_admin_email, 'transactional@alternun.test');
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
