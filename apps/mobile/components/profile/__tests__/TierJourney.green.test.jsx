import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal, Text } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { TierJourney } from '../TierJourney';

// The real thresholds: Green below 1.000, then Bronze, Silver 3.000, Gold 7.000, Platinum 12.000.
jest.mock('@alternun/ui', () => {
  const { View } = require('react-native');
  return {
    GlassCard: View,
    ...jest.requireActual('../../../../../packages/ui/src/components/airsTiers'),
  };
});
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: 'off' }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    locale: 'en',
    t: (_key, params, fallback) =>
      fallback.replace(/{{(\w+)}}/g, (_, key) => String(params?.[key] ?? '')),
  }),
}));

const colors = { text: '#fff', muted: '#aaa' };
const textContent = (tree) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .join(' ');

function openFromDot(score) {
  let tree;
  act(() => {
    tree = renderer.create(<TierJourney score={score} isDark c={colors} />);
  });
  const line = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => line.props.onLayout({ nativeEvent: { layout: { width: 400 } } }));
  act(() => tree.root.findAllByProps({ testID: 'tier-journey-marker' })[0].props.onPress());
  return tree;
}

it('shows Green, not Bronze, from the dot below 1.000 Airs, with what is left for Bronze', () => {
  const tree = openFromDot(20);

  expect(tree.root.findAllByType(Modal)).toHaveLength(1);
  expect(textContent(tree)).toContain('Green status');
  expect(textContent(tree)).not.toContain('Bronze status');
  expect(textContent(tree)).toContain('Your current tier');
  expect(tree.root.findByProps({ testID: 'tier-details-balance' }).props.children).toBe(
    'You have 20 Airs. 980 Airs to go for Bronze.'
  );
  // Green has no badge art: a leaf in the Green color.
  const modal = tree.root.findByType(Modal);
  expect(modal.findAllByType(Image)).toHaveLength(0);
  expect(modal.findByType(Leaf).props.color).toBe('#2fb67c');
});

it('shows the current tier and the next one from the dot once Bronze is reached', () => {
  const tree = openFromDot(1200);

  expect(textContent(tree)).toContain('Bronze status');
  expect(tree.root.findByProps({ testID: 'tier-details-balance' }).props.children).toBe(
    'You have 1,200 Airs. 1,800 Airs to go for Silver.'
  );
});

it('keeps the plain balance at the top tier', () => {
  const tree = openFromDot(15000);

  expect(textContent(tree)).toContain('Platinum status');
  expect(tree.root.findByProps({ testID: 'tier-details-balance' }).props.children).toBe(
    'You have 15,000 Airs.'
  );
});
