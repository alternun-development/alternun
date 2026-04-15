import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
import { AlternunConfigError } from '../../core/errors';

export interface PostmarkEmailProviderOptions {
  serverToken?: string;
  from?: string;
  senderName?: string;
  sendEmail?: (input: EmailMessageInput) => Promise<void>;
}

export class PostmarkEmailProvider implements EmailProvider {
  readonly name = 'postmark' as const;

  constructor(private readonly options: PostmarkEmailProviderOptions = {}) {}

  private async send(input: EmailMessageInput): Promise<void> {
    if (this.options.sendEmail) {
      await this.options.sendEmail(input);
      return;
    }

    throw new AlternunConfigError('Postmark email provider is not configured.');
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
      ok: [this.options.sendEmail, this.options.serverToken, this.options.from].some(Boolean),
      provider: this.name,
      details: {
        from: this.options.from ?? null,
        senderName: this.options.senderName ?? null,
      },
    });
  }
}
