import { resolveMobileApiBaseUrl } from './runtimeConfig';

/** Honor awards ("Galardones de honor"): special medals and trophies of people and allies. */

export type HonorAwardTier = 'generic' | 'gold' | 'silver' | 'bronze';
export type HonorAwardKind = 'medal' | 'trophy';

export interface HonorAwardRecipe {
  id: string;
  kind: HonorAwardKind;
  tier: HonorAwardTier;
  audience: 'user' | 'enterprise';
  title: string;
  classification: string | null;
  purpose: string | null;
  eventName: string | null;
  eventYear: number | null;
  /** Dates as the card back prints them ("Noviembre 21 y 22 - 2026"); older APIs omit it. */
  eventDates?: string | null;
  venueName: string | null;
  venueLocation: string | null;
  airsAmount: number;
  badgeImageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  /** Built-in art the app draws when there is no image ("golf_mangrove", "coast"). */
  artPreset?: string | null;
}

export interface HonorAward {
  id: string;
  status: 'pending' | 'claimed';
  awardedAt: string;
  claimedAt: string | null;
  recipe: HonorAwardRecipe;
  project: {
    id: string;
    slug: string;
    title: string;
    /** From the project content; older API versions leave them out. */
    location?: string | null;
    description?: string | null;
  } | null;
  partner: {
    id: string;
    slug: string;
    displayName: string;
    description: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    /** ISO country code of the ally (e.g. "CO"), shown under its name on the card. */
    countryCode?: string | null;
  } | null;
}

/** A medal for people the person does not hold yet: shown locked in their legacy. */
export type HonorAwardCatalogItem = Pick<HonorAward, 'recipe' | 'project' | 'partner'>;

export class HonorAwardRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(code ?? `HTTP_${status}`);
    this.name = 'HonorAwardRequestError';
  }
}

/** Where awards are listed and claimed: the signed-in person, an ally they manage, or an ally's public page. */
export type HonorAwardScope =
  | { kind: 'me' }
  | { kind: 'enterprise-manage'; enterpriseId: string }
  | { kind: 'enterprise-public'; slug: string };

/** How many of an ally's honor awards a person holds (for example hotel stays). */
export interface HonorAwardGuestSummary {
  found: boolean;
  total: number;
  byRecipe: Array<{ recipeId: string; title: string; count: number }>;
}

export interface HonorAwardGrantInput {
  recipeId: string;
  email: string;
  /** Needed when the email has no Airs account yet. */
  recipientName?: string;
  /** For example the reservation number: one medal per stay. */
  reference?: string;
}

/**
 * What a send did. With Airs it is an Airs report: "released" (credited, the award waits to be
 * claimed), "pending_approval" (an approver decides) or "awaiting_claim" (no account yet).
 */
export type HonorAwardSendResult =
  | { kind: 'grant'; grantId: string }
  | { kind: 'airs_report'; reportId: string; reportStatus: string; airsAmount: number };

/** A claim code as the ally's team sees it; the code itself is shown only when created. */
export interface HonorAwardClaimCode {
  id: string;
  recipeId: string;
  recipeTitle: string;
  recipeEventName: string | null;
  hint: string;
  label: string | null;
  maxRedemptions: number;
  redemptionCount: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface HonorAwardClaimCodeInput {
  recipeId: string;
  label?: string;
  maxRedemptions: number;
  validDays: number;
}

export interface HonorAwardRedeemResult {
  recipeId: string;
  airsAmount: number;
  reportStatus: string | null;
  /** The award to claim now, when it was given right away. */
  grantId: string | null;
}

/** What an ally's team does from its manage view: give its honor awards and look up a guest. */
export interface HonorAwardAllyDesk {
  listRecipes(): Promise<HonorAwardRecipe[]>;
  grant(input: HonorAwardGrantInput): Promise<HonorAwardSendResult>;
  lookupGuest(email: string): Promise<HonorAwardGuestSummary>;
  listCodes(): Promise<HonorAwardClaimCode[]>;
  /** The new code in clear text, only in this response. */
  createCode(
    input: HonorAwardClaimCodeInput
  ): Promise<{ code: string; record: HonorAwardClaimCode }>;
  revokeCode(codeId: string): Promise<HonorAwardClaimCode>;
}

export interface HonorAwardClient {
  list(): Promise<HonorAward[]>;
  claim(awardId: string): Promise<HonorAward>;
  readonly canClaim: boolean;
  /** Only for the signed-in person: the medals they can still earn. */
  catalog?(): Promise<HonorAwardCatalogItem[]>;
  /** Only for the signed-in person: redeem a claim code shared by an ally. */
  redeem?(code: string): Promise<HonorAwardRedeemResult>;
  /** Only for an ally's manage view. */
  readonly desk?: HonorAwardAllyDesk;
}

export function honorAwardsPath(scope: HonorAwardScope): string {
  switch (scope.kind) {
    case 'me':
      return '/v1/me/honor-awards';
    case 'enterprise-manage':
      return `/v1/me/enterprises/${encodeURIComponent(scope.enterpriseId)}/manage/honor-awards`;
    default:
      return `/v1/enterprises/${encodeURIComponent(scope.slug)}/honor-awards`;
  }
}

export function createHonorAwardClient(
  scope: HonorAwardScope,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): HonorAwardClient {
  const base = `${apiUrl.replace(/\/+$/, '')}${honorAwardsPath(scope)}`;
  const needsAuth = scope.kind !== 'enterprise-public';

  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (needsAuth) {
      const token = await getToken();
      if (!token) throw new HonorAwardRequestError(401, 'AUTH_REQUIRED');
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetcher(`${base}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      let code: string | undefined;
      try {
        const body = (await response.json()) as { code?: unknown };
        code = typeof body.code === 'string' ? body.code : undefined;
      } catch {
        // No JSON error body: the status code is enough.
      }
      throw new HonorAwardRequestError(response.status, code);
    }
    return (await response.json()) as T;
  }

  return {
    canClaim: needsAuth,
    list: () => request<HonorAward[]>(''),
    claim: (awardId) => {
      if (!needsAuth) return Promise.reject(new HonorAwardRequestError(403, 'READ_ONLY'));
      return request<HonorAward>(`/${encodeURIComponent(awardId)}/claim`, 'POST');
    },
    ...(scope.kind === 'me'
      ? {
          catalog: () => request<HonorAwardCatalogItem[]>('/catalog'),
          redeem: (code: string) =>
            request<HonorAwardRedeemResult>('/redeem', 'POST', { code: code.trim() }),
        }
      : {}),
    ...(scope.kind === 'enterprise-manage'
      ? {
          desk: {
            listRecipes: () => request<HonorAwardRecipe[]>('/recipes'),
            grant: (input: HonorAwardGrantInput) => {
              const reference = input.reference?.trim();
              const recipientName = input.recipientName?.trim();
              return request<HonorAwardSendResult>('/grants', 'POST', {
                recipeId: input.recipeId,
                email: input.email.trim().toLowerCase(),
                ...(recipientName ? { recipientName } : {}),
                ...(reference ? { reference } : {}),
              });
            },
            listCodes: () => request<HonorAwardClaimCode[]>('/codes'),
            createCode: (input: HonorAwardClaimCodeInput) => {
              const label = input.label?.trim();
              return request<{ code: string; record: HonorAwardClaimCode }>('/codes', 'POST', {
                recipeId: input.recipeId,
                maxRedemptions: input.maxRedemptions,
                validDays: input.validDays,
                ...(label ? { label } : {}),
              });
            },
            revokeCode: (codeId: string) =>
              request<HonorAwardClaimCode>(`/codes/${encodeURIComponent(codeId)}/revoke`, 'POST'),
            lookupGuest: (email: string) =>
              request<HonorAwardGuestSummary>('/guests/lookup', 'POST', {
                email: email.trim().toLowerCase(),
              }),
          },
        }
      : {}),
  };
}

/** Pending awards first (they wait for the claim), then the newest. */
export function sortHonorAwards(awards: readonly HonorAward[]): HonorAward[] {
  return [...awards].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'pending' ? -1 : 1;
    return right.awardedAt.localeCompare(left.awardedAt);
  });
}

/** A public page whose medals to earn are listed: an ally or a project. */
export type HonorCatalogSource = { kind: 'enterprise' | 'project'; slug: string };

/** The active medals people can earn with an ally or through a project (no sign-in needed). */
export async function fetchPublicHonorCatalog(
  source: HonorCatalogSource,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): Promise<HonorAwardCatalogItem[]> {
  const collection = source.kind === 'enterprise' ? 'enterprises' : 'projects';
  const response = await fetcher(
    `${apiUrl.replace(/\/+$/, '')}/v1/${collection}/${encodeURIComponent(
      source.slug
    )}/honor-awards/catalog`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new HonorAwardRequestError(response.status);
  const body: unknown = await response.json();
  return Array.isArray(body) ? (body as HonorAwardCatalogItem[]) : [];
}
