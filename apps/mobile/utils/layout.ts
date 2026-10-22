/** Max width of the centered content column on large screens. */
export const CONTENT_MAX_WIDTH = 1200;
/** Minimum breathing room between the viewport edge and content on desktop. */
const DESKTOP_MIN_GUTTER = 32;
const DESKTOP_BREAKPOINT = 1024;

/**
 * Horizontal inset so content is centered within CONTENT_MAX_WIDTH, with a
 * minimum gutter on desktop. Returns `base` on small screens.
 */
export function getContentGutter(width: number, base = 0): number {
  if (width < DESKTOP_BREAKPOINT) return base;
  return Math.max(DESKTOP_MIN_GUTTER, Math.floor((width - CONTENT_MAX_WIDTH) / 2));
}
