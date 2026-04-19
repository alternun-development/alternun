import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SupabaseSignupService {
  private readonly logger = new Logger(SupabaseSignupService.name);

  async signUp(
    email: string,
    password: string,
    locale?: string
  ): Promise<{ success: boolean; message?: string }> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
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
          // Hint that account may exist without explicitly revealing it
          throw new Error(
            'Unable to create account with this email. This email may already be registered. Try signing in instead.'
          );
        }

        throw new Error(errorStr);
      }

      await response.json();
      this.logger.debug('User signed up successfully', { email });

      return {
        success: true,
        message: 'Confirmation email sent. Please check your email.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Signup service error', { email, error: message });
      throw new Error(message);
    }
  }
}
