import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createServer } from 'vite';

const adminDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionBoundaryFile = path.join(
  adminDirectory,
  'src/server/admin-session-boundary.ts'
);

void test('the admin BFF session boundary keeps session material server-side and enforces CSRF', async () => {
  assert.ok(
    fs.existsSync(sessionBoundaryFile),
    'Expected a same-origin BFF session module at apps/admin/src/server/admin-session-boundary.ts'
  );

  const sessionBoundarySource = fs.readFileSync(sessionBoundaryFile, 'utf8');
  assert.doesNotMatch(
    sessionBoundarySource,
    /\b(localStorage|sessionStorage|window)\b/,
    'The BFF session boundary must never expose session material to browser storage'
  );
  assert.doesNotMatch(
    sessionBoundarySource,
    /\bpassword\b/i,
    'The BFF login entry must redirect to Authentik and must not process password payloads'
  );

  const viteServer = await createServer({
    root: adminDirectory,
    logLevel: 'silent',
    server: { middlewareMode: true },
  });

  try {
    const sessionBoundary = await viteServer.ssrLoadModule('/src/server/admin-session-boundary.ts');

    assert.equal(typeof sessionBoundary.createAdminSessionCookie, 'function');
    assert.equal(typeof sessionBoundary.assertAdminMutationCsrf, 'function');
    assert.equal(typeof sessionBoundary.createAdminLoginRedirect, 'function');
    assert.equal(typeof sessionBoundary.ADMIN_SESSION_COOKIE_NAME, 'string');
    assert.equal(typeof sessionBoundary.ADMIN_CSRF_COOKIE_NAME, 'string');

    const sessionCookie = sessionBoundary.createAdminSessionCookie('opaque-server-session-id');
    assert.equal(sessionCookie.name, sessionBoundary.ADMIN_SESSION_COOKIE_NAME);
    assert.equal(sessionCookie.value, 'opaque-server-session-id');
    assert.equal(sessionCookie.options.httpOnly, true);
    assert.equal(sessionCookie.options.secure, true);
    assert.ok(
      ['lax', 'strict'].includes(sessionCookie.options.sameSite),
      'The session cookie must set SameSite to lax or strict'
    );
    assert.equal(sessionCookie.options.path, '/');

    assert.doesNotThrow(() =>
      sessionBoundary.assertAdminMutationCsrf({
        method: 'GET',
        cookies: {},
        headers: {},
      })
    );
    assert.doesNotThrow(() =>
      sessionBoundary.assertAdminMutationCsrf({
        method: 'PATCH',
        cookies: { [sessionBoundary.ADMIN_CSRF_COOKIE_NAME]: 'csrf-secret' },
        headers: { 'x-csrf-token': 'csrf-secret' },
      })
    );
    assert.throws(
      () =>
        sessionBoundary.assertAdminMutationCsrf({
          method: 'DELETE',
          cookies: { [sessionBoundary.ADMIN_CSRF_COOKIE_NAME]: 'csrf-secret' },
          headers: {},
        }),
      /csrf/i
    );
    assert.throws(
      () =>
        sessionBoundary.assertAdminMutationCsrf({
          method: 'POST',
          cookies: { [sessionBoundary.ADMIN_CSRF_COOKIE_NAME]: 'csrf-secret' },
          headers: { 'x-csrf-token': 'different-secret' },
        }),
      /csrf/i
    );

    const loginRedirect = sessionBoundary.createAdminLoginRedirect({
      loginEntryUrl: 'https://login.alternun.co',
      returnTo: 'https://admin.alternun.co/allowances',
    });
    const loginUrl = new URL(loginRedirect);
    assert.equal(loginUrl.origin, 'https://login.alternun.co');
    assert.equal(loginUrl.searchParams.get('next'), 'https://admin.alternun.co/allowances');
  } finally {
    await viteServer.close();
  }
});
