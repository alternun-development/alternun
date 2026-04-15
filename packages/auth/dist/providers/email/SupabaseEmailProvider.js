import { AlternunConfigError } from '../../core/errors.js';
export class SupabaseEmailProvider {
    constructor(options = {}) {
        this.options = options;
        this.name = 'supabase';
    }
    async sendVerificationEmail(input) {
        if (this.options.sendVerificationEmail) {
            await this.options.sendVerificationEmail(input);
            return;
        }
        throw new AlternunConfigError('Supabase email provider is not configured.');
    }
    async sendPasswordResetEmail(input) {
        if (this.options.sendPasswordResetEmail) {
            await this.options.sendPasswordResetEmail(input);
            return;
        }
        throw new AlternunConfigError('Supabase email provider is not configured.');
    }
    async sendMagicLink(input) {
        if (this.options.sendMagicLink) {
            await this.options.sendMagicLink(input);
            return;
        }
        throw new AlternunConfigError('Supabase email provider is not configured.');
    }
    healthcheck() {
        var _a, _b;
        return Promise.resolve({
            ok: [
                this.options.sendVerificationEmail,
                this.options.sendPasswordResetEmail,
                this.options.sendMagicLink,
                this.options.from,
            ].some(Boolean),
            provider: this.name,
            details: {
                from: (_a = this.options.from) !== null && _a !== void 0 ? _a : null,
                senderName: (_b = this.options.senderName) !== null && _b !== void 0 ? _b : null,
            },
        });
    }
}
