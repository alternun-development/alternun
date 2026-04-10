import type { AuthRuntime, OAuthFlow, SignInOptions, User } from '@edcalderon/auth';
export type AuthExecutionProviderName = 'better-auth' | 'supabase';
export type IdentityIssuerProviderName = 'authentik' | 'supabase-legacy';
export type EmailProviderName = 'supabase' | 'postmark' | 'ses';
export type LinkedAuthAccountType = 'social' | 'password' | 'wallet' | 'oidc' | 'custom';
export type WalletProvider = 'metamask' | 'walletconnect';
export interface WalletConnectionResult {
  walletAddress: string;
  connectedAt?: string;
  sessionToken?: string | null;
  metadata?: Record<string, unknown>;
}
export interface WalletConnectionBridge {
  connect(provider: WalletProvider): Promise<WalletConnectionResult>;
  disconnect?: (provider: WalletProvider, walletAddress: string) => Promise<void>;
}
export interface ExternalIdentity {
  provider: string;
  providerUserId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  avatarUrl?: string;
  rawClaims: Record<string, unknown>;
}
export interface Principal {
  issuer: string;
  subject: string;
  email?: string;
  roles: string[];
  metadata: Record<string, unknown>;
}
export interface LinkedAuthAccount {
  provider: string;
  providerUserId: string;
  type: LinkedAuthAccountType;
  email?: string;
  displayName?: string;
  linkedAt?: string;
  metadata: Record<string, unknown>;
}
export interface ExecutionSession {
  provider: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresAt?: number | null;
  externalIdentity?: ExternalIdentity | null;
  linkedAccounts: LinkedAuthAccount[];
  raw: Record<string, unknown>;
}
export interface IssuerSession {
  issuer: string;
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresAt?: number | null;
  principal: Principal;
  claims: Record<string, unknown>;
  linkedAccounts: LinkedAuthAccount[];
  raw: Record<string, unknown>;
}
export interface AlternunSession {
  issuerAccessToken: string;
  issuerRefreshToken: string | null;
  executionSession: ExecutionSession | null;
  principal: Principal;
  linkedAccounts: LinkedAuthAccount[];
}
export interface ClaimValidationResult {
  valid: boolean;
  principal: Principal | null;
  errors: string[];
}
export interface IssuerDiscoveryConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  endSessionEndpoint?: string;
  jwksUri?: string;
  clientId?: string;
}
export interface AuthExecutionSignInOptions {
  provider: string;
  flow?: OAuthFlow;
  redirectUri?: string;
  email?: string;
  password?: string;
  web3?: SignInOptions['web3'];
  locale?: string;
  metadata?: Record<string, unknown>;
  forceFreshSession?: boolean;
}
export interface AuthExecutionSignUpInput {
  email: string;
  password: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}
export interface AuthExecutionResult {
  session: ExecutionSession | null;
  externalIdentity: ExternalIdentity | null;
  redirectUrl?: string | null;
  needsEmailVerification?: boolean;
  emailAlreadyRegistered?: boolean;
  confirmationEmailSent?: boolean;
}
export interface AuthLinkProviderInput {
  provider: string;
  providerUserId: string;
  type: LinkedAuthAccountType;
  email?: string;
  metadata?: Record<string, unknown>;
}
export interface AuthUnlinkProviderInput {
  provider: string;
  providerUserId: string;
  type: LinkedAuthAccountType;
}
export interface IdentityExchangeInput {
  externalIdentity: ExternalIdentity;
  executionSession?: ExecutionSession | null;
  claims?: Record<string, unknown>;
  redirectTo?: string | null;
  context?: Record<string, unknown>;
}
export interface PrincipalRecord extends Principal {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface UserProjectionRecord {
  appUserId: string;
  principalId?: string;
  principal: Principal;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  status?: string;
  metadata: Record<string, unknown>;
}
export interface ProvisioningEventRecord {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status?: string;
  attempts?: number;
}
export interface EmailMessageInput {
  email: string;
  locale?: string;
  subject?: string;
  displayName?: string;
  redirectUrl?: string;
  templateName?: string;
  metadata?: Record<string, unknown>;
}
export interface EmailProviderHealthcheckResult {
  ok: boolean;
  provider: EmailProviderName;
  details?: Record<string, unknown>;
}
export interface AuthRuntimeConfig {
  runtime: AuthRuntime;
  executionProvider: AuthExecutionProviderName;
  issuerProvider: IdentityIssuerProviderName;
  emailProvider: EmailProviderName;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseAnonKey?: string;
  authentikIssuer?: string;
  authentikClientId?: string;
  authentikRedirectUri?: string;
  betterAuthBaseUrl?: string;
  betterAuthClientId?: string;
  betterAuthApiKey?: string;
  authExchangeUrl?: string;
  emailFrom?: string;
  emailSenderName?: string;
  emailLocale?: string;
  allowMockWalletFallback?: boolean;
  allowWalletOnlySession?: boolean;
}
export interface AuthCompatUser extends User {
  provider?: string;
  providerUserId?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
}
