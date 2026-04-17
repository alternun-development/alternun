import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
export interface PostmarkEmailProviderOptions {
    serverToken?: string;
    from?: string;
    senderName?: string;
    sendEmail?: (input: EmailMessageInput) => Promise<void>;
}
export declare class PostmarkEmailProvider implements EmailProvider {
    private readonly options;
    readonly name: "postmark";
    constructor(options?: PostmarkEmailProviderOptions);
    private send;
    sendVerificationEmail(input: EmailMessageInput): Promise<void>;
    sendPasswordResetEmail(input: EmailMessageInput): Promise<void>;
    sendMagicLink(input: EmailMessageInput): Promise<void>;
    healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
