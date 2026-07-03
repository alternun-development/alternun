const SUMMARY_CARDS_STACK_BREAKPOINT = 720;
const SUMMARY_CARDS_DENSE_BREAKPOINT = 480;

export function getDashboardSummaryCardsLayout(
  width: number,
  fontScale = 1
): {
  isMobile: boolean;
  isCompactMobile: boolean;
  isDenseAtnCard: boolean;
} {
  const isMobile = width < SUMMARY_CARDS_STACK_BREAKPOINT;
  const effectiveWidth = width / Math.max(fontScale, 1);

  return {
    isMobile,
    isCompactMobile: isMobile,
    isDenseAtnCard: effectiveWidth < SUMMARY_CARDS_DENSE_BREAKPOINT,
  };
}
