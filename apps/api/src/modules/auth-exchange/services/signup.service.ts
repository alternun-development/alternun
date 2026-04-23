import { Injectable, Logger, Optional } from '@nestjs/common';
import { SignUpRequestDto } from '../dto/signup-request.dto';
import { SignUpResponseDto } from '../dto/signup-response.dto';
import {
  deriveSignupName,
  hasUnverifiedAuthUserByEmail,
  isDuplicateSignupError,
  normalizeSignupUser,
  resolveVerificationCallbackUrl,
  firstNonEmptyTrimmed,
  extractErrorMessage,
  extractErrorStatus,
} from './signup/signup.utils';
import { createSignupProvider } from './signup/signup.provider.factory';
import type { SignupProvider, SignupResult } from './signup/signup.types';

type AuthUserLookup = (email: string) => Promise<boolean>;

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    @Optional()
    private readonly authApi?: SignupProvider,
    @Optional()
    private readonly authUserLookup: AuthUserLookup = hasUnverifiedAuthUserByEmail
  ) {}

  private resolveProvider(): SignupProvider {
    return this.authApi ?? createSignupProvider(process.env);
  }

  private normalizeResult(result: SignupResult): SignUpResponseDto {
    const isEmailVerified = Boolean(result.user?.email_confirmed_at);
    const token =
      isEmailVerified &&
      result.session?.access_token &&
      typeof result.session.access_token === 'string'
        ? result.session.access_token
        : null;
    const accessToken = isEmailVerified ? token : null;
    const user = result.user ? normalizeSignupUser(result.user) : null;
    const needsEmailVerification = !isEmailVerified;

    return {
      needsEmailVerification,
      emailAlreadyRegistered: false,
      confirmationEmailSent: needsEmailVerification,
      token,
      accessToken,
      user,
    };
  }

  async signUp(request: SignUpRequestDto): Promise<SignUpResponseDto> {
    const email = request.email.trim();
    const password = request.password;
    const name = deriveSignupName(email, request.name);
    const locale = firstNonEmptyTrimmed([request.locale]);
    const authApi = this.resolveProvider();
    const callbackURL = resolveVerificationCallbackUrl(process.env);

    try {
      const response = await authApi.signUpEmail({
        body: {
          name,
          email,
          password,
          callbackURL,
          ...(locale ? { locale } : {}),
        },
      });

      const normalized = this.normalizeResult(response);
      this.logger.debug(`${authApi.name} signup completed`, {
        email,
        name,
        provider: authApi.name,
        needsEmailVerification: normalized.needsEmailVerification,
        hasToken: Boolean(normalized.accessToken),
        emailVerified: !normalized.needsEmailVerification,
      });

      return normalized;
    } catch (error) {
      const unverifiedAuthUserExists = await this.authUserLookup(email).catch(() => false);
      if (unverifiedAuthUserExists) {
        this.logger.warn(
          `${authApi.name} signup redirected to verification because auth.users already has an unverified email`,
          {
            email,
            name,
            provider: authApi.name,
          }
        );

        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: false,
          confirmationEmailSent: false,
        };
      }

      if (isDuplicateSignupError(error)) {
        this.logger.warn(`${authApi.name} signup requires email verification follow-up`, {
          email,
          name,
          provider: authApi.name,
        });

        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: false,
          confirmationEmailSent: false,
        };
      }

      const message = extractErrorMessage(error);
      const status = extractErrorStatus(error);
      this.logger.error(`${authApi.name} signup failed`, {
        email,
        name,
        provider: authApi.name,
        status,
        error: message,
      });

      throw new Error(`PROVIDER_ERROR: ${message}`);
    }
  }
}
