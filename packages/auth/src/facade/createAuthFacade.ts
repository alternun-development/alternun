import type { AuthRuntimeConfig } from '../core/types';
import type {
  AuthLogger,
  CreateAuthFacadeInput,
  EmailProvider,
  IdentityIssuerProvider,
  IdentityRepository,
} from '../core/contracts';
import { resolveAuthRuntimeConfig } from '../runtime/config';
import {
  AlternunMobileAuthClient,
  type AlternunMobileAuthClientOptions,
} from '../mobile/AlternunMobileAuthClient';
import { BetterAuthExecutionProvider } from '../providers/better-auth/BetterAuthExecutionProvider';
import { AuthentikIssuerProvider } from '../providers/authentik/AuthentikIssuerProvider';
import { SupabaseLegacyIssuerProvider } from '../providers/supabase-legacy/SupabaseLegacyIssuerProvider';
import {
  SupabaseExecutionProvider,
  type LegacyExecutionClientLike,
} from '../providers/supabase-legacy/SupabaseExecutionProvider';
import { SupabaseIdentityRepository } from '../providers/supabase-legacy/SupabaseIdentityRepository';
import { PostmarkEmailProvider } from '../providers/email/PostmarkEmailProvider';
import { SesEmailProvider } from '../providers/email/SesEmailProvider';
import { SupabaseEmailProvider } from '../providers/email/SupabaseEmailProvider';
import { upsertOidcUser } from '../compat/upsertOidcUser';
import { AlternunAuthFacade } from './AlternunAuthFacade';

export interface CreateAuthFacadeOptions {
  runtime?: Partial<AuthRuntimeConfig> & { env?: Record<string, string | undefined> };
  executionProvider?: CreateAuthFacadeInput['executionProvider'];
  issuerProvider?: CreateAuthFacadeInput['issuerProvider'];
  emailProvider?: CreateAuthFacadeInput['emailProvider'];
  identityRepository?: IdentityRepository;
  walletBridge?: CreateAuthFacadeInput['walletBridge'];
  allowMockWalletFallback?: boolean;
  allowWalletOnlySession?: boolean;
  logger?: AuthLogger;
  fetchFn?: typeof fetch;
}

function resolveRuntimeConfig(input?: CreateAuthFacadeOptions['runtime']): AuthRuntimeConfig {
  const { env, ...overrides } = input ?? {};
  return {
    ...resolveAuthRuntimeConfig(env),
    ...overrides,
  } as AuthRuntimeConfig;
}

function createIdentityRepository(
  runtime: AuthRuntimeConfig,
  options: CreateAuthFacadeOptions
): IdentityRepository {
  return (
    options.identityRepository ??
    new SupabaseIdentityRepository({
      supabaseUrl: runtime.supabaseUrl,
      supabaseKey: runtime.supabaseKey,
      legacyUpsertFn: upsertOidcUser,
    })
  );
}

function createLegacyExecutionClient(
  runtime: AuthRuntimeConfig,
  options: CreateAuthFacadeOptions
): LegacyExecutionClientLike {
  const legacyClient = new AlternunMobileAuthClient({
    supabaseUrl: runtime.supabaseUrl,
    supabaseKey: runtime.supabaseKey,
    supabaseAnonKey: runtime.supabaseAnonKey,
    walletBridge: options.walletBridge ?? undefined,
    allowMockWalletFallback:
      options.allowMockWalletFallback ?? runtime.allowMockWalletFallback ?? false,
    allowWalletOnlySession:
      options.allowWalletOnlySession ?? runtime.allowWalletOnlySession ?? false,
  } satisfies AlternunMobileAuthClientOptions);

  return {
    runtime: legacyClient.runtime,
    getUser: legacyClient.getUser.bind(legacyClient),
    signInWithEmail: legacyClient.signInWithEmail.bind(legacyClient),
    signInWithGoogle: legacyClient.signInWithGoogle.bind(legacyClient),
    signIn: legacyClient.signIn.bind(legacyClient),
    signOut: legacyClient.signOut.bind(legacyClient),
    onAuthStateChange: legacyClient.onAuthStateChange.bind(legacyClient),
    getSessionToken: legacyClient.getSessionToken.bind(legacyClient),
    capabilities: legacyClient.capabilities.bind(legacyClient),
    signUpWithEmail: legacyClient.signUpWithEmail.bind(legacyClient),
    resendEmailConfirmation: legacyClient.resendEmailConfirmation.bind(legacyClient),
    verifyEmailConfirmationCode: legacyClient.verifyEmailConfirmationCode.bind(legacyClient),
    setOidcUser: legacyClient.setOidcUser.bind(legacyClient),
    supabase: (legacyClient as unknown as { supabase?: unknown }).supabase,
  } satisfies LegacyExecutionClientLike;
}

function hasLegacyEmailSupport(runtime: AuthRuntimeConfig): boolean {
  return Boolean(runtime.supabaseUrl && (runtime.supabaseKey ?? runtime.supabaseAnonKey));
}

function createExecutionProvider(runtime: AuthRuntimeConfig, options: CreateAuthFacadeOptions) {
  if (options.executionProvider) {
    return options.executionProvider;
  }

  const legacyClient = createLegacyExecutionClient(runtime, options);

  if (runtime.executionProvider === 'better-auth') {
    return new BetterAuthExecutionProvider({
      baseUrl: runtime.betterAuthBaseUrl,
      fetchFn: options.fetchFn,
      defaultProvider: 'google',
      walletBridge: options.walletBridge ?? null,
      emailFallbackClient: hasLegacyEmailSupport(runtime) ? legacyClient : null,
    });
  }

  return new SupabaseExecutionProvider(legacyClient);
}

function createIssuerProvider(
  runtime: AuthRuntimeConfig,
  options: CreateAuthFacadeOptions,
  identityRepository: IdentityRepository
): IdentityIssuerProvider {
  if (options.issuerProvider) {
    return options.issuerProvider;
  }

  if (runtime.issuerProvider === 'supabase-legacy') {
    return new SupabaseLegacyIssuerProvider({
      identityRepository,
      issuer: runtime.authentikIssuer,
      clientId: runtime.authentikClientId,
      redirectUri: runtime.authentikRedirectUri,
    });
  }

  return new AuthentikIssuerProvider({
    identityRepository,
    issuer: runtime.authentikIssuer,
    clientId: runtime.authentikClientId,
    redirectUri: runtime.authentikRedirectUri,
    authExchangeUrl: runtime.authExchangeUrl,
    fetchFn: options.fetchFn,
    sessionStorage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  });
}

function createEmailProvider(
  runtime: AuthRuntimeConfig,
  options: CreateAuthFacadeOptions
): EmailProvider {
  if (options.emailProvider) {
    return options.emailProvider;
  }

  switch (runtime.emailProvider) {
    case 'postmark':
      return new PostmarkEmailProvider({
        from: runtime.emailFrom,
        senderName: runtime.emailSenderName,
      });
    case 'ses':
      return new SesEmailProvider({
        from: runtime.emailFrom,
        senderName: runtime.emailSenderName,
      });
    default:
      return new SupabaseEmailProvider({
        from: runtime.emailFrom,
        senderName: runtime.emailSenderName,
      });
  }
}

export function createAuthFacade(options: CreateAuthFacadeOptions = {}): AlternunAuthFacade {
  const runtime = resolveRuntimeConfig(options.runtime);
  const identityRepository = createIdentityRepository(runtime, options);
  const executionProvider = createExecutionProvider(runtime, options);
  const issuerProvider = createIssuerProvider(runtime, options, identityRepository);
  const emailProvider = createEmailProvider(runtime, options);

  return new AlternunAuthFacade({
    executionProvider,
    issuerProvider,
    emailProvider,
    identityRepository,
    runtime,
    logger: options.logger,
    walletBridge: options.walletBridge ?? null,
    allowMockWalletFallback:
      options.allowMockWalletFallback ?? runtime.allowMockWalletFallback ?? false,
    allowWalletOnlySession:
      options.allowWalletOnlySession ?? runtime.allowWalletOnlySession ?? false,
  });
}
