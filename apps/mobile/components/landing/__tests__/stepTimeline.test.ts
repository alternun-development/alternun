import { describe, expect, it, } from '@jest/globals';
import { getStepTimelineProgressRange, getStepTimelineTrackMetrics, } from '../stepTimeline';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBeCloseTo(expected: number, precision?: number): void;
};

describeTest('stepTimeline', () => {
  itTest('computes desktop track insets and span for four steps', () => {
    const metrics = getStepTimelineTrackMetrics(4,);

    expectValue(metrics.trackInsetPercent,).toBeCloseTo(12.5, 5,);
    expectValue(metrics.trackSpanPercent,).toBeCloseTo(75, 5,);
    expectValue(metrics.segmentSpanPercent,).toBeCloseTo(25, 5,);
  },);

  itTest('keeps the desktop progress line inside the final dot', () => {
    const metrics = getStepTimelineTrackMetrics(4,);
    const range = getStepTimelineProgressRange(3, 4, metrics.trackSpanPercent,);

    expectValue(range.startPercent,).toBeCloseTo(75, 5,);
    expectValue(range.endPercent,).toBeCloseTo(75, 5,);
  },);

  itTest('fills the mobile progress bar cumulatively', () => {
    const range = getStepTimelineProgressRange(2, 4, 100,);

    expectValue(range.startPercent,).toBeCloseTo(66.6667, 3,);
    expectValue(range.endPercent,).toBeCloseTo(100, 5,);
  },);
},);
