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
  isAuthentikConfigured,
  hasPendingAuthentikCallback,
  startAuthentikOAuthFlow,
  handleAuthentikCallback,
  readOidcSession,
  clearOidcSession,
  OIDC_INITIAL_SEARCH,
  type OidcClaims,
  type OidcSession,
  type OidcProvider,
  type OidcTokens,
  type AuthentikOidcConfig,
} from '@edcalderon/auth';

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
