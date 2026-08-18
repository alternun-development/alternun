import type { AirsDashboardSnapshot } from './types';

export type AirsDashboardLoadState = {
  isInitialLoading: boolean;
  error: Error | null;
};

export function resolveAirsDashboardLoadState({
  snapshot,
  isLoading,
  error,
}: {
  snapshot: AirsDashboardSnapshot | null | undefined;
  isLoading: boolean | undefined;
  error: Error | null | undefined;
}): AirsDashboardLoadState {
  return {
    isInitialLoading: !snapshot && Boolean(isLoading),
    error: error ?? null,
  };
}
