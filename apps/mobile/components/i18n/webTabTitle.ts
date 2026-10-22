import { createTranslator, type AlternunLocale } from '@alternun/i18n';

export function webTabTitleForLocale(locale: AlternunLocale): string {
  const { t } = createTranslator({ locale, namespace: 'shared' });
  return t('webMeta.tabTitle');
}

export function applyWebTabTitle(locale: AlternunLocale): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.title = webTabTitleForLocale(locale);
  document.documentElement.lang = locale;
}
