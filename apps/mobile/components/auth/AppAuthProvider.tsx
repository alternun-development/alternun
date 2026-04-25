import {
  AppAuthProvider as AlternunAuthProvider,
  useAuth as useAlternunAuth,
} from '@alternun/auth';
import { useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { createWeb3WalletBridge } from './walletBridge';
import { clearOidcSession, readOidcSession } from '@alternun/auth';
import {
  authentikPreset,
  oidcSessionToUser,
  type CallbackCapableAuthClient,
} from './authWebSession';
import { shouldClearOidcSessionOnAuthStateChange } from './authSessionBridge';
import { isBetterAuthExecutionEnabled } from './authExecutionMode';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

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

function getBetterAuthUrl(): string | undefined {
  // Try environment variable first (should be set by build process)
  const envUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  if (envUrl?.trim()) {
    // Env var is already the full auth URL (e.g., http://localhost:8082/auth or https://testnet.api.alternun.co/auth)
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Fallback: derive API base from window.location.origin, then append /auth
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined;
  if (origin) {
    const apiBase = resolveMobileApiBaseUrl(undefined, origin);
    // Append /auth if not already present (single source of truth pattern)
    if (apiBase) {
      const normalized = apiBase.trim().replace(/\/+$/, '');
      return normalized.endsWith('/auth') ? normalized : `${normalized}/auth`;
    }
  }
  return undefined;
}

const BETTER_AUTH_SESSION_KEY = 'alternun.better-auth.session';

function readStoredBetterAuthSession(): string | null {
  if (typeof globalThis?.localStorage === 'undefined') {
    return null;
  }

  try {
    return globalThis.localStorage.getItem(BETTER_AUTH_SESSION_KEY);
  } catch {
    return null;
  }
}

function storeBetterAuthSession(token: string | null): void {
  if (typeof globalThis?.localStorage === 'undefined') {
    return;
  }

  try {
    if (token) {
      globalThis.localStorage.setItem(BETTER_AUTH_SESSION_KEY, token);
    } else {
      globalThis.localStorage.removeItem(BETTER_AUTH_SESSION_KEY);
    }
  } catch {
    // Silently fail - storage might be unavailable
  }
}

function AuthSessionBridge(): null {
  const { client } = useAlternunAuth();
  const hasReceivedAuthStateRef = useRef(false);
  const previousUserRef = useRef<import('@alternun/auth').User | null | undefined>(undefined);
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();

  // Restore stored OIDC session on mount (survives page reload)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (isBetterAuthExecution) {
      clearOidcSession();
      // For Better Auth, restore session from localStorage first (faster), then from cookies
      const restoreSession = async () => {
        try {
          // Try to restore from localStorage first for faster initialization
          const storedToken = readStoredBetterAuthSession();
          console.log('[Auth] Stored token from localStorage:', storedToken ? 'exists' : 'none');

          // Restore from cookies and validate with server
          const user = await client.getUser();
          console.log(
            '[Auth] getUser() on mount returned:',
            user ? `user (${user.email})` : 'null'
          );

          // If we got a user, store their session token in localStorage for next time
          if (user) {
            const token = await client.getSessionToken?.();
            console.log('[Auth] getSessionToken() on mount:', token ? 'exists' : 'null');
            if (token) {
              storeBetterAuthSession(token);
            }
          } else {
            // Clear stored session if validation failed
            storeBetterAuthSession(null);
          }
        } catch (error) {
          console.error(
            '[Auth] Session restore error:',
            error instanceof Error ? error.message : String(error)
          );
          // Silently fail - user will see the landing page and can sign in
          storeBetterAuthSession(null);
        }
      };
      void restoreSession();
      return;
    }

    const session = readOidcSession();
    if (!session) return;
    const callbackClient = client as CallbackCapableAuthClient;
    // Re-provision on restore to ensure Supabase UUID is current; fall back to sub.
    void authentikPreset
      .onSessionReady(session.claims, session.provider)
      .then((appUserId) => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session, appUserId));
      })
      .catch(() => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session));
      });
  }, [client, isBetterAuthExecution]);

  // Clear OIDC session and revoke token when user signs out; sync Better Auth session token on sign in
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (isBetterAuthExecution) {
      clearOidcSession();
      // Also clear the stored Better Auth session from localStorage on sign out
      storeBetterAuthSession(null);

      // Listen for auth state changes to sync session token for all signin methods
      return client.onAuthStateChange((user) => {
        if (user) {
          console.log('[Auth] onAuthStateChange: user signed in:', user.email);
          // User logged in - store session token for persistence across reloads
          void (async () => {
            try {
              // Wait briefly for cookies to be processed by browser
              await new Promise((resolve) => setTimeout(resolve, 50));

              // Get the session token - this will fetch from server using cookies
              const token = await client.getSessionToken?.();
              console.log(
                '[Auth] onAuthStateChange: getSessionToken returned:',
                token ? 'token exists' : 'null'
              );
              if (token) {
                storeBetterAuthSession(token);
                console.log('[Auth] onAuthStateChange: stored token to localStorage');
              }
            } catch (error) {
              console.error(
                '[Auth] onAuthStateChange error:',
                error instanceof Error ? error.message : String(error)
              );
              // Silently fail - session will be restored from cookies if available
            }
          })();
        } else {
          console.log('[Auth] onAuthStateChange: user signed out');
          // User logged out
          storeBetterAuthSession(null);
        }
      });
    }

    return client.onAuthStateChange((user) => {
      const shouldClearOidcSession = shouldClearOidcSessionOnAuthStateChange({
        hasReceivedAuthState: hasReceivedAuthStateRef.current,
        previousUser: previousUserRef.current,
        nextUser: user,
      });

      hasReceivedAuthStateRef.current = true;
      previousUserRef.current = user;

      if (!shouldClearOidcSession) return;

      const session = readOidcSession();
      clearOidcSession();
      if (session?.tokens.accessToken ?? session?.tokens.idToken) {
        void authentikPreset
          .logoutHandler({
            accessToken: session.tokens.accessToken,
            idToken: session.tokens.idToken,
          })
          .then((result: { endSessionUrl?: string }) => {
            if (typeof window !== 'undefined' && result.endSessionUrl) {
              window.location.assign(result.endSessionUrl);
            }
          })
          .catch(() => {
            // Best-effort token revocation — local session already cleared
          });
      }
    });
  }, [client, isBetterAuthExecution]);

  return null;
}

export function AppAuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), []);
  const betterAuthBaseUrl = useMemo(() => getBetterAuthUrl(), []);

  return (
    <AlternunAuthProvider
      options={{
        supabaseUrl: getSupabaseUrl(),
        supabaseKey: getSupabaseKey(),
        walletBridge,
        allowMockWalletFallback: getAllowMockWalletFallback(),
        allowWalletOnlySession: getAllowWalletOnlySession(),
        betterAuthBaseUrl,
      }}
    >
      {children}
      <AuthSessionBridge />
    </AlternunAuthProvider>
  );
}

export const useAuth = useAlternunAuth;
export type { OAuthFlow, User } from '@alternun/auth';
