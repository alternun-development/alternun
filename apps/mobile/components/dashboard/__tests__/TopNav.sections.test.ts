import { describe, expect, it } from '@jest/globals';
import { NAV_SECTIONS } from '../navSections';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
};

describeTest('NAV_SECTIONS', () => {
  itTest('lists only live sections: Portfolio stays hidden until it ships', () => {
    expectValue(NAV_SECTIONS.map((section) => section.key)).toEqual([
      'dashboard',
      'explore',
      'profile',
    ]);
  });
});
