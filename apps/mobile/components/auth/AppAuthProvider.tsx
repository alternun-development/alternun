import {
  AppAuthProvider as AlternunAuthProvider,
  useAuth as useAlternunAuth,
} from '@alternun/auth';
import { useEffect, useMemo, type PropsWithChildren, } from 'react';
import { Platform, } from 'react-native';
import { createWeb3WalletBridge, } from './walletBridge';
import { clearOidcSession, readOidcSession, } from '@alternun/auth';
import {
  authentikPreset,
  oidcSessionToUser,
  type CallbackCapableAuthClient,
} from './authWebSession';

function getAllowMockWalletFallback(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH === 'true';
}

function getAllowWalletOnlySession(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH === 'true';
}

function getSupabaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URI;
}

function getSupabaseKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

function AuthSessionBridge(): null {
  const { client, } = useAlternunAuth();

  // Restore stored OIDC session on mount (survives page reload)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const session = readOidcSession();
    if (!session) return;
    const callbackClient = client as CallbackCapableAuthClient;
    // Re-provision on restore to ensure Supabase UUID is current; fall back to sub.
    void authentikPreset
      .onSessionReady(session.claims, session.provider,)
      .then((appUserId,) => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session, appUserId,),);
      },)
      .catch(() => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session,),);
      },);
  }, [client,],);

  // Clear OIDC session and revoke token when user signs out
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return client.onAuthStateChange((user,) => {
      if (!user) {
        const session = readOidcSession();
        clearOidcSession();
        if (session?.tokens.accessToken ?? session?.tokens.idToken) {
          void authentikPreset
            .logoutHandler({
              accessToken: session.tokens.accessToken,
              idToken: session.tokens.idToken,
            },)
            .then((result: { endSessionUrl?: string },) => {
              if (typeof window !== 'undefined' && result.endSessionUrl) {
                window.location.assign(result.endSessionUrl,);
              }
            },)
            .catch(() => {
              // Best-effort token revocation — local session already cleared
            },);
        }
      }
    },);
  }, [client,],);

  return null;
}

export function AppAuthProvider({ children, }: PropsWithChildren,): React.JSX.Element {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), [],);

  return (
    <AlternunAuthProvider
      options={{
        supabaseUrl: getSupabaseUrl(),
        supabaseKey: getSupabaseKey(),
        walletBridge,
        allowMockWalletFallback: getAllowMockWalletFallback(),
        allowWalletOnlySession: getAllowWalletOnlySession(),
      }}
    >
      {children}
      <AuthSessionBridge />
    </AlternunAuthProvider>
  );
}

export const useAuth = useAlternunAuth;
export type { OAuthFlow, User, } from '@alternun/auth';
