import type { HonorAward } from '../../utils/honorAwards';
import type { HonorDemoCopy } from './honorAwards.types';

/**
 * A sample legacy medal (Manglar Verde) used only to preview the claim and the mission from an
 * empty slot. Mission medals have a single design (no gold, silver or bronze), so the sample is
 * the generic one. Nothing is saved and the screens label it as a demo.
 */
export function buildDemoHonorAward(copy: HonorDemoCopy): HonorAward {
  return {
    id: 'demo-generic',
    status: 'claimed',
    awardedAt: '2026-10-30T12:00:00Z',
    claimedAt: '2026-10-30T12:00:00Z',
    recipe: {
      id: 'demo-generic',
      kind: 'medal',
      tier: 'generic',
      audience: 'user',
      title: 'Manglar Verde',
      classification: copy.classification,
      purpose: copy.purpose,
      eventName: 'Tour Callaway Colombia',
      eventYear: 2026,
      eventDates: 'Noviembre 21 y 22 - 2026',
      venueName: 'Pueblo Viejo Country Club',
      venueLocation: 'Cota, Cundinamarca – CO.',
      airsAmount: 5,
      badgeImageUrl: null,
      frontImageUrl: null,
      backImageUrl: null,
      artPreset: 'golf_mangrove',
    },
    project: {
      id: 'demo-project',
      slug: '',
      title: 'Fundación Batis',
      location: copy.projectLocation,
      description: copy.projectDescription,
    },
    partner: {
      id: 'demo-partner',
      slug: '',
      displayName: 'Swing Golf',
      description: copy.partnerDescription,
      logoUrl: null,
      websiteUrl: null,
      countryCode: 'CO',
    },
  };
}
