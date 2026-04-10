import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
import { AlternunConfigError } from '../../core/errors';

export interface SupabaseEmailProviderOptions {
  from?: string;
  senderName?: string;
  sendVerificationEmail?: (input: EmailMessageInput) => Promise<void>;
  sendPasswordResetEmail?: (input: EmailMessageInput) => Promise<void>;
  sendMagicLink?: (input: EmailMessageInput) => Promise<void>;
}

export class SupabaseEmailProvider implements EmailProvider {
  readonly name = 'supabase' as const;

  constructor(private readonly options: SupabaseEmailProviderOptions = {}) {}

  async sendVerificationEmail(input: EmailMessageInput): Promise<void> {
    if (this.options.sendVerificationEmail) {
      await this.options.sendVerificationEmail(input);
      return;
    }

    throw new AlternunConfigError('Supabase email provider is not configured.');
  }

  async sendPasswordResetEmail(input: EmailMessageInput): Promise<void> {
    if (this.options.sendPasswordResetEmail) {
      await this.options.sendPasswordResetEmail(input);
      return;
    }

    throw new AlternunConfigError('Supabase email provider is not configured.');
  }

  async sendMagicLink(input: EmailMessageInput): Promise<void> {
    if (this.options.sendMagicLink) {
      await this.options.sendMagicLink(input);
      return;
    }

    throw new AlternunConfigError('Supabase email provider is not configured.');
  }

  healthcheck(): Promise<EmailProviderHealthcheckResult> {
    return Promise.resolve({
      ok: [
        this.options.sendVerificationEmail,
        this.options.sendPasswordResetEmail,
        this.options.sendMagicLink,
        this.options.from,
      ].some(Boolean),
      provider: this.name,
      details: {
        from: this.options.from ?? null,
        senderName: this.options.senderName ?? null,
      },
    });
  }
}
