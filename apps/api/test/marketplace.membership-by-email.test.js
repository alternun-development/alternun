const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');

const {
  createAuthentikGroupSync,
  resolveAuthentikApiBase,
} = require('../src/modules/marketplace/authentik-group-sync.ts');
const {
  MarketplaceMembershipService,
} = require('../src/modules/marketplace/marketplace-membership.service.ts');
const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const { memberKey } = require('../src/modules/marketplace/marketplace-membership.repository.ts');

const ENTERPRISE_ID = '10000000-0000-4000-8000-000000000001';
const PROJECT_ID = '20000000-0000-4000-8000-000000000001';

// Generated per run, so no credential-looking literal lives in the repository.
const BEARER = randomUUID();

const CONFIG = {
  AUTHENTIK_API_URL: 'https://sso.example.test',
  AUTHENTIK_API_TOKEN: BEARER,
};

function fakeAuthentik({ users, groups, failPost = false } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const respond = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
    if (url.includes('/core/users/')) return respond({ results: users ?? [] });
    if (url.includes('/core/groups/?')) return respond({ results: groups ?? [] });
    if (init.method === 'POST')
      return failPost ? respond({}, false, 500) : respond(null, true, 204);
    return respond({}, false, 404);
  };
  return { calls, fetch };
}

const ada = { pk: 7, email: 'Ada@Example.test', is_active: true };
const operatorGroup = { pk: 'aaaa-bbbb', name: 'Alternun Partner Operator' };

test('the API base needs https (or local http) and no credentials in the URL', () => {
  assert.equal(resolveAuthentikApiBase({}), null);
  assert.equal(
    resolveAuthentikApiBase({ AUTHENTIK_API_URL: 'https://sso.example.test/' }),
    'https://sso.example.test/api/v3'
  );
  assert.equal(
    resolveAuthentikApiBase({ AUTHENTIK_API_URL: 'https://sso.example.test/api/v3/' }),
    'https://sso.example.test/api/v3'
  );
  assert.equal(
    resolveAuthentikApiBase({ AUTHENTIK_API_URL: 'http://localhost:9000' }),
    'http://localhost:9000/api/v3'
  );
  for (const unsafe of [
    'http://sso.example.test',
    'https://user:pass@sso.example.test',
    'https://sso.example.test/?x=1',
    'not a url',
  ]) {
    assert.equal(resolveAuthentikApiBase({ AUTHENTIK_API_URL: unsafe }), null, unsafe);
  }
});

test('without configuration the group sync does nothing', async () => {
  const authentik = fakeAuthentik();
  const noUrl = createAuthentikGroupSync({
    env: { AUTHENTIK_API_TOKEN: 'x' },
    fetch: authentik.fetch,
  });
  const noToken = createAuthentikGroupSync({
    env: { AUTHENTIK_API_URL: CONFIG.AUTHENTIK_API_URL },
    fetch: authentik.fetch,
  });

  assert.equal(await noUrl.add('ada@example.test', 'partner_operator'), 'skipped');
  assert.equal(await noToken.remove('ada@example.test', 'partner_operator'), 'skipped');
  assert.equal(authentik.calls.length, 0);
});

test('adding finds the person and the role group, then adds exactly that person', async () => {
  const authentik = fakeAuthentik({ users: [ada], groups: [operatorGroup] });
  const sync = createAuthentikGroupSync({ env: CONFIG, fetch: authentik.fetch });

  assert.equal(await sync.add(' ADA@example.test ', 'partner_operator'), 'added');

  assert.equal(authentik.calls.length, 3);
  assert.match(authentik.calls[0].url, /\/api\/v3\/core\/users\/\?email=ada%40example\.test&/);
  assert.match(authentik.calls[1].url, /\/core\/groups\/\?name=Alternun%20Partner%20Operator&/);
  assert.equal(
    authentik.calls[2].url,
    'https://sso.example.test/api/v3/core/groups/aaaa-bbbb/add_user/'
  );
  assert.equal(authentik.calls[2].method, 'POST');
  assert.deepEqual(JSON.parse(authentik.calls[2].body), { pk: 7 });
  assert.equal(authentik.calls[2].headers.Authorization, `Bearer ${BEARER}`);
});

test('removing uses the remove endpoint and every role maps to its own group', async () => {
  const authentik = fakeAuthentik({
    users: [ada],
    groups: [
      { pk: 'g-1', name: 'Alternun Sub Admin' },
      { pk: 'g-2', name: 'Alternun Partner Read Only' },
    ],
  });
  const sync = createAuthentikGroupSync({ env: CONFIG, fetch: authentik.fetch });

  assert.equal(await sync.remove('ada@example.test', 'sub_admin'), 'removed');
  assert.match(authentik.calls.at(-1).url, /\/core\/groups\/g-1\/remove_user\/$/);
  assert.equal(await sync.remove('ada@example.test', 'partner_readonly'), 'removed');
  assert.match(authentik.calls.at(-1).url, /\/core\/groups\/g-2\/remove_user\/$/);
});

test('a person with no Authentik account, or a look-alike email, is skipped without any change', async () => {
  const missing = fakeAuthentik({ users: [], groups: [operatorGroup] });
  assert.equal(
    await createAuthentikGroupSync({ env: CONFIG, fetch: missing.fetch }).add(
      'ada@example.test',
      'partner_operator'
    ),
    'skipped'
  );
  assert.ok(missing.calls.every((call) => call.method === 'GET'));

  const lookalike = fakeAuthentik({
    users: [
      { pk: 9, email: 'ada@example.test.evil', is_active: true },
      { pk: 10, email: 'ada@example.test', is_active: false },
    ],
    groups: [operatorGroup],
  });
  assert.equal(
    await createAuthentikGroupSync({ env: CONFIG, fetch: lookalike.fetch }).add(
      'ada@example.test',
      'partner_operator'
    ),
    'skipped'
  );
  assert.ok(lookalike.calls.every((call) => call.method === 'GET'));
});

test('a missing group, a rejected change or a network error is reported as failed, never thrown', async () => {
  const noGroup = fakeAuthentik({ users: [ada], groups: [] });
  assert.equal(
    await createAuthentikGroupSync({ env: CONFIG, fetch: noGroup.fetch }).add(
      'ada@example.test',
      'partner_operator'
    ),
    'failed'
  );

  const rejected = fakeAuthentik({ users: [ada], groups: [operatorGroup], failPost: true });
  assert.equal(
    await createAuthentikGroupSync({ env: CONFIG, fetch: rejected.fetch }).add(
      'ada@example.test',
      'partner_operator'
    ),
    'failed'
  );

  const down = createAuthentikGroupSync({
    env: CONFIG,
    fetch: async () => {
      throw new Error('connect ECONNREFUSED');
    },
  });
  assert.equal(await down.add('ada@example.test', 'partner_operator'), 'failed');
});

// ─── Service ────────────────────────────────────────────────────────────────

const enterprise = { id: ENTERPRISE_ID };
const project = { id: PROJECT_ID, enterpriseId: ENTERPRISE_ID };
const adaUser = {
  id: 'user-ada',
  issuer: 'issuer',
  subject: 'ada-subject',
  email: 'ada@example.test',
};

function membership(overrides = {}) {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    member: { issuer: adaUser.issuer, subject: adaUser.subject },
    memberUserId: adaUser.id,
    enterpriseId: ENTERPRISE_ID,
    projectId: PROJECT_ID,
    scopeType: 'project',
    role: 'sub_admin',
    status: 'active',
    grantedBy: { issuer: 'issuer', subject: 'owner-subject' },
    createdAt: 'now',
    updatedAt: 'now',
    revokedAt: null,
    ...overrides,
  };
}

function principal(role, subject = `${role}-subject`) {
  return { iss: 'issuer', aud: 'admin', sub: subject, roles: [role], organizationIds: ['*'] };
}

function build({ user = adaUser, others = 0, current = membership(), sync } = {}) {
  const calls = { lookups: [], grants: [], changes: [], sync: [], counts: [] };
  const repository = {
    findVerifiedUserByEmail: async (email) => {
      calls.lookups.push(email);
      return user;
    },
    emailsForMembers: async (members) =>
      new Map(
        members.map((member) => [memberKey(member.issuer, member.subject), 'ada@example.test'])
      ),
    countActiveWithRole: async (...args) => {
      calls.counts.push(args);
      return others;
    },
    list: async () => [membership()],
    find: async () => current,
    grant: async (input) => {
      calls.grants.push(input);
      return membership({
        role: input.role,
        member: { issuer: input.memberIssuer, subject: input.memberSubject },
      });
    },
    change: async (id, role, status) => {
      calls.changes.push([id, role, status]);
      return membership({ role, status });
    },
  };
  const admin = {
    audit: async () => undefined,
    actorHasScope: async () => true,
    listActorMemberships: async () => [],
    findEnterprise: async () => enterprise,
    findProject: async () => project,
  };
  const groupSync = sync ?? {
    add: async (...args) => {
      calls.sync.push(['add', ...args]);
      return 'added';
    },
    remove: async (...args) => {
      calls.sync.push(['remove', ...args]);
      return 'removed';
    },
  };
  return { service: new MarketplaceMembershipService(repository, admin, groupSync), calls };
}

const input = (role = 'partner_operator') => ({
  email: 'Ada@Example.test',
  enterpriseId: ENTERPRISE_ID,
  projectId: PROJECT_ID,
  scopeType: 'project',
  role,
});

function code(expected) {
  return (error) => error instanceof MarketplaceApiError && error.code === expected;
}

test('a Super Admin assigns a Project Admin by email and the group follows', async () => {
  const { service, calls } = build();

  const result = await service.grantByEmail(principal('platform_owner'), 'req-1', input());

  assert.equal(calls.lookups[0], 'Ada@Example.test');
  assert.deepEqual(calls.grants[0], {
    memberIssuer: 'issuer',
    memberSubject: 'ada-subject',
    memberUserId: 'user-ada',
    enterpriseId: ENTERPRISE_ID,
    projectId: PROJECT_ID,
    scopeType: 'project',
    role: 'partner_operator',
  });
  assert.equal(result.groupSync, 'added');
  assert.equal(result.membership.memberEmail, 'ada@example.test');
  assert.deepEqual(calls.sync, [['add', 'ada@example.test', 'partner_operator']]);
});

test('a Project Admin assigns a moderator but cannot assign another Project Admin', async () => {
  const allowed = build();
  const result = await allowed.service.grantByEmail(
    principal('partner_operator'),
    'req-1',
    input('sub_admin')
  );
  assert.equal(result.membership.role, 'sub_admin');

  const denied = build();
  await assert.rejects(
    denied.service.grantByEmail(principal('partner_operator'), 'req-2', input('partner_operator')),
    code('ROLE_ESCALATION_DENIED')
  );
  assert.equal(denied.calls.grants.length, 0);
  assert.equal(denied.calls.sync.length, 0);
});

test('callers without the permission learn nothing about the email', async () => {
  const { service, calls } = build();

  await assert.rejects(
    service.grantByEmail(principal('partner_readonly'), 'req-1', input('sub_admin')),
    code('PERMISSION_DENIED')
  );
  assert.equal(calls.lookups.length, 0);
});

test('an email without a verified account is refused with a clear code', async () => {
  const { service, calls } = build({ user: null });

  await assert.rejects(
    service.grantByEmail(principal('platform_owner'), 'req-1', input()),
    (error) => code('MEMBERSHIP_USER_NOT_FOUND')(error) && error.getStatus() === 422
  );
  assert.equal(calls.grants.length, 0);
});

test('nobody can assign themselves by email', async () => {
  const { service, calls } = build({
    user: { ...adaUser, issuer: 'issuer', subject: 'platform_owner-subject' },
  });

  await assert.rejects(
    service.grantByEmail(principal('platform_owner'), 'req-1', input()),
    code('SELF_MEMBERSHIP_CHANGE_DENIED')
  );
  assert.equal(calls.grants.length, 0);
});

test('a failing or missing group sync never undoes the membership', async () => {
  const failing = build({ sync: { add: async () => 'failed', remove: async () => 'failed' } });
  assert.equal(
    (await failing.service.grantByEmail(principal('platform_owner'), 'req-1', input())).groupSync,
    'failed'
  );

  const throwing = build({
    sync: {
      add: async () => {
        throw new Error('boom');
      },
      remove: async () => 'removed',
    },
  });
  const result = await throwing.service.grantByEmail(principal('platform_owner'), 'req-1', input());
  assert.equal(result.groupSync, 'failed');
  assert.equal(throwing.calls.grants.length, 1);

  const unconfigured = new MarketplaceMembershipService(
    { findVerifiedUserByEmail: async () => adaUser, grant: async () => membership() },
    {
      audit: async () => undefined,
      actorHasScope: async () => true,
      findProject: async () => project,
    },
    undefined
  );
  assert.equal(
    (await unconfigured.grantByEmail(principal('platform_owner'), 'req-1', input())).groupSync,
    'skipped'
  );
});

test('revoking removes the group only when no other membership holds that role', async () => {
  const last = build({ others: 0 });
  await last.service.revoke(
    principal('platform_owner'),
    'req-1',
    membership().id,
    'Left the project'
  );
  assert.deepEqual(last.calls.sync, [['remove', 'ada@example.test', 'sub_admin']]);

  const shared = build({ others: 1 });
  await shared.service.revoke(
    principal('platform_owner'),
    'req-2',
    membership().id,
    'Left the project'
  );
  assert.deepEqual(shared.calls.sync, []);
});

test('changing a role adds the new group and removes the old one when it is no longer held', async () => {
  const { service, calls } = build({ others: 0, current: membership({ role: 'sub_admin' }) });

  await service.change(principal('platform_owner'), 'req-1', membership().id, {
    role: 'partner_readonly',
  });

  assert.deepEqual(calls.sync, [
    ['add', 'ada@example.test', 'partner_readonly'],
    ['remove', 'ada@example.test', 'sub_admin'],
  ]);
});

test('lists show the verified email of each member', async () => {
  const { service } = build();

  const [entry] = await service.list(principal('platform_owner'), 'req-1', {
    projectId: PROJECT_ID,
  });

  assert.equal(entry.memberEmail, 'ada@example.test');
});

test('an email grant uses the panel issuer, not the one stored with the account', async () => {
  const { service, calls } = build({ user: { ...adaUser, issuer: 'mobile-app-issuer' } });

  await service.grantByEmail(principal('platform_owner'), 'req-1', input());

  assert.equal(calls.grants[0].memberIssuer, 'issuer');
  assert.equal(calls.grants[0].memberSubject, 'ada-subject');
});

test('reactivating a revoked membership with the same role restores the group', async () => {
  const { service, calls } = build({ current: membership({ status: 'revoked' }) });

  await service.change(principal('platform_owner'), 'req-1', membership().id, {
    status: 'active',
  });

  assert.deepEqual(calls.sync, [['add', 'ada@example.test', 'sub_admin']]);
});

// ─── Repository ─────────────────────────────────────────────────────────────

const {
  MarketplaceMembershipRepository,
} = require('../src/modules/marketplace/marketplace-membership.repository.ts');

function fakeUsersClient(data) {
  const calls = [];
  const query = {
    select: (columns) => (calls.push(['select', columns]), query),
    eq: (...args) => (calls.push(['eq', ...args]), query),
    ilike: (...args) => (calls.push(['ilike', ...args]), query),
    limit: async () => ({ data, error: null }),
    or: async (filter) => (calls.push(['or', filter]), { data, error: null }),
  };
  return { calls, client: { from: () => query } };
}

const AUTHENTIK_UUID = 'c0ffee00-0000-4000-8000-000000000001';
const webhookRow = {
  id: 'user-ada',
  iss: 'https://sso.example.test/application/o/alternun-mobile/',
  sub: '9a8b7c6d-0000-5000-a000-000000000000',
  email: 'Ada@Example.test',
  email_verified: true,
  raw_claims: { uuid: AUTHENTIK_UUID, sub: AUTHENTIK_UUID },
};

test('a webhook-synced account resolves to its Authentik UUID, not the hashed principal', async () => {
  const { client } = fakeUsersClient([webhookRow]);
  const repository = new MarketplaceMembershipRepository(client);

  const user = await repository.findVerifiedUserByEmail('ada@example.test');

  assert.equal(user.subject, AUTHENTIK_UUID);
  assert.equal(user.email, 'ada@example.test');
});

test('member emails are found by Authentik UUID and keyed by the membership identity', async () => {
  const { client, calls } = fakeUsersClient([webhookRow]);
  const repository = new MarketplaceMembershipRepository(client);
  const member = { issuer: 'panel-issuer', subject: AUTHENTIK_UUID };

  const emails = await repository.emailsForMembers([
    member,
    { issuer: 'panel-issuer', subject: 'bad,subject)' },
  ]);

  assert.equal(emails.get(memberKey(member.issuer, member.subject)), 'ada@example.test');
  assert.equal(emails.size, 1);
  assert.deepEqual(
    calls.find(([kind]) => kind === 'or'),
    ['or', `sub.in.(${AUTHENTIK_UUID}),raw_claims->>uuid.in.(${AUTHENTIK_UUID})`]
  );
});
