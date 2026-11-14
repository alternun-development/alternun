import { marketplaceCopy } from './copy';
import { isValidMedalImageUrl } from './medals';
import type {
  HonorAwardGrantValues,
  HonorAwardRecipe,
  HonorAwardRecipeErrors,
  HonorAwardRecipeValues,
} from './honor-awards.types';

export const HONOR_AWARD_TIERS = ['generic', 'gold', 'silver', 'bronze'] as const;
export const HONOR_AWARD_KINDS = ['medal', 'trophy'] as const;
export const HONOR_AWARD_AUDIENCES = ['user', 'enterprise'] as const;
/** Built-in art the app can draw; empty means the generic shield. */
export const HONOR_ART_PRESETS = ['golf_mangrove', 'coast'] as const;

export const honorAwardRecipesPath = '/v1/admin/honor-awards/recipes';

export function honorAwardRecipePath(recipeId: string): string {
  return `${honorAwardRecipesPath}/${encodeURIComponent(recipeId)}`;
}

export function honorAwardGrantsPath(recipeId: string): string {
  return `${honorAwardRecipePath(recipeId)}/grants`;
}

export function honorAwardRevokePath(grantId: string): string {
  return `/v1/admin/honor-awards/grants/${encodeURIComponent(grantId)}/revoke`;
}

export const emptyHonorAwardRecipe: HonorAwardRecipeValues = {
  title: '',
  kind: 'medal',
  tier: 'generic',
  audience: 'user',
  classification: '',
  purpose: '',
  eventName: '',
  eventYear: '',
  venueName: '',
  venueLocation: '',
  airsAmount: '0',
  badgeImageUrl: '',
  frontImageUrl: '',
  backImageUrl: '',
  artPreset: '',
  projectId: '',
  partnerEnterpriseId: '',
};

export const emptyHonorAwardGrant: HonorAwardGrantValues = {
  email: '',
  enterpriseId: '',
  reference: '',
  note: '',
};

const TEXT_LIMITS: ReadonlyArray<[keyof HonorAwardRecipeValues, number]> = [
  ['classification', 80],
  ['purpose', 500],
  ['eventName', 120],
  ['venueName', 120],
  ['venueLocation', 160],
];
const IMAGE_FIELDS = ['badgeImageUrl', 'frontImageUrl', 'backImageUrl'] as const;

/** Values of a saved recipe, ready to edit. */
export function recipeToValues(recipe: HonorAwardRecipe): HonorAwardRecipeValues {
  return {
    title: recipe.title,
    kind: recipe.kind,
    tier: recipe.tier,
    audience: recipe.audience,
    classification: recipe.classification ?? '',
    purpose: recipe.purpose ?? '',
    eventName: recipe.eventName ?? '',
    eventYear: recipe.eventYear == null ? '' : String(recipe.eventYear),
    venueName: recipe.venueName ?? '',
    venueLocation: recipe.venueLocation ?? '',
    airsAmount: String(recipe.airsAmount),
    badgeImageUrl: recipe.badgeImageUrl ?? '',
    frontImageUrl: recipe.frontImageUrl ?? '',
    backImageUrl: recipe.backImageUrl ?? '',
    artPreset: recipe.artPreset ?? '',
    projectId: recipe.projectId ?? '',
    partnerEnterpriseId: recipe.partnerEnterpriseId ?? '',
  };
}

export function validateHonorAwardRecipe(values: HonorAwardRecipeValues): HonorAwardRecipeErrors {
  const copy = marketplaceCopy.honorAwards.errors;
  const errors: HonorAwardRecipeErrors = {};
  const title = values.title.trim();
  if (!title || title.length > 80) errors.title = copy.title;
  for (const [field, max] of TEXT_LIMITS) {
    if (values[field].trim().length > max) errors[field] = copy.tooLong(max);
  }
  const year = values.eventYear.trim();
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100)) {
    errors.eventYear = copy.eventYear;
  }
  const airs = values.airsAmount.trim();
  if (!/^\d{1,7}$/.test(airs) || Number(airs) > 1_000_000) errors.airsAmount = copy.airsAmount;
  for (const field of IMAGE_FIELDS) {
    const value = values[field].trim();
    if (value && !isValidMedalImageUrl(value)) errors[field] = copy.imageUrl;
  }
  return errors;
}

/** Request body: blank optional text is sent as null so it can be cleared on edit. */
export function buildHonorAwardRecipeBody(values: HonorAwardRecipeValues): Record<string, unknown> {
  const optional = (value: string): string | null => value.trim() || null;
  return {
    title: values.title.trim(),
    kind: values.kind,
    tier: values.tier,
    audience: values.audience,
    classification: optional(values.classification),
    purpose: optional(values.purpose),
    eventName: optional(values.eventName),
    eventYear: values.eventYear.trim() ? Number(values.eventYear.trim()) : null,
    venueName: optional(values.venueName),
    venueLocation: optional(values.venueLocation),
    airsAmount: Number(values.airsAmount.trim() || '0'),
    badgeImageUrl: optional(values.badgeImageUrl),
    frontImageUrl: optional(values.frontImageUrl),
    backImageUrl: optional(values.backImageUrl),
    artPreset: optional(values.artPreset),
    projectId: optional(values.projectId),
    partnerEnterpriseId: optional(values.partnerEnterpriseId),
  };
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** A grant goes to a person by account email or to an enterprise, as the recipe says. */
export function validateHonorAwardGrant(
  recipe: Pick<HonorAwardRecipe, 'audience'>,
  values: HonorAwardGrantValues
): string | null {
  const copy = marketplaceCopy.honorAwards.errors;
  if (recipe.audience === 'user' && !EMAIL_PATTERN.test(values.email.trim())) return copy.email;
  if (recipe.audience === 'enterprise' && !values.enterpriseId) return copy.enterprise;
  if (values.reference.trim().length > 80) return copy.tooLong(80);
  if (values.note.trim().length > 300) return copy.tooLong(300);
  return null;
}

export function buildHonorAwardGrantBody(
  recipe: Pick<HonorAwardRecipe, 'audience'>,
  values: HonorAwardGrantValues
): Record<string, string> {
  const note = values.note.trim();
  const reference = values.reference.trim();
  return recipe.audience === 'user'
    ? {
        recipientType: 'user',
        email: values.email.trim().toLowerCase(),
        ...(reference ? { reference } : {}),
        ...(note ? { note } : {}),
      }
    : { recipientType: 'enterprise', enterpriseId: values.enterpriseId, ...(note ? { note } : {}) };
}

/** Active recipes first, then by sort order and title. */
export function sortHonorAwardRecipes(recipes: readonly HonorAwardRecipe[]): HonorAwardRecipe[] {
  return [...recipes].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title)
  );
}
