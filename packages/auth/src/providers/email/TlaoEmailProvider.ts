import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
import { AlternunConfigError } from '../../core/errors';

export interface TlaoEmailProviderOptions {
  from?: string;
  senderName?: string;
  sendEmail?: (input: EmailMessageInput) => Promise<void>;
}

export class TlaoEmailProvider implements EmailProvider {
  readonly name = 'tlao' as const;

  constructor(private readonly options: TlaoEmailProviderOptions = {}) {}

  private async send(input: EmailMessageInput): Promise<void> {
    if (this.options.sendEmail) {
      await this.options.sendEmail(input);
      return;
    }

    throw new AlternunConfigError('Tláo email provider is not configured.');
  }

  async sendVerificationEmail(input: EmailMessageInput): Promise<void> {
    await this.send({ ...input, templateName: input.templateName ?? 'verification' });
  }

  async sendPasswordResetEmail(input: EmailMessageInput): Promise<void> {
    await this.send({ ...input, templateName: input.templateName ?? 'password-reset' });
  }

  async sendMagicLink(input: EmailMessageInput): Promise<void> {
    await this.send({ ...input, templateName: input.templateName ?? 'magic-link' });
  }

  healthcheck(): Promise<EmailProviderHealthcheckResult> {
    return Promise.resolve({
      ok: [this.options.sendEmail, this.options.from].some(Boolean),
      provider: this.name,
      details: {
        from: this.options.from ?? null,
        senderName: this.options.senderName ?? null,
      },
    });
  }
}
