const assert = require('node:assert/strict');
const test = require('node:test');

const { hasPermission } = require('../src/common/admin-auth/admin-auth.guard.ts');
const {
  AdminNotificationRepository,
} = require('../src/modules/marketplace/admin-notification.repository.ts');
const {
  AdminNotificationService,
  adminNotificationEventFor,
} = require('../src/modules/marketplace/admin-notification.service.ts');
const { AirsReportService } = require('../src/modules/marketplace/airs-report.service.ts');

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';

function report(overrides = {}) {
  return {
    id: REPORT_ID,
    projectId: PROJECT_ID,
    status: 'released',
    recipientEmail: 'guest@example.test',
    amount: 50,
    concept: 'Two nights at the pilot hotel',
    submittedBy: { issuer: 'https://sso.example.test/', subject: 'admin-1' },
    decision: { kind: 'auto', outcome: 'approved', reason: null },
    ...overrides,
  };
}

const manual = (outcome, reason = null) => ({ kind: 'manual', outcome, reason });

// ── Events ───────────────────────────────────────────────────────────────────────────────

test('each report state maps to the notice the console shows', () => {
  assert.equal(
    adminNotificationEventFor(report({ status: 'pending_approval', decision: null })),
    'report_needs_review'
  );
  assert.equal(adminNotificationEventFor(report()), 'report_submitted');
  assert.equal(
    adminNotificationEventFor(report({ decision: manual('approved') })),
    'report_approved'
  );
  assert.equal(
    adminNotificationEventFor(
      report({ status: 'rejected', decision: manual('rejected', 'No match') })
    ),
    'report_rejected'
  );
  assert.equal(adminNotificationEventFor(report({ status: 'cancelled', decision: null })), null);
});

test('every admin role can read its own inbox', () => {
  for (const role of [
    'partner_readonly',
    'sub_admin',
    'partner_operator',
    'moderator',
    'internal_admin',
    'platform_owner',
  ]) {
    assert.equal(hasPermission({ roles: [role] }, 'notifications:read'), true, role);
  }
  assert.equal(hasPermission({ roles: ['stranger'] }, 'notifications:read'), false);
});

// ── Repository with a recording client ────────────────────────────────────────────────────

function fakeClient({ insertError, tables = {} } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const call = { table, filters: [], action: 'select', payload: null };
      calls.push(call);
      const builder = {
        insert: (payload) => {
          call.action = 'insert';
          call.payload = payload;
          return Promise.resolve({ error: insertError ?? null });
        },
        update: (payload) => ((call.action = 'update'), (call.payload = payload), builder),
        select: (_columns, options) => {
          call.options = options;
          return builder;
        },
        eq: (column, value) => (call.filters.push(['eq', column, value]), builder),
        is: (column, value) => (call.filters.push(['is', column, value]), builder),
        in: (column, value) => (call.filters.push(['in', column, value]), builder),
        order: () => builder,
        limit: () => builder,
        then: (resolve) => {
          const key = call.filters.find((entry) => entry[1] === 'recipient_issuer')
            ? 'identity'
            : 'email';
          const rows = tables[key] ?? [];
          return resolve({ data: rows, count: rows.length, error: null });
        },
      };
      return builder;
    },
  };
  return client;
}

const viewer = {
  issuer: 'https://sso.example.test/',
  subject: 'admin-1',
  email: 'approver@example.test',
};

test('a repeated notification is ignored but any other database error is reported', async () => {
  const drafts = [
    {
      eventType: 'report_submitted',
      reportId: REPORT_ID,
      projectId: PROJECT_ID,
      payload: {},
      recipientEmail: 'a@example.test',
    },
    {
      eventType: 'report_submitted',
      reportId: REPORT_ID,
      projectId: PROJECT_ID,
      payload: {},
      recipientEmail: 'b@example.test',
    },
  ];
  const duplicate = new AdminNotificationRepository(fakeClient({ insertError: { code: '23505' } }));
  assert.equal(await duplicate.insertMany(drafts), 0);

  const broken = new AdminNotificationRepository(fakeClient({ insertError: { code: '08006' } }));
  await assert.rejects(broken.insertMany(drafts));

  const fine = new AdminNotificationRepository(fakeClient());
  assert.equal(await fine.insertMany(drafts), 2);
});

test('the inbox reads by identity and by email, merged newest first', async () => {
  const client = fakeClient({
    tables: {
      identity: [
        {
          id: 'a',
          event_type: 'report_approved',
          created_at: '2026-10-27T10:00:00Z',
          payload: { amount: 1 },
        },
      ],
      email: [
        {
          id: 'b',
          event_type: 'report_needs_review',
          created_at: '2026-10-27T12:00:00Z',
          payload: {},
        },
      ],
    },
  });
  const list = await new AdminNotificationRepository(client).list(viewer);

  assert.deepEqual(
    list.map((item) => item.id),
    ['b', 'a']
  );
  assert.deepEqual(client.calls[0].filters, [
    ['eq', 'recipient_issuer', viewer.issuer],
    ['eq', 'recipient_subject', viewer.subject],
  ]);
  assert.deepEqual(client.calls[1].filters, [['eq', 'recipient_email', viewer.email]]);
});

test('marking read touches only the viewer rows that are still unread', async () => {
  const client = fakeClient({
    tables: { identity: [{ id: 'a' }], email: [{ id: 'b' }, { id: 'c' }] },
  });
  const ids = ['33333333-3333-4333-8333-333333333333'];

  const updated = await new AdminNotificationRepository(client).markRead(viewer, ids);

  assert.equal(updated, 3);
  for (const call of client.calls) {
    assert.equal(call.action, 'update');
    assert.ok(
      call.filters.some((entry) => entry[0] === 'is' && entry[1] === 'read_at' && entry[2] === null)
    );
    assert.deepEqual(
      call.filters.find((entry) => entry[0] === 'in'),
      ['in', 'id', ids]
    );
  }
  assert.equal(
    client.calls.some((call) => call.filters.some((entry) => entry[2] === 'someone-else')),
    false
  );
});

// ── Service ───────────────────────────────────────────────────────────────────────────────

const principal = (overrides = {}) => ({
  iss: viewer.issuer,
  sub: viewer.subject,
  email: 'Approver@Example.test',
  emailVerified: true,
  roles: ['sub_admin'],
  ...overrides,
});

test('the viewer email counts only when the token vouches for it', async () => {
  const seen = [];
  const service = new AdminNotificationService({
    list: async (value) => (seen.push(value), []),
    unreadCount: async () => 0,
    markRead: async (value, ids) => (seen.push([value, ids]), 0),
  });

  await service.list(principal());
  await service.list(principal({ emailVerified: false }));
  await service.list(principal({ email: undefined }));
  await service.markRead(principal(), []);

  assert.equal(seen[0].email, 'approver@example.test');
  assert.equal(seen[1].email, null);
  assert.equal(seen[2].email, null);
  assert.equal(seen[3][1], null);
});

test('recording de-duplicates emails, skips bad ones and never throws', async () => {
  const stored = [];
  const service = new AdminNotificationService({
    insertMany: async (drafts) => (stored.push(...drafts), drafts.length),
  });

  const count = await service.recordReportEvent(report(), 'report_needs_review', {
    emails: [
      'Approver@example.test',
      'approver@example.test',
      'not-an-email',
      ' ops@example.test ',
    ],
    identities: [
      { issuer: 'https://sso.example.test/', subject: 'admin-1' },
      { issuer: '', subject: 'x' },
    ],
  });

  assert.equal(count, 3);
  assert.deepEqual(
    stored.map((draft) => draft.recipientEmail ?? draft.recipientSubject),
    ['approver@example.test', 'ops@example.test', 'admin-1']
  );
  assert.equal(stored[0].payload.amount, 50);

  const empty = new AdminNotificationService({
    insertMany: async () => assert.fail('nothing to store'),
  });
  assert.equal(
    await empty.recordReportEvent(report(), 'report_submitted', { emails: [], identities: [] }),
    0
  );

  const failing = new AdminNotificationService({
    insertMany: async () => {
      throw new Error('database down');
    },
  });
  assert.equal(
    await failing.recordReportEvent(report(), 'report_submitted', {
      emails: ['a@example.test'],
      identities: [],
    }),
    0
  );
});

// ── The report service leaves a notice next to each email ─────────────────────────────────

function reportService(response, { inbox, approvers = ['approver@example.test'] } = {}) {
  const repository = {
    submit: async () => response,
    approve: async () => response,
    reject: async () => response,
    listApproverEmails: async () => approvers,
  };
  return new AirsReportService(
    repository,
    {},
    async () => {},
    async () => {},
    inbox
  );
}

function recorder() {
  const calls = [];
  return {
    calls,
    recordReportEvent: async (value, event, audience, extra) => {
      calls.push({ id: value.id, event, audience, extra });
      return 1;
    },
  };
}

const actor = { iss: 'i', sub: 's', roles: ['platform_owner'] };

test('a report waiting for review notifies the approvers and support; an automatic one only support', async () => {
  process.env.AIRS_REPORT_SUPPORT_EMAILS = 'support@example.test';
  try {
    const waiting = recorder();
    await reportService(
      { report: report({ status: 'pending_approval', decision: null }), idempotent: false },
      { inbox: waiting }
    ).submit(actor, 'r', PROJECT_ID, {});
    assert.equal(waiting.calls[0].event, 'report_needs_review');
    assert.deepEqual(waiting.calls[0].audience.emails, [
      'support@example.test',
      'approver@example.test',
    ]);
    assert.deepEqual(waiting.calls[0].audience.identities, []);

    const auto = recorder();
    await reportService({ report: report(), idempotent: false }, { inbox: auto }).submit(
      actor,
      'r',
      PROJECT_ID,
      {}
    );
    assert.equal(auto.calls[0].event, 'report_submitted');
    assert.deepEqual(auto.calls[0].audience.emails, ['support@example.test']);
  } finally {
    delete process.env.AIRS_REPORT_SUPPORT_EMAILS;
  }
});

test('a decision notifies whoever submitted the report, with the rejection reason', async () => {
  const inbox = recorder();
  const rejected = report({ status: 'rejected', decision: manual('rejected', 'No match') });
  await reportService({ report: rejected, idempotent: false }, { inbox }).reject(
    actor,
    'r',
    REPORT_ID,
    'No match'
  );
  assert.equal(inbox.calls[0].event, 'report_rejected');
  assert.deepEqual(inbox.calls[0].audience.identities, [rejected.submittedBy]);
  assert.deepEqual(inbox.calls[0].extra, { reason: 'No match' });

  const approved = recorder();
  await reportService(
    { report: report({ decision: manual('approved') }), idempotent: false },
    { inbox: approved }
  ).approve(actor, 'r', REPORT_ID, 'a'.repeat(64));
  assert.equal(approved.calls[0].event, 'report_approved');
});

test('a replay leaves no second notice, and a failing inbox never changes the response', async () => {
  const inbox = recorder();
  await reportService({ report: report(), idempotent: true }, { inbox }).submit(
    actor,
    'r',
    PROJECT_ID,
    {}
  );
  assert.equal(inbox.calls.length, 0);

  const response = { report: report(), idempotent: false };
  const broken = reportService(response, {
    inbox: {
      recordReportEvent: async () => {
        throw new Error('inbox down');
      },
    },
  });
  assert.equal(await broken.submit(actor, 'r', PROJECT_ID, {}), response);
});
