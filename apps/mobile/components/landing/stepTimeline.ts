export interface StepTimelineTrackMetrics {
  trackInsetPercent: number;
  trackSpanPercent: number;
  segmentSpanPercent: number;
}

export interface StepTimelineProgressRange {
  startPercent: number;
  endPercent: number;
}

function normalizeStepCount(stepCount: number,): number {
  if (!Number.isFinite(stepCount,)) {
    return 2;
  }

  return Math.max(2, Math.floor(stepCount,),);
}

export function getStepTimelineTrackMetrics(stepCount: number,): StepTimelineTrackMetrics {
  const normalizedStepCount = normalizeStepCount(stepCount,);
  const trackInsetPercent = 100 / (normalizedStepCount * 2);
  const trackSpanPercent = 100 - trackInsetPercent * 2;
  const segmentSpanPercent = trackSpanPercent / (normalizedStepCount - 1);

  return {
    trackInsetPercent,
    trackSpanPercent,
    segmentSpanPercent,
  };
}

export function getStepTimelineProgressRange(
  activeStep: number,
  stepCount: number,
  trackSpanPercent: number,
): StepTimelineProgressRange {
  const normalizedStepCount = normalizeStepCount(stepCount,);
  const clampedStep = Math.min(Math.max(Math.floor(activeStep,), 0,), normalizedStepCount - 1,);
  const segmentSpanPercent = trackSpanPercent / (normalizedStepCount - 1);
  const startPercent = Math.min(clampedStep * segmentSpanPercent, trackSpanPercent,);
  const endPercent = Math.min((clampedStep + 1) * segmentSpanPercent, trackSpanPercent,);

  return {
    startPercent,
    endPercent,
  };
}
