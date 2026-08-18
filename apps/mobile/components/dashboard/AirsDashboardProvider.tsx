import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '../auth/AppAuthProvider';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { fetchAirsDashboardSnapshot, withAirsRequestTimeout } from './airsSnapshot';
import type { AirsDashboardSnapshot } from './types';

type AirsDashboardContextValue = {
  snapshot: AirsDashboardSnapshot | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const AirsDashboardContext = createContext<AirsDashboardContextValue | null>(null);

export function AirsDashboardProvider({ children }: React.PropsWithChildren): React.JSX.Element {
  const { user, loading: authLoading, client } = useAuth();
  const { language } = useAppPreferences();
  const [snapshot, setSnapshot] = useState<AirsDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const inFlightUserKeyRef = useRef<string | null>(null);
  const snapshotUserKeyRef = useRef<string | null>(null);
  const onboardingKeyRef = useRef<string | null>(null);

  const userKey =
    typeof user?.id === 'string' && user.id.trim().length > 0
      ? user.id
      : typeof user?.email === 'string' && user.email.trim().length > 0
      ? user.email
      : null;
  const onboardingKey = userKey ? `${userKey}:${language ?? ''}` : null;

  const refresh = useCallback((): Promise<void> => {
    if (inFlightRefreshRef.current && inFlightUserKeyRef.current === userKey) {
      return inFlightRefreshRef.current;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (authLoading) {
      return Promise.resolve();
    }

    if (!userKey) {
      snapshotUserKeyRef.current = null;
      onboardingKeyRef.current = null;
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return Promise.resolve();
    }

    if (snapshotUserKeyRef.current !== userKey) {
      snapshotUserKeyRef.current = userKey;
      setSnapshot(null);
    }

    setIsLoading(true);
    setError(null);

    const nextRefresh = (async (): Promise<void> => {
      try {
        const sessionToken = await withAirsRequestTimeout(async () => client.getSessionToken());
        if (!sessionToken) {
          throw new Error('No AIRS session token is available.');
        }

        const apiBaseUrl = resolveMobileApiBaseUrl();

        if (onboardingKey && onboardingKeyRef.current !== onboardingKey) {
          try {
            const onboardingResponse = await withAirsRequestTimeout((signal) =>
              fetch(`${apiBaseUrl.replace(/\/+$/, '')}/v1/airs/onboarding`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${sessionToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ locale: language }),
                signal,
              })
            );

            if (onboardingResponse.ok) {
              onboardingKeyRef.current = onboardingKey;
            }
          } catch {
            // Onboarding is idempotent and must never replace the canonical balance read below.
          }
        }

        const nextSnapshot = await withAirsRequestTimeout((signal) =>
          fetchAirsDashboardSnapshot({
            apiBaseUrl,
            sessionToken,
            signal,
          })
        );

        if (requestIdRef.current === requestId) {
          setSnapshot(nextSnapshot);
        }
      } catch (cause) {
        if (requestIdRef.current === requestId) {
          setError(cause instanceof Error ? cause : new Error('Unable to load the AIRS balance.'));
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    })();

    inFlightRefreshRef.current = nextRefresh;
    inFlightUserKeyRef.current = userKey;
    void nextRefresh.finally(() => {
      if (inFlightRefreshRef.current === nextRefresh) {
        inFlightRefreshRef.current = null;
        inFlightUserKeyRef.current = null;
      }
    });

    return nextRefresh;
  }, [authLoading, client, language, onboardingKey, userKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleSnapshot = snapshotUserKeyRef.current === userKey ? snapshot : null;
  const value = useMemo(
    () => ({ snapshot: visibleSnapshot, isLoading, error, refresh }),
    [error, isLoading, refresh, visibleSnapshot]
  );

  return <AirsDashboardContext.Provider value={value}>{children}</AirsDashboardContext.Provider>;
}

export function useAirsDashboardSnapshot(): AirsDashboardContextValue {
  const value = useContext(AirsDashboardContext);
  if (!value) {
    throw new Error('useAirsDashboardSnapshot must be used inside AirsDashboardProvider.');
  }

  return value;
}
