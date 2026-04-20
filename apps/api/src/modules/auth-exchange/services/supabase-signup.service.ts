import { Injectable, Logger } from '@nestjs/common';

interface SupabaseSignupServiceOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_SIGNUP_TIMEOUT_MS = 15000;

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError' || error.name === 'TimeoutError'
    : error instanceof Error
    ? error.name === 'AbortError' || error.name === 'TimeoutError'
    : false;
}

@Injectable()
export class SupabaseSignupService {
  private readonly logger = new Logger(SupabaseSignupService.name);

  async signUp(
    email: string,
    password: string,
    locale?: string,
    options: SupabaseSignupServiceOptions = {}
  ): Promise<{
    needsEmailVerification: boolean;
    emailAlreadyRegistered?: boolean;
    confirmationEmailSent?: boolean;
    error?: string;
  }> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const fetchFn = options.fetchFn ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_SIGNUP_TIMEOUT_MS;

    if (!supabaseUrl || !supabaseKey) {
      return {
        needsEmailVerification: false,
        error: 'Signup service temporarily unavailable',
      };
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await fetchFn(`${normalizeBaseUrl(supabaseUrl)}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          email,
          password,
          data: locale ? { locale } : {},
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as unknown;
        const errorStr = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody);

        this.logger.error('Supabase signup failed', {
          email,
          status: response.status,
          error: errorBody,
        });

        // Check for duplicate key error (user already exists)
        if (errorStr.includes('duplicate key') || errorStr.includes('23505')) {
          return {
            needsEmailVerification: true,
            emailAlreadyRegistered: true,
            confirmationEmailSent: false,
          };
        }

        return {
          needsEmailVerification: false,
          error: 'Unable to create account. Please try again.',
        };
      }

      await response.json();
      this.logger.debug('User signed up successfully', { email });

      return {
        needsEmailVerification: true,
        emailAlreadyRegistered: false,
        confirmationEmailSent: true,
      };
    } catch (error) {
      if (isAbortError(error)) {
        this.logger.error('Supabase signup timed out', {
          email,
          timeoutMs,
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Signup service error', { email, error: message });
      return {
        needsEmailVerification: false,
        error: 'Unable to create account. Please try again.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
