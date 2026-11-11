import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BrandLoader, { BRAND_SYMBOLS, nextSymbolIndex } from '../BrandLoader';

jest.mock('expo-image', () => ({ __esModule: true, Image: () => null }));

it('always swaps to a different symbol', () => {
  expect(BRAND_SYMBOLS).toHaveLength(9);
  for (let current = 0; current < BRAND_SYMBOLS.length; current += 1) {
    for (const random of [0, 0.5, 0.999]) {
      const next = nextSymbolIndex(current, () => random);
      expect(next).not.toBe(current);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(BRAND_SYMBOLS.length);
    }
  }
});

it('changes the symbol in the middle of the spinner over time', () => {
  jest.useFakeTimers();
  let tree;
  act(() => {
    tree = renderer.create(<BrandLoader />);
  });
  const symbol = () => tree.root.findByProps({ testID: 'brand-loader-symbol' }).props.source;
  const first = symbol();
  act(() => jest.advanceTimersByTime(700));
  expect(symbol()).not.toBe(first);
  expect(tree.root.findByProps({ testID: 'brand-loader' }).props.accessibilityRole).toBe(
    'progressbar'
  );
  act(() => tree.unmount());
  jest.useRealTimers();
});
