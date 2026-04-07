import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

type LegalType = 'privacy' | 'terms';
type Locale = 'en' | 'es' | 'th';

export interface LegalContent {
  type: LegalType;
  locale: Locale;
  content: string;
}

@Injectable()
export class LegalService {
  /**
   * Reads legal markdown content (privacy policy or terms)
   * Falls back to English if locale file not found
   */
  getContent(type: LegalType, locale: Locale = 'en'): LegalContent {
    const monorepoRoot = join(__dirname, '../../../../..');
    const filePath = this.resolveFilePath(monorepoRoot, type, locale);

    try {
      const content = readFileSync(filePath, 'utf-8');
      return { type, locale, content };
    } catch {
      // Fallback to English if locale file not found
      if (locale !== 'en') {
        const enPath = this.resolveFilePath(monorepoRoot, type, 'en');
        try {
          const content = readFileSync(enPath, 'utf-8');
          return { type, locale: 'en', content };
        } catch {
          throw new NotFoundException(`Legal content not found for ${type}`);
        }
      }
      throw new NotFoundException(`Legal content not found for ${type}`);
    }
  }

  private resolveFilePath(monorepoRoot: string, type: LegalType, locale: Locale): string {
    if (locale === 'en') {
      return join(monorepoRoot, `apps/docs/src/pages/${type}.md`);
    }

    // Localized paths follow docusaurus i18n convention
    return join(
      monorepoRoot,
      `apps/docs/i18n/${locale}/docusaurus-plugin-content-docs/current/${type}.md`
    );
  }
}
