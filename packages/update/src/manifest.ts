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
