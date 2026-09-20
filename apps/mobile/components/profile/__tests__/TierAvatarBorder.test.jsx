import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, AppState } from 'react-native';
import TierAvatarBorder from '../TierAvatarBorder';

let tree;
let previousState;
beforeEach(() => {
  previousState = AppState.currentState;
  AppState.currentState = 'active';
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
  AppState.currentState = previousState;
  jest.restoreAllMocks();
});

it('animates the ring without restarting for parent rerenders and stops on unmount', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const start = jest.fn();
  const stop = jest.fn();
  const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop });
  await act(async () => {
    tree = renderer.create(<TierAvatarBorder color='#cd7f32' motionLevel='full' />);
  });
  expect(start).toHaveBeenCalledTimes(1);
  act(() => {
    tree.update(<TierAvatarBorder color='#cd7f32' motionLevel='full' />);
  });
  expect(loop).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  tree = null;
  expect(stop).toHaveBeenCalledTimes(1);
});

it.each([
  ['full', true],
  ['low', false],
  ['off', false],
])('keeps a static ring with %s motion / system reduced=%s', async (motionLevel, reduced) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);
  const loop = jest.spyOn(Animated, 'loop');
  await act(async () => {
    tree = renderer.create(<TierAvatarBorder color='#cd7f32' motionLevel={motionLevel} />);
  });
  expect(tree.root.findAllByProps({ testID: 'tier-avatar-border' }).length).toBeGreaterThan(0);
  expect(loop).not.toHaveBeenCalled();
});
