/** Fraction (0–1) of the way from `min` to `max`. Never below 0 or above 1. */
export function calculateTierProgress(score: number, min: number, max: number): number {
  return Math.max(0, Math.min((score - min) / (max - min), 1));
}
