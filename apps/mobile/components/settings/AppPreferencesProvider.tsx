import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'es' | 'th';

const PREFERENCES_STORAGE_KEY = 'alternun.mobile.preferences.v1';

interface AppPreferencesContextValue {
  themeMode: ThemeMode;
  language: AppLanguage;
  showAirsIntro: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setShowAirsIntro: (show: boolean) => void;
  toggleThemeMode: () => void;
  cycleLanguage: () => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

const LANGUAGE_ORDER: AppLanguage[] = ['en', 'es', 'th'];

interface StoredPreferences {
  themeMode?: ThemeMode;
  language?: AppLanguage;
  showAirsIntro?: boolean;
}

function canUseLocalStorage(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readStoredPreferences(): StoredPreferences | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = globalThis.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredPreferences;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredPreferences(preferences: StoredPreferences): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage write errors to avoid blocking app usage.
  }
}

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const stored = readStoredPreferences();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    stored?.themeMode === 'light' || stored?.themeMode === 'dark' ? stored.themeMode : 'dark',
  );
  const [language, setLanguage] = useState<AppLanguage>(
    stored?.language === 'es' || stored?.language === 'th' || stored?.language === 'en'
      ? stored.language
      : 'en',
  );
  const [showAirsIntro, setShowAirsIntro] = useState<boolean>(
    typeof stored?.showAirsIntro === 'boolean' ? stored.showAirsIntro : true,
  );

  const persistPreferences = (next: StoredPreferences) => {
    writeStoredPreferences({
      themeMode: next.themeMode ?? themeMode,
      language: next.language ?? language,
      showAirsIntro: typeof next.showAirsIntro === 'boolean' ? next.showAirsIntro : showAirsIntro,
    });
  };

  const setThemeModeWithPersist = (mode: ThemeMode) => {
    setThemeMode(mode);
    persistPreferences({ themeMode: mode });
  };

  const setLanguageWithPersist = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    persistPreferences({ language: nextLanguage });
  };

  const setShowAirsIntroWithPersist = (show: boolean) => {
    setShowAirsIntro(show);
    persistPreferences({ showAirsIntro: show });
  };

  const value = useMemo<AppPreferencesContextValue>(() => {
    const toggleThemeMode = () => {
      const next = themeMode === 'dark' ? 'light' : 'dark';
      setThemeModeWithPersist(next);
    };

    const cycleLanguage = () => {
      const index = LANGUAGE_ORDER.indexOf(language);
      const next = LANGUAGE_ORDER[(index + 1) % LANGUAGE_ORDER.length];
      setLanguageWithPersist(next);
    };

    return {
      themeMode,
      language,
      showAirsIntro,
      setThemeMode: setThemeModeWithPersist,
      setLanguage: setLanguageWithPersist,
      setShowAirsIntro: setShowAirsIntroWithPersist,
      toggleThemeMode,
      cycleLanguage,
    };
  }, [themeMode, language, showAirsIntro]);

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return context;
}
