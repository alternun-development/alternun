/**
 * TooltipProvider — Root wrapper syncing theme to tooltip system.
 * Wraps app with context and platform-specific tooltip root.
 */

import React, { createContext, useContext } from 'react';

interface TooltipContextValue {
  isDark: boolean;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

export function useTooltipContext(): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltipContext must be used within TooltipProvider');
  }
  return context;
}

interface TooltipProviderProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function TooltipProvider({
  children,
  isDark = true,
}: TooltipProviderProps): React.JSX.Element {
  // On web, optionally wrap with Radix UI provider if available
  // For now, just provide context
  return <TooltipContext.Provider value={{ isDark }}>{children}</TooltipContext.Provider>;
}
