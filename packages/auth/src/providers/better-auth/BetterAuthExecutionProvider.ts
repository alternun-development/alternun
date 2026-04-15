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
import {
  SupabaseExecutionProvider,
  type LegacyExecutionClientLike,
} from '../supabase-legacy/SupabaseExecutionProvider';

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

export interface BetterAuthBrowserSocialSignInOptions {
  provider: string;
  callbackURL?: string;
  errorCallbackURL?: string;
  newUserCallbackURL?: string;
  disableRedirect?: boolean;
  [key: string]: unknown;
}

export interface BetterAuthBrowserClientLike {
  signIn?: {
    social?(options: BetterAuthBrowserSocialSignInOptions): Promise<unknown>;
    email?(options: {
      email: string;
      password: string;
      callbackURL?: string;
      errorCallbackURL?: string;
      newUserCallbackURL?: string;
      [key: string]: unknown;
    }): Promise<unknown>;
  };
  signUp?: {
    email?(options: {
      email: string;
      password: string;
      callbackURL?: string;
      [key: string]: unknown;
    }): Promise<unknown>;
  };
  signOut?(): Promise<unknown>;
  getSession?(): Promise<unknown>;
  refreshSession?(): Promise<unknown>;
  linkSocial?(input: AuthLinkProviderInput): Promise<unknown>;
  unlinkSocial?(input: AuthUnlinkProviderInput): Promise<unknown>;
}

export interface BetterAuthExecutionProviderOptions {
  client?: BetterAuthClientLike | null;
  browserClient?: BetterAuthBrowserClientLike | null;
  browserClientFactory?: () =>
    | Promise<BetterAuthBrowserClientLike | null>
    | BetterAuthBrowserClientLike
    | null;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  emailFallbackClient?: LegacyExecutionClientLike | null;
  allowLegacySessionFallback?: boolean;
  signInPath?: string;
  signInSocialPath?: string;
  signInEmailPath?: string;
  signUpPath?: string;
  signUpEmailPath?: string;
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
  const payload = isRecord(raw.data) ? raw.data : raw;
  const sessionPayload = isRecord(payload.session) ? payload.session : null;
  const userPayload = isRecord(payload.user) ? payload.user : null;
  const externalIdentityPayload =
    isRecord(payload.externalIdentity) && payload.externalIdentity
      ? (payload.externalIdentity as unknown as ExternalIdentity)
      : userPayload
      ? claimsToExternalIdentity(
          fallbackProvider,
          {
            ...userPayload,
            sub:
              typeof userPayload.sub === 'string' && userPayload.sub.trim().length > 0
                ? userPayload.sub
                : typeof userPayload.id === 'string' && userPayload.id.trim().length > 0
                ? userPayload.id
                : typeof sessionPayload?.userId === 'string' &&
                  sessionPayload.userId.trim().length > 0
                ? sessionPayload.userId
                : undefined,
            email:
              typeof userPayload.email === 'string' && userPayload.email.trim().length > 0
                ? userPayload.email
                : undefined,
            email_verified:
              typeof userPayload.email_verified === 'boolean'
                ? userPayload.email_verified
                : typeof userPayload.emailVerified === 'boolean'
                ? userPayload.emailVerified
                : undefined,
            name:
              typeof userPayload.name === 'string' && userPayload.name.trim().length > 0
                ? userPayload.name
                : typeof userPayload.displayName === 'string' &&
                  userPayload.displayName.trim().length > 0
                ? userPayload.displayName
                : undefined,
            picture:
              typeof userPayload.picture === 'string' && userPayload.picture.trim().length > 0
                ? userPayload.picture
                : typeof userPayload.image === 'string' && userPayload.image.trim().length > 0
                ? userPayload.image
                : typeof userPayload.avatarUrl === 'string' &&
                  userPayload.avatarUrl.trim().length > 0
                ? userPayload.avatarUrl
                : undefined,
          },
          typeof userPayload.sub === 'string' && userPayload.sub.trim().length > 0
            ? userPayload.sub
            : typeof userPayload.id === 'string' && userPayload.id.trim().length > 0
            ? userPayload.id
            : typeof sessionPayload?.userId === 'string' && sessionPayload.userId.trim().length > 0
            ? sessionPayload.userId
            : undefined
        )
      : null;
  const identityCandidate = externalIdentityPayload;
  const accessTokenCandidate =
    typeof payload.accessToken === 'string'
      ? payload.accessToken
      : typeof sessionPayload?.token === 'string'
      ? sessionPayload.token
      : typeof sessionPayload?.id === 'string'
      ? sessionPayload.id
      : typeof sessionPayload?.sessionToken === 'string'
      ? sessionPayload.sessionToken
      : null;
  const refreshTokenCandidate =
    typeof payload.refreshToken === 'string'
      ? payload.refreshToken
      : typeof sessionPayload?.refreshToken === 'string'
      ? sessionPayload.refreshToken
      : null;
  const idTokenCandidate =
    typeof payload.idToken === 'string'
      ? payload.idToken
      : typeof sessionPayload?.idToken === 'string'
      ? sessionPayload.idToken
      : null;
  const expiresAtCandidate =
    normalizeMaybeDate(payload.expiresAt) ??
    normalizeMaybeDate(sessionPayload?.expiresAt) ??
    normalizeMaybeDate(sessionPayload?.expires_at) ??
    null;

  return {
    provider:
      typeof payload.provider === 'string'
        ? payload.provider
        : identityCandidate?.provider ?? fallbackProvider,
    accessToken: accessTokenCandidate,
    refreshToken: refreshTokenCandidate,
    idToken: idTokenCandidate,
    expiresAt: expiresAtCandidate,
    externalIdentity: identityCandidate,
    linkedAccounts: Array.isArray(payload.linkedAccounts)
      ? (payload.linkedAccounts as LinkedAuthAccount[])
      : [],
    raw,
  };
}

function extractRedirectUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const redirectUrlCandidate =
    typeof raw.redirectUrl === 'string'
      ? raw.redirectUrl
      : typeof raw.redirectURL === 'string'
      ? raw.redirectURL
      : typeof raw.url === 'string'
      ? raw.url
      : typeof raw.location === 'string'
      ? raw.location
      : null;

  const trimmed = redirectUrlCandidate?.trim();
  return trimmed ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function normalizeMaybeDate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

async function callJson(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  body: unknown,
  apiKey?: string
): Promise<unknown> {
  const url = buildUrlWithBasePath(baseUrl, path);
  let response: Response;

  try {
    response = await fetchFn(url, {
      method: 'POST',
      credentials: 'include',
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

function buildUrlWithBasePath(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = path.trim();
  return new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
}

function resolveBrowserClientBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

  try {
    const url = new URL(trimmedBaseUrl);
    if (url.pathname && url.pathname !== '/') {
      return trimmedBaseUrl;
    }

    return `${trimmedBaseUrl}/auth`;
  } catch {
    return `${trimmedBaseUrl}/auth`;
  }
}

export class BetterAuthExecutionProvider implements AuthExecutionProvider {
  readonly name = 'better-auth' as const;
  private readonly emailFallbackProvider: SupabaseExecutionProvider | null;
  private readonly allowLegacySessionFallback: boolean;
  private browserClientPromise: Promise<BetterAuthBrowserClientLike | null> | null = null;

  constructor(private readonly options: BetterAuthExecutionProviderOptions) {
    this.emailFallbackProvider = options.emailFallbackClient
      ? new SupabaseExecutionProvider(options.emailFallbackClient)
      : null;
    this.allowLegacySessionFallback = options.allowLegacySessionFallback ?? false;
  }

  private get client(): BetterAuthClientLike | null {
    return this.options.client ?? null;
  }

  private get fetchFn(): typeof fetch {
    return this.options.fetchFn ?? fetch;
  }

  private async resolveBrowserClient(): Promise<BetterAuthBrowserClientLike | null> {
    if (this.options.browserClient) {
      return this.options.browserClient;
    }

    if (this.options.browserClientFactory) {
      const created = await this.options.browserClientFactory();
      if (created) {
        this.options.browserClient = created;
      }
      return created;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    if (!this.options.baseUrl?.trim()) {
      return null;
    }

    if (!this.browserClientPromise) {
      this.browserClientPromise = import('better-auth/client')
        .then(
          ({ createAuthClient }) =>
            createAuthClient({
              baseURL: resolveBrowserClientBaseUrl(this.requireBaseUrl()),
            }) as unknown as BetterAuthBrowserClientLike
        )
        .catch(() => null);
    }

    return this.browserClientPromise;
  }

  private normalizeProvider(provider?: string | null): string | null {
    const trimmed = provider?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private async getFallbackExecutionSession(): Promise<ExecutionSession | null> {
    if (!this.emailFallbackProvider) {
      return null;
    }

    try {
      return await this.emailFallbackProvider.getExecutionSession();
    } catch {
      return null;
    }
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

    const browserClient = await this.resolveBrowserClient();

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

    if (browserClient?.signIn) {
      if (provider === 'email' && browserClient.signIn.email && options.password) {
        const result = await browserClient.signIn.email({
          email: options.email ?? '',
          password: options.password,
          callbackURL: options.redirectUri,
          errorCallbackURL: options.redirectUri,
          newUserCallbackURL: options.redirectUri,
        });
        const normalizedSession = normalizeSession(result, 'email');
        return {
          session: normalizedSession,
          externalIdentity: normalizedSession?.externalIdentity ?? null,
          redirectUrl: extractRedirectUrl(result),
        };
      }

      if (browserClient.signIn.social) {
        const result = await browserClient.signIn.social({
          provider,
          callbackURL: options.redirectUri,
          errorCallbackURL: options.redirectUri,
          newUserCallbackURL: options.redirectUri,
          disableRedirect: false,
        });
        const normalizedSession = normalizeSession(result, provider);
        return {
          session: normalizedSession,
          externalIdentity: normalizedSession?.externalIdentity ?? null,
          redirectUrl: extractRedirectUrl(result),
        };
      }
    }

    if (provider === 'email' && this.emailFallbackProvider) {
      return this.emailFallbackProvider.signIn(options);
    }

    const isEmailProvider = provider === 'email';
    const response = await callJson(
      this.fetchFn,
      this.requireBaseUrl(),
      isEmailProvider
        ? this.options.signInEmailPath ?? this.options.signInPath ?? '/auth/sign-in/email'
        : this.options.signInSocialPath ?? this.options.signInPath ?? '/auth/sign-in/social',
      {
        provider,
        flow: options.flow ?? (provider === 'email' ? 'native' : 'redirect'),
        callbackURL: options.redirectUri,
        errorCallbackURL: options.redirectUri,
        newUserCallbackURL: options.redirectUri,
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

    if (this.emailFallbackProvider) {
      return this.emailFallbackProvider.signUp(input);
    }

    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.signUp?.email) {
      const signUpOptions = {
        email: input.email,
        password: input.password,
        callbackURL: undefined,
        locale: input.locale,
        metadata: input.metadata,
      } as Parameters<NonNullable<NonNullable<BetterAuthBrowserClientLike['signUp']>['email']>>[0];
      const result = await browserClient.signUp.email(signUpOptions);
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
      this.options.signUpEmailPath ?? this.options.signUpPath ?? '/auth/sign-up/email',
      {
        email: input.email,
        password: input.password,
        locale: input.locale,
        callbackURL: undefined,
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
    }

    if (this.emailFallbackProvider) {
      await this.emailFallbackProvider.signOut().catch(() => undefined);
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
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.getSession) {
      const session = await browserClient.getSession();
      const normalized = normalizeSession(session, this.options.defaultProvider ?? 'better-auth');
      if (normalized) {
        return normalized;
      }
    }

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
      if (user) {
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
    }

    if (this.allowLegacySessionFallback) {
      const fallbackSession = await this.getFallbackExecutionSession();
      if (fallbackSession) {
        return fallbackSession;
      }
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
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.refreshSession) {
      const session = await browserClient.refreshSession();
      const normalized = normalizeSession(session, this.options.defaultProvider ?? 'better-auth');
      if (normalized) {
        return normalized;
      }
    }

    if (this.client?.refreshSession) {
      const session = await this.client.refreshSession();
      return normalizeSession(session, this.options.defaultProvider ?? 'better-auth');
    }

    if (this.allowLegacySessionFallback) {
      const fallbackSession = await this.getFallbackExecutionSession();
      if (fallbackSession) {
        return fallbackSession;
      }
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
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.linkSocial) {
      await browserClient.linkSocial(input);
      return {
        provider: input.provider,
        providerUserId: input.providerUserId,
        type: input.type,
        email: input.email,
        metadata: input.metadata ?? {},
      };
    }

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
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.unlinkSocial) {
      await browserClient.unlinkSocial(input);
      return;
    }

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
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.signIn?.email) {
      const result = await browserClient.signIn.email({
        email,
        password,
      });

      const session = normalizeSession(result, 'email');
      if (session?.externalIdentity) {
        return {
          id: session.externalIdentity.providerUserId,
          email: session.externalIdentity.email,
          avatarUrl: session.externalIdentity.avatarUrl,
          provider: session.externalIdentity.provider,
          providerUserId: session.externalIdentity.providerUserId,
          metadata: session.externalIdentity.rawClaims,
        };
      }
    }

    if (this.client?.signIn) {
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

    if (this.emailFallbackProvider) {
      return this.emailFallbackProvider.signInWithEmail(email, password);
    }

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
    if (this.emailFallbackProvider) {
      await this.emailFallbackProvider.resendEmailConfirmation(email);
      return;
    }

    await this.signIn({
      provider: 'email',
      flow: 'native',
      email,
    });
  }

  async verifyEmailConfirmationCode(email: string, code: string): Promise<void> {
    if (this.emailFallbackProvider) {
      await this.emailFallbackProvider.verifyEmailConfirmationCode(email, code);
      return;
    }

    return Promise.resolve();
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    const browserClient = await this.resolveBrowserClient();
    if (browserClient?.signIn?.social) {
      await browserClient.signIn.social({
        provider: 'google',
        callbackURL: redirectTo,
      });
      return;
    }

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
