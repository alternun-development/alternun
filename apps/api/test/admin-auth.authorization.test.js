const assert = require('node:assert/strict');
const { createHmac, createSign, generateKeyPairSync } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const Fastify = require('fastify');

const EXPECTED_ADMIN_ROLES = [
  'platform_owner',
  'internal_admin',
  'partner_operator',
  'partner_readonly',
];
const AUTHENTIK_JWKS_URL = 'https://login.alternun.co/application/o/alternun-admin/jwks/';
const AUTHENTIK_ISSUER = 'https://login.alternun.co/application/o/alternun-admin/';
const AUTHENTIK_JWT_SIGNING_SECRET_ENV = ['AUTHENTIK', 'JWT', 'SIGNING', 'SECRET'].join('_');
const originalFetch = global.fetch;
const originalAdminAuthEnv = {
  ADMIN_AUTH_AUDIENCE: process.env.ADMIN_AUTH_AUDIENCE,
  ADMIN_AUTH_ISSUER: process.env.ADMIN_AUTH_ISSUER,
  ADMIN_AUTH_JWKS_URL: process.env.ADMIN_AUTH_JWKS_URL,
  AUTHENTIK_AUDIENCE: process.env.AUTHENTIK_AUDIENCE,
  AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
  AUTHENTIK_JWKS_URL: process.env.AUTHENTIK_JWKS_URL,
  AUTHENTIK_JWT_SIGNING_KEY: process.env.AUTHENTIK_JWT_SIGNING_KEY,
  AUTH_SESSION_SIGNING_KEY: process.env.AUTH_SESSION_SIGNING_KEY,
};
originalAdminAuthEnv[AUTHENTIK_JWT_SIGNING_SECRET_ENV] =
  process.env[AUTHENTIK_JWT_SIGNING_SECRET_ENV];
const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const rsaJwk = rsaKeyPair.publicKey.export({ format: 'jwk' });

function restoreAdminAuthEnv() {
  for (const [key, value] of Object.entries(originalAdminAuthEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  global.fetch = originalFetch;
}

test.afterEach(() => {
  restoreAdminAuthEnv();
});

function loadAdminAuthContract() {
  try {
    return require('../src/common/admin-auth/admin-auth.guard.ts');
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}

function signAdminToken({
  signingKey = 'test-signing-key',
  issuer = 'https://login.alternun.co/application/o/alternun-admin/',
  audience = 'alternun-app',
  subject = 'partner-user-1',
  roles = ['partner_readonly'],
  organizationIds = ['partner-org-1'],
  tokenUse = 'access',
  expiresInSeconds = 60 * 15,
} = {}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    sub: subject,
    aud: audience,
    email: 'partner@example.com',
    email_verified: true,
    iat: issuedAt,
    nbf: issuedAt,
    exp: issuedAt + expiresInSeconds,
    roles,
    alternun_roles: roles,
    principal_id: subject,
    app_user_id: `${subject}-app-user`,
    token_use: tokenUse,
    organization_ids: organizationIds,
  };

  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url'
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', signingKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function signAuthentikAdminToken({
  audience = ['alternun-app', 'account'],
  issuer = AUTHENTIK_ISSUER,
  kid = 'alternun-admin-rsa',
  organizationIds = ['partner-org-1'],
  roles = ['partner_operator'],
  subject = 'partner-user-1',
  expiresInSeconds = 60 * 15,
  expiresAt,
  includeTokenUse = true,
} = {}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    sub: subject,
    aud: audience,
    email: 'partner@example.com',
    email_verified: true,
    iat: issuedAt,
    nbf: issuedAt,
    exp: expiresAt ?? issuedAt + expiresInSeconds,
    roles,
    alternun_roles: roles,
    ...(includeTokenUse ? { token_use: 'access' } : {}),
    organization_ids: organizationIds,
  };
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString(
    'base64url'
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(rsaKeyPair.privateKey, 'base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function createAdminApi() {
  const adminAuth = loadAdminAuthContract();

  assert.ok(
    adminAuth,
    'Step 2 must provide src/common/admin-auth/admin-auth.guard.ts before admin routes can authorize requests'
  );
  assert.equal(typeof adminAuth.createAdminAuthGuard, 'function');
  assert.equal(typeof adminAuth.createIssuerJwtAdminVerifier, 'function');

  const guard = adminAuth.createAdminAuthGuard({
    expectedIssuer: 'https://login.alternun.co/application/o/alternun-admin/',
    expectedAudience: 'alternun-app',
    verifyAccessToken: adminAuth.createIssuerJwtAdminVerifier('test-signing-key'),
  });

  const app = Fastify();
  const withOrganizationScope = (permission) =>
    guard.requirePermission({
      permission,
      organizationId: (request) => request.params.organizationId,
    });

  app.get(
    '/admin/organizations/:organizationId/allowances',
    { preHandler: withOrganizationScope('allowances:read') },
    async () => ({ data: [] })
  );
  app.delete(
    '/admin/organizations/:organizationId/allowances/:allowanceId',
    { preHandler: withOrganizationScope('allowances:write') },
    async (_request, reply) => reply.code(204).send()
  );

  return app;
}

test('admin guard exposes only the canonical admin roles', () => {
  const adminAuth = loadAdminAuthContract();

  assert.ok(
    adminAuth,
    'Step 2 must provide src/common/admin-auth/admin-auth.guard.ts before admin roles can be enforced'
  );
  assert.deepEqual(adminAuth.ADMIN_ROLES, EXPECTED_ADMIN_ROLES);
});

test('partner_readonly admin receives 403 for an allowance mutation', async () => {
  const app = createAdminApi();

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/organizations/partner-org-1/allowances/allowance-1',
      headers: { authorization: `Bearer ${signAdminToken()}` },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('an authenticated non-admin token is rejected from an admin read route with 403', async () => {
  const app = createAdminApi();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/organizations/partner-org-1/allowances',
      headers: {
        authorization: `Bearer ${signAdminToken({
          subject: 'regular-user-1',
          roles: ['authenticated'],
        })}`,
      },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('a verifier failure and wrong audience are rejected with 401 before an admin route runs', async () => {
  const app = createAdminApi();

  try {
    const invalidSignature = await app.inject({
      method: 'GET',
      url: '/admin/organizations/partner-org-1/allowances',
      headers: {
        authorization: `Bearer ${signAdminToken({ signingKey: 'wrong-signing-key' })}`,
      },
    });
    const wrongAudience = await app.inject({
      method: 'GET',
      url: '/admin/organizations/partner-org-1/allowances',
      headers: {
        authorization: `Bearer ${signAdminToken({ audience: 'mobile-app' })}`,
      },
    });

    assert.equal(invalidSignature.statusCode, 401);
    assert.equal(wrongAudience.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('partner_operator can mutate only resources in its organization', async () => {
  const app = createAdminApi();

  try {
    const allowed = await app.inject({
      method: 'DELETE',
      url: '/admin/organizations/partner-org-1/allowances/allowance-1',
      headers: {
        authorization: `Bearer ${signAdminToken({
          subject: 'partner-operator-1',
          roles: ['partner_operator'],
        })}`,
      },
    });
    const crossOrganization = await app.inject({
      method: 'DELETE',
      url: '/admin/organizations/partner-org-2/allowances/allowance-1',
      headers: {
        authorization: `Bearer ${signAdminToken({
          subject: 'partner-operator-1',
          roles: ['partner_operator'],
        })}`,
      },
    });

    assert.equal(allowed.statusCode, 204);
    assert.equal(crossOrganization.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('platform_owner can cross organization boundaries only with explicit wildcard scope', async () => {
  const app = createAdminApi();

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/organizations/partner-org-9/allowances/allowance-1',
      headers: {
        authorization: `Bearer ${signAdminToken({
          subject: 'platform-owner-1',
          roles: ['platform_owner'],
          organizationIds: ['*'],
        })}`,
      },
    });

    assert.equal(response.statusCode, 204);
  } finally {
    await app.close();
  }
});

test('resolveRuntimeOptions accepts RS256 Authentik tokens through the configured JWKS endpoint', async () => {
  const adminAuth = loadAdminAuthContract();

  assert.ok(adminAuth);
  process.env.ADMIN_AUTH_ISSUER = AUTHENTIK_ISSUER;
  process.env.ADMIN_AUTH_AUDIENCE = 'alternun-app';
  process.env.AUTHENTIK_JWKS_URL = AUTHENTIK_JWKS_URL;
  delete process.env.ADMIN_AUTH_JWKS_URL;
  delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
  delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
  delete process.env.AUTH_SESSION_SIGNING_KEY;

  let fetchCount = 0;
  global.fetch = async (url) => {
    fetchCount += 1;
    assert.equal(url, AUTHENTIK_JWKS_URL);

    return new Response(
      JSON.stringify({
        keys: [
          {
            ...rsaJwk,
            alg: 'RS256',
            kid: 'alternun-admin-rsa',
            use: 'sig',
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  };

  const options = adminAuth.resolveRuntimeOptions();

  assert.ok(options, 'resolveRuntimeOptions should accept AUTHENTIK_JWKS_URL-backed verification');
  const principal = await adminAuth.authenticateAdminPrincipal(
    `Bearer ${signAuthentikAdminToken({ includeTokenUse: false })}`,
    options
  );

  assert.equal(fetchCount, 1);
  assert.deepEqual(principal, {
    iss: AUTHENTIK_ISSUER,
    aud: ['alternun-app', 'account'],
    sub: 'partner-user-1',
    roles: ['partner_operator'],
    organizationIds: ['partner-org-1'],
  });
});

test('an Authentik token that expires exactly now is rejected with 401', async () => {
  const adminAuth = loadAdminAuthContract();
  const originalDateNow = Date.now;
  const nowMilliseconds = 1_780_000_000_000;
  const nowSeconds = Math.floor(nowMilliseconds / 1000);

  try {
    Date.now = () => nowMilliseconds;
    process.env.ADMIN_AUTH_ISSUER = AUTHENTIK_ISSUER;
    process.env.ADMIN_AUTH_AUDIENCE = 'alternun-app';
    process.env.ADMIN_AUTH_JWKS_URL = AUTHENTIK_JWKS_URL;
    delete process.env.AUTHENTIK_JWKS_URL;
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          keys: [
            {
              ...rsaJwk,
              alg: 'RS256',
              kid: 'alternun-admin-rsa',
              use: 'sig',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );

    const options = adminAuth.resolveRuntimeOptions();

    await assert.rejects(
      adminAuth.authenticateAdminPrincipal(
        `Bearer ${signAuthentikAdminToken({ expiresAt: nowSeconds })}`,
        options
      ),
      (error) => error?.getStatus?.() === 401
    );
  } finally {
    Date.now = originalDateNow;
  }
});

test('the production admin module registers guarded allowance routes in AppModule', () => {
  const controllerPath = join(__dirname, '../src/modules/admin/admin-allowances.controller.ts');
  const modulePath = join(__dirname, '../src/modules/admin/admin.module.ts');
  const appModulePath = join(__dirname, '../src/app.module.ts');

  assert.ok(
    existsSync(controllerPath),
    'Step 2 must register an actual admin allowance controller; the test-only Fastify route is not production protection'
  );
  assert.ok(existsSync(modulePath), 'Step 2 must provide an AdminModule for admin routes.');

  const controllerSource = readFileSync(controllerPath, 'utf8');
  const moduleSource = readFileSync(modulePath, 'utf8');
  const appModuleSource = readFileSync(appModulePath, 'utf8');

  assert.match(
    controllerSource,
    /@Controller\(\s*\{\s*path:\s*['"]admin\/organizations\/:organizationId\/allowances['"],\s*version:\s*['"]1['"]\s*\}\s*\)/
  );
  assert.match(controllerSource, /@UseGuards\(\s*AdminAuthGuard\s*\)/);
  assert.match(controllerSource, /@Delete\(\s*['"]:allowanceId['"]\s*\)/);
  assert.match(moduleSource, /controllers:\s*\[\s*AdminAllowancesController\s*\]/);
  assert.match(moduleSource, /providers:\s*\[\s*AdminAuthGuard\s*\]/);
  assert.match(
    appModuleSource,
    /import\s+\{\s*AdminModule\s*\}\s+from ['"].\/modules\/admin\/admin\.module['"]/
  );
  assert.match(appModuleSource, /AdminModule/);
});

test('dedicated admin JWT verification requires an Authentik JWKS configuration', () => {
  const adminAuth = loadAdminAuthContract();

  assert.ok(adminAuth, 'Step 2 must provide the dedicated admin-auth boundary');
  assert.equal(typeof adminAuth.resolveAdminJwtVerificationConfig, 'function');

  const dedicatedConfig = adminAuth.resolveAdminJwtVerificationConfig({
    ADMIN_AUTH_ISSUER: 'https://login.alternun.co/application/o/alternun-admin/',
    ADMIN_AUTH_AUDIENCE: 'alternun-app',
    ADMIN_AUTH_JWKS_URL: 'https://login.alternun.co/application/o/alternun-admin/jwks/',
    AUTHENTIK_ISSUER: 'https://login.alternun.co/application/o/alternun-mobile/',
    AUTHENTIK_CLIENT_ID: 'alternun-mobile',
    AUTHENTIK_JWT_SIGNING_KEY: 'legacy-shared-secret',
  });

  assert.deepEqual(dedicatedConfig, {
    issuer: 'https://login.alternun.co/application/o/alternun-admin/',
    audience: 'alternun-app',
    jwksUrl: 'https://login.alternun.co/application/o/alternun-admin/jwks/',
  });
});

test('dedicated admin JWT verification does not fall back to generic issuer, client, or HMAC configuration', () => {
  const adminAuth = loadAdminAuthContract();

  assert.ok(adminAuth, 'Step 2 must provide the dedicated admin-auth boundary');
  assert.equal(typeof adminAuth.resolveAdminJwtVerificationConfig, 'function');

  assert.equal(
    adminAuth.resolveAdminJwtVerificationConfig({
      AUTHENTIK_ISSUER: 'https://login.alternun.co/application/o/alternun-mobile/',
      AUTHENTIK_CLIENT_ID: 'alternun-mobile',
      AUTHENTIK_JWKS_URL: 'https://login.alternun.co/application/o/alternun-mobile/jwks/',
      AUTHENTIK_JWT_SIGNING_KEY: 'legacy-shared-secret',
      ADMIN_AUTH_AUDIENCE: 'alternun-app',
    }),
    null
  );

  assert.equal(
    adminAuth.resolveAdminJwtVerificationConfig({
      ADMIN_AUTH_ISSUER: 'https://login.alternun.co/application/o/alternun-admin/',
      ADMIN_AUTH_AUDIENCE: 'alternun-app',
      AUTHENTIK_JWT_SIGNING_KEY: 'legacy-shared-secret',
    }),
    null
  );
});

test('legacy admin roles are rejected at the dedicated admin boundary', async () => {
  const app = createAdminApi();

  try {
    for (const legacyRole of [
      'platform_admin',
      'support_admin',
      'read_only_admin',
      'partner_admin',
    ]) {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/organizations/partner-org-1/allowances',
        headers: {
          authorization: `Bearer ${signAdminToken({ roles: [legacyRole] })}`,
        },
      });

      assert.equal(response.statusCode, 403, `${legacyRole} must not grant admin access`);
    }
  } finally {
    await app.close();
  }
});

test('the API example environment exposes a dedicated admin JWKS URL', () => {
  const environmentExample = readFileSync(join(__dirname, '../.env.example'), 'utf8');

  assert.match(environmentExample, /^ADMIN_AUTH_ISSUER=/m);
  assert.match(environmentExample, /^ADMIN_AUTH_AUDIENCE=/m);
  assert.match(environmentExample, /^ADMIN_AUTH_JWKS_URL=/m);
});
