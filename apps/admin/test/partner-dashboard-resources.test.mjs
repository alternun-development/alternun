import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let viteServer;
let resolveAdminAccessProfile;

before(async () => {
  viteServer = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true },
  });

  ({ resolveAdminAccessProfile } = await viteServer.ssrLoadModule('/src/auth/oidc-client.ts'));
});

after(async () => {
  await viteServer?.close();
});

void test('partner readonly access exposes no internal admin resource links', () => {
  const partnerAccess = resolveAdminAccessProfile(['partner_readonly'], ['partner-organization']);
  const internalAccess = resolveAdminAccessProfile(['internal_admin']);

  assert.ok(partnerAccess);
  assert.equal(partnerAccess.surface, 'partner');
  assert.deepEqual(partnerAccess.organizationIds, ['partner-organization']);

  for (const internalOnlyResource of ['users', 'wallets', 'audit']) {
    assert.equal(
      partnerAccess.allowedResources.includes(internalOnlyResource),
      false,
      `${internalOnlyResource} must not be available for partner navigation or routes`
    );
  }

  assert.ok(internalAccess);
  assert.equal(internalAccess.surface, 'internal');

  for (const internalOnlyResource of ['users', 'wallets', 'audit']) {
    assert.equal(
      internalAccess.allowedResources.includes(internalOnlyResource),
      true,
      `${internalOnlyResource} must remain available to internal administrators`
    );
  }
});
