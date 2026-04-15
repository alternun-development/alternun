/**
 * Hook providing normalized tooltip API across platforms.
 * Handles visibility, triggers, and platform-specific behavior.
 */

import { useState, useCallback } from 'react';

export interface UseTooltipState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export function useTooltip(initialVisible = false): UseTooltipState {
  const [isVisible, setIsVisible] = useState(initialVisible);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible((prev) => !prev), []);

  return {
    isVisible,
    setIsVisible,
    show,
    hide,
    toggle,
  };
}

/**
 * Resolves trigger behavior based on platform.
 * Native: 'click', 'longPress'
 * Web: 'hover', 'click'
 */
export function resolveTriggerForPlatform(
  requestedTrigger: 'click' | 'hover' | 'longPress'
): 'click' | 'hover' {
  // On native, treat longPress as click
  if (requestedTrigger === 'longPress') return 'click';
  return requestedTrigger as 'click' | 'hover';
}
