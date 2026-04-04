export interface ReleaseManifest {
  version: string;
}
export declare function normalizeReleaseVersion(value: string | undefined | null): string;
export declare function createReleaseManifest(version: string): ReleaseManifest;
export declare function parseReleaseManifest(value: unknown): ReleaseManifest | null;
export declare function serializeReleaseManifest(manifest: ReleaseManifest): string;
