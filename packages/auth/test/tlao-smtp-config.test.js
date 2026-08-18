import test from 'node:test';
import assert from 'node:assert/strict';
import smtpConfigModule from '../infra/email/scripts/common.cjs';

const { buildSupabaseSmtpConfig } = smtpConfigModule;

test('buildSupabaseSmtpConfig defaults to Tláo Mail with username-password credentials', () => {
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
});
