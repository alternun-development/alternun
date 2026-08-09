import { describe, expect, it } from '@jest/globals';
import { NAV_SECTIONS } from '../navSections';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
};

describeTest('NAV_SECTIONS', () => {
  itTest('keeps Explorer enabled while portfolio remains coming soon', () => {
    const comingSoonKeys = NAV_SECTIONS.filter((section) => section.comingSoon).map(
      (section) => section.key
    );

    expectValue(comingSoonKeys).toEqual(['portafolio']);
    expectValue(NAV_SECTIONS.find((section) => section.key === 'dashboard')?.comingSoon).toBe(
      undefined
    );
    expectValue(NAV_SECTIONS.find((section) => section.key === 'explorar')?.comingSoon).toBe(
      undefined
    );
  });
});
