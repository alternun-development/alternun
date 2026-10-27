const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderAirsReportDecisionEmail,
  renderAirsReportReviewRequestEmail,
} = require('../src/modules/marketplace/airs-report-emails.ts');
const {
  createAirsReportWorkflowNotifier,
} = require('../src/modules/marketplace/airs-report-notifier.ts');
const { AirsReportService } = require('../src/modules/marketplace/airs-report.service.ts');

function report(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    status: 'pending_approval',
    recipientEmail: 'guest@example.test',
    recipientName: 'Ada Lovelace',
    amount: 250,
    concept: 'Two nights at the pilot hotel',
    documentNumber: 'INV-1',
    submittedBy: { issuer: 'https://sso.example.test/', subject: 'admin-1' },
    decision: null,
    ...overrides,
  };
}

function decided(outcome, overrides = {}) {
  return report({
    status: outcome === 'rejected' ? 'rejected' : 'released',
    decision: {
      kind: 'manual',
      outcome,
      decidedAt: '2026-10-27T12:00:00.000Z',
      decidedBy: { issuer: 'https://sso.example.test/', subject: 'approver-1' },
      reason: outcome === 'rejected' ? 'Invoice does not match <the> stay' : null,
    },
    ...overrides,
  });
}

const context = (overrides) => ({
  report: report(),
  projectName: 'Eco Turismo',
  appUrl: 'https://airs.example.test',
  ...overrides,
});

function recorder({ failFor = [] } = {}) {
  const sent = [];
  return {
    sent,
    send: async ({ to, email }) => {
      if (failFor.includes(to)) throw new Error('smtp down');
      sent.push({ to, subject: email.subject, text: email.text });
      return { sent: true };
    },
  };
}

const ENV = { AIRS_REPORT_SUPPORT_EMAILS: 'support@example.test,ops@example.test' };
const approvers = async () => ['Approver.One@example.test', 'approver.two@example.test'];
const submitter = async () => 'submitter@example.test';

test('the review request names the report and links to the approvals page, in both languages', () => {
  const email = renderAirsReportReviewRequestEmail(context());

  assert.match(email.subject, /por revisar/);
  assert.match(email.subject, /to review/);
  assert.match(email.text, /Destinatario: guest@example\.test/);
  assert.match(email.text, /Recipient: guest@example\.test/);
  assert.match(email.text, /Revisar en: https:\/\/airs\.example\.test\/airs-reports/);
  assert.match(email.text, /Review at: https:\/\/airs\.example\.test\/airs-reports/);
  assert.match(email.text, /Documento: INV-1/);
});

test('the decision email says approved or rejected and shows the rejection reason escaped', () => {
  const approved = renderAirsReportDecisionEmail(context({ report: decided('approved') }));
  assert.match(approved.subject, /aprobado/);
  assert.match(approved.subject, /approved/);
  assert.doesNotMatch(approved.text, /Motivo del rechazo/);

  const rejected = renderAirsReportDecisionEmail(context({ report: decided('rejected') }));
  assert.match(rejected.subject, /rechazado/);
  assert.match(rejected.text, /Motivo del rechazo: Invoice does not match <the> stay/);
  assert.match(rejected.html, /Invoice does not match &lt;the&gt; stay/);
  assert.doesNotMatch(rejected.html, /<the>/);
});

test('a report over the limits is emailed to the approvers and support, once each', async () => {
  const mail = recorder();
  const notify = createAirsReportWorkflowNotifier({
    send: mail.send,
    env: { AIRS_REPORT_SUPPORT_EMAILS: 'support@example.test,approver.two@example.test' },
    projectName: async () => 'Eco Turismo',
    approverEmails: approvers,
    submitterEmail: submitter,
  });

  const result = await notify(report());

  assert.deepEqual(result, { sent: 3 });
  assert.deepEqual(
    mail.sent.map((entry) => entry.to),
    ['approver.one@example.test', 'approver.two@example.test', 'support@example.test']
  );
});

test('a manual decision is emailed to the submitter and support, not to the approvers', async () => {
  const mail = recorder();
  const notify = createAirsReportWorkflowNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => null,
    approverEmails: approvers,
    submitterEmail: submitter,
  });

  for (const outcome of ['approved', 'rejected']) {
    mail.sent.length = 0;
    assert.deepEqual(await notify(decided(outcome)), { sent: 3 });
    assert.deepEqual(
      mail.sent.map((entry) => entry.to),
      ['submitter@example.test', 'support@example.test', 'ops@example.test']
    );
  }
});

test('automatic approvals and other states send no workflow email', async () => {
  const mail = recorder();
  const notify = createAirsReportWorkflowNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => null,
    approverEmails: approvers,
    submitterEmail: submitter,
  });

  const auto = report({
    status: 'released',
    decision: { kind: 'auto', outcome: 'approved', decidedAt: 'x', decidedBy: null, reason: null },
  });
  for (const value of [
    auto,
    report({ status: 'awaiting_claim' }),
    report({ status: 'cancelled' }),
  ]) {
    assert.deepEqual(await notify(value), { sent: 0 });
  }
  assert.equal(mail.sent.length, 0);
});

test('lookup and send failures never throw and never stop the other emails', async () => {
  const mail = recorder({ failFor: ['support@example.test'] });
  const notify = createAirsReportWorkflowNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => {
      throw new Error('storage down');
    },
    approverEmails: async () => {
      throw new Error('database down');
    },
    submitterEmail: async () => {
      throw new Error('database down');
    },
  });

  assert.deepEqual(await notify(report()), { sent: 1 });
  assert.deepEqual(
    mail.sent.map((entry) => entry.to),
    ['ops@example.test']
  );
  assert.deepEqual(await notify(decided('rejected')), { sent: 1 });
});

test('a submitter that cannot be resolved is skipped but support is still told', async () => {
  const mail = recorder();
  const notify = createAirsReportWorkflowNotifier({
    send: mail.send,
    env: ENV,
    projectName: async () => null,
    submitterEmail: async () => null,
  });

  assert.deepEqual(await notify(decided('rejected')), { sent: 2 });
});

function stubService(repository, workflow, issued = async () => {}) {
  return new AirsReportService(repository, {}, issued, workflow);
}

const principal = { sub: 'admin-1', iss: 'https://sso.example.test/', roles: ['platform_owner'] };

test('the service announces the workflow after submit, approve and reject, never on a replay', async () => {
  const seen = [];
  const live = { report: report(), idempotent: false };
  const replay = { report: report(), idempotent: true };
  const repository = {
    submit: async () => live,
    approve: async () => live,
    reject: async () => live,
  };
  const service = stubService(repository, async (value) => seen.push(value.id));

  await service.submit(principal, 'req-1', report().projectId, {});
  await service.approve(principal, 'req-2', report().id, 'a'.repeat(64));
  await service.reject(principal, 'req-3', report().id, 'Not enough proof');
  assert.deepEqual(seen, [report().id, report().id, report().id]);

  seen.length = 0;
  const replayService = stubService(
    { submit: async () => replay, approve: async () => replay, reject: async () => replay },
    async (value) => seen.push(value.id)
  );
  await replayService.submit(principal, 'req-1', report().projectId, {});
  await replayService.approve(principal, 'req-2', report().id, 'a'.repeat(64));
  await replayService.reject(principal, 'req-3', report().id, 'Not enough proof');
  assert.deepEqual(seen, []);
});

test('a failing workflow email does not change the response', async () => {
  const live = { report: report(), idempotent: false };
  const service = stubService(
    { submit: async () => live, approve: async () => live, reject: async () => live },
    async () => {
      throw new Error('mail exploded');
    }
  );

  assert.equal(await service.reject(principal, 'req-3', report().id, 'Not enough proof'), live);
  assert.equal(await service.submit(principal, 'req-1', report().projectId, {}), live);
});
