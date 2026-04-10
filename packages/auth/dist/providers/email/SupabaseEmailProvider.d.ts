import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
export interface SupabaseEmailProviderOptions {
  from?: string;
  senderName?: string;
  sendVerificationEmail?: (input: EmailMessageInput) => Promise<void>;
  sendPasswordResetEmail?: (input: EmailMessageInput) => Promise<void>;
  sendMagicLink?: (input: EmailMessageInput) => Promise<void>;
}
export declare class SupabaseEmailProvider implements EmailProvider {
  private readonly options;
  readonly name: 'supabase';
  constructor(options?: SupabaseEmailProviderOptions);
  sendVerificationEmail(input: EmailMessageInput): Promise<void>;
  sendPasswordResetEmail(input: EmailMessageInput): Promise<void>;
  sendMagicLink(input: EmailMessageInput): Promise<void>;
  healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
