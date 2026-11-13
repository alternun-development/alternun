/* eslint-disable */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';

test('verification email refuses the retired SMTP provider instead of losing the code', async () => {
  const secrets = require('@aws-sdk/client-secrets-manager');
  const originalSend = secrets.SecretsManagerClient.prototype.send;
  secrets.SecretsManagerClient.prototype.send = async () => ({
    SecretString: JSON.stringify({
      host: 'smtp.postmarkapp.com',
      port: 587,
      username: 'user',
      password: 'pass',
      from: 'transactional@alternun.co',
    }),
  });
  const errorLog = console.error;
  console.error = () => undefined;

  try {
    const { sendAuthVerificationEmail } = await import(
      '../src/modules/auth-exchange/auth-confirmation.email'
    );
    await assert.rejects(
      sendAuthVerificationEmail(
        { to: 'new@example.com', confirmationUrl: 'https://example.com/verify', token: '123456' },
        { AIRS_SMTP_SECRET_ARN: 'alternun/test/smtp' }
      ),
      /retired provider/
    );
  } finally {
    secrets.SecretsManagerClient.prototype.send = originalSend;
    console.error = errorLog;
  }
});
