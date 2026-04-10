import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
export interface SesEmailProviderOptions {
  region?: string;
  from?: string;
  senderName?: string;
  sendEmail?: (input: EmailMessageInput) => Promise<void>;
}
export declare class SesEmailProvider implements EmailProvider {
  private readonly options;
  readonly name: 'ses';
  constructor(options?: SesEmailProviderOptions);
  private send;
  sendVerificationEmail(input: EmailMessageInput): Promise<void>;
  sendPasswordResetEmail(input: EmailMessageInput): Promise<void>;
  sendMagicLink(input: EmailMessageInput): Promise<void>;
  healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
