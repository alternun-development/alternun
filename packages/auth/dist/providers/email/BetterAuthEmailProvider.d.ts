import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
export interface BetterAuthEmailProviderOptions {
    baseUrl?: string;
    fetchFn?: typeof fetch;
}
export declare class BetterAuthEmailProvider implements EmailProvider {
    private readonly options;
    readonly name: "postmark";
    constructor(options?: BetterAuthEmailProviderOptions);
    private get fetchFn();
    private requireBaseUrl;
    sendVerificationEmail(input: EmailMessageInput): Promise<void>;
    sendPasswordResetEmail(): Promise<void>;
    sendMagicLink(): Promise<void>;
    healthcheck(): Promise<EmailProviderHealthcheckResult>;
}
