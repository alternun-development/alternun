export declare const SUPPORTED_EMAIL_LOCALES: readonly ["en", "es", "th"];
export type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number];
export declare const DEFAULT_EMAIL_LOCALE: EmailLocale;
export declare const EMAIL_TEMPLATE_KEYS: readonly ["account-delete-email", "change-email-email", "confirm-signup-email", "invite-email", "magic-link-email", "otp-email", "reauthentication-email", "reset-password-email"];
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];
export interface EmailTemplateTranslation {
    subject: string;
    preview: string;
    greeting: string;
    intro: string;
    ctaLabel: string;
    ignoreNotice: string;
    footer: string;
    codeLabel?: string;
    closing?: string;
}
export type EmailTemplateParams = Record<string, string | number | boolean | null | undefined>;
export declare function listSupportedEmailLocales(): ReadonlyArray<EmailLocale>;
export declare function listEmailTemplateKeys(): ReadonlyArray<EmailTemplateKey>;
export declare function isSupportedEmailLocale(value: string | null | undefined): value is EmailLocale;
export declare function normalizeEmailLocale(value: EmailLocale | string | null | undefined, fallbackLocale?: EmailLocale): EmailLocale;
export declare function getEmailTemplateTranslation(locale: EmailLocale | string | null | undefined, template: EmailTemplateKey, fallbackLocale?: EmailLocale): EmailTemplateTranslation;
export declare function interpolateEmailTemplateText(value: string, params?: EmailTemplateParams): string;
export declare function renderEmailTemplateTranslation({ locale, template, params, fallbackLocale, }: {
    locale: EmailLocale | string | null | undefined;
    template: EmailTemplateKey;
    params?: EmailTemplateParams;
    fallbackLocale?: EmailLocale;
}): EmailTemplateTranslation;
export interface EmailTemplateTranslator {
    locale: EmailLocale;
    template: EmailTemplateKey;
    translation: EmailTemplateTranslation;
    t: (key: keyof EmailTemplateTranslation, params?: EmailTemplateParams) => string;
}
export declare function createEmailTemplateTranslator({ locale, template, fallbackLocale, }: {
    locale: EmailLocale | string | null | undefined;
    template: EmailTemplateKey;
    fallbackLocale?: EmailLocale;
}): EmailTemplateTranslator;
