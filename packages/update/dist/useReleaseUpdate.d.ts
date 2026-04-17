export type ReleaseUpdateMode = 'auto' | 'on' | 'off';
export interface ReleaseUpdateOptions {
  currentVersion: string;
  mode?: string | null;
  manifestUrl?: string;
  workerUrl?: string;
  appOrigin?: string | null;
  pollIntervalMs?: number;
  storageKey?: string;
  onReload?: () => void;
}
export interface ReleaseUpdateRuntime {
  origin: string | null;
  hostname: string | null;
  manifestUrl: string;
  workerUrl: string;
}
export interface ReleaseUpdateState {
  enabled: boolean;
  checking: boolean;
  available: boolean;
  currentVersion: string;
  remoteVersion: string | null;
  error: string | null;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
  dismiss: () => void;
  reload: () => void;
}
export declare function normalizeReleaseUpdateMode(
  value: string | null | undefined
): ReleaseUpdateMode;
export declare function isReleaseUpdateEnabled(
  mode: ReleaseUpdateMode,
  hostname?: string | null
): boolean;
export declare function resolveReleaseUpdateRuntime({
  origin,
  manifestUrl,
  workerUrl,
}?: {
  origin?: string | null;
  manifestUrl?: string | null;
  workerUrl?: string | null;
}): ReleaseUpdateRuntime;
export declare function buildReleaseManifestJson(version: string): string;
export declare function buildReleaseWorkerSource(
  currentVersion: string,
  manifestUrl?: string
): string;
export declare function useReleaseUpdate({
  currentVersion,
  mode,
  manifestUrl,
  workerUrl,
  appOrigin,
  pollIntervalMs,
  storageKey,
  onReload,
}: ReleaseUpdateOptions): ReleaseUpdateState;
