/**
 * useAirsRefresh — Hook for managing Airs score refresh with daily TTL.
 *
 * Initially fetches once per day; extensible for WebSocket subscriptions.
 * Provides:
 * - Last refresh timestamp
 * - TTL-based cache validation
 * - Manual refresh trigger
 * - Metadata for UI (validity dates, update info)
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface AirsRefreshMetadata {
  /** ISO timestamp of last refresh */
  lastRefreshAt: string | null;
  /** ISO timestamp when current data expires */
  expiresAt: string | null;
  /** Whether data is stale (past expiry) */
  isStale: boolean;
  /** Milliseconds until data expires */
  ttlMs: number | null;
}

interface UseAirsRefreshOptions {
  /** Refresh interval in milliseconds. Default: 24 hours */
  refreshIntervalMs?: number;
  /** Callback when auto-refresh is triggered */
  onAutoRefresh?: () => Promise<void>;
}

export function useAirsRefresh(options: UseAirsRefreshOptions = {}): {
  metadata: AirsRefreshMetadata;
  refresh: () => Promise<void>;
  setRefreshTime: (timestamp: string) => void;
  isLoading: boolean;
} {
  const { refreshIntervalMs = 24 * 60 * 60 * 1000, onAutoRefresh } = options;

  const [metadata, setMetadata] = useState<AirsRefreshMetadata>({
    lastRefreshAt: null,
    expiresAt: null,
    isStale: true,
    ttlMs: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update metadata when refresh time changes
  const setRefreshTime = useCallback(
    (timestamp: string) => {
      const refreshAt = new Date(timestamp);
      const expiresAt = new Date(refreshAt.getTime() + refreshIntervalMs);

      setMetadata({
        lastRefreshAt: timestamp,
        expiresAt: expiresAt.toISOString(),
        isStale: false,
        ttlMs: refreshIntervalMs,
      });
    },
    [refreshIntervalMs]
  );

  // Calculate remaining TTL
  useEffect((): (() => void) | void => {
    if (!metadata.expiresAt) return;

    const updateTTL = (): void => {
      const now = new Date();
      const expiry = new Date(metadata.expiresAt!);
      const remaining = expiry.getTime() - now.getTime();

      setMetadata((prev) => ({
        ...prev,
        isStale: remaining <= 0,
        ttlMs: remaining > 0 ? remaining : null,
      }));
    };

    updateTTL();
    const interval = setInterval(updateTTL, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [metadata.expiresAt]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onAutoRefresh) {
        await onAutoRefresh();
      }
      setRefreshTime(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, [onAutoRefresh, setRefreshTime]);

  // Set up auto-refresh timer
  useEffect((): (() => void) => {
    if (!metadata.lastRefreshAt) return () => {};

    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
    }

    // Schedule next refresh
    autoRefreshTimerRef.current = setTimeout((): void => {
      void refresh();
    }, refreshIntervalMs);

    return (): void => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current);
      }
    };
  }, [metadata.lastRefreshAt, refreshIntervalMs, refresh]);

  return {
    metadata,
    refresh,
    setRefreshTime,
    isLoading,
  };
}
