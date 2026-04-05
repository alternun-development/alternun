import React, { createContext, useContext, type ReactNode } from 'react';
import { darkTheme, lightTheme, type AlternunTheme } from './themes';

interface ThemeContextValue {
  theme: AlternunTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  mode?: 'dark' | 'light';
  onToggle?: () => void;
}

export function ThemeProvider({ children, mode = 'dark', onToggle }: ThemeProviderProps) {
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, isDark: mode === 'dark', toggleTheme: onToggle ?? (() => {}) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
