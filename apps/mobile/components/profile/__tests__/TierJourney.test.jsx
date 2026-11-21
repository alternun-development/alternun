import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { TierJourney } from '../TierJourney';
import { TierDetailsModal } from '../TierDetailsModal';
import { STATUS_DETAIL_BADGES } from '../badgeAssets';

jest.mock('@alternun/ui', () => {
  const { View } = require('react-native');
  const tiers = {
    bronze: { label: 'Bronze', min: 0, color: '#cd7f32', next: 'silver' },
    silver: { label: 'Silver', min: 1000, color: '#a8b8cc', next: 'gold' },
    gold: { label: 'Gold', min: 5000, color: '#d4b96a', next: 'platinum' },
    platinum: { label: 'Platinum', min: 20000, color: '#9ba9c4', next: null },
  };
  const unranked = { label: 'Green', min: 0, color: '#2fb67c', next: 'bronze' };
  return {
    GlassCard: View,
    TIERS: tiers,
    UNRANKED_TIER: unranked,
    tierSpecOf: (tier) => (tier ? tiers[tier] : unranked),
    resolveTier: (score) =>
      score >= 20000 ? 'platinum' : score >= 5000 ? 'gold' : score >= 1000 ? 'silver' : 'bronze',
  };
});
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: 'off' }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    locale: 'en',
    t: (_key, params, fallback) => fallback.replace(/{{(\w+)}}/g, (_, key) => String(params[key])),
  }),
}));

const colors = { text: '#fff', muted: '#aaa' };
const textContent = (tree) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .join(' ');

it.each([
  ['Bronze', 'bronze', '0+ AIRS'],
  ['Silver', 'silver', '1,000+ AIRS'],
  ['Gold', 'gold', '5,000+ AIRS'],
  ['Platinum', 'platinum', '20,000+ AIRS'],
])(
  'opens %s from the journey, including locked tiers, and dismisses it',
  (label, tier, threshold) => {
    let tree;
    act(() => {
      tree = renderer.create(<TierJourney score={100} isDark c={colors} />);
    });
    expect(tree.root.findAllByType(Modal)).toHaveLength(0);
    act(() => {
      tree.root
        .findAllByType(TouchableOpacity)
        .find((node) => node.props.accessibilityLabel === label)
        .props.onPress();
    });
    expect(textContent(tree)).toContain(`${label} status`);
    expect(textContent(tree)).toContain(threshold);
    expect(textContent(tree)).toContain('What AIRS opens up');
    if (tier !== 'platinum') {
      expect(
        tree.root
          .findAllByType(Image)
          .some((node) => node.props.source === STATUS_DETAIL_BADGES[tier])
      ).toBe(true);
    }
    act(() => {
      tree.root
        .findAll((node) => typeof node.props.onPress === 'function')
        .find((node) => node.props.accessibilityLabel === 'Close tier details')
        .props.onPress();
    });
    expect(tree.root.findAllByType(Modal)).toHaveLength(0);
    act(() => tree.unmount());
  }
);

it.each([
  [null, 'Your score is currently unavailable'],
  [100, '4,900 AIRS to reach this tier'],
  [5000, 'Your current tier'],
  [20000, 'Milestone reached'],
])(
  'explains progress for score=%s and supports backdrop and native dismissal',
  (score, expected) => {
    let tree;
    const onClose = jest.fn();
    act(() => {
      tree = renderer.create(<TierDetailsModal tier='gold' score={score} onClose={onClose} />);
    });
    expect(textContent(tree)).toContain(expected);
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    act(() =>
      tree.root
        .findAll((node) => typeof node.props.onPress === 'function')
        .find((node) => node.props.testID === 'tier-details-backdrop')
        .props.onPress()
    );
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => tree.unmount());
  }
);

it.each([
  // Fill width in px on a 400 px line: it runs from 14 px up to the person's position.
  [null, false, 0, 0, 'Your score is currently unavailable'],
  [0, true, 36, 1, '20,000 AIRS to reach this tier'],
  [1000, false, 136, 2, '19,000 AIRS to reach this tier'],
  [5000, true, 236, 3, '15,000 AIRS to reach this tier'],
  [20000, false, 336, 3, 'Your current tier'],
  [25000, true, 345, 3, 'Your current tier'],
])(
  'shows accurate milestone progress at score=%s in dark mode=%s',
  (score, isDark, progressWidth, reachedImageCount, expectedDetails) => {
    let tree;
    act(() => {
      tree = renderer.create(<TierJourney score={score} isDark={isDark} c={colors} />);
    });
    const line = tree.root.find((node) => typeof node.props.onLayout === 'function');
    act(() => line.props.onLayout({ nativeEvent: { layout: { width: 400 } } }));

    const tracks = tree.root.findAllByType(View).filter((node) => node.props.style?.height === 3);
    expect(tracks).toHaveLength(2);
    expect(tracks[0].props.style.backgroundColor).toBe(
      isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)'
    );
    expect(tracks[1].props.style.width).toBe(progressWidth);
    const images = tree.root.findAllByType(Image);
    expect(images).toHaveLength(3);
    expect(images.filter((node) => node.props.style.opacity === 1)).toHaveLength(reachedImageCount);
    expect(images.filter((node) => node.props.style.opacity === 0.35)).toHaveLength(
      3 - reachedImageCount
    );

    const platinum = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.props.accessibilityLabel === 'Platinum');
    const marker = platinum.findAllByType(View).find((node) => node.props.style?.borderWidth === 2);
    const reachedPlatinum = score !== null && score >= 20000;
    expect(marker.props.style.backgroundColor).toBe(reachedPlatinum ? '#9ba9c4' : 'transparent');
    expect(marker.props.style.borderColor).toBe(
      reachedPlatinum ? '#9ba9c4' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,45,49,0.12)'
    );
    expect(platinum.findAllByType(Check)).toHaveLength(reachedPlatinum ? 1 : 0);
    if (!reachedPlatinum) {
      expect(platinum.findAllByType(Text).some((node) => node.props.children === 4)).toBe(true);
    }

    act(() => platinum.props.onPress());
    expect(textContent(tree)).toContain('Platinum status');
    expect(textContent(tree)).toContain(expectedDetails);
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(tree.root.findAllByType(Modal)).toHaveLength(0);
    act(() => tree.unmount());
  }
);

it("marks the person's Airs on the line with a live dot once the line is measured", () => {
  let tree;
  act(() => {
    tree = renderer.create(<TierJourney score={2_000} isDark c={colors} />);
  });
  expect(tree.root.findAllByProps({ testID: 'tier-journey-marker' })).toHaveLength(0);
  const line = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => line.props.onLayout({ nativeEvent: { layout: { width: 400 } } }));
  const marker = tree.root.findAllByProps({ testID: 'tier-journey-marker' })[0];
  expect(marker.props.accessibilityLabel).toBe('2,000 Airs');
  expect(textContent(tree)).toContain('2,000 Airs');
  // Mocked thresholds 0 / 1.000 / 5.000 / 20.000 put 2.000 a quarter of the way to Gold.
  expect(marker.props.style.left).toBe(175 - 9);
});

it('shows no marker without a score', () => {
  let tree;
  act(() => {
    tree = renderer.create(<TierJourney score={null} isDark c={colors} />);
  });
  const line = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => line.props.onLayout({ nativeEvent: { layout: { width: 400 } } }));
  expect(tree.root.findAllByProps({ testID: 'tier-journey-marker' })).toHaveLength(0);
});

it("opens the person's status from the dot, and Green from the stretch before the first tier", () => {
  let tree;
  act(() => {
    tree = renderer.create(<TierJourney score={600} isDark c={colors} />);
  });
  const line = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => line.props.onLayout({ nativeEvent: { layout: { width: 400 } } }));

  // Mocked thresholds 0 / 1.000 / 5.000 / 20.000: 600 Airs is Bronze, heading to Silver.
  const dot = tree.root.findAllByProps({ testID: 'tier-journey-marker' })[0];
  act(() => dot.props.onPress());
  expect(textContent(tree)).toContain('Bronze status');
  expect(textContent(tree)).toContain('Your current tier');
  expect(tree.root.findAllByProps({ testID: 'tier-details-balance' })[0].props.children).toBe(
    'You have 600 Airs. 400 Airs to go for Silver.'
  );
  act(() => tree.root.findByType(Modal).props.onRequestClose());

  const before = tree.root.findAllByProps({ testID: 'tier-journey-before-first' })[0];
  act(() => before.props.onPress());
  expect(textContent(tree)).toContain('Green status');
});
