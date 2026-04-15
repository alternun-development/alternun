export type IdentitySourceLoginFlowMode = 'source' | 'logout-then-source';

export function normalizeGoogleSourceLoginFlowMode(
  value: string | undefined
): IdentitySourceLoginFlowMode {
  const normalized = value?.trim().toLowerCase().replace(/_/g, '-') ?? '';

  if (
    normalized === 'logout-then-source' ||
    normalized === 'logout-first' ||
    normalized === 'logout-before-source'
  ) {
    return 'logout-then-source';
  }

  return 'source';
}
