import type { HonorAward, HonorAwardTier } from '../../utils/honorAwards';

const DEMO_TIERS: readonly HonorAwardTier[] = ['gold', 'silver', 'bronze', 'generic'];
const DEMO_AIRS: Record<HonorAwardTier, number> = { gold: 15, silver: 10, bronze: 5, generic: 5 };

/** Each empty slot previews a different tier: gold, silver, bronze, generic, then again. */
export function demoTierForSlot(index: number): HonorAwardTier {
  return DEMO_TIERS[((index % DEMO_TIERS.length) + DEMO_TIERS.length) % DEMO_TIERS.length];
}

/**
 * A sample award (the Manglar Verde golf medal) used only to preview the claim animation and
 * the card from an empty slot. Nothing is saved and the screens label it as a demo.
 */
export function buildDemoHonorAward(
  tier: HonorAwardTier,
  copy: { classification: string; purpose: string }
): HonorAward {
  return {
    id: `demo-${tier}`,
    status: 'claimed',
    awardedAt: '2026-10-30T12:00:00Z',
    claimedAt: '2026-10-30T12:00:00Z',
    recipe: {
      id: `demo-${tier}`,
      kind: 'medal',
      tier,
      audience: 'user',
      title: 'Manglar Verde',
      classification: copy.classification,
      purpose: copy.purpose,
      eventName: 'Tour Colombia FCG Callaway',
      eventYear: 2026,
      venueName: 'Club El Rincón de Cajicá',
      venueLocation: 'Cajicá, Cundinamarca – CO.',
      airsAmount: DEMO_AIRS[tier],
      badgeImageUrl: null,
      frontImageUrl: null,
      backImageUrl: null,
      artPreset: 'golf_mangrove',
    },
    project: { id: 'demo-project', slug: '', title: 'Fundación Batis' },
    partner: {
      id: 'demo-partner',
      slug: '',
      displayName: 'Swing Golf Colombia',
      description: null,
      logoUrl: null,
      websiteUrl: null,
    },
  };
}
