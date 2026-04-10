import type { AuthCapabilities, AuthRuntime, SignInOptions, User } from '@edcalderon/auth';
import type {
  AuthExecutionResult,
  AuthExecutionSignInOptions,
  AuthExecutionSignUpInput,
  AuthLinkProviderInput,
  AuthUnlinkProviderInput,
  ExecutionSession,
  ExternalIdentity,
  LinkedAuthAccount,
  WalletConnectionBridge,
} from '../../core/types';
import type { AuthExecutionProvider } from '../../core/contracts';
import { AlternunConfigError, AlternunProviderError } from '../../core/errors';
import { claimsToExternalIdentity } from '../../identity/claims';

export interface BetterAuthClientLike {
  runtime?: AuthRuntime;
  signIn?(options: SignInOptions & Record<string, unknown>): Promise<unknown>;
  signUp?(input: AuthExecutionSignUpInput & Record<string, unknown>): Promise<unknown>;
  signOut?(): Promise<void>;
  getSession?(): Promise<unknown>;
  refreshSession?(): Promise<unknown>;
  linkProvider?(input: AuthLinkProviderInput): Promise<unknown>;
  unlinkProvider?(input: AuthUnlinkProviderInput): Promise<unknown>;
  getUser?(): Promise<User | null>;
  getSessionToken?(): Promise<string | null>;
}

export interface BetterAuthExecutionProviderOptions {
  client?: BetterAuthClientLike | null;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  signInPath?: string;
  signUpPath?: string;
  signOutPath?: string;
  sessionPath?: string;
  refreshPath?: string;
  linkPath?: string;
  unlinkPath?: string;
  walletBridge?: WalletConnectionBridge | null;
  defaultProvider?: string;
}

function normalizeSession(input: unknown, fallbackProvider: string): ExecutionSession | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const identityCandidate =
    raw.externalIdentity && typeof raw.externalIdentity === 'object'
      ? (raw.externalIdentity as ExternalIdentity)
      : raw.user && typeof raw.user === 'object'
      ? claimsToExternalIdentity(fallbackProvider, raw.user as Record<string, unknown>)
      : null;

  return {
    provider:
      typeof raw.provider === 'string'
        ? raw.provider
        : identityCandidate?.provider ?? fallbackProvider,
    accessToken: typeof raw.accessToken === 'string' ? raw.accessToken : null,
    refreshToken: typeof raw.refreshToken === 'string' ? raw.refreshToken : null,
    idToken: typeof raw.idToken === 'string' ? raw.idToken : null,
    expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : null,
    externalIdentity: identityCandidate,
    linkedAccounts: Array.isArray(raw.linkedAccounts)
      ? (raw.linkedAccounts as LinkedAuthAccount[])
      : [],
    raw,
  };
}

async function callJson(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  body: unknown,
  apiKey?: string
): Promise<unknown> {
  const url = new URL(path, baseUrl).toString();
  let response: Response;

  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    throw new AlternunProviderError(
      [
        `Better Auth request to ${url} failed before a response was received.`,
        'If this is a browser request, verify that the Better Auth service trusts the current app origin in BETTER_AUTH_TRUSTED_ORIGINS.',
        `Original error: ${message}`,
      ].join(' ')
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AlternunProviderError(
      `Better Auth request failed (${response.status} ${response.statusText}): ${text}`
    );
  }

  return response.json().catch(() => ({}));
}

export class BetterAuthExecutionProvider implements AuthExecutionProvider {
  readonly name = 'better-auth' as const;

  constructor(private readonly options: BetterAuthExecutionProviderOptions) {}

  private get client(): BetterAuthClientLike | null {
    return this.options.client ?? null;
  }

  private get fetchFn(): typeof fetch {
    return this.options.fetchFn ?? fetch;
  }

  private normalizeProvider(provider?: string | null): string | null {
    const trimmed = provider?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private requireBaseUrl(): string {
    if (this.options.baseUrl?.trim()) {
      return this.options.baseUrl.trim().replace(/\/$/, '');
    }

    throw new AlternunConfigError(
      'Better Auth execution provider requires a baseUrl or a client implementation.'
    );
  }

  async signIn(options: AuthExecutionSignInOptions): Promise<AuthExecutionResult> {
    const client = this.client;
    const provider =
      this.normalizeProvider(options.provider) ??
      this.normalizeProvider(this.options.defaultProvider) ??
      'google';

    if (client?.signIn) {
      const result = await client.signIn({
        provider,
        flow: options.flow ?? (provider === 'email' ? 'native' : 'redirect'),
        redirectUri: options.redirectUri,
        web3: options.web3,
        email: options.email,
        password: options.password,
        metadata: options.metadata,
      } as SignInOptions & Record<string, unknown>);

      const normalizedSession = normalizeSession(result, provider);
      return {
        session: normalizedSession,
        externalIdentity: normalizedSession?.externalIdentity ?? null,
        redirectUrl: options.redirectUri ?? null,
      };
    }

    const response = await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      this.options.signInPath ?? '/auth/sign-in',
      {
        provider,
        flow: options.flow ?? (provider === 'email' ? 'native' : 'redirect'),
        redirectUri: options.redirectUri,
        email: options.email,
        password: options.password,
        web3: options.web3,
        metadata: options.metadata,
      }
    );

    const session = normalizeSession(response, provider);
    return {
      session,
      externalIdentity: session?.externalIdentity ?? null,
      redirectUrl:
        typeof (response as Record<string, unknown>)?.redirectUrl === 'string'
          ? ((response as Record<string, unknown>).redirectUrl as string)
          : options.redirectUri ?? null,
      needsEmailVerification:
        typeof (response as Record<string, unknown>)?.needsEmailVerification === 'boolean'
          ? ((response as Record<string, unknown>).needsEmailVerification as boolean)
          : undefined,
      emailAlreadyRegistered:
        typeof (response as Record<string, unknown>)?.emailAlreadyRegistered === 'boolean'
          ? ((response as Record<string, unknown>).emailAlreadyRegistered as boolean)
          : undefined,
      confirmationEmailSent:
        typeof (response as Record<string, unknown>)?.confirmationEmailSent === 'boolean'
          ? ((response as Record<string, unknown>).confirmationEmailSent as boolean)
          : undefined,
    };
  }

  async signUp(input: AuthExecutionSignUpInput): Promise<AuthExecutionResult> {
    const client = this.client;
    if (client?.signUp) {
      const result = await client.signUp(
        input as AuthExecutionSignUpInput & Record<string, unknown>
      );
      const normalizedSession = normalizeSession(result, 'email');
      return {
        session: normalizedSession,
        externalIdentity: normalizedSession?.externalIdentity ?? null,
        needsEmailVerification:
          typeof (result as Record<string, unknown>)?.needsEmailVerification === 'boolean'
            ? ((result as Record<string, unknown>).needsEmailVerification as boolean)
            : undefined,
        emailAlreadyRegistered:
          typeof (result as Record<string, unknown>)?.emailAlreadyRegistered === 'boolean'
            ? ((result as Record<string, unknown>).emailAlreadyRegistered as boolean)
            : undefined,
        confirmationEmailSent:
          typeof (result as Record<string, unknown>)?.confirmationEmailSent === 'boolean'
            ? ((result as Record<string, unknown>).confirmationEmailSent as boolean)
            : undefined,
      };
    }

    const response = await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      this.options.signUpPath ?? '/auth/sign-up',
      {
        email: input.email,
        password: input.password,
        locale: input.locale,
        metadata: input.metadata,
      }
    );

    const session = normalizeSession(response, 'email');
    return {
      session,
      externalIdentity: session?.externalIdentity ?? null,
      needsEmailVerification:
        typeof (response as Record<string, unknown>)?.needsEmailVerification === 'boolean'
          ? ((response as Record<string, unknown>).needsEmailVerification as boolean)
          : undefined,
      emailAlreadyRegistered:
        typeof (response as Record<string, unknown>)?.emailAlreadyRegistered === 'boolean'
          ? ((response as Record<string, unknown>).emailAlreadyRegistered as boolean)
          : undefined,
      confirmationEmailSent:
        typeof (response as Record<string, unknown>)?.confirmationEmailSent === 'boolean'
          ? ((response as Record<string, unknown>).confirmationEmailSent as boolean)
          : undefined,
    };
  }

  async signOut(): Promise<void> {
    if (this.client?.signOut) {
      await this.client.signOut();
      return;
    }

    const baseUrl = this.options.baseUrl?.trim();
    if (!baseUrl) {
      return;
    }

    await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      this.options.signOutPath ?? '/auth/sign-out',
      {}
    );
  }

  async getExecutionSession(): Promise<ExecutionSession | null> {
    if (this.client?.getSession) {
      const session = await this.client.getSession();
      const normalized = normalizeSession(session, this.options.defaultProvider ?? 'better-auth');
      if (normalized) {
        return normalized;
      }
    }

    if (this.client?.getUser && this.client.getSessionToken) {
      const user = await this.client.getUser();
      const token = await this.client.getSessionToken();
      if (!user) {
        return null;
      }

      return {
        provider: user.provider ?? this.options.defaultProvider ?? 'better-auth',
        accessToken: token ?? null,
        refreshToken: null,
        idToken: null,
        expiresAt: null,
        externalIdentity: claimsToExternalIdentity(
          user.provider ?? this.options.defaultProvider ?? 'better-auth',
          user.metadata ?? {},
          user.providerUserId ?? user.id
        ),
        linkedAccounts: [],
        raw: { user },
      };
    }

    if (!this.options.baseUrl) {
      return null;
    }

    const response = await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      this.options.sessionPath ?? '/auth/session',
      {}
    );
    return normalizeSession(response, this.options.defaultProvider ?? 'better-auth');
  }

  async refreshExecutionSession(): Promise<ExecutionSession | null> {
    if (this.client?.refreshSession) {
      const session = await this.client.refreshSession();
      return normalizeSession(session, this.options.defaultProvider ?? 'better-auth');
    }

    if (!this.options.baseUrl) {
      return this.getExecutionSession();
    }

    const response = await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      this.options.refreshPath ?? '/auth/session/refresh',
      {}
    );
    return normalizeSession(response, this.options.defaultProvider ?? 'better-auth');
  }

  async linkProvider(input: AuthLinkProviderInput): Promise<LinkedAuthAccount | null> {
    if (this.client?.linkProvider) {
      await this.client.linkProvider(input);
    } else if (this.options.baseUrl) {
      await callJson(this.fetchFn, this.requireBaseUrl(), this.options.linkPath ?? '/auth/link', {
        provider: input.provider,
        providerUserId: input.providerUserId,
        type: input.type,
        email: input.email,
        metadata: input.metadata ?? {},
      });
    } else {
      return null;
    }

    return {
      provider: input.provider,
      providerUserId: input.providerUserId,
      type: input.type,
      email: input.email,
      metadata: input.metadata ?? {},
    };
  }

  async unlinkProvider(input: AuthUnlinkProviderInput): Promise<void> {
    if (this.client?.unlinkProvider) {
      await this.client.unlinkProvider(input);
      return;
    }

    if (!this.options.baseUrl) {
      return;
    }

    await callJson(this.fetchFn, this.requireBaseUrl(), this.options.unlinkPath ?? '/auth/unlink', {
      provider: input.provider,
      providerUserId: input.providerUserId,
      type: input.type,
    });
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await this.signIn({
      provider: 'email',
      flow: 'native',
      email,
      password,
    });

    if (result.externalIdentity) {
      return {
        id: result.externalIdentity.providerUserId,
        email: result.externalIdentity.email,
        avatarUrl: result.externalIdentity.avatarUrl,
        provider: result.externalIdentity.provider,
        providerUserId: result.externalIdentity.providerUserId,
        metadata: result.externalIdentity.rawClaims,
      };
    }

    throw new AlternunProviderError('Better Auth email sign-in did not return a user session.');
  }

  async signUpWithEmail(
    email: string,
    password: string,
    locale?: string
  ): Promise<AuthExecutionResult> {
    return this.signUp({ email, password, locale });
  }

  async resendEmailConfirmation(email: string): Promise<void> {
    await this.signIn({
      provider: 'email',
      flow: 'native',
      email,
    });
  }

  verifyEmailConfirmationCode(): Promise<void> {
    return Promise.resolve();
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    await this.signIn({
      provider: 'google',
      flow: 'redirect',
      redirectUri: redirectTo,
    });
  }

  capabilities(): AuthCapabilities {
    return {
      runtime: 'web',
      supportedFlows: ['redirect', 'native'],
    };
  }

  async getUser(): Promise<User | null> {
    const session = await this.getExecutionSession();
    const identity = session?.externalIdentity;
    if (!identity) {
      return null;
    }

    return {
      id: identity.providerUserId,
      email: identity.email,
      avatarUrl: identity.avatarUrl,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      metadata: identity.rawClaims,
    };
  }

  async getSessionToken(): Promise<string | null> {
    const session = await this.getExecutionSession();
    return session?.accessToken ?? null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    void this.getUser()
      .then(callback)
      .catch(() => callback(null));

    return () => undefined;
  }
}

export type {
  AuthCapabilities,
  AuthClient,
  OAuthFlow,
  SignInOptions,
  User,
} from '@edcalderon/auth';
