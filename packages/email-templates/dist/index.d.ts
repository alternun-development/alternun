export {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_TEMPLATE_KEYS,
  SUPPORTED_EMAIL_LOCALES,
  createEmailTemplateTranslator,
  getEmailTemplateTranslation,
  interpolateEmailTemplateText,
  isSupportedEmailLocale,
  listEmailTemplateKeys,
  listSupportedEmailLocales,
  normalizeEmailLocale,
  renderEmailTemplateTranslation,
  type EmailLocale,
  type EmailTemplateKey,
  type EmailTemplateParams,
  type EmailTemplateTranslation,
  type EmailTemplateTranslator,
} from './lib/i18n';
export {
  renderAirsWelcomeEmail,
  type AirsWelcomeEmail,
  type AirsWelcomeEmailInput,
} from './lib/airs-welcome';
