/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// The pure rule module: importing all of @alternun/ui needs native modules in Jest.
import {
  resolveTier,
  tierSpecOf,
  TIERS,
  UNRANKED_TIER,
} from '../../../../../packages/ui/src/components/airsTiers';

describe('Airs tiers', () => {
  it('has no tier below 1.000 Airs, then Bronze, Silver, Gold and Platinum', () => {
    expect(resolveTier(0)).toBeNull();
    expect(resolveTier(999)).toBeNull();
    expect(resolveTier(1_000)).toBe('bronze');
    expect(resolveTier(2_999)).toBe('bronze');
    expect(resolveTier(3_000)).toBe('silver');
    expect(resolveTier(7_000)).toBe('gold');
    expect(resolveTier(11_999)).toBe('gold');
    expect(resolveTier(12_000)).toBe('platinum');
  });

  it('shows the way to Bronze before the first tier', () => {
    expect(tierSpecOf(null)).toBe(UNRANKED_TIER);
    expect(UNRANKED_TIER).toMatchObject({ min: 0, max: 1_000, next: 'bronze' });
    expect(tierSpecOf('bronze')).toBe(TIERS.bronze);
    expect(TIERS.bronze).toMatchObject({ min: 1_000, max: 3_000, next: 'silver' });
    expect(TIERS.platinum).toMatchObject({ min: 12_000, max: null, next: null });
  });
});
