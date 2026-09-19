import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, TouchableOpacity } from 'react-native';
import { AchievementBadge, ACHIEVEMENT_CATALOG } from '../AchievementBadge';
import { ACHIEVEMENT_ARTWORK, LOCKED_BADGE } from '../badgeAssets';

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
      unlocked ? ACHIEVEMENT_ARTWORK.first_10_airs : LOCKED_BADGE
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
