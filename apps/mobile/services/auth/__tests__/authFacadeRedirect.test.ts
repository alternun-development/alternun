/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it, jest } from '@jest/globals';
import { AlternunAuthFacade } from '../../../../../packages/auth/src/facade/AlternunAuthFacade';
import type {
  AuthExecutionProvider,
  CreateAuthFacadeInput,
  EmailProvider,
  IdentityIssuerProvider,
  IdentityRepository,
} from '../../../../../packages/auth/src/core/contracts';
import type { AuthRuntimeConfig } from '../../../../../packages/auth/src/core/types';

const redirectUrl = 'https://auth.example.com/oauth/start';
const assign = jest.fn();
const executionSignIn = jest.fn().mockResolvedValue({
  redirectUrl,
});

const browserWindow = {
  location: {
    assign,
  },
};

const globalWithWindow = globalThis as typeof globalThis & {
  window?: typeof browserWindow;
  document?: Record<string, never>;
};

globalWithWindow.window = browserWindow as typeof browserWindow & Window;
globalWithWindow.document = {};

function createExecutionProvider(): AuthExecutionProvider {
  return {
    name: 'better-auth',
    signIn: executionSignIn,
    signUp: jest.fn().mockResolvedValue({
      session: null,
      externalIdentity: null,
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    getExecutionSession: jest.fn().mockResolvedValue(null),
    refreshExecutionSession: jest.fn().mockResolvedValue(null),
    linkProvider: jest.fn().mockResolvedValue(null),
    unlinkProvider: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuthExecutionProvider;
}

function createIssuerProvider(): IdentityIssuerProvider {
  return {
    name: 'authentik',
    exchangeIdentity: jest.fn(),
    getIssuerSession: jest.fn().mockResolvedValue(null),
    refreshIssuerSession: jest.fn().mockResolvedValue(null),
    logoutIssuerSession: jest.fn().mockResolvedValue(undefined),
    discoverIssuerConfig: jest.fn().mockResolvedValue({
      issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      authorizationEndpoint: 'https://testnet.sso.alternun.co/application/o/authorize/',
      tokenEndpoint: 'https://testnet.sso.alternun.co/application/o/token/',
    }),
    validateClaims: jest.fn().mockResolvedValue({
      valid: true,
      principal: null,
      errors: [],
    }),
  } as unknown as IdentityIssuerProvider;
}

function createEmailProvider(): EmailProvider {
  return {
    name: 'supabase',
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendMagicLink: jest.fn().mockResolvedValue(undefined),
    healthcheck: jest.fn().mockResolvedValue({
      ok: true,
      provider: 'supabase',
    }),
  } as unknown as EmailProvider;
}

function createIdentityRepository(): IdentityRepository {
  return {
    name: 'supabase',
    upsertPrincipal: jest.fn().mockResolvedValue({
      id: 'principal-1',
      issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      subject: 'subject-1',
      roles: [],
      metadata: {},
    }),
    findPrincipalByExternalIdentity: jest.fn().mockResolvedValue(null),
    upsertUserProjection: jest.fn().mockResolvedValue({
      appUserId: 'principal-1',
      principal: {
        issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
        subject: 'subject-1',
        roles: [],
        metadata: {},
      },
      metadata: {},
    }),
    upsertLinkedAccount: jest.fn().mockResolvedValue({
      provider: 'google',
      providerUserId: 'subject-1',
      type: 'oidc',
      metadata: {},
    }),
    recordProvisioningEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as IdentityRepository;
}

describe('AlternunAuthFacade redirect handling', () => {
  it('navigates to the Better Auth redirectUrl in web mode', async () => {
    const executionProvider = createExecutionProvider();
    const issuerProvider = createIssuerProvider();
    const emailProvider = createEmailProvider();
    const identityRepository = createIdentityRepository();
    const runtime: AuthRuntimeConfig = {
      runtime: 'web',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    };
    const options: CreateAuthFacadeInput = {
      executionProvider,
      issuerProvider,
      emailProvider,
      identityRepository,
      runtime,
    };

    const facade = new AlternunAuthFacade(options);

    await facade.signIn({
      provider: 'google',
      flow: 'redirect',
      redirectUri: 'http://localhost:8081/auth/callback',
    });

    expect(assign).toHaveBeenCalledWith(redirectUrl);
    expect(executionSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        flow: 'redirect',
        redirectUri: 'http://localhost:8081/auth/callback',
      })
    );
  });
});
