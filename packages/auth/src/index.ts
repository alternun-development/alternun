export { AuthProvider } from "@edcalderon/auth";
export type {
  AuthCapabilities,
  AuthClient,
  AuthRuntime,
  OAuthFlow,
  SignInOptions,
  User,
} from "@edcalderon/auth";

export {
  AppAuthProvider,
  useAuth,
  type AppAuthProviderProps,
} from "./mobile/AppAuthProvider";

export {
  AlternunMobileAuthClient,
  SUPPORTED_WALLET_PROVIDERS,
  createAlternunMobileAuthClient,
  isWalletProvider,
  type AlternunMobileAuthClientOptions,
  type WalletConnectionBridge,
  type WalletConnectionResult,
  type WalletProvider,
} from "./mobile/AlternunMobileAuthClient";

export {
  emailAddressSchema,
  signInPasswordSchema,
  signUpPasswordSchema,
  parseEmailAddress,
  parseSignInPassword,
  parseSignUpPassword,
  getValidationErrorMessage,
} from "./validation/authInputValidation";
