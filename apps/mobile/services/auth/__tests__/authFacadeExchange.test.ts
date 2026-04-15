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

function createExecutionIdentity(provider: string): {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string;
  rawClaims: Record<string, unknown>;
} {
  return {
    provider,
    providerUserId: `${provider}-123`,
    email: `${provider}@example.com`,
    emailVerified: true,
    displayName: `${provider} user`,
    avatarUrl: `https://example.com/${provider}.png`,
    rawClaims: {
      sub: `${provider}-123`,
      email: `${provider}@example.com`,
      name: `${provider} user`,
    },
  };
}

function createFacade(provider: string): {
  facade: AlternunAuthFacade;
  exchangeIdentity: jest.Mock;
  executionSignIn: jest.Mock;
} {
  const executionIdentity = createExecutionIdentity(provider);
  const executionSession = {
    provider: 'better-auth',
    accessToken: 'execution-token',
    refreshToken: 'execution-refresh',
    idToken: 'execution-id',
    expiresAt: Date.now() + 60_000,
    externalIdentity: executionIdentity,
    linkedAccounts: [],
    raw: {
      source: 'test',
    },
  };

  const executionSignIn = jest.fn().mockResolvedValue({
    session: executionSession,
    externalIdentity: executionIdentity,
  });
  const exchangeIdentity = jest.fn().mockResolvedValue({
    issuerAccessToken: 'issuer-token',
    issuerRefreshToken: 'issuer-refresh',
    executionSession,
    principal: {
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      subject: `${provider}-principal`,
      email: executionIdentity.email,
      roles: ['authenticated'],
      metadata: {
        provider,
      },
    },
    linkedAccounts: [
      {
        provider,
        providerUserId: executionIdentity.providerUserId,
        type: 'oidc',
        email: executionIdentity.email,
        displayName: executionIdentity.displayName,
        metadata: {},
      },
    ],
  });

  const executionProvider = {
    name: 'better-auth',
    signIn: executionSignIn,
    signUp: jest.fn().mockResolvedValue({
      session: executionSession,
      externalIdentity: executionIdentity,
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    getExecutionSession: jest.fn().mockResolvedValue(executionSession),
    refreshExecutionSession: jest.fn().mockResolvedValue(executionSession),
    linkProvider: jest.fn().mockResolvedValue(null),
    unlinkProvider: jest.fn().mockResolvedValue(undefined),
    onAuthStateChange: (callback: (user: { id: string } | null) => void) => {
      callback(null);
      return () => undefined;
    },
    capabilities: () => ({
      runtime: 'web',
      supportedFlows: ['redirect', 'native'],
    }),
  } as unknown as AuthExecutionProvider;

  const issuerProvider = {
    name: 'authentik',
    exchangeIdentity,
    getIssuerSession: jest.fn().mockResolvedValue(null),
    refreshIssuerSession: jest.fn().mockResolvedValue(null),
    logoutIssuerSession: jest.fn().mockResolvedValue(undefined),
    discoverIssuerConfig: jest.fn().mockResolvedValue({
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      authorizationEndpoint: 'https://sso.example.com/application/o/authorize/',
      tokenEndpoint: 'https://sso.example.com/application/o/token/',
    }),
    validateClaims: jest.fn().mockResolvedValue({
      valid: true,
      principal: null,
      errors: [],
    }),
  } as unknown as IdentityIssuerProvider;

  const identityRepository = {
    name: 'stub-repo',
    upsertPrincipal: jest.fn().mockResolvedValue({
      id: `${provider}-principal`,
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      subject: `${provider}-principal`,
      roles: [],
      metadata: {},
    }),
    findPrincipalByExternalIdentity: jest.fn().mockResolvedValue(null),
    upsertUserProjection: jest.fn().mockResolvedValue({
      appUserId: `${provider}-principal`,
      principal: {
        issuer: 'https://sso.example.com/application/o/alternun-mobile/',
        subject: `${provider}-principal`,
        roles: [],
        metadata: {},
      },
      metadata: {},
    }),
    upsertLinkedAccount: jest.fn().mockResolvedValue({
      provider,
      providerUserId: executionIdentity.providerUserId,
      type: 'oidc',
      metadata: {},
    }),
    recordProvisioningEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as IdentityRepository;

  const emailProvider = {
    name: 'supabase',
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendMagicLink: jest.fn().mockResolvedValue(undefined),
    healthcheck: jest.fn().mockResolvedValue({
      ok: true,
      provider: 'supabase',
    }),
  } as unknown as EmailProvider;

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
  return { facade, exchangeIdentity, executionSignIn };
}

describe('AlternunAuthFacade social exchange', () => {
  it.each(['google', 'discord'] as const)(
    'exchanges %s sign-in into the Authentik-backed app session',
    async (provider: 'google' | 'discord') => {
      const { facade, exchangeIdentity, executionSignIn } = createFacade(provider);

      await facade.signIn({
        provider,
        flow: 'redirect',
      });

      expect(executionSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          flow: 'redirect',
        })
      );
      expect(exchangeIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          externalIdentity: expect.objectContaining({
            provider,
            providerUserId: `${provider}-123`,
          }),
        })
      );
      expect(await facade.getSessionToken()).toBe('issuer-token');
      expect((await facade.getUser())?.provider).toBe('better-auth');
      expect((await facade.getAlternunSession())?.linkedAccounts[0]?.provider).toBe(provider);
    }
  );
});
