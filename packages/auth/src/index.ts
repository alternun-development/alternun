export { AuthProvider } from '@edcalderon/auth';
export type {
  AuthCapabilities,
  AuthClient,
  AuthRuntime,
  OAuthFlow,
  SignInOptions,
  User,
} from '@edcalderon/auth';

export { AppAuthProvider, useAuth, type AppAuthProviderProps } from './mobile/AppAuthProvider';

export { AlternunAuthFacade } from './facade/AlternunAuthFacade';
export { createAuthFacade } from './facade/createAuthFacade';

export {
  AuthentikIssuerProvider,
  type AuthentikIssuerProviderOptions,
} from './providers/authentik/AuthentikIssuerProvider';
export {
  BetterAuthExecutionProvider,
  type BetterAuthExecutionProviderOptions,
  type BetterAuthClientLike,
} from './providers/better-auth/BetterAuthExecutionProvider';
export {
  SupabaseExecutionProvider,
  type SupabaseExecutionProviderOptions,
  type LegacyExecutionClientLike,
} from './providers/supabase-legacy/SupabaseExecutionProvider';
export {
  SupabaseLegacyIssuerProvider,
  type SupabaseLegacyIssuerProviderOptions,
} from './providers/supabase-legacy/SupabaseLegacyIssuerProvider';
export {
  SupabaseIdentityRepository,
  type SupabaseIdentityRepositoryOptions,
} from './providers/supabase-legacy/SupabaseIdentityRepository';
export { SupabaseEmailProvider } from './providers/email/SupabaseEmailProvider';
export { PostmarkEmailProvider } from './providers/email/PostmarkEmailProvider';
export { SesEmailProvider } from './providers/email/SesEmailProvider';

export { resolveAuthRuntimeConfig, resolveAuthProviderSelection } from './runtime/config';

export { upsertOidcUser as upsertCompatOidcUser } from './compat/upsertOidcUser';

export type {
  ExternalIdentity,
  Principal,
  LinkedAuthAccount,
  ExecutionSession,
  IssuerSession,
  AlternunSession,
  ClaimValidationResult,
  IssuerDiscoveryConfig,
  AuthRuntimeConfig,
  AuthCompatUser,
  AuthExecutionResult,
  AuthExecutionSignInOptions,
  AuthExecutionSignUpInput,
  AuthLinkProviderInput,
  AuthUnlinkProviderInput,
  EmailMessageInput,
  EmailProviderHealthcheckResult,
  AuthExecutionProviderName,
  IdentityIssuerProviderName,
  EmailProviderName,
  LinkedAuthAccountType,
} from './core/types';

export type {
  AuthExecutionProvider,
  IdentityIssuerProvider,
  EmailProvider,
  IdentityRepository,
  AuthLogger,
  CreateAuthFacadeInput,
} from './core/contracts';

export {
  createAlternunAuthentikPreset,
  type AlternunAuthentikPresetOptions,
  type AlternunAuthentikPreset,
} from './mobile/authentikPreset';

export {
  buildAuthentikRelayPath,
  buildAuthentikRelayRoute,
  getAuthentikLoginEntryMode,
  getAuthentikSocialLoginMode,
  normalizeAuthentikLoginEntryMode,
  normalizeAuthentikSocialLoginMode,
  parseAuthentikProviderFlowSlugs,
  resolveAuthentikLoginStrategy,
  resolveAuthentikProviderFlowSlugs,
  shouldUseAuthentikRelayEntry,
  type AuthentikLoginEntryMode,
  type AuthentikLoginStrategy,
  type AuthentikProviderFlowSlugs,
  type AuthentikRelayProvider,
  type AuthentikRelayRoute,
  type AuthentikSocialLoginMode,
  type ResolveAuthentikLoginStrategyOptions,
} from './mobile/authEntry';

export {
  clearAuthReturnTo,
  getAuthentikWebCallbackUrl,
  nativeSignIn,
  readAuthReturnTo,
  resolveAuthReturnTo,
  resolveAuthRuntime,
  storeAuthReturnTo,
  webRedirectSignIn,
  type NativeSignInOptions,
  type WebRedirectSignInOptions,
} from './mobile/runtimeSignIn';

export {
  AlternunMobileAuthClient,
  SUPPORTED_WALLET_PROVIDERS,
  createAlternunMobileAuthClient,
  isWalletProvider,
  type AlternunMobileAuthClientOptions,
  type WalletConnectionBridge,
  type WalletConnectionResult,
  type WalletProvider,
} from './mobile/AlternunMobileAuthClient';

export {
  buildAuthentikOAuthFlowStartUrl,
  buildAuthentikLoginEntryUrl,
  isAuthentikConfigured,
  hasPendingAuthentikCallback,
  startAuthentikOAuthFlow,
  handleAuthentikCallback,
  readOidcSession,
  clearOidcSession,
  readPendingAuthentikOAuthProvider,
  clearPendingAuthentikOAuthProvider,
  AUTHENTIK_WEB_CALLBACK_PATH,
  buildAuthentikWebCallbackUrl,
  resolveAuthentikRedirectUri,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  OIDC_INITIAL_SEARCH,
  createAuthentikPreset,
  createAuthentikRelayHandler,
  createAuthentikLogoutHandler,
  createProvisioningAdapter,
  handleAuthentikPresetCallback,
  discoverEndpoints,
  resolveSafeRedirect,
  validateAuthentikConfig,
  validateFullConfig,
  type AlternunAuthentikOAuthFlowOptions,
  type BuildAuthentikLoginEntryUrlInput,
  type OidcClaims,
  type OidcSession,
  type OidcProvider,
  type OidcTokens,
  type AuthentikOidcConfig,
  type AuthentikPreset,
  type AuthentikPresetConfig,
  type CreateAuthentikPresetOptions,
  type HandleAuthentikCallbackInput,
  type AuthentikRelayHandler,
  type AuthentikRelayConfig,
  type AuthentikCallbackConfig,
  type AuthentikLogoutConfig,
  type AuthentikEndpoints,
  type AuthentikProvider,
  type AuthentikCallbackResult,
  type ProcessCallbackResult,
  type AuthentikLogoutResult,
  type ProvisioningAdapter,
  type ProvisioningPayload,
  type ProvisioningResult,
  type SafeRedirectConfig,
} from './authentik';

export { upsertOidcUser } from './AuthentikOidcClient';

export {
  emailAddressSchema,
  signInPasswordSchema,
  signUpPasswordSchema,
  parseEmailAddress,
  parseSignInPassword,
  parseSignUpPassword,
  getValidationErrorMessage,
} from './validation/authInputValidation';
