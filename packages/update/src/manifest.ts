export interface ReleaseManifest {
  version: string;
}

export function normalizeReleaseVersion(value: string | undefined | null): string {
  const version = value?.trim();

  if (!version) {
    throw new Error('A release version is required.');
  }

  return version;
}

export function createReleaseManifest(version: string): ReleaseManifest {
  return {
    version: normalizeReleaseVersion(version),
  };
}

export function parseReleaseManifest(value: unknown): ReleaseManifest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { version?: unknown };
  if (typeof candidate.version !== 'string') {
    return null;
  }

  const version = candidate.version.trim();
  if (!version) {
    return null;
  }

  return { version };
}

export function serializeReleaseManifest(manifest: ReleaseManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Compare two semantic versions (X.Y.Z format).
 * Returns: 1 if versionA > versionB, -1 if versionA < versionB, 0 if equal.
 */
export function compareReleaseVersions(versionA: string, versionB: string): number {
  const parseVersion = (v: string) => {
    const parts = v.split('.').map((p) => parseInt(p, 10) || 0);
    return { major: parts[0] ?? 0, minor: parts[1] ?? 0, patch: parts[2] ?? 0 };
  };

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  return 0;
}
