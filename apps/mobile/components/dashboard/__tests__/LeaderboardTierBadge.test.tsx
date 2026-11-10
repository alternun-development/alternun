/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { LeaderboardTierBadge } from '../LeaderboardTierBadge';

jest.mock('@alternun/ui', () => ({
  resolveTier: (score: number): string =>
    score >= 20_000 ? 'platinum' : score >= 5_000 ? 'gold' : score >= 1_000 ? 'silver' : 'bronze',
  TIERS: {
    bronze: { label: 'Bronze', color: '#cd7f32' },
    silver: { label: 'Silver', color: '#a8b8cc' },
    gold: { label: 'Gold', color: '#d4b96a' },
    platinum: { label: 'Platinum', color: '#9ba9c4' },
  },
}));
jest.mock('../../profile/badgeAssets', () => ({
  STATUS_BADGES: { bronze: 1, silver: 2, gold: 3 },
}));

function render(score: number): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<LeaderboardTierBadge testID='tier' score={score} />);
  });
  return renderer!;
}

const badge = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(
    (node) => node.props.testID === 'tier' && typeof node.props.onPress === 'function'
  )[0];
const text = (r: ReactTestRenderer): string => JSON.stringify(r.toJSON());

describe('LeaderboardTierBadge', () => {
  it('shows only the icon, labelled with the tier of the balance', () => {
    const bronze = render(30);
    expect(badge(bronze).props.accessibilityLabel).toBe('Bronze');
    expect(bronze.root.findAll((node) => node.props.source === 1).length).toBeGreaterThan(0);
    expect(text(bronze)).not.toContain('"Bronze"]');
    expect(text(bronze)).not.toMatch(/"children":\["Bronze"\]|"children":"Bronze"/);
    expect(badge(render(1_200)).props.accessibilityLabel).toBe('Silver');
  });

  it('expands the tier name on hover and toggles it on press', () => {
    const r = render(30);
    act(() => badge(r).props.onHoverIn());
    expect(text(r)).toContain('Bronze');
    act(() => badge(r).props.onHoverOut());
    expect(badge(r).props.accessibilityState).toEqual({ expanded: false });
    act(() => badge(r).props.onPress());
    expect(badge(r).props.accessibilityState).toEqual({ expanded: true });
    act(() => badge(r).props.onPress());
    expect(badge(r).props.accessibilityState).toEqual({ expanded: false });
  });

  it('falls back to a colored dot without artwork, and treats bad scores as 0', () => {
    const platinum = render(25_000);
    expect(platinum.root.findAll((node) => node.props.source !== undefined)).toHaveLength(0);
    expect(badge(platinum).props.accessibilityLabel).toBe('Platinum');
    expect(badge(render(Number.NaN)).props.accessibilityLabel).toBe('Bronze');
  });
});
