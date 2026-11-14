import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import TierRevealCinematic from '../TierRevealCinematic';
import { STATUS_DETAIL_BADGES } from '../badgeAssets';

jest.mock('@alternun/ui', () => ({
  TIERS: {
    bronze: { label: 'Bronze', color: '#cd7f32', min: 0, next: 'silver' },
    silver: { label: 'Silver', color: '#a8b8cc', min: 1000, next: 'gold' },
    gold: { label: 'Gold', color: '#d4b96a', min: 5000, next: 'platinum' },
    platinum: { label: 'Platinum', color: '#9ba9c4', min: 20000, next: null },
  },
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: 'off' }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(<TierRevealCinematic score={30} onClose={jest.fn()} {...props} />);
  });
  return tree;
}

it('reveals the metal bronze badge with congrats and the way to Silver', () => {
  const onClose = jest.fn();
  const tree = render({ tier: 'bronze', onClose });
  expect(tree.root.findAllByType(Image)[0].props.source).toBe(STATUS_DETAIL_BADGES.bronze);
  expect(texts(tree)).toEqual(
    expect.arrayContaining([
      '¡Felicitaciones!',
      'Eres nivel Bronce',
      '30 Airs',
      'Te faltan 970 Airs para llegar a Plata.',
    ])
  );
  const button = tree.root.find(
    (node) =>
      typeof node.props.onPress === 'function' &&
      node.findAll((child) => child.type === Text && child.props.children === 'Continuar').length >
        0
  );
  act(() => button.props.onPress());
  expect(onClose).toHaveBeenCalled();
  act(() => tree.unmount());
});

it('tells Platinum members they reached the top tier', () => {
  const tree = render({ tier: 'platinum', score: 25000 });
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Eres nivel Platino', 'Alcanzaste el nivel más alto de Airs.'])
  );
  expect(tree.root.findAllByType(Image)).toHaveLength(1);
  act(() => tree.unmount());
});

it('renders nothing without a tier', () => {
  const tree = render({ tier: null });
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});
