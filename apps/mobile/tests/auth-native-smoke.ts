import {
  AppAuthProvider,
  AlternunMobileAuthClient,
  type AuthClient,
  type OAuthFlow,
  type SignInOptions,
  type User,
  type WalletConnectionBridge,
  useAuth,
} from '@alternun/auth';

// Compile-time smoke test for React Native support in @alternun/auth.
type NativeFlow = Extract<OAuthFlow, 'native'>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AuthClient = AuthClient;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _SignInOptions = SignInOptions;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _User = User;

declare const walletBridge: WalletConnectionBridge;

const client = new AlternunMobileAuthClient({
  supabaseUrl: 'https://example.supabase.co',
  supabaseKey: 'sb_publishable_example',
  walletBridge,
  allowMockWalletFallback: false,
});

async function smokeSignInWithGoogle(authClient: AuthClient, flow: NativeFlow): Promise<void> {
  await authClient.signIn({ provider: 'google', flow });
}

async function smokeSignInWithWallet(authClient: AuthClient): Promise<void> {
  await authClient.signIn({ provider: 'walletconnect', flow: 'native' });
}

void AppAuthProvider;
void useAuth;
void client;
void smokeSignInWithGoogle;
void smokeSignInWithWallet;
