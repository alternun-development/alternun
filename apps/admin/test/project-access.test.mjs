import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let access;
let permissions;

const projects = [
  { id: 'p-1', enterpriseIds: ['e-1'], slug: 'eco-turismo', title: 'Eco Turismo' },
  { id: 'p-2', enterpriseIds: ['e-2'], slug: 'golf-club', title: 'Golf Club' },
  { id: 'p-3', enterpriseIds: ['e-3', 'e-4'], slug: 'a-cafe', title: 'A Cafe' },
];

const member = (overrides) => ({
  id: `m-${Math.random()}`,
  projectId: null,
  enterpriseId: 'e-1',
  scopeType: 'project',
  role: 'sub_admin',
  status: 'active',
  memberEmail: 'ada@example.test',
  ...overrides,
});

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy } = await viteServer.ssrLoadModule('/src/marketplace/copy.ts'));
  access = await viteServer.ssrLoadModule('/src/marketplace/project-access.ts');
  permissions = await viteServer.ssrLoadModule('/src/marketplace/permissions.ts');
});

after(async () => {
  await viteServer?.close();
});

test('people are grouped by role for each project, from project and enterprise memberships', () => {
  const rows = access.buildAccessRows(
    projects,
    [
      member({ projectId: 'p-1', role: 'partner_operator', memberEmail: 'admin@example.test' }),
      member({ projectId: 'p-1', role: 'sub_admin', memberEmail: 'mod@example.test' }),
      member({ projectId: 'p-1', role: 'sub_admin', memberEmail: 'mod@example.test' }),
      member({
        scopeType: 'enterprise',
        enterpriseId: 'e-2',
        role: 'partner_operator',
        memberEmail: 'owner@example.test',
      }),
      member({ projectId: 'p-1', role: 'partner_readonly', memberEmail: 'viewer@example.test' }),
    ],
    []
  );
  const eco = rows.find((row) => row.projectId === 'p-1');
  assert.deepEqual(eco.admins, ['admin@example.test']);
  assert.deepEqual(eco.moderators, ['mod@example.test']);
  assert.deepEqual(eco.readOnly, ['viewer@example.test']);
  assert.deepEqual(rows.find((row) => row.projectId === 'p-2').admins, ['owner@example.test']);
});

test('enterprise admins of a non-primary related enterprise count for the project', () => {
  const rows = access.buildAccessRows(
    projects,
    [
      member({
        scopeType: 'enterprise',
        enterpriseId: 'e-4',
        role: 'partner_operator',
        memberEmail: 'partner@example.test',
      }),
    ],
    []
  );
  assert.deepEqual(rows.find((row) => row.projectId === 'p-3').admins, ['partner@example.test']);
  assert.deepEqual(rows.find((row) => row.projectId === 'p-1').admins, []);
});

test('revoked memberships and other projects never show', () => {
  const rows = access.buildAccessRows(
    projects,
    [
      member({
        projectId: 'p-1',
        role: 'partner_operator',
        status: 'revoked',
        memberEmail: 'gone@example.test',
      }),
      member({ projectId: 'p-2', role: 'partner_operator', memberEmail: 'other@example.test' }),
    ],
    []
  );
  assert.deepEqual(rows.find((row) => row.projectId === 'p-1').admins, []);
  assert.deepEqual(rows.find((row) => row.projectId === 'p-2').admins, ['other@example.test']);
});

test('a person who has not signed in is named without an id, and gaps sort first', () => {
  const rows = access.buildAccessRows(
    projects,
    [member({ projectId: 'p-3', role: 'partner_operator', memberEmail: null })],
    [{ projectId: 'p-1', slug: 'eco-turismo', missingAccount: true, missingAdmin: true }]
  );
  assert.equal(rows[0].projectId, 'p-1');
  assert.equal(rows[0].missingAdmin, true);
  assert.equal(rows[0].missingAccount, true);
  assert.deepEqual(rows.find((row) => row.projectId === 'p-3').admins, [
    marketplaceCopy.projectAccess.unknownPerson,
  ]);
  assert.equal(access.countGaps(rows), 1);
  assert.equal(access.countGaps([]), 0);
  assert.equal(
    marketplaceCopy.projectAccess.gapsSummary(0),
    'Every project has an admin and an account.'
  );
});

test('only Super Admins see the access screen', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'project_access:read'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'project_access:read'), false, role);
  }
});
