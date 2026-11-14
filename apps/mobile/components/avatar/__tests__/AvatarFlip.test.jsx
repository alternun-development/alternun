import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import AvatarFlip from '../AvatarFlip';

const mockPreferences = { motionLevel: 'off' };
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => mockPreferences,
}));

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(
      <AvatarFlip size={90} front={<Text>chosen</Text>} back={<Text>tier</Text>} {...props} />
    );
  });
  return tree;
}

const face = (tree, id) => tree.root.find((node) => node.props.testID === id);

it('shows the chosen avatar and hides the tier badge until it turns', () => {
  const tree = render({ flipped: false });
  expect(face(tree, 'avatar-flip-front').props.accessibilityElementsHidden).toBe(false);
  expect(face(tree, 'avatar-flip-back').props.accessibilityElementsHidden).toBe(true);

  act(() =>
    tree.update(
      <AvatarFlip size={90} front={<Text>chosen</Text>} back={<Text>tier</Text>} flipped />
    )
  );
  expect(face(tree, 'avatar-flip-front').props.accessibilityElementsHidden).toBe(true);
  expect(face(tree, 'avatar-flip-back').props.importantForAccessibility).toBe('auto');
  act(() => tree.unmount());
});

it('never turns without a tier badge', () => {
  mockPreferences.motionLevel = 'full';
  const tree = render({ flipped: true, back: null });
  expect(tree.root.findAll((node) => node.props.testID === 'avatar-flip-back')).toHaveLength(0);
  expect(face(tree, 'avatar-flip-front').props.accessibilityElementsHidden).toBe(false);
  act(() => tree.unmount());
});
