import test from 'node:test';
import assert from 'node:assert/strict';
import statusReport from '../infra/email/scripts/03-status-report.cjs';

test('recognizes a configured Tláo SMTP host in status reports', () => {
  assert.equal(
    statusReport.inferProviderFromHost('smtp.tlao.example', {
      tlao: { smtpHost: 'smtp.tlao.example' },
    }),
    'tlao'
  );
});
