import { describe, expect, it } from '@jest/globals';
import { getTokenCardDefaultExpanded } from '../tokenCard';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: boolean): void;
};

describeTest('tokenCard', () => {
  itTest('keeps the token description collapsed on mobile first load', () => {
    expectValue(getTokenCardDefaultExpanded(true)).toBe(false);
  });

  itTest('keeps the token description collapsed on larger screens too', () => {
    expectValue(getTokenCardDefaultExpanded(false)).toBe(false);
  });
});
