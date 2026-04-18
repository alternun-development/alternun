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

      // Better Auth endpoints: try common paths
      const signUpUrls = [
        `${betterAuthUrl.replace(/\/+$/, '')}/api/auth/sign-up/email`,
        `${betterAuthUrl.replace(/\/+$/, '')}/auth/api/sign-up/email`,
        `${betterAuthUrl.replace(/\/+$/, '')}/sign-up/email`,
      ];

      let lastError: Error | null = null;

      for (const signUpUrl of signUpUrls) {
        try {
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
            this.logger.debug('Response not JSON', {
              email,
              status: response.status,
              contentType,
              preview: text.substring(0, 100),
            });
          }

          if (response.ok && data) {
            this.logger.debug('Signup successful', { email });
            if (data.user) {
              return {
                needsEmailVerification: true,
                emailAlreadyRegistered: false,
                confirmationEmailSent: true,
              };
            }
            return {
              needsEmailVerification: true,
              emailAlreadyRegistered: false,
              confirmationEmailSent: false,
            };
          }

          if (response.ok) {
            return {
              needsEmailVerification: true,
              emailAlreadyRegistered: false,
              confirmationEmailSent: false,
            };
          }

          if (response.status !== 404) {
            const errorMessage = this.extractErrorMessage(data, response.status);

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

            lastError = new Error(`PROVIDER_ERROR: ${errorMessage}`);
            break;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (lastError) {
        throw lastError;
      }

      throw new Error('PROVIDER_ERROR: No valid Better Auth endpoint found. Check configuration.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Signup service error', { email, error: message });
      throw new Error(`PROVIDER_ERROR: ${message}`);
    }
  }
}
