import type {
  AuthCapabilities,
  AuthClient,
  AuthRuntime,
  OAuthFlow,
  SignInOptions,
  User,
} from '@edcalderon/auth';
import type {
  AlternunSession,
  AuthExecutionResult,
  ExecutionSession,
  IssuerSession,
} from '../core/types';
import type {
  AuthExecutionProvider,
  AuthLogger,
  CreateAuthFacadeInput,
  IdentityIssuerProvider,
  EmailProvider,
  IdentityRepository,
} from '../core/contracts';
import { AlternunProviderError, toAlternunAuthError } from '../core/errors';
import {
  createAlternunSession,
  executionSessionToUser,
  issuerSessionToUser,
  principalToUser,
} from '../core/session';

type ExecutionProviderCompat = AuthExecutionProvider & {
  onAuthStateChange?: (callback: (user: User | null) => void) => () => void;
  signInWithEmail?: (email: string, password: string) => Promise<User>;
  signUpWithEmail?: (email: string, password: string, locale?: string) => Promise<unknown>;
  resendEmailConfirmation?: (email: string) => Promise<void>;
  verifyEmailConfirmationCode?: (email: string, code: string) => Promise<void>;
  signInWithGoogle?: (redirectTo?: string) => Promise<void>;
  getSessionToken?: () => Promise<string | null>;
  setOidcUser?: (user: User | null) => void;
  supabase?: unknown;
  capabilities?: () => AuthCapabilities;
};

type IssuerProviderCompat = IdentityIssuerProvider & {
  onAuthStateChange?: (callback: (session: IssuerSession | null) => void) => () => void;
};

function uniqueFlows(...candidates: Array<OAuthFlow | undefined | null>): OAuthFlow[] {
  return Array.from(new Set(candidates.filter(Boolean) as OAuthFlow[]));
}

function isEmailAuthResult(value: unknown): value is AuthExecutionResult {
  return Boolean(value && typeof value === 'object');
}

export interface AlternunAuthFacadeCompat extends AuthClient {
  signUpWithEmail(email: string, password: string, locale?: string): Promise<AuthExecutionResult>;
  resendEmailConfirmation(email: string): Promise<void>;
  verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
  setOidcUser(user: User | null): void;
  getExecutionSession(): Promise<ExecutionSession | null>;
  refreshExecutionSession(): Promise<ExecutionSession | null>;
  getIssuerSession(): Promise<IssuerSession | null>;
  refreshIssuerSession(): Promise<IssuerSession | null>;
  logoutIssuerSession(options?: { reason?: string; redirectTo?: string | null }): Promise<void>;
  getAlternunSession(): Promise<AlternunSession | null>;
  readonly supabase?: unknown;
}

export class AlternunAuthFacade implements AlternunAuthFacadeCompat {
  runtime: AuthRuntime;

  private currentUser: User | null = null;
  private currentCompatUser: User | null = null;
  private currentExecutionSession: ExecutionSession | null = null;
  private currentIssuerSession: IssuerSession | null = null;
  private currentAlternunSession: AlternunSession | null = null;
  private lastExchangeKey: string | null = null;
  private providerUnsubscribe: (() => void) | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  constructor(private readonly options: CreateAuthFacadeInput) {
    this.runtime = options.runtime.runtime;
  }

  private get executionProvider(): ExecutionProviderCompat {
    return this.options.executionProvider as ExecutionProviderCompat;
  }

  private get issuerProvider(): IssuerProviderCompat {
    return this.options.issuerProvider as IssuerProviderCompat;
  }

  private get emailProvider(): EmailProvider {
    return this.options.emailProvider;
  }

  private get identityRepository(): IdentityRepository {
    return this.options.identityRepository;
  }

  get supabase(): unknown {
    return this.executionProvider.supabase ?? null;
  }

  capabilities(): AuthCapabilities {
    const providerCapabilities = this.executionProvider.capabilities?.();
    const runtime = providerCapabilities?.runtime ?? this.runtime;
    const supportedFlows = uniqueFlows(
      ...(providerCapabilities?.supportedFlows ?? []),
      this.runtime === 'web' ? 'redirect' : 'native'
    );

    return {
      runtime,
      supportedFlows,
    };
  }

  private log(
    channel: Parameters<NonNullable<AuthLogger['log']>>[0]['channel'],
    action: string,
    outcome: Parameters<NonNullable<AuthLogger['log']>>[0]['outcome'],
    details?: Record<string, unknown>,
    message?: string
  ): void {
    this.options.logger?.log({
      channel,
      action,
      outcome,
      details,
      message,
    });
  }

  private emit(user: User | null): void {
    this.currentUser = user;
    for (const listener of this.listeners) {
      listener(user);
    }
  }

  private attachExecutionSubscription(): void {
    if (this.providerUnsubscribe) {
      return;
    }

    if (!this.executionProvider.onAuthStateChange) {
      return;
    }

    this.providerUnsubscribe = this.executionProvider.onAuthStateChange((user) => {
      this.currentCompatUser = user;
      void this.refreshState('execution-provider-change', {
        allowExchange: true,
        preferExecution: true,
      }).catch(() => {
        this.emit(user);
      });
    });
  }

  private detachExecutionSubscription(): void {
    if (!this.providerUnsubscribe) {
      return;
    }

    if (this.listeners.size > 0) {
      return;
    }

    this.providerUnsubscribe();
    this.providerUnsubscribe = null;
  }

  private async safeGetExecutionSession(): Promise<ExecutionSession | null> {
    try {
      return await this.executionProvider.getExecutionSession();
    } catch (error) {
      this.log('execution-provider', 'getExecutionSession', 'failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async safeGetIssuerSession(): Promise<IssuerSession | null> {
    try {
      return await this.issuerProvider.getIssuerSession();
    } catch (error) {
      this.log('issuer-exchange', 'getIssuerSession', 'failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async safeExchangeIdentity(
    executionSession: ExecutionSession,
    trigger: string
  ): Promise<AlternunSession | null> {
    const externalIdentity = executionSession.externalIdentity;
    if (!externalIdentity) {
      return null;
    }

    const exchangeKey = `${externalIdentity.provider}:${externalIdentity.providerUserId}:${
      executionSession.accessToken ?? ''
    }:${executionSession.refreshToken ?? ''}`;
    if (this.currentAlternunSession && this.lastExchangeKey === exchangeKey) {
      return this.currentAlternunSession;
    }

    this.log('issuer-exchange', 'exchangeIdentity', 'start', {
      provider: externalIdentity.provider,
      providerUserId: externalIdentity.providerUserId,
      trigger,
    });

    try {
      const session = await this.issuerProvider.exchangeIdentity({
        externalIdentity,
        executionSession,
        claims: externalIdentity.rawClaims,
        context: {
          trigger,
          executionProvider: executionSession.provider,
          issuerProvider: this.issuerProvider.name,
          identityRepository: this.identityRepository.name,
        },
      });

      this.lastExchangeKey = exchangeKey;
      this.currentAlternunSession = session;
      this.currentIssuerSession = await this.safeGetIssuerSession();
      this.log('issuer-exchange', 'exchangeIdentity', 'success', {
        issuer: session.principal.issuer,
        subject: session.principal.subject,
      });
      return session;
    } catch (error) {
      this.log('issuer-exchange', 'exchangeIdentity', 'failure', {
        provider: externalIdentity.provider,
        providerUserId: externalIdentity.providerUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private buildUserFromAlternunSession(
    session: AlternunSession,
    executionSession?: ExecutionSession | null
  ): User {
    return principalToUser(session.principal, {
      id: session.principal.subject,
      provider: executionSession?.provider ?? session.linkedAccounts[0]?.provider,
      providerUserId:
        executionSession?.externalIdentity?.providerUserId ??
        session.linkedAccounts[0]?.providerUserId,
      metadata: {
        issuerAccessToken: session.issuerAccessToken,
        issuerRefreshToken: session.issuerRefreshToken ?? null,
        linkedAccounts: session.linkedAccounts,
      },
    });
  }

  private async refreshState(
    trigger: string,
    options: { allowExchange?: boolean; preferExecution?: boolean } = {}
  ): Promise<User | null> {
    const [issuerSession, executionSession] = await Promise.all([
      this.safeGetIssuerSession(),
      this.safeGetExecutionSession(),
    ]);
    const fallbackPrincipal = issuerSession?.principal ?? null;

    this.currentIssuerSession = issuerSession;
    this.currentExecutionSession = executionSession;

    if (
      options.preferExecution &&
      executionSession?.externalIdentity &&
      options.allowExchange !== false
    ) {
      const alternunSession = await this.safeExchangeIdentity(executionSession, trigger);
      if (alternunSession) {
        const user = this.buildUserFromAlternunSession(alternunSession, executionSession);
        this.currentCompatUser = user;
        this.emit(user);
        return user;
      }
    }

    if (issuerSession) {
      const user = issuerSessionToUser(issuerSession, executionSession);
      this.currentAlternunSession = executionSession
        ? {
            issuerAccessToken: issuerSession.accessToken,
            issuerRefreshToken: issuerSession.refreshToken ?? null,
            executionSession,
            principal: issuerSession.principal,
            linkedAccounts: issuerSession.linkedAccounts,
          }
        : {
            issuerAccessToken: issuerSession.accessToken,
            issuerRefreshToken: issuerSession.refreshToken ?? null,
            executionSession: null,
            principal: issuerSession.principal,
            linkedAccounts: issuerSession.linkedAccounts,
          };
      this.currentCompatUser = user;
      this.emit(user);
      return user;
    }

    if (executionSession?.externalIdentity && options.allowExchange !== false) {
      const alternunSession = await this.safeExchangeIdentity(executionSession, trigger);
      if (alternunSession) {
        const user = this.buildUserFromAlternunSession(alternunSession, executionSession);
        this.currentCompatUser = user;
        this.emit(user);
        return user;
      }
    }

    if (this.currentCompatUser) {
      this.emit(this.currentCompatUser);
      return this.currentCompatUser;
    }

    if (executionSession) {
      const user = executionSessionToUser(executionSession, fallbackPrincipal);
      this.currentCompatUser = user;
      this.emit(user);
      return user;
    }

    this.emit(null);
    return null;
  }

  async getUser(): Promise<User | null> {
    return this.refreshState('getUser', { allowExchange: true });
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    if (this.executionProvider.signInWithEmail) {
      const user = await this.executionProvider.signInWithEmail(email, password);
      this.currentCompatUser = user;
      this.currentExecutionSession = await this.safeGetExecutionSession();
      await this.refreshState('signInWithEmail', {
        allowExchange: true,
        preferExecution: true,
      });
      return user;
    }

    const result = await this.executionProvider.signIn({
      provider: 'email',
      flow: this.runtime === 'web' ? 'redirect' : 'native',
      email,
      password,
    });

    if (result.session?.externalIdentity) {
      this.currentExecutionSession = result.session;
      const alternunSession = await this.safeExchangeIdentity(result.session, 'signInWithEmail');
      if (alternunSession) {
        const user = this.buildUserFromAlternunSession(alternunSession, result.session);
        this.currentCompatUser = user;
        this.emit(user);
        return user;
      }
    }

    const user = await this.refreshState('signInWithEmail', {
      allowExchange: true,
      preferExecution: true,
    });
    if (user) {
      return user;
    }

    throw new AlternunProviderError('Email sign-in did not produce a user session.');
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    await this.signIn({
      provider: 'google',
      flow: this.runtime === 'web' ? 'redirect' : 'native',
      redirectUri: redirectTo,
    });
  }

  async signIn(options: SignInOptions): Promise<void> {
    this.log('execution-provider', 'signIn', 'start', {
      provider: options.provider,
      flow: options.flow,
    });

    try {
      const result = await this.executionProvider.signIn({
        provider: options.provider ?? 'google',
        flow: options.flow ?? (this.runtime === 'web' ? 'redirect' : 'native'),
        redirectUri: options.redirectUri,
        web3: options.web3,
      });

      if (result.session) {
        this.currentExecutionSession = result.session;
      }

      if (result.externalIdentity && result.session) {
        const alternunSession = await this.safeExchangeIdentity(result.session, 'signIn');
        if (alternunSession) {
          const user = this.buildUserFromAlternunSession(alternunSession, result.session);
          this.currentCompatUser = user;
          this.emit(user);
          return;
        }
      }

      if (result.session) {
        const user = executionSessionToUser(
          result.session,
          this.currentIssuerSession?.principal ?? null
        );
        this.currentCompatUser = user;
        this.emit(user);
        return;
      }

      if (result.redirectUrl) {
        if (this.runtime === 'web' && typeof window !== 'undefined') {
          window.location.assign(result.redirectUrl);
        }

        this.log('execution-provider', 'signIn', 'skipped', {
          redirectUrl: result.redirectUrl,
        });
        return;
      }

      await this.refreshState('signIn', { allowExchange: true, preferExecution: true });
      this.log('execution-provider', 'signIn', 'success', {
        provider: options.provider,
      });
    } catch (error) {
      this.log('execution-provider', 'signIn', 'failure', {
        provider: options.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      throw toAlternunAuthError(error);
    }
  }

  async signUpWithEmail(
    email: string,
    password: string,
    locale?: string
  ): Promise<AuthExecutionResult> {
    if (this.executionProvider.signUpWithEmail) {
      const outcome = await this.executionProvider.signUpWithEmail(email, password, locale);
      const outcomeRecord = outcome as Record<string, unknown>;
      const result: AuthExecutionResult = isEmailAuthResult(outcome)
        ? {
            session: null,
            externalIdentity: null,
            needsEmailVerification:
              typeof outcomeRecord.needsEmailVerification === 'boolean'
                ? Boolean(outcomeRecord.needsEmailVerification)
                : true,
            emailAlreadyRegistered:
              typeof outcomeRecord.emailAlreadyRegistered === 'boolean'
                ? Boolean(outcomeRecord.emailAlreadyRegistered)
                : false,
            confirmationEmailSent:
              typeof outcomeRecord.confirmationEmailSent === 'boolean'
                ? Boolean(outcomeRecord.confirmationEmailSent)
                : false,
          }
        : {
            session: null,
            externalIdentity: null,
            needsEmailVerification: true,
            emailAlreadyRegistered: false,
            confirmationEmailSent: false,
          };

      this.log('execution-provider', 'signUpWithEmail', 'success', {
        needsEmailVerification: result.needsEmailVerification,
        emailAlreadyRegistered: result.emailAlreadyRegistered,
        confirmationEmailSent: result.confirmationEmailSent,
      });
      await this.refreshState('signUpWithEmail', {
        allowExchange: true,
        preferExecution: true,
      });
      return result;
    }

    const result = await this.executionProvider.signUp({
      email,
      password,
      locale,
    });

    if (result.session?.externalIdentity) {
      this.currentExecutionSession = result.session;
      const alternunSession = await this.safeExchangeIdentity(result.session, 'signUpWithEmail');
      if (alternunSession) {
        const user = this.buildUserFromAlternunSession(alternunSession, result.session);
        this.currentCompatUser = user;
        this.emit(user);
      }
    }

    const normalized: AuthExecutionResult = {
      session: result.session,
      externalIdentity: result.externalIdentity,
      needsEmailVerification: Boolean(result.needsEmailVerification ?? !result.session),
      emailAlreadyRegistered: Boolean(result.emailAlreadyRegistered ?? false),
      confirmationEmailSent: Boolean(result.confirmationEmailSent ?? !result.session),
    };

    this.log('execution-provider', 'signUpWithEmail', 'success', {
      needsEmailVerification: normalized.needsEmailVerification,
      emailAlreadyRegistered: normalized.emailAlreadyRegistered,
      confirmationEmailSent: normalized.confirmationEmailSent,
    });

    return normalized;
  }

  async resendEmailConfirmation(email: string): Promise<void> {
    if (this.executionProvider.resendEmailConfirmation) {
      await this.executionProvider.resendEmailConfirmation(email);
      this.log('email-provider', 'resendEmailConfirmation', 'success', { email });
      return;
    }

    await this.emailProvider.sendVerificationEmail({
      email,
      templateName: 'verification',
      metadata: {
        source: 'facade',
      },
    });
    this.log('email-provider', 'sendVerificationEmail', 'success', { email });
  }

  async verifyEmailConfirmationCode(email: string, code: string): Promise<void> {
    if (this.executionProvider.verifyEmailConfirmationCode) {
      await this.executionProvider.verifyEmailConfirmationCode(email, code);
      this.log('email-provider', 'verifyEmailConfirmationCode', 'success', { email });
      return;
    }

    throw new AlternunProviderError(
      'Email confirmation code verification is not supported by the active execution provider.'
    );
  }

  async signOut(): Promise<void> {
    this.log('execution-provider', 'signOut', 'start');
    await Promise.allSettled([
      this.executionProvider.signOut(),
      this.issuerProvider.logoutIssuerSession({ reason: 'signOut' }),
    ]);

    this.currentExecutionSession = null;
    this.currentIssuerSession = null;
    this.currentAlternunSession = null;
    this.currentCompatUser = null;
    this.lastExchangeKey = null;
    this.emit(null);
    this.log('execution-provider', 'signOut', 'success');
  }

  async getExecutionSession(): Promise<ExecutionSession | null> {
    const session = this.currentExecutionSession ?? (await this.safeGetExecutionSession());
    this.currentExecutionSession = session;
    return session;
  }

  async refreshExecutionSession(): Promise<ExecutionSession | null> {
    this.currentExecutionSession = await this.executionProvider.refreshExecutionSession();
    await this.refreshState('refreshExecutionSession', { allowExchange: true });
    return this.currentExecutionSession;
  }

  async getIssuerSession(): Promise<IssuerSession | null> {
    const session = this.currentIssuerSession ?? (await this.safeGetIssuerSession());
    this.currentIssuerSession = session;
    return session;
  }

  async refreshIssuerSession(): Promise<IssuerSession | null> {
    this.currentIssuerSession = await this.issuerProvider.refreshIssuerSession();
    await this.refreshState('refreshIssuerSession', { allowExchange: true });
    return this.currentIssuerSession;
  }

  async logoutIssuerSession(options?: {
    reason?: string;
    redirectTo?: string | null;
  }): Promise<void> {
    await this.issuerProvider.logoutIssuerSession(options);
    this.currentIssuerSession = null;
    this.currentAlternunSession = null;
    await this.refreshState('logoutIssuerSession', { allowExchange: false });
  }

  async getAlternunSession(): Promise<AlternunSession | null> {
    if (this.currentAlternunSession) {
      return this.currentAlternunSession;
    }

    const issuerSession = await this.getIssuerSession();
    if (issuerSession) {
      const executionSession = await this.getExecutionSession();
      this.currentAlternunSession = createAlternunSession({
        issuerSession,
        executionSession,
      });
      return this.currentAlternunSession;
    }

    const executionSession = await this.getExecutionSession();
    if (executionSession?.externalIdentity) {
      const alternunSession = await this.safeExchangeIdentity(
        executionSession,
        'getAlternunSession'
      );
      if (alternunSession) {
        return alternunSession;
      }
    }

    return null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    this.attachExecutionSubscription();

    void this.getUser()
      .then((user) => callback(user))
      .catch(() => callback(null));

    return () => {
      this.listeners.delete(callback);
      this.detachExecutionSubscription();
    };
  }

  setOidcUser(user: User | null): void {
    this.currentCompatUser = user;
    this.emit(user);
  }

  async getSessionToken(): Promise<string | null> {
    const alternunSession = await this.getAlternunSession();
    if (alternunSession?.issuerAccessToken) {
      return alternunSession.issuerAccessToken;
    }

    const issuerSession = await this.getIssuerSession();
    if (issuerSession?.accessToken) {
      return issuerSession.accessToken;
    }

    const executionSession = await this.getExecutionSession();
    return executionSession?.accessToken ?? null;
  }
}
