import { Injectable, Logger } from '@nestjs/common';
import { SignUpRequestDto } from '../dto/signup-request.dto';
import { SignUpResponseDto } from '../dto/signup-response.dto';

interface BetterAuthResponse {
  error?: string;
  message?: string;
  user?: Record<string, unknown>;
}

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  private extractErrorMessage(data: BetterAuthResponse | null, status: number): string {
    if (!data) return `HTTP ${status}`;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    return `HTTP ${status}`;
  }

  async signUp(request: SignUpRequestDto): Promise<SignUpResponseDto> {
    const { email, password, locale } = request;

    try {
      const betterAuthUrl =
        process.env.AUTH_BETTER_AUTH_URL ?? process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '';

      if (!betterAuthUrl) {
        throw new Error('CONFIG_ERROR: Better Auth URL not configured');
      }

      const signUpUrl = `${betterAuthUrl.replace(/\/+$/, '')}/sign-up/email`;

      this.logger.debug('Attempting signup via Better Auth', { email, url: signUpUrl });

      const response = await fetch(signUpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: email.split('@')[0],
          ...(locale ? { data: { locale } } : {}),
        }),
      });

      const contentType = response.headers.get('content-type');
      let data: BetterAuthResponse | null = null;

      try {
        if (contentType?.includes('application/json')) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data = await response.json();
        }
      } catch (parseError) {
        const text = await response.text();
        this.logger.error('Failed to parse response as JSON', {
          email,
          status: response.status,
          contentType,
          responseText: text.substring(0, 500),
        });
      }

      this.logger.debug('Better Auth signup response', {
        email,
        status: response.status,
        hasData: !!data,
      });

      if (!response.ok) {
        const errorMessage = this.extractErrorMessage(data, response.status);

        this.logger.error('Better Auth signup error', {
          email,
          error: errorMessage,
          status: response.status,
        });

        if (
          errorMessage.toLowerCase().includes('already') ||
          errorMessage.toLowerCase().includes('exists')
        ) {
          return {
            needsEmailVerification: true,
            emailAlreadyRegistered: true,
            confirmationEmailSent: false,
          };
        }

        throw new Error(`PROVIDER_ERROR: ${errorMessage}`);
      }

      // If signup was successful, user should be created
      if (data?.user) {
        this.logger.debug('User created successfully', { email });
        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: false,
          confirmationEmailSent: true,
        };
      }

      this.logger.warn('Unexpected signup response', { data, email });
      return {
        needsEmailVerification: true,
        emailAlreadyRegistered: false,
        confirmationEmailSent: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Signup service error', { email, error: message });
      throw new Error(`PROVIDER_ERROR: ${message}`);
    }
  }
}
