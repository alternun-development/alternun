export interface CommunityAirsTotal {
  totalAirs: number;
  updatedAt: string | null;
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
