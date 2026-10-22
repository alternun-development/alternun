/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { beforeEach, describe, expect, it } from '@jest/globals';

import { applyWebTabTitle, webTabTitleForLocale } from '../webTabTitle';

describe('webTabTitle', () => {
  describe('webTabTitleForLocale', () => {
    it('returns the localized tab title per locale', () => {
      expect(webTabTitleForLocale('en')).toBe("Airs | What's your regenerative score?");
      expect(webTabTitleForLocale('es')).toBe('Airs | ¿Cuál es tu score regenerativo?');
      expect(webTabTitleForLocale('th')).toBe('Airs | คะแนนเชิงฟื้นฟูของคุณคือเท่าไหร่?');
    });
  });

  describe('applyWebTabTitle', () => {
    beforeEach(() => {
      document.title = 'Airs | ¿Cuál es tu score regenerativo?';
    });

    it('updates the document title and lang for the detected locale', () => {
      applyWebTabTitle('en');
      expect(document.title).toBe("Airs | What's your regenerative score?");
      expect(document.documentElement.lang).toBe('en');
    });

    it('keeps the Spanish title in sync for Spanish users', () => {
      applyWebTabTitle('es');
      expect(document.title).toBe('Airs | ¿Cuál es tu score regenerativo?');
      expect(document.documentElement.lang).toBe('es');
    });
  });
});
