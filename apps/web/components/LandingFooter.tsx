'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type Locale = 'en' | 'es' | 'th';

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    copyright: '(c) {{year}} Alternun. All rights reserved.',
    help: 'Help',
  },
  es: {
    copyright: '(c) {{year}} Alternun. Todos los derechos reservados.',
    help: 'Ayuda',
  },
  th: {
    copyright: '(c) {{year}} Alternun. สงวนลิขสิทธิ์ทั้งหมด.',
    help: 'ช่วยเหลือ',
  },
};

export default function LandingFooter() {
  const [version, setVersion] = useState('1.0.0');
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Load version from package.json
    try {
      const pkg = require('../package.json') as { version: string };
      setVersion(pkg.version);
    } catch (e) {
      // Fallback to default
    }

    // Get locale from browser or document
    const htmlLang = (document.documentElement.lang || 'en').split('-')[0];
    const supportedLocale: Locale = (
      ['en', 'es', 'th'].includes(htmlLang) ? htmlLang : 'en'
    ) as Locale;
    setLocale(supportedLocale);
  }, []);

  const t = (key: string, params?: { year: number }): string => {
    let text = TRANSLATIONS[locale][key] || TRANSLATIONS.en[key] || key;
    if (params) {
      text = text.replace(/\{\{\s*year\s*\}\}/g, String(params.year));
    }
    return text;
  };

  return (
    <footer className='w-full bg-white/40 backdrop-blur-sm border-t border-gray-200/30 center'>
      <div className='w-full px-8 py-6 flex justify-center'>
        <div className='flex flex-col items-center gap-4'>
          {/* Copyright — centered */}
          <p className='text-gray-900 font-semibold text-center'>
            {t('copyright', { year: new Date().getFullYear() })}
          </p>

          {/* Version and Help Icon — centered below */}
          <div className='flex items-center justify-center gap-3'>
            {/* Help Icon Button */}
            <button
              className='p-2 rounded-full border border-gray-300/50 bg-white/60 hover:bg-white transition-colors'
              aria-label={t('help')}
              title={t('help')}
            >
              <HelpCircle size={18} className='text-gray-600' strokeWidth={1.5} />
            </button>

            {/* Version Button */}
            <button
              className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-300/50 bg-teal-50/40 hover:bg-teal-100/50 transition-colors'
              aria-label={`Version ${version}`}
            >
              <span className='text-teal-600 font-bold text-sm'>v{version}</span>
              <span className='text-teal-600 text-xs'>▾</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
