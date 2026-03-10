import enAccountDeleteEmail from '../locales/en/account-delete-email.json';
import enChangeEmailEmail from '../locales/en/change-email-email.json';
import enConfirmSignupEmail from '../locales/en/confirm-signup-email.json';
import enInviteEmail from '../locales/en/invite-email.json';
import enMagicLinkEmail from '../locales/en/magic-link-email.json';
import enOtpEmail from '../locales/en/otp-email.json';
import enReauthenticationEmail from '../locales/en/reauthentication-email.json';
import enResetPasswordEmail from '../locales/en/reset-password-email.json';
import esAccountDeleteEmail from '../locales/es/account-delete-email.json';
import esChangeEmailEmail from '../locales/es/change-email-email.json';
import esConfirmSignupEmail from '../locales/es/confirm-signup-email.json';
import esInviteEmail from '../locales/es/invite-email.json';
import esMagicLinkEmail from '../locales/es/magic-link-email.json';
import esOtpEmail from '../locales/es/otp-email.json';
import esReauthenticationEmail from '../locales/es/reauthentication-email.json';
import esResetPasswordEmail from '../locales/es/reset-password-email.json';
import thAccountDeleteEmail from '../locales/th/account-delete-email.json';
import thChangeEmailEmail from '../locales/th/change-email-email.json';
import thConfirmSignupEmail from '../locales/th/confirm-signup-email.json';
import thInviteEmail from '../locales/th/invite-email.json';
import thMagicLinkEmail from '../locales/th/magic-link-email.json';
import thOtpEmail from '../locales/th/otp-email.json';
import thReauthenticationEmail from '../locales/th/reauthentication-email.json';
import thResetPasswordEmail from '../locales/th/reset-password-email.json';

export const SUPPORTED_EMAIL_LOCALES = ['en', 'es', 'th'] as const;
export type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number];

export const DEFAULT_EMAIL_LOCALE: EmailLocale = 'en';

export const EMAIL_TEMPLATE_KEYS = [
  'account-delete-email',
  'change-email-email',
  'confirm-signup-email',
  'invite-email',
  'magic-link-email',
  'otp-email',
  'reauthentication-email',
  'reset-password-email',
] as const;
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

type EmailTemplateCatalog = Record<EmailTemplateKey, EmailTemplateTranslation>;

const catalogs: Record<EmailLocale, EmailTemplateCatalog> = {
  en: {
    'account-delete-email': enAccountDeleteEmail as EmailTemplateTranslation,
    'change-email-email': enChangeEmailEmail as EmailTemplateTranslation,
    'confirm-signup-email': enConfirmSignupEmail as EmailTemplateTranslation,
    'invite-email': enInviteEmail as EmailTemplateTranslation,
    'magic-link-email': enMagicLinkEmail as EmailTemplateTranslation,
    'otp-email': enOtpEmail as EmailTemplateTranslation,
    'reauthentication-email': enReauthenticationEmail as EmailTemplateTranslation,
    'reset-password-email': enResetPasswordEmail as EmailTemplateTranslation,
  },
  es: {
    'account-delete-email': esAccountDeleteEmail as EmailTemplateTranslation,
    'change-email-email': esChangeEmailEmail as EmailTemplateTranslation,
    'confirm-signup-email': esConfirmSignupEmail as EmailTemplateTranslation,
    'invite-email': esInviteEmail as EmailTemplateTranslation,
    'magic-link-email': esMagicLinkEmail as EmailTemplateTranslation,
    'otp-email': esOtpEmail as EmailTemplateTranslation,
    'reauthentication-email': esReauthenticationEmail as EmailTemplateTranslation,
    'reset-password-email': esResetPasswordEmail as EmailTemplateTranslation,
  },
  th: {
    'account-delete-email': thAccountDeleteEmail as EmailTemplateTranslation,
    'change-email-email': thChangeEmailEmail as EmailTemplateTranslation,
    'confirm-signup-email': thConfirmSignupEmail as EmailTemplateTranslation,
    'invite-email': thInviteEmail as EmailTemplateTranslation,
    'magic-link-email': thMagicLinkEmail as EmailTemplateTranslation,
    'otp-email': thOtpEmail as EmailTemplateTranslation,
    'reauthentication-email': thReauthenticationEmail as EmailTemplateTranslation,
    'reset-password-email': thResetPasswordEmail as EmailTemplateTranslation,
  },
};

export function listSupportedEmailLocales(): ReadonlyArray<EmailLocale> {
  return SUPPORTED_EMAIL_LOCALES;
}

export function listEmailTemplateKeys(): ReadonlyArray<EmailTemplateKey> {
  return EMAIL_TEMPLATE_KEYS;
}

export function isSupportedEmailLocale(value: string | null | undefined): value is EmailLocale {
  if (!value) {
    return false;
  }

  return (SUPPORTED_EMAIL_LOCALES as ReadonlyArray<string>).includes(value.toLowerCase());
}

export function normalizeEmailLocale(
  value: EmailLocale | string | null | undefined,
  fallbackLocale: EmailLocale = DEFAULT_EMAIL_LOCALE
): EmailLocale {
  if (!value) {
    return fallbackLocale;
  }

  const normalized = value.toLowerCase().replace('_', '-');
  if (isSupportedEmailLocale(normalized)) {
    return normalized;
  }

  const baseLocale = normalized.split('-')[0];
  return isSupportedEmailLocale(baseLocale) ? baseLocale : fallbackLocale;
}

export function getEmailTemplateTranslation(
  locale: EmailLocale | string | null | undefined,
  template: EmailTemplateKey,
  fallbackLocale: EmailLocale = DEFAULT_EMAIL_LOCALE
): EmailTemplateTranslation {
  const resolvedLocale = normalizeEmailLocale(locale, fallbackLocale);
  const resolvedCatalog = catalogs[resolvedLocale];
  const fallbackCatalog = catalogs[fallbackLocale];

  return resolvedCatalog[template] ?? fallbackCatalog[template];
}

export function interpolateEmailTemplateText(value: string, params?: EmailTemplateParams): string {
  if (!params) {
    return value;
  }

  let result = '';
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf('{{', cursor);
    if (start === -1) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, start);

    const end = value.indexOf('}}', start + 2);
    if (end === -1) {
      result += value.slice(start);
      break;
    }

    const key = value.slice(start + 2, end).trim();
    const resolved = params[key];
    result += resolved == null ? value.slice(start, end + 2) : String(resolved);
    cursor = end + 2;
  }

  return result;
}

export function renderEmailTemplateTranslation({
  locale,
  template,
  params,
  fallbackLocale = DEFAULT_EMAIL_LOCALE,
}: {
  locale: EmailLocale | string | null | undefined;
  template: EmailTemplateKey;
  params?: EmailTemplateParams;
  fallbackLocale?: EmailLocale;
}): EmailTemplateTranslation {
  const translation = getEmailTemplateTranslation(locale, template, fallbackLocale);

  return {
    subject: interpolateEmailTemplateText(translation.subject, params),
    preview: interpolateEmailTemplateText(translation.preview, params),
    greeting: interpolateEmailTemplateText(translation.greeting, params),
    intro: interpolateEmailTemplateText(translation.intro, params),
    ctaLabel: interpolateEmailTemplateText(translation.ctaLabel, params),
    ignoreNotice: interpolateEmailTemplateText(translation.ignoreNotice, params),
    footer: interpolateEmailTemplateText(translation.footer, params),
    codeLabel: translation.codeLabel
      ? interpolateEmailTemplateText(translation.codeLabel, params)
      : undefined,
    closing: translation.closing
      ? interpolateEmailTemplateText(translation.closing, params)
      : undefined,
  };
}

export interface EmailTemplateTranslator {
  locale: EmailLocale;
  template: EmailTemplateKey;
  translation: EmailTemplateTranslation;
  t: (key: keyof EmailTemplateTranslation, params?: EmailTemplateParams) => string;
}

export function createEmailTemplateTranslator({
  locale,
  template,
  fallbackLocale = DEFAULT_EMAIL_LOCALE,
}: {
  locale: EmailLocale | string | null | undefined;
  template: EmailTemplateKey;
  fallbackLocale?: EmailLocale;
}): EmailTemplateTranslator {
  const resolvedLocale = normalizeEmailLocale(locale, fallbackLocale);
  const translation = getEmailTemplateTranslation(resolvedLocale, template, fallbackLocale);

  return {
    locale: resolvedLocale,
    template,
    translation,
    t(key: keyof EmailTemplateTranslation, params?: EmailTemplateParams): string {
      const value = translation[key];
      if (typeof value !== 'string') {
        return '';
      }

      return interpolateEmailTemplateText(value, params);
    },
  };
}
