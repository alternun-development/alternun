import enCatalog from './catalogs/en.json';
import esCatalog from './catalogs/es.json';
import thCatalog from './catalogs/th.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'th'] as const;
export type AlternunLocale = (typeof SUPPORTED_LOCALES)[number];

export const TRANSLATION_NAMESPACES = ['shared', 'mobile', 'web', 'docs'] as const;
export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];
export type AppTranslationNamespace = Exclude<TranslationNamespace, 'shared'>;

export const DEFAULT_LOCALE: AlternunLocale = 'en';

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export type TranslationCatalog = Record<TranslationNamespace, TranslationTree>;

export interface ResolveMessagesOptions {
  locale: AlternunLocale | string | null | undefined;
  namespace: TranslationNamespace;
  fallbackLocale?: AlternunLocale;
  includeShared?: boolean;
}

export interface TranslateOptions {
  locale: AlternunLocale | string | null | undefined;
  namespace: TranslationNamespace;
  key: string;
  params?: TranslationParams;
  fallbackLocale?: AlternunLocale;
  fallbackValue?: string;
}

export interface CreateTranslatorOptions {
  locale: AlternunLocale | string | null | undefined;
  namespace: TranslationNamespace;
  fallbackLocale?: AlternunLocale;
}

export interface Translator {
  locale: AlternunLocale;
  namespace: TranslationNamespace;
  messages: TranslationTree;
  has: (key: string) => boolean;
  t: (key: string, params?: TranslationParams, fallbackValue?: string) => string;
}

const catalogs: Record<AlternunLocale, TranslationCatalog> = {
  en: enCatalog as TranslationCatalog,
  es: esCatalog as TranslationCatalog,
  th: thCatalog as TranslationCatalog,
};

function isTree(value: string | TranslationTree | undefined): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base: TranslationTree, override: TranslationTree): TranslationTree {
  const result: TranslationTree = { ...base, };

  for (const [key, value,] of Object.entries(override,)) {
    const baseValue = result[key];

    if (isTree(baseValue) && isTree(value)) {
      result[key] = deepMerge(baseValue, value,);
      continue;
    }

    result[key] = value;
  }

  return result;
}

function getPathValue(tree: TranslationTree, key: string): string | TranslationTree | undefined {
  const segments = key.split('.').filter(Boolean,);
  let current: string | TranslationTree | undefined = tree;

  for (const segment of segments) {
    if (!isTree(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token: string) => {
    const value = params[token.trim()];
    return value == null ? '' : String(value);
  },);
}

export function listSupportedLocales(): ReadonlyArray<AlternunLocale> {
  return SUPPORTED_LOCALES;
}

export function isSupportedLocale(value: string | null | undefined): value is AlternunLocale {
  if (!value) {
    return false;
  }

  return (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value.toLowerCase(),);
}

export function normalizeLocale(
  value: AlternunLocale | string | null | undefined,
  fallbackLocale: AlternunLocale = DEFAULT_LOCALE,
): AlternunLocale {
  if (!value) {
    return fallbackLocale;
  }

  const normalized = value.toLowerCase().replace('_', '-',);
  if (isSupportedLocale(normalized,)) {
    return normalized;
  }

  const baseLocale = normalized.split('-',)[0];
  return isSupportedLocale(baseLocale,) ? baseLocale : fallbackLocale;
}

export function getCatalog(locale: AlternunLocale | string | null | undefined): TranslationCatalog {
  return catalogs[normalizeLocale(locale,)];
}

export function resolveMessages({
  locale,
  namespace,
  fallbackLocale = DEFAULT_LOCALE,
  includeShared = namespace !== 'shared',
}: ResolveMessagesOptions,): TranslationTree {
  const resolvedLocale = normalizeLocale(locale, fallbackLocale,);
  const fallbackCatalog = catalogs[fallbackLocale];
  const resolvedCatalog = catalogs[resolvedLocale];

  if (namespace === 'shared') {
    if (resolvedLocale === fallbackLocale) {
      return fallbackCatalog.shared;
    }

    return deepMerge(fallbackCatalog.shared, resolvedCatalog.shared,);
  }

  let messages: TranslationTree = {};

  if (includeShared) {
    messages = deepMerge(messages, fallbackCatalog.shared,);
  }
  messages = deepMerge(messages, fallbackCatalog[namespace],);

  if (resolvedLocale === fallbackLocale) {
    return messages;
  }

  if (includeShared) {
    messages = deepMerge(messages, resolvedCatalog.shared,);
  }

  return deepMerge(messages, resolvedCatalog[namespace],);
}

export function translate({
  locale,
  namespace,
  key,
  params,
  fallbackLocale = DEFAULT_LOCALE,
  fallbackValue = key,
}: TranslateOptions,): string {
  const messages = resolveMessages({
    locale,
    namespace,
    fallbackLocale,
  },);
  const value = getPathValue(messages, key,);

  return typeof value === 'string' ? interpolate(value, params,) : fallbackValue;
}

export function createTranslator({
  locale,
  namespace,
  fallbackLocale = DEFAULT_LOCALE,
}: CreateTranslatorOptions,): Translator {
  const resolvedLocale = normalizeLocale(locale, fallbackLocale,);
  const messages = resolveMessages({
    locale: resolvedLocale,
    namespace,
    fallbackLocale,
  },);

  return {
    locale: resolvedLocale,
    namespace,
    messages,
    has(key: string,): boolean {
      return typeof getPathValue(messages, key,) === 'string';
    },
    t(key: string, params?: TranslationParams, fallbackValue?: string,): string {
      const value = getPathValue(messages, key,);
      if (typeof value !== 'string') {
        return fallbackValue ?? key;
      }

      return interpolate(value, params,);
    },
  };
}

export function getLocaleLabel(
  locale: AlternunLocale | string | null | undefined,
  displayLocale: AlternunLocale | string | null | undefined = DEFAULT_LOCALE,
): string {
  const resolvedLocale = normalizeLocale(locale,);
  return translate({
    locale: displayLocale,
    namespace: 'shared',
    key: `languageNames.${resolvedLocale}`,
    fallbackValue: resolvedLocale,
  },);
}

export const rawCatalogs = catalogs;
