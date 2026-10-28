import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROLES = [
  'platform_owner',
  'internal_admin',
  'moderator',
  'partner_operator',
  'sub_admin',
  'partner_readonly',
];

const CLIENT_PERMISSIONS = [
  'enterprises:create',
  'enterprises:update',
  'enterprises:status',
  'enterprises:reorder',
  'projects:create',
  'projects:update',
  'projects:publish',
  'projects:pause',
  'projects:archive',
  'projects:reorder',
  'project_media:write',
  'project_media:moderate',
  'activities:write',
  'activities:publish',
  'completions:award',
  'completions:reject',
  'completions:reverse',
  'comments:read',
  'comments:moderate',
  'participants:read',
  'participants:manage',
  'audit:read',
  'project_memberships:assign',
  'project_memberships:revoke',
];

let viteServer;
let client;
let server;
let marketplaceCopy;
let marketplaceErrorMessage;
let MarketplaceRequestError;
let completionActionAvailability;

const principal = (role) => ({
  iss: 'issuer',
  aud: 'admin',
  sub: role,
  roles: [role],
  organizationIds: [],
});

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  client = await viteServer.ssrLoadModule('/src/marketplace/permissions.ts');
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  ({ MarketplaceRequestError } = await viteServer.ssrLoadModule('/src/marketplace/api.ts'));
  ({ completionActionAvailability } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/approval-inbox.tsx'
  ));
  const apiGuard = fileURLToPath(
    new URL('../../api/src/common/admin-auth/admin-auth.guard.ts', import.meta.url)
  );
  server = await viteServer.ssrLoadModule(`/@fs/${apiGuard.replace(/\\/g, '/')}`);
});

after(async () => {
  await viteServer?.close();
});

void test('client permission matrix matches the API matrix for every role', () => {
  for (const role of ROLES) {
    for (const permission of CLIENT_PERMISSIONS) {
      assert.equal(
        client.hasMarketplacePermission([role], permission),
        server.hasPermission(principal(role), permission),
        `${role} / ${permission}`
      );
    }
  }
});

void test('global moderator cannot approve, reject, reverse, or pause activities', () => {
  assert.deepEqual(completionActionAvailability(['moderator']), {
    approve: false,
    reject: false,
    reverse: false,
  });
  assert.equal(completionActionAvailability(['partner_operator']).approve, true);
  // The activity editor enables publish and pause only with activities:publish.
  assert.equal(client.hasMarketplacePermission(['moderator'], 'activities:publish'), false);
  assert.equal(client.hasMarketplacePermission(['moderator'], 'activities:write'), false);
  assert.match(marketplaceCopy.permissions.award, /project administrator/);
});

void test('only global admins and partner operators see logo and cover controls', () => {
  for (const role of ROLES) {
    assert.equal(
      client.canChangeBrandMedia([role]),
      ['platform_owner', 'internal_admin', 'partner_operator'].includes(role),
      role
    );
  }
  assert.deepEqual([...client.brandMediaKinds].sort(), ['cover', 'logo']);
  assert.equal(
    marketplaceErrorMessage(new MarketplaceRequestError(403, 'BRAND_ASSET_WRITE_DENIED')),
    marketplaceCopy.errors.BRAND_ASSET_WRITE_DENIED
  );
  assert.match(marketplaceCopy.mediaEditor.brandRestricted, /logo and cover/);
});
