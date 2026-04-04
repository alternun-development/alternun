"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_TEMPLATE_KEYS = exports.DEFAULT_EMAIL_LOCALE = exports.SUPPORTED_EMAIL_LOCALES = void 0;
exports.listSupportedEmailLocales = listSupportedEmailLocales;
exports.listEmailTemplateKeys = listEmailTemplateKeys;
exports.isSupportedEmailLocale = isSupportedEmailLocale;
exports.normalizeEmailLocale = normalizeEmailLocale;
exports.getEmailTemplateTranslation = getEmailTemplateTranslation;
exports.interpolateEmailTemplateText = interpolateEmailTemplateText;
exports.renderEmailTemplateTranslation = renderEmailTemplateTranslation;
exports.createEmailTemplateTranslator = createEmailTemplateTranslator;
const account_delete_email_json_1 = __importDefault(require("../locales/en/account-delete-email.json"));
const change_email_email_json_1 = __importDefault(require("../locales/en/change-email-email.json"));
const confirm_signup_email_json_1 = __importDefault(require("../locales/en/confirm-signup-email.json"));
const invite_email_json_1 = __importDefault(require("../locales/en/invite-email.json"));
const magic_link_email_json_1 = __importDefault(require("../locales/en/magic-link-email.json"));
const otp_email_json_1 = __importDefault(require("../locales/en/otp-email.json"));
const reauthentication_email_json_1 = __importDefault(require("../locales/en/reauthentication-email.json"));
const reset_password_email_json_1 = __importDefault(require("../locales/en/reset-password-email.json"));
const account_delete_email_json_2 = __importDefault(require("../locales/es/account-delete-email.json"));
const change_email_email_json_2 = __importDefault(require("../locales/es/change-email-email.json"));
const confirm_signup_email_json_2 = __importDefault(require("../locales/es/confirm-signup-email.json"));
const invite_email_json_2 = __importDefault(require("../locales/es/invite-email.json"));
const magic_link_email_json_2 = __importDefault(require("../locales/es/magic-link-email.json"));
const otp_email_json_2 = __importDefault(require("../locales/es/otp-email.json"));
const reauthentication_email_json_2 = __importDefault(require("../locales/es/reauthentication-email.json"));
const reset_password_email_json_2 = __importDefault(require("../locales/es/reset-password-email.json"));
const account_delete_email_json_3 = __importDefault(require("../locales/th/account-delete-email.json"));
const change_email_email_json_3 = __importDefault(require("../locales/th/change-email-email.json"));
const confirm_signup_email_json_3 = __importDefault(require("../locales/th/confirm-signup-email.json"));
const invite_email_json_3 = __importDefault(require("../locales/th/invite-email.json"));
const magic_link_email_json_3 = __importDefault(require("../locales/th/magic-link-email.json"));
const otp_email_json_3 = __importDefault(require("../locales/th/otp-email.json"));
const reauthentication_email_json_3 = __importDefault(require("../locales/th/reauthentication-email.json"));
const reset_password_email_json_3 = __importDefault(require("../locales/th/reset-password-email.json"));
exports.SUPPORTED_EMAIL_LOCALES = ['en', 'es', 'th'];
exports.DEFAULT_EMAIL_LOCALE = 'en';
exports.EMAIL_TEMPLATE_KEYS = [
    'account-delete-email',
    'change-email-email',
    'confirm-signup-email',
    'invite-email',
    'magic-link-email',
    'otp-email',
    'reauthentication-email',
    'reset-password-email',
];
const catalogs = {
    en: {
        'account-delete-email': account_delete_email_json_1.default,
        'change-email-email': change_email_email_json_1.default,
        'confirm-signup-email': confirm_signup_email_json_1.default,
        'invite-email': invite_email_json_1.default,
        'magic-link-email': magic_link_email_json_1.default,
        'otp-email': otp_email_json_1.default,
        'reauthentication-email': reauthentication_email_json_1.default,
        'reset-password-email': reset_password_email_json_1.default,
    },
    es: {
        'account-delete-email': account_delete_email_json_2.default,
        'change-email-email': change_email_email_json_2.default,
        'confirm-signup-email': confirm_signup_email_json_2.default,
        'invite-email': invite_email_json_2.default,
        'magic-link-email': magic_link_email_json_2.default,
        'otp-email': otp_email_json_2.default,
        'reauthentication-email': reauthentication_email_json_2.default,
        'reset-password-email': reset_password_email_json_2.default,
    },
    th: {
        'account-delete-email': account_delete_email_json_3.default,
        'change-email-email': change_email_email_json_3.default,
        'confirm-signup-email': confirm_signup_email_json_3.default,
        'invite-email': invite_email_json_3.default,
        'magic-link-email': magic_link_email_json_3.default,
        'otp-email': otp_email_json_3.default,
        'reauthentication-email': reauthentication_email_json_3.default,
        'reset-password-email': reset_password_email_json_3.default,
    },
};
function listSupportedEmailLocales() {
    return exports.SUPPORTED_EMAIL_LOCALES;
}
function listEmailTemplateKeys() {
    return exports.EMAIL_TEMPLATE_KEYS;
}
function isSupportedEmailLocale(value) {
    if (!value) {
        return false;
    }
    return exports.SUPPORTED_EMAIL_LOCALES.includes(value.toLowerCase());
}
function normalizeEmailLocale(value, fallbackLocale = exports.DEFAULT_EMAIL_LOCALE) {
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
function getEmailTemplateTranslation(locale, template, fallbackLocale = exports.DEFAULT_EMAIL_LOCALE) {
    var _a;
    const resolvedLocale = normalizeEmailLocale(locale, fallbackLocale);
    const resolvedCatalog = catalogs[resolvedLocale];
    const fallbackCatalog = catalogs[fallbackLocale];
    return (_a = resolvedCatalog[template]) !== null && _a !== void 0 ? _a : fallbackCatalog[template];
}
function interpolateEmailTemplateText(value, params) {
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
function renderEmailTemplateTranslation({ locale, template, params, fallbackLocale = exports.DEFAULT_EMAIL_LOCALE, }) {
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
function createEmailTemplateTranslator({ locale, template, fallbackLocale = exports.DEFAULT_EMAIL_LOCALE, }) {
    const resolvedLocale = normalizeEmailLocale(locale, fallbackLocale);
    const translation = getEmailTemplateTranslation(resolvedLocale, template, fallbackLocale);
    return {
        locale: resolvedLocale,
        template,
        translation,
        t(key, params) {
            const value = translation[key];
            if (typeof value !== 'string') {
                return '';
            }
            return interpolateEmailTemplateText(value, params);
        },
    };
}
