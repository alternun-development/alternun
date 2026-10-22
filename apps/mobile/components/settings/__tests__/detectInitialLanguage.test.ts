/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { afterEach, describe, expect, it } from '@jest/globals';

import { detectInitialLanguage } from '../AppPreferencesProvider';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(language?: string, languages?: string[]): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language, languages },
    configurable: true,
  });
}

afterEach(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
  }
});

describe('detectInitialLanguage', () => {
  it('prefers a stored language over the browser locale', () => {
    setNavigator('en-US');
    expect(detectInitialLanguage({ language: 'th' })).toBe('th');
  });

  it('detects the browser language when no language is stored', () => {
    setNavigator('es-AR', ['es-AR', 'en-US']);
    expect(detectInitialLanguage({ themeMode: 'dark' })).toBe('es');
    expect(detectInitialLanguage(null)).toBe('es');
  });

  it('walks navigator.languages to find the first supported locale', () => {
    setNavigator('fr-FR', ['fr-FR', 'th-TH', 'en-US']);
    expect(detectInitialLanguage(null)).toBe('th');
  });

  it('falls back to the default locale for unsupported browser languages', () => {
    setNavigator('fr-FR', ['fr-FR']);
    expect(detectInitialLanguage(null)).toBe('en');
  });
});
