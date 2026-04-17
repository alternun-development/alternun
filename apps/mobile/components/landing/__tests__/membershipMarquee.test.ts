import { describe, expect, it } from '@jest/globals';
import {
  MEMBERSHIP_MARQUEE_BASE_DISTANCE,
  MEMBERSHIP_MARQUEE_LEFT_BASE_DURATION_MS,
  MEMBERSHIP_MARQUEE_RIGHT_BASE_DURATION_MS,
  getMembershipLogoBandWidth,
  getMembershipMarqueeRepeatCount,
  scaleMembershipMarqueeDuration,
} from '../membershipMarquee';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: number): void;
};

describeTest('membershipMarquee', () => {
  itTest('derives the logo band width from the repeated logo set', () => {
    expectValue(getMembershipLogoBandWidth(5)).toBe(364);
  });

  itTest('grows the repeat count on wide screens to avoid empty trailing space', () => {
    const bandWidth = getMembershipLogoBandWidth(5);

    expectValue(getMembershipMarqueeRepeatCount(375, bandWidth)).toBe(4);
    expectValue(getMembershipMarqueeRepeatCount(2048, bandWidth)).toBe(7);
  });

  itTest('scales the marquee duration proportionally to the travel distance', () => {
    const bandWidth = getMembershipLogoBandWidth(5);

    expectValue(
      scaleMembershipMarqueeDuration(
        bandWidth,
        MEMBERSHIP_MARQUEE_BASE_DISTANCE,
        MEMBERSHIP_MARQUEE_LEFT_BASE_DURATION_MS
      )
    ).toBe(4853);
    expectValue(
      scaleMembershipMarqueeDuration(
        bandWidth,
        MEMBERSHIP_MARQUEE_BASE_DISTANCE,
        MEMBERSHIP_MARQUEE_RIGHT_BASE_DURATION_MS
      )
    ).toBe(6067);
  });
});
