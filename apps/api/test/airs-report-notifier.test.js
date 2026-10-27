const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderAirsReportRecipientEmail,
  renderAirsReportSupportEmail,
} = require('../src/modules/marketplace/airs-report-emails.ts');
const {
  createAirsReportNotifier,
  resolveAirsReportAppUrl,
  resolveAirsReportSupportEmails,
} = require('../src/modules/marketplace/airs-report-notifier.ts');
const { AirsReportService } = require('../src/modules/marketplace/airs-report.service.ts');

function report(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    status: 'awaiting_claim',
    recipientEmail: 'guest@example.test',
    recipientName: 'Ada Lovelace',
    amount: 1250,
    concept: 'Two nights at the pilot hotel',
    documentNumber: 'INV-1',
    submittedBy: { issuer: 'https://sso.example.test/', subject: 'admin-1' },
    ...overrides,
  };
}

function context(overrides = {}) {
  return { report: report(), projectName: 'Eco Turismo', appUrl: 'https://airs.example.test', ...overrides };
}

test('the recipient email invites a new person to claim, in Spanish and English', () => {
  const email = renderAirsReportRecipientEmail(context());

  assert.match(email.subject, /1,250 Airs/);
  assert.match(email.subject, /reclamar/);
  assert.match(email.subject, /claim/i);
  assert.match(email.text, /Hola Ada/);
  assert.match(email.text, /Hi Ada/);
  assert.match(email.text, /Reclamar mis Airs: https:\/\/airs\.example\.test\//);
  assert.match(email.text, /Claim my Airs: https:\/\/airs\.example\.test\//);
  assert.match(email.text, /Motivo: Two nights at the pilot hotel/);
  assert.match(email.text, /Proyecto: Eco Turismo/);
  assert.match(email.html, /href="https:\/\/airs\.example\.test\/"/);
});

test('the recipient email for an existing account says the Airs were credited', () => {
  const email = renderAirsReportRecipientEmail(
    context({ report: report({ status: 'released', recipientName: null }) })
  );

  assert.match(email.text, /Se acreditaron 1,250 Airs/);
  assert.match(email.text, /Abrir mi cuenta/);
  assert.doesNotMatch(email.text, /Reclamar/);
  assert.match(email.text, /^Hola:/);
});

test('email content escapes anything the issuer typed', () => {
  const hostile = '<script>alert(1)</script> "x" & \'y\'';
  const recipient = renderAirsReportRecipientEmail(
    context({ report: report({ concept: hostile, recipientName: '<b>Bob</b>' }), projectName: '<i>P</i>' })
  );
  const support = renderAirsReportSupportEmail(
    context({ report: report({ concept: hostile }), projectName: '<i>P</i>' })
  );

  for (const html of [recipient.html, support.html]) {
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<i>P<\/i>/);
    assert.match(html, /&lt;script&gt;/);
  }
  assert.doesNotMatch(recipient.html, /<b>Bob<\/b>/);
});

test('the support email lists who issued what, to whom and in which state', () => {
  const email = renderAirsReportSupportEmail(context());

  assert.match(email.subject, /1,250 Airs a guest@example\.test \(esperando reclamo\)/);
  assert.match(email.text, /Reporte: 11111111-1111-4111-8111-111111111111/);
  assert.match(email.text, /Documento: INV-1/);
  assert.match(email.text, /Proyecto: Eco Turismo/);
  assert.match(email.text, /Emitido por: https:\/\/sso\.example\.test\/ \/ admin-1/);
  assert.match(
    renderAirsReportSupportEmail(context({ report: report({ status: 'released' }) })).subject,
    /\(acreditado\)/
  );
});

test('support addresses come from configuration, lowercased, deduplicated and validated', () => {
  assert.deepEqual(resolveAirsReportSupportEmails({}), []);
  assert.deepEqual(
    resolveAirsReportSupportEmails({
      AIRS_REPORT_SUPPORT_EMAILS: ' Support@Example.test, support@example.test,not-an-email,,ops@example.test ',
    }),
    ['support@example.test', 'ops@example.test']
  );
});

test('the app link follows the deployment and falls back to production', () => {
  assert.equal(resolveAirsReportAppUrl({}), 'https://airs.alternun.co');
  assert.equal(
    resolveAirsReportAppUrl({ AIRS_DASHBOARD_URL: 'https://testnet.airs.example.test///' }),
    'https://testnet.airs.example.test'
  );
  assert.equal(
    resolveAirsReportAppUrl({ EXPO_PUBLIC_ORIGIN: 'https://origin.example.test/' }),
    'https://origin.example.test'
  );
});

function recorder({ failFor = [] } = {}) {
  const sent = [];
  return {
    sent,
    send: async ({ to, email }) => {
      if (failFor.includes(to)) throw new Error('smtp down');
      sent.push({ to, subject: email.subject });
      return { sent: true };
    },
  };
}

const ENV = { AIRS_REPORT_SUPPORT_EMAILS: 'support@example.test,ops@example.test' };

test('issuing Airs emails the recipient and every support mailbox', async () => {
  const mail = recorder();
  const notify = createAirsReportNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => 'Eco Turismo',
  });

  for (const status of ['awaiting_claim', 'released']) {
    mail.sent.length = 0;
    const result = await notify(report({ status }));
    assert.deepEqual(result, { recipientSent: true, supportSent: 2 });
    assert.deepEqual(
      mail.sent.map((entry) => entry.to),
      ['guest@example.test', 'support@example.test', 'ops@example.test']
    );
  }
});

test('reports that are not issued yet send nothing', async () => {
  const mail = recorder();
  const notify = createAirsReportNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => null,
  });

  for (const status of ['pending_approval', 'approved', 'rejected', 'cancelled', 'reversed']) {
    assert.deepEqual(await notify(report({ status })), { recipientSent: false, supportSent: 0 });
  }
  assert.equal(mail.sent.length, 0);
});

test('without configured support mailboxes only the recipient is emailed', async () => {
  const mail = recorder();
  const notify = createAirsReportNotifier({ send: mail.send, env: {}, projectName: async () => null });

  assert.deepEqual(await notify(report()), { recipientSent: true, supportSent: 0 });
  assert.deepEqual(mail.sent.map((entry) => entry.to), ['guest@example.test']);
});

test('a failed email never throws and never stops the others', async () => {
  const mail = recorder({ failFor: ['guest@example.test', 'support@example.test'] });
  const notify = createAirsReportNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => {
      throw new Error('storage down');
    },
  });

  const result = await notify(report());

  assert.deepEqual(result, { recipientSent: false, supportSent: 1 });
  assert.deepEqual(mail.sent.map((entry) => entry.to), ['ops@example.test']);
  assert.match(mail.sent[0].subject, /Seguimiento de Airs/);
});

function stubService(response, notify) {
  const repository = {
    submit: async () => response,
    approve: async () => response,
  };
  return new AirsReportService(repository, {}, notify);
}

const principal = { sub: 'admin-1', iss: 'https://sso.example.test/', roles: ['platform_owner'] };

test('the service announces a new issuance after submit and after approve', async () => {
  const announced = [];
  const service = stubService(
    { report: report(), idempotent: false, autoApproval: { approved: true } },
    async (value) => announced.push(value.id)
  );

  await service.submit(principal, 'req-1', report().projectId, {});
  await service.approve(principal, 'req-2', report().id, 'a'.repeat(64));

  assert.deepEqual(announced, [report().id, report().id]);
});

test('the service never announces an idempotent replay', async () => {
  const announced = [];
  const service = stubService(
    { report: report(), idempotent: true },
    async (value) => announced.push(value.id)
  );

  await service.submit(principal, 'req-1', report().projectId, {});
  await service.approve(principal, 'req-2', report().id, 'a'.repeat(64));

  assert.deepEqual(announced, []);
});

test('a failing announcement does not change the response', async () => {
  const response = { report: report(), idempotent: false, autoApproval: { approved: true } };
  const service = stubService(response, async () => {
    throw new Error('mail exploded');
  });

  assert.equal(await service.submit(principal, 'req-1', report().projectId, {}), response);
  assert.equal(await service.approve(principal, 'req-2', report().id, 'a'.repeat(64)), response);
});
