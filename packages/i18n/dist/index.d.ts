export declare const SUPPORTED_LOCALES: readonly ["en", "es", "th"];
export type AlternunLocale = (typeof SUPPORTED_LOCALES)[number];
export declare const TRANSLATION_NAMESPACES: readonly ["shared", "mobile", "web", "docs"];
export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];
export type AppTranslationNamespace = Exclude<TranslationNamespace, 'shared'>;
export declare const DEFAULT_LOCALE: AlternunLocale;
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
export declare function listSupportedLocales(): ReadonlyArray<AlternunLocale>;
export declare function isSupportedLocale(value: string | null | undefined): value is AlternunLocale;
export declare function normalizeLocale(value: AlternunLocale | string | null | undefined, fallbackLocale?: AlternunLocale): AlternunLocale;
export declare function getCatalog(locale: AlternunLocale | string | null | undefined): TranslationCatalog;
export declare function resolveMessages({ locale, namespace, fallbackLocale, includeShared, }: ResolveMessagesOptions): TranslationTree;
export declare function translate({ locale, namespace, key, params, fallbackLocale, fallbackValue, }: TranslateOptions): string;
export declare function createTranslator({ locale, namespace, fallbackLocale, }: CreateTranslatorOptions): Translator;
export declare function getLocaleLabel(locale: AlternunLocale | string | null | undefined, displayLocale?: AlternunLocale | string | null | undefined): string;
export declare const rawCatalogs: Record<"en" | "es" | "th", TranslationCatalog>;
