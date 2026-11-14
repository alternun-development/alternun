export type HonorAwardTier = 'generic' | 'gold' | 'silver' | 'bronze';
export type HonorAwardKind = 'medal' | 'trophy';
export type HonorAwardAudience = 'user' | 'enterprise';

/** The design of one honor award ("Galardón de honor"). */
export type HonorAwardRecipe = {
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
  /** Built-in art the app draws when there is no image. */
  artPreset: string | null;
  projectId: string | null;
  partnerEnterpriseId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type HonorAwardGrant = {
  id: string;
  recipeId: string;
  recipientType: HonorAwardAudience;
  userId: string | null;
  enterpriseId: string | null;
  status: 'pending' | 'claimed' | 'revoked';
  source: 'manual' | 'project_medal';
  /** For example a hotel reservation number. */
  reference: string | null;
  note: string | null;
  awardedAt: string;
  claimedAt: string | null;
  revokedAt: string | null;
};

/** Form values: every field is text while editing. */
export type HonorAwardRecipeValues = {
  title: string;
  kind: HonorAwardKind;
  tier: HonorAwardTier;
  audience: HonorAwardAudience;
  classification: string;
  purpose: string;
  eventName: string;
  eventYear: string;
  venueName: string;
  venueLocation: string;
  airsAmount: string;
  badgeImageUrl: string;
  frontImageUrl: string;
  backImageUrl: string;
  artPreset: string;
  projectId: string;
  partnerEnterpriseId: string;
};

export type HonorAwardRecipeErrors = Partial<Record<keyof HonorAwardRecipeValues, string>>;

export type HonorAwardGrantValues = {
  email: string;
  enterpriseId: string;
  reference: string;
  note: string;
};
