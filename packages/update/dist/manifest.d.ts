export interface ReleaseManifest {
    version: string;
}
export declare function normalizeReleaseVersion(value: string | undefined | null): string;
export declare function createReleaseManifest(version: string): ReleaseManifest;
export declare function parseReleaseManifest(value: unknown): ReleaseManifest | null;
export declare function serializeReleaseManifest(manifest: ReleaseManifest): string;
/**
 * Compare two semantic versions (X.Y.Z format).
 * Returns: 1 if versionA > versionB, -1 if versionA < versionB, 0 if equal.
 */
export declare function compareReleaseVersions(versionA: string, versionB: string): number;
