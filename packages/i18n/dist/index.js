"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawCatalogs = exports.DEFAULT_LOCALE = exports.TRANSLATION_NAMESPACES = exports.SUPPORTED_LOCALES = void 0;
exports.listSupportedLocales = listSupportedLocales;
exports.isSupportedLocale = isSupportedLocale;
exports.normalizeLocale = normalizeLocale;
exports.getCatalog = getCatalog;
exports.resolveMessages = resolveMessages;
exports.translate = translate;
exports.createTranslator = createTranslator;
exports.getLocaleLabel = getLocaleLabel;
const en_json_1 = __importDefault(require("./catalogs/en.json"));
const es_json_1 = __importDefault(require("./catalogs/es.json"));
const th_json_1 = __importDefault(require("./catalogs/th.json"));
exports.SUPPORTED_LOCALES = ['en', 'es', 'th',];
exports.TRANSLATION_NAMESPACES = ['shared', 'mobile', 'web', 'docs',];
exports.DEFAULT_LOCALE = 'en';
const catalogs = {
    en: en_json_1.default,
    es: es_json_1.default,
    th: th_json_1.default,
};
function isTree(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function deepMerge(base, override) {
    const result = { ...base, };
    for (const [key, value,] of Object.entries(override)) {
        const baseValue = result[key];
        if (isTree(baseValue) && isTree(value)) {
            result[key] = deepMerge(baseValue, value);
            continue;
        }
        result[key] = value;
    }
    return result;
}
function getPathValue(tree, key) {
    const segments = key.split('.').filter(Boolean);
    let current = tree;
    for (const segment of segments) {
        if (!isTree(current)) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}
function interpolate(template, params) {
    if (!params) {
        return template;
    }
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token) => {
        const value = params[token.trim()];
        return value == null ? '' : String(value);
    });
}
function listSupportedLocales() {
    return exports.SUPPORTED_LOCALES;
}
function isSupportedLocale(value) {
    if (!value) {
        return false;
    }
    return exports.SUPPORTED_LOCALES.includes(value.toLowerCase());
}
function normalizeLocale(value, fallbackLocale = exports.DEFAULT_LOCALE) {
    if (!value) {
        return fallbackLocale;
    }
    const normalized = value.toLowerCase().replace('_', '-');
    if (isSupportedLocale(normalized)) {
        return normalized;
    }
    const baseLocale = normalized.split('-')[0];
    return isSupportedLocale(baseLocale) ? baseLocale : fallbackLocale;
}
function getCatalog(locale) {
    return catalogs[normalizeLocale(locale)];
}
function resolveMessages({ locale, namespace, fallbackLocale = exports.DEFAULT_LOCALE, includeShared = namespace !== 'shared', }) {
    const resolvedLocale = normalizeLocale(locale, fallbackLocale);
    const fallbackCatalog = catalogs[fallbackLocale];
    const resolvedCatalog = catalogs[resolvedLocale];
    if (namespace === 'shared') {
        if (resolvedLocale === fallbackLocale) {
            return fallbackCatalog.shared;
        }
        return deepMerge(fallbackCatalog.shared, resolvedCatalog.shared);
    }
    let messages = {};
    if (includeShared) {
        messages = deepMerge(messages, fallbackCatalog.shared);
    }
    messages = deepMerge(messages, fallbackCatalog[namespace]);
    if (resolvedLocale === fallbackLocale) {
        return messages;
    }
    if (includeShared) {
        messages = deepMerge(messages, resolvedCatalog.shared);
    }
    return deepMerge(messages, resolvedCatalog[namespace]);
}
function translate({ locale, namespace, key, params, fallbackLocale = exports.DEFAULT_LOCALE, fallbackValue = key, }) {
    const messages = resolveMessages({
        locale,
        namespace,
        fallbackLocale,
    });
    const value = getPathValue(messages, key);
    return typeof value === 'string' ? interpolate(value, params) : fallbackValue;
}
function createTranslator({ locale, namespace, fallbackLocale = exports.DEFAULT_LOCALE, }) {
    const resolvedLocale = normalizeLocale(locale, fallbackLocale);
    const messages = resolveMessages({
        locale: resolvedLocale,
        namespace,
        fallbackLocale,
    });
    return {
        locale: resolvedLocale,
        namespace,
        messages,
        has(key) {
            return typeof getPathValue(messages, key) === 'string';
        },
        t(key, params, fallbackValue) {
            const value = getPathValue(messages, key);
            if (typeof value !== 'string') {
                return fallbackValue !== null && fallbackValue !== void 0 ? fallbackValue : key;
            }
            return interpolate(value, params);
        },
    };
}
function getLocaleLabel(locale, displayLocale = exports.DEFAULT_LOCALE) {
    const resolvedLocale = normalizeLocale(locale);
    return translate({
        locale: displayLocale,
        namespace: 'shared',
        key: `languageNames.${resolvedLocale}`,
        fallbackValue: resolvedLocale,
    });
}
exports.rawCatalogs = catalogs;
