import {
  AppAuthProvider,
  AlternunMobileAuthClient,
  type AuthClient,
  type OAuthFlow,
  type SignInOptions,
  type User,
  type WalletConnectionBridge,
  useAuth,
} from "@alternun/auth";

// Compile-time smoke test for React Native support in @alternun/auth.
type NativeFlow = Extract<OAuthFlow, "native">;
type _AuthClient = AuthClient;
type _SignInOptions = SignInOptions;
type _User = User;

declare const walletBridge: WalletConnectionBridge;

const client = new AlternunMobileAuthClient({
  supabaseUrl: "https://example.supabase.co",
  supabaseKey: "sb_publishable_example",
  walletBridge,
  allowMockWalletFallback: false,
});

async function smokeSignInWithGoogle(authClient: AuthClient, flow: NativeFlow) {
  await authClient.signIn({ provider: "google", flow });
}

async function smokeSignInWithWallet(authClient: AuthClient) {
  await authClient.signIn({ provider: "walletconnect", flow: "native" });
}

void AppAuthProvider;
void useAuth;
void client;
void smokeSignInWithGoogle;
void smokeSignInWithWallet;
