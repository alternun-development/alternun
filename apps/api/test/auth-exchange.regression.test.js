require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');
const { ValidationPipe } = require('@nestjs/common');

const {
  AuthExchangeRequestDto,
} = require('../src/modules/auth-exchange/dto/auth-exchange-request.dto.ts');

function createExternalIdentity() {
  return {
    provider: 'google',
    providerUserId: 'google-123',
    email: 'ada@example.com',
    emailVerified: true,
    displayName: 'Ada Lovelace',
    avatarUrl: 'https://example.com/avatar.png',
    rawClaims: { sub: 'google-123' },
  };
}

test('the API DTO accepts the backend exchange request built by AuthentikIssuerProvider', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
    process.env.AUTHENTIK_CLIENT_ID = 'alternun-mobile';
    process.env.AUTHENTIK_REDIRECT_URI = 'https://testnet.airs.alternun.co/auth/callback';
    process.env.AUTH_EXCHANGE_URL = 'https://testnet.api.alternun.co/auth/exchange';

    const externalIdentity = createExternalIdentity();
    const input = {
      externalIdentity,
      executionSession: {
        provider: 'better-auth',
        accessToken: 'execution-token',
        refreshToken: 'execution-refresh',
        idToken: 'execution-id',
        expiresAt: 1_730_000_000,
        externalIdentity,
        linkedAccounts: [],
        raw: {},
      },
      claims: externalIdentity.rawClaims,
      redirectTo: 'https://testnet.airs.alternun.co/dashboard',
      context: {
        trigger: 'oauth-callback',
        runtime: 'web',
        app: 'mobile',
      },
    };
    // Mirrors AuthentikIssuerProvider.buildBackendExchangeRequest. Importing the provider here
    // would load the package's browser-facing dependency graph instead of isolating API validation.
    const body = {
      externalIdentity: input.externalIdentity,
      executionSession: {
        provider: input.executionSession.provider,
        accessToken: input.executionSession.accessToken,
        refreshToken: input.executionSession.refreshToken,
        idToken: input.executionSession.idToken,
        expiresAt: input.executionSession.expiresAt,
        linkedAccounts: input.executionSession.linkedAccounts,
      },
      context: {
        ...input.context,
        authExchangeUrl: process.env.AUTH_EXCHANGE_URL,
      },
      claims: input.claims,
      redirectTo: input.redirectTo,
    };
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const validationResult = await validationPipe
      .transform(body, {
        type: 'body',
        metatype: AuthExchangeRequestDto,
      })
      .then(
        () => ({ accepted: true }),
        (error) => ({
          accepted: false,
          status: typeof error?.getStatus === 'function' ? error.getStatus() : null,
          response: typeof error?.getResponse === 'function' ? error.getResponse() : null,
        })
      );

    assert.equal(
      validationResult.accepted,
      true,
      `The request produced by AuthentikIssuerProvider was rejected: ${JSON.stringify(
        validationResult
      )}`
    );
  } finally {
    process.env = originalEnv;
  }
});

test('the API DTO rejects properties outside the legacy exchange field list', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
    process.env.AUTHENTIK_CLIENT_ID = 'alternun-mobile';
    process.env.AUTHENTIK_REDIRECT_URI = 'https://testnet.airs.alternun.co/auth/callback';
    process.env.AUTH_EXCHANGE_URL = 'https://testnet.api.alternun.co/auth/exchange';

    const body = {
      externalIdentity: createExternalIdentity(),
      executionSession: {
        provider: 'better-auth',
        accessToken: 'execution-token',
        refreshToken: 'execution-refresh',
        idToken: 'execution-id',
        expiresAt: 1_730_000_000,
        linkedAccounts: [],
      },
      context: {
        trigger: 'oauth-callback',
        runtime: 'web',
        app: 'mobile',
        authExchangeUrl: process.env.AUTH_EXCHANGE_URL,
      },
      claims: { sub: 'google-123' },
      redirectTo: 'https://testnet.airs.alternun.co/dashboard',
      unexpectedExchangeField: 'must-be-rejected',
    };
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const validationError = await validationPipe
      .transform(body, {
        type: 'body',
        metatype: AuthExchangeRequestDto,
      })
      .then(
        () => null,
        (error) => error
      );

    const response =
      typeof validationError?.getResponse === 'function' ? validationError.getResponse() : null;
    const messages = Array.isArray(response?.message) ? response.message : [];

    assert.equal(validationError?.getStatus?.(), 400);
    assert.equal(
      messages.some((message) =>
        String(message).includes('unexpectedExchangeField should not exist')
      ),
      true
    );
  } finally {
    process.env = originalEnv;
  }
});
