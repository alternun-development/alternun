import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SupabaseSignupService {
  private readonly logger = new Logger(SupabaseSignupService.name);

  async signUp(
    email: string,
    password: string,
    locale?: string
  ): Promise<{
    needsEmailVerification: boolean;
    emailAlreadyRegistered?: boolean;
    confirmationEmailSent?: boolean;
    error?: string;
  }> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        needsEmailVerification: false,
        error: 'Signup service temporarily unavailable',
      };
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Signup service error', { email, error: message });
      return {
        needsEmailVerification: false,
        error: 'Unable to create account. Please try again.',
      };
    }
  }
}
