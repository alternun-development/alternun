import type { RbiProjectionInput, RbiProjectionMetrics } from './types';

function isNonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function calculateRbiProjection({
  airs,
  participationFactor,
  communityEligibleAirs,
}: RbiProjectionInput): RbiProjectionMetrics {
  const hasParticipationFactor =
    isNonNegativeFinite(participationFactor) && participationFactor <= 1;
  const participationFactorPercent = hasParticipationFactor ? participationFactor * 100 : null;
  const eligibleAirs =
    isNonNegativeFinite(airs) && hasParticipationFactor ? airs * participationFactor : null;
  const aliquotPercent =
    eligibleAirs !== null && isNonNegativeFinite(communityEligibleAirs) && communityEligibleAirs > 0
      ? (eligibleAirs / communityEligibleAirs) * 100
      : null;

  return {
    participationFactorPercent,
    eligibleAirs,
    aliquotPercent,
  };
}
