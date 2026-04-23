import type { EmailProvider } from '../../core/contracts';
import type { EmailMessageInput, EmailProviderHealthcheckResult } from '../../core/types';
import { AlternunConfigError, AlternunProviderError } from '../../core/errors';

export interface BetterAuthEmailProviderOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

async function postJson(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  body: unknown
): Promise<Response> {
  const normalizedBaseUrl = baseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/auth\/exchange$/, '')
    .replace(/\/auth$/, '');
  const normalizedPath = path.trim().replace(/^\/+/, '');
  const url = new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
  return fetchFn(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export class BetterAuthEmailProvider implements EmailProvider {
  readonly name = 'postmark' as const;

  constructor(private readonly options: BetterAuthEmailProviderOptions = {}) {}

  private get fetchFn(): typeof fetch {
    return this.options.fetchFn ?? fetch;
  }

  private requireBaseUrl(): string {
    const baseUrl = this.options.baseUrl?.trim();
    if (!baseUrl) {
      throw new AlternunConfigError(
        'Better Auth email provider requires a baseUrl for /auth/send-verification-email.'
      );
    }

    return baseUrl;
  }

  async sendVerificationEmail(input: EmailMessageInput): Promise<void> {
    const response = await postJson(
      this.fetchFn,
      this.requireBaseUrl(),
      '/auth/send-verification-email',
      {
        email: input.email,
        ...(input.redirectUrl ? { callbackURL: input.redirectUrl } : {}),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AlternunProviderError(
        `Better Auth verification email request failed (${response.status} ${response.statusText}): ${text}`
      );
    }
  }

  sendPasswordResetEmail(): Promise<void> {
    return Promise.reject(
      new AlternunProviderError(
        'Better Auth email provider does not support password reset email delivery.'
      )
    );
  }

  sendMagicLink(): Promise<void> {
    return Promise.reject(
      new AlternunProviderError('Better Auth email provider does not support magic link delivery.')
    );
  }

  healthcheck(): Promise<EmailProviderHealthcheckResult> {
    return Promise.resolve({
      ok: Boolean(this.options.baseUrl),
      provider: this.name,
      details: {
        baseUrl: this.options.baseUrl ?? null,
      },
    });
  }
}
