/**
 * Tooltip system exports — facade pattern for cross-platform tooltips.
 */

export { Tooltip } from './Tooltip';
export { TooltipProvider, useTooltipContext } from './TooltipProvider';
export { WalkthroughTour } from './WalkthroughTour';
export { useTooltip, resolveTriggerForPlatform } from './useTooltip';
export { getTooltipTheme, tooltipThemes } from './theme';

export type { TooltipConfig, TooltipPlacement, WalkthroughStep, WalkthroughConfig } from './types';
export type { UseTooltipState } from './useTooltip';
export type { TooltipTheme } from './theme';
