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
      // Use consistent standard: POST /api/v1/auth/signup through the API facade
      // This endpoint is defined in auth-exchange.controller.ts
      // Clients should call this endpoint, not Better Auth directly
      const baseUrl =
        process.env.AUTH_API_URL ??
        process.env.EXPO_PUBLIC_API_URL ??
        process.env.AUTH_BETTER_AUTH_URL?.replace(/\/auth$/, '') ??
        'http://localhost:8081';

      const signUpUrl = `${baseUrl.replace(/\/+$/, '')}/auth/signup`;

      this.logger.debug('Attempting signup via API facade', { email, url: signUpUrl });

      const response = await fetch(signUpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...(locale ? { locale } : {}),
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
        this.logger.error('Failed to parse signup response as JSON', {
          email,
          status: response.status,
          contentType,
          responseText: text.substring(0, 200),
        });
        throw new Error(`PARSE_ERROR: Invalid response from signup endpoint at ${signUpUrl}`);
      }

      if (!response.ok) {
        const errorMessage = this.extractErrorMessage(data, response.status);

        this.logger.error('Signup failed', {
          email,
          status: response.status,
          error: errorMessage,
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

      if (data?.user) {
        this.logger.debug('User created successfully', { email });
        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: false,
          confirmationEmailSent: true,
        };
      }

      this.logger.warn('Signup completed but no user data returned', { email });
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
