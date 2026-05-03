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

type RefreshableAuthClient = {
  getUser(): Promise<import('@alternun/auth').User | null>;
};

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

const SESSION_TOKEN_KEY = 'alternun_session_token';

function getStoredSessionToken(): string | null {
  if (!window?.localStorage) {
    return null;
  }
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

function storeSessionToken(token: string): void {
  if (!window?.localStorage) {
    return;
  }
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

function clearStoredSessionToken(): void {
  if (!window?.localStorage) {
    return;
  }
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

function AuthSessionBridge(): null {
  const { client } = useAlternunAuth();
  const hasReceivedAuthStateRef = useRef(false);
  const previousUserRef = useRef<import('@alternun/auth').User | null | undefined>(undefined);
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const hasAttemptedRestoreRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (hasAttemptedRestoreRef.current) return;
    hasAttemptedRestoreRef.current = true;

    if (isBetterAuthExecution) {
      clearOidcSession();
      // For Better Auth, read the current session twice because the browser session
      // can still be rehydrating when the profile page mounts after a reload.
      const restoreSession = async () => {
        const refreshableClient = client as RefreshableAuthClient;
        try {
          const firstUser = await refreshableClient.getUser();
          if (firstUser) {
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
          await refreshableClient.getUser();
        } catch {
          // Silently fail - user will see landing and can sign in
        }
      };
      void restoreSession();
      return;
    }

    // For Supabase, restore from stored token if available
    const storedToken = getStoredSessionToken();
    if (storedToken) {
      console.log('[Session] Token found in localStorage, attempting restore');
      const restoreSession = async () => {
        try {
          const user = await client.getUser();
          if (user) {
            console.log('[Session] Restored user:', user.email);
          } else {
            console.log('[Session] getUser() returned null, clearing token');
            clearStoredSessionToken();
          }
        } catch (error) {
          console.log(
            '[Session] Restore failed:',
            error instanceof Error ? error.message : String(error)
          );
          clearStoredSessionToken();
        }
      };
      void restoreSession();
    } else {
      console.log('[Session] No stored token found on mount');
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
      // Better Auth handles session via HTTP-only cookies automatically
      return client.onAuthStateChange(() => {
        // No-op: Better Auth manages session state internally
      });
    }

    return client.onAuthStateChange((user) => {
      // For Supabase, manage token storage on user signin/signout
      if (user) {
        console.log('[Session] User signed in:', user.email);
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const token = (
            client as unknown as { getSessionToken?(): Promise<string | null> }
          ).getSessionToken?.();
          if (token) {
            void Promise.resolve(token).then((t) => {
              if (t) {
                console.log('[Session] Storing token for persistence');
                storeSessionToken(t);
              }
            });
          } else {
            console.log('[Session] No getSessionToken available');
          }
        } catch (error) {
          console.log(
            '[Session] Error getting token:',
            error instanceof Error ? error.message : String(error)
          );
        }
      } else {
        console.log('[Session] User signed out');
        clearStoredSessionToken();
      }

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
