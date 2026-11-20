/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { tierLinePosition } from '../tierJourneyPosition';

const THRESHOLDS = [1_000, 3_000, 7_000, 12_000];
// 400 px wide: nodes centred at 50, 150, 250 and 350; the line runs from 14 to 386.

describe('tierLinePosition', () => {
  it('starts at the line start and reaches each node at its threshold', () => {
    expect(tierLinePosition(0, 400, THRESHOLDS)).toBe(14);
    expect(tierLinePosition(1_000, 400, THRESHOLDS)).toBe(50);
    expect(tierLinePosition(3_000, 400, THRESHOLDS)).toBe(150);
    expect(tierLinePosition(12_000, 400, THRESHOLDS)).toBe(350);
  });

  it('interpolates between thresholds and stops at the line end', () => {
    expect(tierLinePosition(500, 400, THRESHOLDS)).toBe(32);
    expect(tierLinePosition(2_000, 400, THRESHOLDS)).toBe(100);
    expect(tierLinePosition(18_000, 400, THRESHOLDS)).toBe(368);
    expect(tierLinePosition(1_000_000, 400, THRESHOLDS)).toBe(386);
  });

  it('treats bad scores as 0 and needs a measured width', () => {
    expect(tierLinePosition(Number.NaN, 400, THRESHOLDS)).toBe(14);
    expect(tierLinePosition(-5, 400, THRESHOLDS)).toBe(14);
    expect(tierLinePosition(500, 0, THRESHOLDS)).toBe(0);
  });
});
