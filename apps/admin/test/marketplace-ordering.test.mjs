import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let moveId;
let hasMarketplacePermission;

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ moveId } = await viteServer.ssrLoadModule('/src/marketplace/ordering.ts'));
  ({ hasMarketplacePermission } = await viteServer.ssrLoadModule(
    '/src/marketplace/permissions.ts'
  ));
});

after(async () => {
  await viteServer?.close();
});

void test('moving an item swaps it with its neighbour and keeps every id once', () => {
  assert.deepEqual(moveId(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 5, 1), ['a', 'b', 'c']);
});

void test('only global admins see the ordering controls', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(hasMarketplacePermission([role], 'enterprises:reorder'), true, role);
    assert.equal(hasMarketplacePermission([role], 'projects:reorder'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(hasMarketplacePermission([role], 'enterprises:reorder'), false, role);
    assert.equal(hasMarketplacePermission([role], 'projects:reorder'), false, role);
  }
});

void test('saving an order sends the full id list to the order endpoint', async () => {
  const { saveMarketplaceOrder } = await viteServer.ssrLoadModule('/src/marketplace/ordering.ts');
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify([{ id: 'b' }, { id: 'a' }]), { status: 200 });
  };
  try {
    const result = await saveMarketplaceOrder('projects', ['b', 'a']);
    assert.deepEqual(result, [{ id: 'b' }, { id: 'a' }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(calls[0].url, /\/v1\/admin\/projects\/order$/);
  assert.equal(calls[0].init.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[0].init.body), { ids: ['b', 'a'] });
});
