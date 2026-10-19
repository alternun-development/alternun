/**
 * Shared look for info-tooltip modals. Mirrors the HeroPanel status popover
 * (packages/ui/src/components/HeroPanel.tsx) so every "i" tooltip in the app is
 * dark, compact and identical in both themes. See docs/TOOLTIP_DESIGN.md.
 */
export const TOOLTIP_MODAL = {
  backdropColor: 'rgba(0,0,0,0.25)',
  surfaceColor: 'rgba(5,15,12,0.95)',
  borderColor: 'rgba(30,230,181,0.16)',
  borderWidth: 0.5,
  borderRadius: 12,
  maxWidth: 280,
  viewportPadding: 16,
  paddingHorizontal: 16,
  paddingVertical: 12,
  titleColor: '#ffffff',
  bodyColor: 'rgba(255,255,255,0.78)',
  titleFontSize: 12,
  bodyFontSize: 12,
  bodyLineHeight: 18,
  closeColor: '#ffffff',
  /** Info trigger icon: bare Lucide `Info`, no ring or background. */
  iconSize: 16,
  iconStrokeWidth: 2,
  iconHitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;
