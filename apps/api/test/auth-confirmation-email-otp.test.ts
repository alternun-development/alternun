/* eslint-disable */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';

test('verification email shows the 6-digit code and no link when no URL is given', async () => {
  const secrets = require('@aws-sdk/client-secrets-manager');
  const nodemailer = require('nodemailer');
  const originalSend = secrets.SecretsManagerClient.prototype.send;
  const originalCreateTransport = nodemailer.createTransport;
  secrets.SecretsManagerClient.prototype.send = async () => ({
    SecretString: JSON.stringify({
      host: 'smtp.example.com',
      port: 587,
      username: 'user',
      password: 'pass',
      from: 'transactional@alternun.co',
    }),
  });
  const sent: Array<Record<string, string>> = [];
  nodemailer.createTransport = () => ({
    sendMail: async (message: Record<string, string>) => {
      sent.push(message);
    },
  });

  try {
    const { sendAuthVerificationEmail } = await import(
      '../src/modules/auth-exchange/auth-confirmation.email'
    );
    await sendAuthVerificationEmail(
      { to: 'new@example.com', token: '482913', locale: 'es' },
      { AIRS_SMTP_SECRET_ARN: 'alternun/test/smtp' }
    );

    assert.equal(sent.length, 1);
    const [message] = sent;
    assert.match(message.html, /482913/);
    assert.match(message.html, /Código de verificación/);
    assert.doesNotMatch(message.html, /<a href=/);
    assert.match(message.text, /482913/);
    assert.doesNotMatch(message.text, /Confirmar mi cuenta/);
    assert.doesNotMatch(message.html + message.text, /AIRS/);
  } finally {
    secrets.SecretsManagerClient.prototype.send = originalSend;
    nodemailer.createTransport = originalCreateTransport;
  }
});
