import { AlternunConfigError, AlternunProviderError } from '../../core/errors';
async function postJson(fetchFn, baseUrl, path, body) {
    const normalizedBaseUrl = baseUrl
        .trim()
        .replace(/\/+$/, '')
        .replace(/\/auth\/exchange$/, '')
        .replace(/\/auth$/, '');
    const normalizedPath = path.trim().replace(/^\/+/, '');
    const url = new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
    return fetchFn(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}
export class BetterAuthEmailProvider {
    constructor(options = {}) {
        this.options = options;
        this.name = 'postmark';
    }
    get fetchFn() {
        var _a;
        return (_a = this.options.fetchFn) !== null && _a !== void 0 ? _a : fetch;
    }
    requireBaseUrl() {
        var _a;
        const baseUrl = (_a = this.options.baseUrl) === null || _a === void 0 ? void 0 : _a.trim();
        if (!baseUrl) {
            throw new AlternunConfigError('Better Auth email provider requires a baseUrl for /auth/send-verification-email.');
        }
        return baseUrl;
    }
    async sendVerificationEmail(input) {
        const response = await postJson(this.fetchFn, this.requireBaseUrl(), '/auth/send-verification-email', {
            email: input.email,
            ...(input.redirectUrl ? { callbackURL: input.redirectUrl } : {}),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new AlternunProviderError(`Better Auth verification email request failed (${response.status} ${response.statusText}): ${text}`);
        }
    }
    sendPasswordResetEmail() {
        return Promise.reject(new AlternunProviderError('Better Auth email provider does not support password reset email delivery.'));
    }
    sendMagicLink() {
        return Promise.reject(new AlternunProviderError('Better Auth email provider does not support magic link delivery.'));
    }
    healthcheck() {
        var _a;
        return Promise.resolve({
            ok: Boolean(this.options.baseUrl),
            provider: this.name,
            details: {
                baseUrl: (_a = this.options.baseUrl) !== null && _a !== void 0 ? _a : null,
            },
        });
    }
}
