import { describe, expect, it } from '@jest/globals';
import { NAV_SECTIONS } from '../navSections';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
};

describeTest('NAV_SECTIONS', () => {
  itTest('marks explore and portfolio as coming soon', () => {
    const comingSoonKeys = NAV_SECTIONS.filter((section) => section.comingSoon).map(
      (section) => section.key
    );

    expectValue(comingSoonKeys).toEqual(['explorar', 'portafolio']);
    expectValue(NAV_SECTIONS.find((section) => section.key === 'dashboard')?.comingSoon).toBe(
      undefined
    );
  });
});
