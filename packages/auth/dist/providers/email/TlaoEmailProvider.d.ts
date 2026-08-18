import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
export interface TlaoEmailProviderOptions {
  from?: string;
  senderName?: string;
  sendEmail?: (input: EmailMessageInput) => Promise<void>;
}
export declare class TlaoEmailProvider implements EmailProvider {
  private readonly options;
  readonly name: 'tlao';
  constructor(options?: TlaoEmailProviderOptions);
  private send;
  sendVerificationEmail(input: EmailMessageInput): Promise<void>;
  sendPasswordResetEmail(input: EmailMessageInput): Promise<void>;
  sendMagicLink(input: EmailMessageInput): Promise<void>;
  healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
