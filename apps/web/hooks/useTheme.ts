'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme-preference') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme('system');
    }
    setMounted(true);
  }, []);

  // Update resolved theme based on theme preference and system preference
  useEffect(() => {
    const getResolvedTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const updateTheme = () => {
      const resolved = getResolvedTheme();
      setResolvedTheme(resolved);

      // Apply theme to HTML element
      const html = document.documentElement;
      if (resolved === 'dark') {
        html.classList.remove('light');
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }

      // Store preference
      localStorage.setItem('theme-preference', theme);
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [theme]);

  const toggleTheme = () => {
    // Trigger view transition
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        setTheme((prev) => {
          if (prev === 'system') {
            // If currently on system, switch to opposite of current resolved theme
            return resolvedTheme === 'dark' ? 'light' : 'dark';
          } else if (prev === 'dark') {
            return 'light';
          } else {
            return 'dark';
          }
        });
      });
    } else {
      // Fallback for browsers without View Transition API
      setTheme((prev) => {
        if (prev === 'system') {
          return resolvedTheme === 'dark' ? 'light' : 'dark';
        } else if (prev === 'dark') {
          return 'light';
        } else {
          return 'dark';
        }
      });
    }
  };

  const setSystemTheme = () => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        setTheme('system');
      });
    } else {
      setTheme('system');
    }
  };

  return {
    theme,
    resolvedTheme,
    toggleTheme,
    setSystemTheme,
    isDark: resolvedTheme === 'dark',
    mounted,
  };
}
