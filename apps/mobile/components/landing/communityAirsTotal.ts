export interface CommunityAirsTotal {
  totalAirs: number;
  updatedAt: string | null;
}

/** The published earning rate for eligible allied-commerce purchases. */
export const AIRS_PER_ELIGIBLE_USD = 5;

/**
 * Gives a purchase-only reference for an AIRS amount. AIRS can also be earned
 * through non-purchase activities, so this must never be presented as a cash value.
 */
export function getEligibleSpendReference(totalAirs: number): number {
  return totalAirs / AIRS_PER_ELIGIBLE_USD;
}

export async function fetchCommunityAirsTotal(
  fetcher: typeof fetch,
  apiBaseUrl: string
): Promise<CommunityAirsTotal> {
  const response = await fetcher(`${apiBaseUrl.replace(/\/+$/, '')}/v1/airs/community-total`);
  if (!response.ok) {
    throw new Error('Unable to load the community AIRS total.');
  }

  const body = (await response.json()) as { totalAirs?: unknown; updatedAt?: unknown };
  const totalAirs = typeof body.totalAirs === 'number' ? body.totalAirs : Number(body.totalAirs);
  if (!Number.isFinite(totalAirs) || totalAirs < 0) {
    throw new Error('Community AIRS total response is invalid.');
  }

  return {
    totalAirs,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : null,
  };
}
