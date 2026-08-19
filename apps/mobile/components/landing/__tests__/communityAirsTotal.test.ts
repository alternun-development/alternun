/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { fetchCommunityAirsTotal, getEligibleSpendReference } from '../communityAirsTotal';

describe('fetchCommunityAirsTotal', () => {
  it('loads the public aggregate without inventing a fallback total', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalAirs: 1250.5, updatedAt: '2026-08-19T12:00:00.000Z' }),
    });

    await expect(fetchCommunityAirsTotal(fetcher, 'https://api.alternun.co')).resolves.toEqual({
      totalAirs: 1250.5,
      updatedAt: '2026-08-19T12:00:00.000Z',
    });
    expect(fetcher).toHaveBeenCalledWith('https://api.alternun.co/v1/airs/community-total');
  });
});

describe('getEligibleSpendReference', () => {
  it('uses the published allied-commerce earning rate only as a purchase reference', () => {
    expect(getEligibleSpendReference(240)).toBe(48);
  });
});
