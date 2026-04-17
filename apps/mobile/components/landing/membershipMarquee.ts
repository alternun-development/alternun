const DEFAULT_LOGO_SIZE = 60;
const DEFAULT_LOGO_GAP = 16;

export const MEMBERSHIP_MARQUEE_BASE_DISTANCE = 300;
export const MEMBERSHIP_MARQUEE_LEFT_BASE_DURATION_MS = 4000;
export const MEMBERSHIP_MARQUEE_RIGHT_BASE_DURATION_MS = 5000;

export function getMembershipLogoBandWidth(
  logoCount: number,
  logoSize = DEFAULT_LOGO_SIZE,
  gap = DEFAULT_LOGO_GAP
): number {
  if (!Number.isFinite(logoCount)) {
    return 0;
  }

  const normalizedCount = Math.max(0, Math.floor(logoCount));
  if (normalizedCount === 0) {
    return 0;
  }

  const normalizedLogoSize = Math.max(0, logoSize);
  const normalizedGap = Math.max(0, gap);

  return normalizedCount * normalizedLogoSize + Math.max(normalizedCount - 1, 0) * normalizedGap;
}

export function getMembershipMarqueeRepeatCount(
  viewportWidth: number,
  logoBandWidth: number,
  minimumCopies = 4
): number {
  const normalizedViewportWidth = Number.isFinite(viewportWidth)
    ? Math.max(0, Math.floor(viewportWidth))
    : 0;
  const normalizedLogoBandWidth = Number.isFinite(logoBandWidth)
    ? Math.max(1, Math.floor(logoBandWidth))
    : 1;
  const normalizedMinimumCopies = Math.max(2, Math.floor(minimumCopies));

  return Math.max(
    normalizedMinimumCopies,
    Math.ceil(normalizedViewportWidth / normalizedLogoBandWidth) + 1
  );
}

export function scaleMembershipMarqueeDuration(
  travelDistance: number,
  baseDistance: number,
  baseDurationMs: number
): number {
  if (
    !Number.isFinite(travelDistance) ||
    !Number.isFinite(baseDistance) ||
    !Number.isFinite(baseDurationMs) ||
    baseDistance <= 0 ||
    baseDurationMs <= 0
  ) {
    return Math.max(0, Math.round(baseDurationMs));
  }

  return Math.max(1, Math.round((travelDistance / baseDistance) * baseDurationMs));
}
