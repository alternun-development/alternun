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
  venueName: string | null;
  venueLocation: string | null;
  airsAmount: number;
  badgeImageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
}

export interface HonorAward {
  id: string;
  status: 'pending' | 'claimed';
  awardedAt: string;
  claimedAt: string | null;
  recipe: HonorAwardRecipe;
  project: { id: string; slug: string; title: string } | null;
  partner: {
    id: string;
    slug: string;
    displayName: string;
    description: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
  } | null;
}

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

export interface HonorAwardClient {
  list(): Promise<HonorAward[]>;
  claim(awardId: string): Promise<HonorAward>;
  readonly canClaim: boolean;
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

  async function request<T>(path: string, method = 'GET'): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (needsAuth) {
      const token = await getToken();
      if (!token) throw new HonorAwardRequestError(401, 'AUTH_REQUIRED');
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetcher(`${base}${path}`, { method, headers });
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
  };
}

/** Pending awards first (they wait for the claim), then the newest. */
export function sortHonorAwards(awards: readonly HonorAward[]): HonorAward[] {
  return [...awards].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'pending' ? -1 : 1;
    return right.awardedAt.localeCompare(left.awardedAt);
  });
}
