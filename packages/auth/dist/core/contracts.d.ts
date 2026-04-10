import type {
  AlternunSession,
  AuthExecutionResult,
  AuthExecutionSignInOptions,
  AuthExecutionSignUpInput,
  AuthLinkProviderInput,
  AuthRuntimeConfig,
  AuthUnlinkProviderInput,
  ClaimValidationResult,
  EmailMessageInput,
  EmailProviderHealthcheckResult,
  EmailProviderName,
  ExecutionSession,
  IdentityExchangeInput,
  IdentityIssuerProviderName,
  IssuerDiscoveryConfig,
  IssuerSession,
  LinkedAuthAccount,
  Principal,
  PrincipalRecord,
  ProvisioningEventRecord,
  UserProjectionRecord,
  AuthExecutionProviderName,
  WalletConnectionBridge,
  ExternalIdentity,
} from './types';
export interface AuthLoggerEvent {
  channel:
    | 'execution-provider'
    | 'issuer-exchange'
    | 'repository-upsert'
    | 'email-provider'
    | 'compatibility'
    | 'runtime';
  action: string;
  outcome: 'start' | 'success' | 'failure' | 'fallback' | 'skipped';
  message?: string;
  details?: Record<string, unknown>;
}
export interface AuthLogger {
  log(event: AuthLoggerEvent): void;
}
export interface AuthExecutionProvider {
  readonly name: AuthExecutionProviderName;
  signIn(options: AuthExecutionSignInOptions): Promise<AuthExecutionResult>;
  signUp(input: AuthExecutionSignUpInput): Promise<AuthExecutionResult>;
  signOut(): Promise<void>;
  getExecutionSession(): Promise<ExecutionSession | null>;
  refreshExecutionSession(): Promise<ExecutionSession | null>;
  linkProvider(input: AuthLinkProviderInput): Promise<LinkedAuthAccount | null>;
  unlinkProvider(input: AuthUnlinkProviderInput): Promise<void>;
}
export interface IdentityIssuerProvider {
  readonly name: IdentityIssuerProviderName;
  exchangeIdentity(input: IdentityExchangeInput): Promise<AlternunSession>;
  getIssuerSession(): Promise<IssuerSession | null>;
  refreshIssuerSession(): Promise<IssuerSession | null>;
  logoutIssuerSession(options?: { reason?: string; redirectTo?: string | null }): Promise<void>;
  discoverIssuerConfig(): Promise<IssuerDiscoveryConfig>;
  validateClaims(
    claims: Record<string, unknown>,
    options?: {
      issuer?: string;
      audience?: string | string[];
    }
  ): Promise<ClaimValidationResult>;
}
export interface EmailProvider {
  readonly name: EmailProviderName;
  sendVerificationEmail(input: EmailMessageInput): Promise<void>;
  sendPasswordResetEmail(input: EmailMessageInput): Promise<void>;
  sendMagicLink(input: EmailMessageInput): Promise<void>;
  healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
export interface IdentityRepository {
  readonly name: string;
  upsertPrincipal(input: {
    principal: Principal;
    externalIdentity?: ExternalIdentity | null;
    source?: string;
  }): Promise<PrincipalRecord>;
  findPrincipalByExternalIdentity(input: {
    externalIdentity: ExternalIdentity;
  }): Promise<PrincipalRecord | null>;
  upsertUserProjection(input: UserProjectionRecord): Promise<UserProjectionRecord>;
  upsertLinkedAccount(input: {
    principalId?: string;
    principal: Principal;
    linkedAccount: LinkedAuthAccount;
  }): Promise<LinkedAuthAccount>;
  recordProvisioningEvent(input: ProvisioningEventRecord): Promise<void>;
}
export type IdentityRepositoryContract = IdentityRepository;
export interface CreateAuthFacadeInput {
  executionProvider: AuthExecutionProvider;
  issuerProvider: IdentityIssuerProvider;
  emailProvider: EmailProvider;
  identityRepository: IdentityRepository;
  runtime: AuthRuntimeConfig;
  logger?: AuthLogger;
  walletBridge?: WalletConnectionBridge | null;
  allowMockWalletFallback?: boolean;
  allowWalletOnlySession?: boolean;
}
