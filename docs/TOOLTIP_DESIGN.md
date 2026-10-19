# Tooltip design standard

Every info ("i") tooltip in the app must look like the HeroPanel status popover
(`packages/ui/src/components/HeroPanel.tsx`, `hero-status-popover`): dark, compact, identical in light and dark themes.

## Source of truth

`apps/mobile/components/theme/tooltipModal.ts` exports `TOOLTIP_MODAL`. Use it. Do not hard-code tooltip colors, sizes or radii.

## Trigger icon

- Bare Lucide `Info`, `size={16}`, `strokeWidth={2}`. No border, ring or background fill (it already draws its own circle, so a wrapper gives a "double circle").
- The touch target grows via `hitSlop={TOOLTIP_MODAL.iconHitSlop}`, not by enlarging the visual.

## Modal

| Property | Value                                            |
| -------- | ------------------------------------------------ |
| Backdrop | `rgba(0,0,0,0.25)`, tap to dismiss               |
| Surface  | `rgba(5,15,12,0.95)` in both themes              |
| Border   | 0.5px `rgba(30,230,181,0.16)`, radius 12         |
| Width    | `maxWidth` 280, 16px viewport padding            |
| Padding  | 16 horizontal / 12 vertical, gap 8               |
| Title    | 12px, weight 600, uppercase, 0.5 tracking, white |
| Body     | 12px / 18px line height, `rgba(255,255,255,.78)` |
| Close    | white `×` (18px) in a 32×32 button, top right    |
| Shadow   | `0 4 12 rgba(0,0,0,.2)`, elevation 8             |

No footer "Close" pill button. The `×` is the close control and keeps the `closeLabel` accessibility label.

## Current users

- `components/dashboard/MetricInfoTooltip.tsx` (RBI / ATN summary cards)
- `components/landing/PublicLandingPage.tsx` (community AIRS total)
- `packages/ui/.../HeroPanel.tsx` (reference implementation)

New tooltips must reuse these tokens. If the hero look changes, update `TOOLTIP_MODAL` and this page together.
