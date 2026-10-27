import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let marketplaceErrorMessage;
let reports;
let AirsReportEditor;
let AirsReportHistoryView;
let AirsReportQueuePage;
let resolveAdminAccessProfile;

const project = {
  id: 'project-1',
  enterpriseId: 'enterprise-1',
  slug: 'hotel-project',
  status: 'published',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'en',
  content: {
    en: {
      title: 'Forest Hotel',
      location: 'Colombia',
      theme: 'Regeneration',
      description: 'A stay connected to the forest.',
      waysToContribute: ['Join an activity'],
    },
  },
};

const validForm = {
  recipientEmail: 'guest@example.test',
  recipientName: '',
  amount: '50',
  concept: 'Two nights at the pilot hotel',
  documentNumber: 'INV-1',
};

const noAccount = { email: 'guest@example.test', hasAccount: false, displayName: null };
const hasAccount = { email: 'guest@example.test', hasAccount: true, displayName: 'Ada L.' };

const totals = {
  timeZone: 'America/Bogota',
  day: '2026-10-26',
  month: '2026-10',
  dailyTotal: 60,
  monthlyTotal: 60,
  dailyLimit: 100,
  monthlyLimit: 300,
};

function submitResponse(status, overrides = {}) {
  return {
    report: { id: 'report-1', status, amount: 60 },
    idempotent: false,
    autoApproval: { approved: status !== 'pending_approval', blockedReason: null, totals },
    ...overrides,
  };
}

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  reports = await viteServer.ssrLoadModule('/src/marketplace/airs-reports.ts');
  ({ AirsReportEditor } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/airs-report-editor.tsx'
  ));
  ({ AirsReportHistoryView } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/airs-report-history.tsx'
  ));
  ({ AirsReportQueuePage } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/airs-report-queue-page.tsx'
  ));
  ({ resolveAdminAccessProfile } = await viteServer.ssrLoadModule('/src/auth/oidc-client.ts'));
});

after(async () => {
  await viteServer?.close();
});

test('a complete report passes the form checks', () => {
  assert.deepEqual(reports.validateAirsReportForm(validForm, null), {});
  assert.deepEqual(reports.validateAirsReportForm(validForm, hasAccount), {});
  assert.deepEqual(
    reports.validateAirsReportForm({ ...validForm, recipientName: 'Ada' }, noAccount),
    {}
  );
});

test('every required field has its own friendly message', () => {
  const errors = reports.validateAirsReportForm(
    { recipientEmail: 'nope', recipientName: '', amount: '', concept: '', documentNumber: '  ' },
    null
  );

  assert.deepEqual(Object.keys(errors).sort(), [
    'amount',
    'concept',
    'documentNumber',
    'recipientEmail',
  ]);
  assert.equal(errors.documentNumber, marketplaceCopy.airsReports.errors.documentRequired);
  for (const message of Object.values(errors))
    assert.doesNotMatch(message, /AIRS_REPORT|undefined/);
});

test('the guest name is required only when the email has no account', () => {
  assert.equal(
    reports.validateAirsReportForm(validForm, noAccount).recipientName,
    marketplaceCopy.airsReports.errors.nameRequired
  );
  assert.equal(reports.validateAirsReportForm(validForm, hasAccount).recipientName, undefined);
  // Before the email is checked the server still decides.
  assert.equal(reports.validateAirsReportForm(validForm, null).recipientName, undefined);
  assert.equal(
    reports.validateAirsReportForm({ ...validForm, recipientName: 'x'.repeat(121) }, null)
      .recipientName,
    marketplaceCopy.airsReports.errors.nameLong
  );
});

test('the Airs amount is a whole number from 1 to the storage limit', () => {
  for (const [value, expected] of [
    ['1', 1],
    [' 12 ', 12],
    ['2147483647', 2147483647],
    ['0', null],
    ['-5', null],
    ['1.5', null],
    ['1e3', null],
    ['abc', null],
    ['', null],
    ['2147483648', null],
  ]) {
    assert.equal(reports.parseAirsReportAmount(value), expected, JSON.stringify(value));
  }
});

test('the reason keeps to 10 to 500 characters and the document number to 80', () => {
  const check = (patch) => reports.validateAirsReportForm({ ...validForm, ...patch }, null);

  assert.ok(check({ concept: 'x'.repeat(9) }).concept);
  assert.equal(check({ concept: 'x'.repeat(10) }).concept, undefined);
  assert.equal(check({ concept: 'x'.repeat(500) }).concept, undefined);
  assert.ok(check({ concept: 'x'.repeat(501) }).concept);
  assert.equal(check({ documentNumber: 'd'.repeat(80) }).documentNumber, undefined);
  assert.ok(check({ documentNumber: 'd'.repeat(81) }).documentNumber);
});

test('the request body is normalized and carries a key for safe retries', () => {
  const body = reports.buildSubmitAirsReportBody(
    {
      recipientEmail: '  Guest@Example.TEST ',
      recipientName: ' Ada Lovelace ',
      amount: ' 75 ',
      concept: '  Two nights at the pilot hotel  ',
      documentNumber: ' INV-9 ',
    },
    noAccount,
    'test-request-key'
  );

  assert.deepEqual(body, {
    recipientEmail: 'guest@example.test',
    recipientName: 'Ada Lovelace',
    amount: 75,
    concept: 'Two nights at the pilot hotel',
    documentNumber: 'INV-9',
    requestKey: 'test-request-key',
  });
  // An existing account keeps its own name.
  assert.equal(
    'recipientName' in
      reports.buildSubmitAirsReportBody(
        { ...validForm, recipientName: 'Typed name' },
        hasAccount,
        'test-request-key'
      ),
    false
  );
});

test('each form submission gets its own key', () => {
  const first = reports.newAirsReportRequestKey();
  const second = reports.newAirsReportRequestKey();

  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(first, second);
});

test('paths are encoded so an email cannot change the request', () => {
  assert.equal(reports.airsReportsPath('project-1'), '/v1/admin/projects/project-1/airs-reports');
  assert.equal(
    reports.airsReportRecipientPath('project-1', ' ada+test@example.com '),
    '/v1/admin/projects/project-1/airs-reports/recipient?email=ada%2Btest%40example.com'
  );
  assert.equal(
    reports.airsReportRecipientPath('project-1', 'a@b.co&x=1'),
    '/v1/admin/projects/project-1/airs-reports/recipient?email=a%40b.co%26x%3D1'
  );
  assert.equal(reports.airsReportDetailPath('r-1'), '/v1/admin/airs-reports/r-1');
  assert.equal(
    reports.airsReportActionPath('r-1', 'approve'),
    '/v1/admin/airs-reports/r-1/approve'
  );
  assert.equal(reports.airsReportActionPath('r-1', 'reject'), '/v1/admin/airs-reports/r-1/reject');
});

test('only the roles the API allows see the report form', () => {
  for (const role of ['platform_owner', 'internal_admin', 'partner_operator', 'sub_admin']) {
    assert.equal(reports.canSubmitAirsReport([role]), true, role);
  }
  for (const role of ['partner_readonly', 'moderator']) {
    assert.equal(reports.canSubmitAirsReport([role]), false, role);
  }
  assert.equal(reports.canSubmitAirsReport([]), false);
});

test('the approvals queue is offered to global admins only', () => {
  assert.equal(reports.canOpenAirsReportQueue(['platform_owner']), true);
  assert.equal(reports.canOpenAirsReportQueue(['internal_admin']), true);
  for (const role of ['partner_operator', 'sub_admin', 'moderator', 'partner_readonly']) {
    assert.equal(reports.canOpenAirsReportQueue([role]), false, role);
  }
});

test('the approvals section is in the menu of internal admins and nobody else', () => {
  const resource = 'marketplace-airs-reports';
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.ok(resolveAdminAccessProfile([role]).allowedResources.includes(resource), role);
  }
  for (const role of ['partner_operator', 'sub_admin', 'moderator', 'partner_readonly']) {
    assert.equal(
      resolveAdminAccessProfile([role]).allowedResources.includes(resource),
      false,
      role
    );
  }
});

test('the result tells the person what happened to the Airs', () => {
  assert.equal(reports.airsReportOutcome(submitResponse('released')), 'credited');
  assert.equal(reports.airsReportOutcome(submitResponse('awaiting_claim')), 'waiting_claim');
  assert.equal(reports.airsReportOutcome(submitResponse('pending_approval')), 'in_review');
});

test('a report that waits for review says why', () => {
  const reason = (autoApproval) =>
    reports.airsReportReviewReason(submitResponse('pending_approval', { autoApproval }));
  const copy = marketplaceCopy.airsReports.outcome;

  assert.equal(reason({ approved: false, blockedReason: 'SELF_REPORT', totals }), copy.reviewSelf);
  assert.equal(
    reason({ approved: false, blockedReason: 'SUBMITTER_EMAIL_UNVERIFIED', totals }),
    copy.reviewUnverified
  );
  assert.equal(
    reason({ approved: false, blockedReason: null, totals: { ...totals, dailyTotal: 101 } }),
    copy.reviewDaily(100)
  );
  assert.equal(
    reason({ approved: false, blockedReason: null, totals: { ...totals, monthlyTotal: 301 } }),
    copy.reviewMonthly(300)
  );
  assert.equal(reason({ approved: false, blockedReason: null, totals }), copy.reviewGeneric);
});

test('rejecting needs a reason that is not too long', () => {
  assert.equal(
    reports.airsReportRejectReasonError(''),
    marketplaceCopy.airsReports.queue.reasonRequired
  );
  assert.equal(
    reports.airsReportRejectReasonError('   '),
    marketplaceCopy.airsReports.queue.reasonRequired
  );
  assert.equal(
    reports.airsReportRejectReasonError('x'.repeat(501)),
    marketplaceCopy.airsReports.queue.reasonLong
  );
  assert.equal(reports.airsReportRejectReasonError('Wrong amount'), null);
});

test('every report error code from the API shows a sentence, never a raw code', () => {
  const codes = [
    'AIRS_REPORT_INPUT_INVALID',
    'AIRS_REPORT_NOT_FOUND',
    'AIRS_REPORT_TRANSITION_INVALID',
    'AIRS_REPORT_SELF_APPROVAL_DENIED',
    'AIRS_REPORT_APPROVER_NOT_ALLOWED',
    'AIRS_REPORT_SNAPSHOT_MISMATCH',
    'AIRS_REPORT_RECIPIENT_NAME_REQUIRED',
    'AIRS_REPORT_REASON_REQUIRED',
    'AIRS_REPORT_MEDAL_UNAVAILABLE',
    'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED',
    'AIRS_REPORT_LOOKUP_RATE_LIMITED',
  ];
  const seen = new Set();
  for (const code of codes) {
    const message = marketplaceErrorMessage({ code });
    assert.notEqual(message, marketplaceCopy.errors.generic, code);
    assert.doesNotMatch(message, /AIRS_REPORT|_/, code);
    seen.add(message);
  }
  assert.equal(seen.size, codes.length);
  assert.match(
    marketplaceErrorMessage({ code: 'AIRS_REPORT_SELF_APPROVAL_DENIED' }),
    /can't approve/
  );
});

test('the project report form renders for roles that can report and says why for others', () => {
  const html = renderToString(createElement(AirsReportEditor, { project, roles: ['sub_admin'] }));
  const copy = marketplaceCopy.airsReports;

  assert.match(html, new RegExp(copy.heading));
  assert.match(html, new RegExp(copy.form.email));
  assert.match(html, new RegExp(copy.form.documentNumber));
  assert.match(html, new RegExp(copy.form.review));
  // The medal field is visible; it stays disabled until the project has medals to pick.
  assert.match(html, /<select[^>]*disabled/);
  assert.match(html, new RegExp(copy.form.medalEmpty));

  const denied = renderToString(
    createElement(AirsReportEditor, { project, roles: ['partner_readonly'] })
  );
  assert.match(denied, new RegExp(copy.permission.replace(/'/g, "&#x27;|'")));
  assert.doesNotMatch(denied, new RegExp(copy.form.review));
});

test('the approvals page renders its loading state without a session', () => {
  const html = renderToString(createElement(AirsReportQueuePage));

  assert.match(html, new RegExp(marketplaceCopy.common.loading));
});

test('the summary counts what is credited and what waits, and leaves out closed reports', () => {
  const summary = reports.summarizeAirsReports([
    { status: 'released', amount: 50 },
    { status: 'released', amount: 25 },
    { status: 'pending_approval', amount: 300 },
    { status: 'awaiting_claim', amount: 40 },
    { status: 'auto_approved', amount: 5 },
    { status: 'rejected', amount: 999 },
    { status: 'cancelled', amount: 999 },
    { status: 'reversed', amount: 999 },
  ]);

  assert.deepEqual(summary, {
    credited: 2,
    creditedAirs: 75,
    waitingApproval: 1,
    waitingClaim: 1,
    totalAirs: 420,
  });
  assert.deepEqual(reports.summarizeAirsReports([]), {
    credited: 0,
    creditedAirs: 0,
    waitingApproval: 0,
    waitingClaim: 0,
    totalAirs: 0,
  });
});

test('timeline actions read as sentences, with a fallback and a note when denied', () => {
  const history = marketplaceCopy.airsReports.history;
  assert.equal(
    reports.describeTimelineAction({ action: 'airs_report.released', result: 'allowed' }),
    history.actions['airs_report.released']
  );
  assert.equal(
    reports.describeTimelineAction({ action: 'airs_report.approve_denied', result: 'denied' }),
    `Approve denied (${history.denied})`
  );
  assert.equal(
    reports.describeTimelineAction({ action: 'airs_report.submitted', result: 'denied' }),
    `${history.actions['airs_report.submitted']} (${history.denied})`
  );
});

test('the history shows the timeline and what each reward is waiting for', () => {
  const history = marketplaceCopy.airsReports.history;
  const detail = {
    report: { id: 'r-1' },
    recipientTotals: {},
    timeline: [
      {
        action: 'airs_report.submitted',
        result: 'allowed',
        reasonCode: null,
        occurredAt: '2026-10-27T12:00:00Z',
      },
      {
        action: 'airs_report.claimed',
        result: 'allowed',
        reasonCode: null,
        occurredAt: '2026-10-27T13:00:00Z',
      },
    ],
    rewards: [
      { kind: 'submitter', amount: 5, status: 'locked', creditedAt: null },
      { kind: 'project', amount: 5, status: 'credited', creditedAt: '2026-10-27T13:30:00Z' },
    ],
  };
  const html = renderToString(createElement(AirsReportHistoryView, { detail }));

  assert.match(html, new RegExp(history.actions['airs_report.submitted']));
  assert.match(html, new RegExp(history.actions['airs_report.claimed']));
  assert.match(html, new RegExp(history.rewardKind.submitter));
  assert.match(html, new RegExp(history.rewardStatus.locked));
  assert.match(html, new RegExp(history.rewardStatus.credited));

  const empty = renderToString(
    createElement(AirsReportHistoryView, { detail: { report: { id: 'r-2' }, recipientTotals: {} } })
  );
  assert.match(empty, new RegExp(history.empty));
  assert.ok(empty.includes(history.rewardsEmpty));
});
