/** Honor awards ("Galardones de honor"): special medals and trophies for people and allies. */

export const HONOR_AWARD_TIERS = ['generic', 'gold', 'silver', 'bronze'] as const;
export const HONOR_AWARD_KINDS = ['medal', 'trophy'] as const;
export const HONOR_AWARD_AUDIENCES = ['user', 'enterprise'] as const;

export type HonorAwardTier = (typeof HONOR_AWARD_TIERS)[number];
export type HonorAwardKind = (typeof HONOR_AWARD_KINDS)[number];
export type HonorAwardAudience = (typeof HONOR_AWARD_AUDIENCES)[number];
export type HonorAwardStatus = 'pending' | 'claimed' | 'revoked';
export type HonorAwardSource = 'manual' | 'project_medal';

/** The design of one award: what it looks like, who can get it and what it is tied to. */
export interface HonorAwardRecipeRecord {
  id: string;
  kind: HonorAwardKind;
  tier: HonorAwardTier;
  audience: HonorAwardAudience;
  title: string;
  classification: string | null;
  purpose: string | null;
  eventName: string | null;
  eventYear: number | null;
  venueName: string | null;
  venueLocation: string | null;
  airsAmount: number;
  badgeImageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  /** Built-in art the app draws when there is no image, e.g. "golf_mangrove" or "coast". */
  artPreset: string | null;
  projectId: string | null;
  partnerEnterpriseId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HonorAwardRecipeInput {
  kind?: HonorAwardKind;
  tier?: HonorAwardTier;
  audience?: HonorAwardAudience;
  title?: string;
  classification?: string | null;
  purpose?: string | null;
  eventName?: string | null;
  eventYear?: number | null;
  venueName?: string | null;
  venueLocation?: string | null;
  airsAmount?: number;
  badgeImageUrl?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  artPreset?: string | null;
  projectId?: string | null;
  partnerEnterpriseId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type CreateHonorAwardRecipeInput = HonorAwardRecipeInput & { title: string };

export interface HonorAwardGrantRecord {
  id: string;
  recipeId: string;
  recipientType: HonorAwardAudience;
  userId: string | null;
  enterpriseId: string | null;
  status: HonorAwardStatus;
  source: HonorAwardSource;
  /** For example a hotel reservation number: one grant per stay. */
  reference: string | null;
  note: string | null;
  awardedAt: string;
  claimedAt: string | null;
  revokedAt: string | null;
}

/** Who receives a grant: a person by the email of their account, or an enterprise. */
export type HonorAwardRecipientInput =
  | { recipientType: 'user'; email: string; reference?: string; note?: string }
  | { recipientType: 'enterprise'; enterpriseId: string; note?: string };

/** An ally gives one of its own honor awards to a person, e.g. a hotel medal for a stay. */
export interface EnterpriseHonorAwardGrantInput {
  recipeId: string;
  email: string;
  reference?: string;
  note?: string;
}

/** How many honor awards of an ally a person holds (for example hotel stays). */
export interface HonorAwardGuestSummary {
  found: boolean;
  total: number;
  byRecipe: Array<{ recipeId: string; title: string; count: number }>;
}

export interface HonorAwardProjectSummary {
  id: string;
  slug: string;
  title: string;
}

export interface HonorAwardPartnerSummary {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
}

/** An award as the app shows it: the grant with its recipe, project and ally. */
export interface HonorAwardView {
  id: string;
  status: Exclude<HonorAwardStatus, 'revoked'>;
  awardedAt: string;
  claimedAt: string | null;
  recipe: Omit<
    HonorAwardRecipeRecord,
    'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt' | 'projectId' | 'partnerEnterpriseId'
  >;
  project: HonorAwardProjectSummary | null;
  partner: HonorAwardPartnerSummary | null;
}
