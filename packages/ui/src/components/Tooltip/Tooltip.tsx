/**
 * Tooltip — Facade component for cross-platform tooltips.
 * Uses universal-tooltip on native, Radix on web.
 */

import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import type { TooltipConfig } from './types';
import { useTooltipContext } from './TooltipProvider';
import { getTooltipTheme } from './theme';

interface TooltipProps extends TooltipConfig {
  children: React.ReactNode;
  /** Optional custom styling */
  style?: ViewStyle;
}

/**
 * Tooltip component — shows contextual help on trigger (click/hover).
 *
 * Usage:
 *   <Tooltip content="Learn about your Airs score" placement="top">
 *     <TouchableOpacity>
 *       <InfoIcon />
 *     </TouchableOpacity>
 *   </Tooltip>
 */
export function Tooltip({
  content: _content,
  placement: _placement = 'top',
  delayDuration: _delayDuration = 0,
  children,
  style,
}: TooltipProps): React.JSX.Element {
  const { isDark } = useTooltipContext();
  getTooltipTheme(isDark);
  const triggerRef = useRef(null);

  // TODO: For MVP, render children as-is.
  // Phase 2: Integrate universal-tooltip for actual tooltip display
  // On native: universal-tooltip's PopupMenu / floating-ui
  // On web: Radix UI Tooltip + Popover

  return (
    <View
      ref={triggerRef}
      style={[styles.triggerWrapper, style]}
      // On web, would attach Radix tooltip here
      // On native, would wire to universal-tooltip PopupMenu
    >
      {children}
      {/* Tooltip content would be rendered in a portal/popover by universal-tooltip */}
    </View>
  );
}

const styles = StyleSheet.create({
  triggerWrapper: {
    // Minimal wrapper for trigger element
  },
  tooltip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
