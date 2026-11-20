/**
 * Airs tiers: thresholds on accumulated Airs and the spec each tier shows. No React Native
 * imports, so the rule can be tested on its own.
 */
import { palette } from '../tokens/colors';
import type { AirsTier, TierSpec } from './airsTiers.types';

// Thresholds on accumulated Airs: the T&C Status thresholds (3.000 / 7.000 / 12.000) with
// Bronze as the first tier at 1.000. Below 1.000 a person has no tier yet.
export const TIERS: Record<AirsTier, TierSpec> = {
  bronze: {
    label: 'Bronze',
    color: '#cd7f32',
    trackColor: 'rgba(205,127,50,0.28)',
    min: 1_000,
    max: 3_000,
    next: 'silver',
    nextLabel: 'Silver',
  },
  silver: {
    label: 'Silver',
    color: palette.statusSilver,
    trackColor: 'rgba(168,184,204,0.28)',
    min: 3_000,
    max: 7_000,
    next: 'gold',
    nextLabel: 'Gold',
  },
  gold: {
    label: 'Gold',
    color: palette.statusGold,
    trackColor: 'rgba(212,185,106,0.28)',
    min: 7_000,
    max: 12_000,
    next: 'platinum',
    nextLabel: 'Platinum',
  },
  platinum: {
    label: 'Platinum',
    color: palette.statusPlatinum,
    trackColor: 'rgba(155,169,196,0.28)',
    min: 12_000,
    max: null,
    next: null,
    nextLabel: null,
  },
};

/** The state before the first tier: the way to Bronze. */
export const UNRANKED_TIER: TierSpec = {
  label: 'No tier yet',
  color: '#8fa8a2',
  trackColor: 'rgba(143,168,162,0.28)',
  min: 0,
  max: TIERS.bronze.min,
  next: 'bronze',
  nextLabel: 'Bronze',
};

/** The tier reached with a given score, or null below the first tier (Bronze). */
export function resolveTier(score: number): AirsTier | null {
  if (score >= TIERS.platinum.min) return 'platinum';
  if (score >= TIERS.gold.min) return 'gold';
  if (score >= TIERS.silver.min) return 'silver';
  if (score >= TIERS.bronze.min) return 'bronze';
  return null;
}

/** The spec of a tier, or of the way to Bronze when there is no tier yet. */
export function tierSpecOf(tier: AirsTier | null): TierSpec {
  return tier ? TIERS[tier] : UNRANKED_TIER;
}
