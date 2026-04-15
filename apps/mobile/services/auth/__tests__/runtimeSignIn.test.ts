/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it, jest } from '@jest/globals';
import type { AuthClient } from '@edcalderon/auth';

const mockIsAuthentikConfigured = jest.fn(() => false);
const mockStartAuthentikOAuthFlow = jest.fn();

jest.mock('@edcalderon/auth/authentik', () => ({
  resolveSafeRedirect: (target: string, options?: { fallbackUrl?: string }): string =>
    target ?? options?.fallbackUrl ?? '/',
}));

jest.mock('../../../../../packages/auth/src/mobile/authentikClient', () => ({
  isAuthentikConfigured: mockIsAuthentikConfigured,
  startAuthentikOAuthFlow: mockStartAuthentikOAuthFlow,
}));

type SessionStorageMock = {
  clear: jest.Mock<void, []>;
  getItem: jest.Mock<string | null, [string]>;
  removeItem: jest.Mock<void, [string]>;
  setItem: jest.Mock<void, [string, string]>;
};

const browserWindow = {
  location: {
    origin: 'https://testnet.airs.alternun.co',
  },
  sessionStorage: {
    clear: jest.fn<void, []>(),
    getItem: jest.fn<string | null, [string]>(),
    removeItem: jest.fn<void, [string]>(),
    setItem: jest.fn<void, [string, string]>(),
  } satisfies SessionStorageMock,
};

const globalWithWindow = globalThis as typeof globalThis & {
  window?: typeof browserWindow;
  document?: Record<string, never>;
};

globalWithWindow.window = browserWindow;
globalWithWindow.document = {};

// Load after the browser globals are present so the module takes the web path.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { webRedirectSignIn } = require('../../../../../packages/auth/src/mobile/runtimeSignIn') as {
  webRedirectSignIn: typeof import('../../../../../packages/auth/src/mobile/runtimeSignIn')['webRedirectSignIn'];
};

describe('runtimeSignIn', () => {
  beforeEach(() => {
    browserWindow.sessionStorage.clear.mockClear();
    mockIsAuthentikConfigured.mockReset();
    mockIsAuthentikConfigured.mockReturnValue(false);
    mockStartAuthentikOAuthFlow.mockReset();
  });

  it('routes google social login through Better Auth when the execution provider is better-auth', async () => {
    const signIn = jest.fn().mockResolvedValue(undefined);
    const client = {
      signIn,
    } satisfies Pick<AuthClient, 'signIn'>;

    const result = await webRedirectSignIn({
      client: client as AuthClient,
      provider: 'google',
      redirectTo: '/dashboard',
      authentikProviderHint: 'google',
      strategy: {
        mode: 'relay',
        socialMode: 'authentik',
        executionProvider: 'better-auth',
        providerFlowSlugs: {},
      },
    });

    expect(result).toBe('better-auth');
    expect(signIn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        flow: 'redirect',
        redirectUri: expect.stringContaining('/auth/callback'),
      })
    );
  });

  it('routes discord social login through Better Auth when the execution provider is better-auth', async () => {
    const signIn = jest.fn().mockResolvedValue(undefined);
    const client = {
      signIn,
    } satisfies Pick<AuthClient, 'signIn'>;

    const result = await webRedirectSignIn({
      client: client as AuthClient,
      provider: 'discord',
      redirectTo: '/dashboard',
      authentikProviderHint: 'discord',
      strategy: {
        mode: 'relay',
        socialMode: 'authentik',
        executionProvider: 'better-auth',
        providerFlowSlugs: {},
      },
    });

    expect(result).toBe('better-auth');
    expect(signIn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'discord',
        flow: 'redirect',
        redirectUri: expect.stringContaining('/auth/callback'),
      })
    );
  });

  it('routes google web social login through Authentik on the stable supabase path', async () => {
    mockIsAuthentikConfigured.mockReturnValue(true);
    const signIn = jest.fn().mockResolvedValue(undefined);
    const client = {
      signIn,
    } satisfies Pick<AuthClient, 'signIn'>;

    const result = await webRedirectSignIn({
      client: client as AuthClient,
      provider: 'google',
      redirectTo: '/dashboard',
      authentikProviderHint: 'google',
      strategy: {
        mode: 'source',
        socialMode: 'authentik',
        executionProvider: 'supabase',
        providerFlowSlugs: {},
      },
    });

    expect(result).toBe('authentik');
    expect(signIn).not.toHaveBeenCalled();
    expect(mockStartAuthentikOAuthFlow).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({
        redirectUri: expect.stringContaining('/auth/callback'),
        forceFreshSession: false,
      })
    );
  });
});
