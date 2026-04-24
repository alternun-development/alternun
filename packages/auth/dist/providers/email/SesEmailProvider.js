import { AlternunConfigError } from '../../core/errors';
export class SesEmailProvider {
    constructor(options = {}) {
        this.options = options;
        this.name = 'ses';
    }
    async send(input) {
        if (this.options.sendEmail) {
            await this.options.sendEmail(input);
            return;
        }
        throw new AlternunConfigError('SES email provider is not configured.');
    }
    async sendVerificationEmail(input) {
        var _a;
        await this.send({ ...input, templateName: (_a = input.templateName) !== null && _a !== void 0 ? _a : 'verification' });
    }
    async sendPasswordResetEmail(input) {
        var _a;
        await this.send({ ...input, templateName: (_a = input.templateName) !== null && _a !== void 0 ? _a : 'password-reset' });
    }
    async sendMagicLink(input) {
        var _a;
        await this.send({ ...input, templateName: (_a = input.templateName) !== null && _a !== void 0 ? _a : 'magic-link' });
    }
    healthcheck() {
        var _a, _b, _c;
        return Promise.resolve({
            ok: [this.options.sendEmail, this.options.region, this.options.from].some(Boolean),
            provider: this.name,
            details: {
                from: (_a = this.options.from) !== null && _a !== void 0 ? _a : null,
                senderName: (_b = this.options.senderName) !== null && _b !== void 0 ? _b : null,
                region: (_c = this.options.region) !== null && _c !== void 0 ? _c : null,
            },
        });
    }
}
