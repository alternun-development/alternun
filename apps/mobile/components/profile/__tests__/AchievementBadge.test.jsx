import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, TouchableOpacity } from 'react-native';
import {
  AchievementBadge,
  ACHIEVEMENT_CATALOG,
  AIRS_MILESTONES,
  isAchievementUnlocked,
} from '../AchievementBadge';
import { ACHIEVEMENT_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from '../badgeAssets';

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (_key, _params, fallback) => fallback }),
}));

describe('profile achievement artwork', () => {
  it.each([true, false])('uses the earned artwork only when unlocked=%s', (unlocked) => {
    const onPress = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <AchievementBadge
          def={{ ...ACHIEVEMENT_CATALOG.first_10_airs, key: 'first_10_airs', unlocked }}
          onPress={onPress}
        />
      );
    });
    expect(tree.root.findByType(Image).props.source).toEqual(
      unlocked ? ACHIEVEMENT_ARTWORK.first_10_airs : LOCKED_ACHIEVEMENT_ARTWORK.first_10_airs
    );
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });

  it('preserves the icon for an earned achievement without supplied artwork', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <AchievementBadge
          def={{
            ...ACHIEVEMENT_CATALOG.account_confirmed,
            key: 'account_confirmed',
            unlocked: true,
          }}
        />
      );
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findByType(TouchableOpacity).props.accessibilityLabel).toBe(
      'Cuenta Verificada'
    );
    act(() => tree.unmount());
  });
});

it.each(Object.entries(AIRS_MILESTONES))(
  'shows numbered grey artwork below %s and colorful artwork when achieved',
  (key, threshold) => {
    expect(isAchievementUnlocked(key, threshold - 1, false)).toBe(false);
    expect(isAchievementUnlocked(key, threshold, false)).toBe(true);
    expect(isAchievementUnlocked(key, null, false)).toBe(false);
    expect(isAchievementUnlocked(key, 0, true)).toBe(true);
    for (const unlocked of [false, true]) {
      let tree;
      act(() => {
        tree = renderer.create(
          <AchievementBadge def={{ ...ACHIEVEMENT_CATALOG[key], key, unlocked }} />
        );
      });
      expect(tree.root.findByType(Image).props.source).toEqual(
        unlocked ? ACHIEVEMENT_ARTWORK[key] : LOCKED_ACHIEVEMENT_ARTWORK[key]
      );
      expect(tree.root.findByType(TouchableOpacity).props.accessibilityValue.text).toBe(
        unlocked ? 'Unlocked' : 'Locked'
      );
      act(() => tree.unmount());
    }
  }
);

it('does not unlock non-score achievements from an AIRS balance', () => {
  expect(isAchievementUnlocked('wallet_connected', 50000, false)).toBe(false);
});

it('keeps a numbered placeholder while an image loads or fails', () => {
  const Svg = require('react-native-svg').default;
  let tree;
  act(() => {
    tree = renderer.create(
      <AchievementBadge
        def={{ ...ACHIEVEMENT_CATALOG.first_100_airs, key: 'first_100_airs', unlocked: false }}
      />
    );
  });
  expect(tree.root.findAllByType(Svg)).toHaveLength(1);
  act(() => tree.root.findByType(Image).props.onLoad());
  expect(tree.root.findAllByType(Svg)).toHaveLength(0);
  act(() => tree.root.findByType(Image).props.onError());
  expect(tree.root.findAllByType(Svg)).toHaveLength(1);
  act(() => tree.unmount());
});
