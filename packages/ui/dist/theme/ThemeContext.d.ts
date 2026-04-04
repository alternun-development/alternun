import React, { type ReactNode } from 'react';
import { type AlternunTheme } from './themes';
interface ThemeContextValue {
  theme: AlternunTheme;
  isDark: boolean;
  toggleTheme: () => void;
}
interface ThemeProviderProps {
  children: ReactNode;
  mode?: 'dark' | 'light';
  onToggle?: () => void;
}
export declare function ThemeProvider({
  children,
  mode,
  onToggle,
}: ThemeProviderProps): React.JSX.Element;
export declare function useTheme(): ThemeContextValue;
export {};
