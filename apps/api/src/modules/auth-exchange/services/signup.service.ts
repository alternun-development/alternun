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
import { sendSignupWelcomeEmail } from '../signup-welcome.email';
import type { SignupProvider, SignupResult } from './signup/signup.types';
import { ReferralsService } from '../../referrals/referrals.service';

type AuthUserLookup = (email: string) => Promise<boolean>;

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    @Optional()
    private readonly authApi?: SignupProvider,
    @Optional()
    private readonly authUserLookup: AuthUserLookup = hasUnverifiedAuthUserByEmail,
    @Optional()
    private readonly referralsService?: ReferralsService
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
          ...(request.referral_code ? { referral_code: request.referral_code } : {}),
          ...(request.referred_by_username
            ? { referred_by_username: request.referred_by_username }
            : {}),
          ...(request.referred_by_email ? { referred_by_email: request.referred_by_email } : {}),
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

      // Send signup welcome email asynchronously
      if (response.user) {
        if (this.referralsService) {
          await this.referralsService
            .create(response.user.id, {
              referral_code: request.referral_code,
              referred_by_username: request.referred_by_username,
              referred_by_email: request.referred_by_email,
            })
            .catch((err) => {
              this.logger.warn('Failed to persist referral at signup time', {
                email,
                error: err instanceof Error ? err.message : String(err),
              });
            });
        }

        this.sendSignupWelcomeEmailAsync(email, name, locale).catch((err) => {
          this.logger.warn('Failed to send signup welcome email', {
            email,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

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

  private async sendSignupWelcomeEmailAsync(
    email: string,
    displayName: string,
    locale?: string | null
  ): Promise<void> {
    try {
      const dashboardUrl = process.env.DASHBOARD_URL ?? 'https://airs.alternun.co';
      await sendSignupWelcomeEmail({
        to: email,
        displayName,
        dashboardUrl,
        locale,
      });
      this.logger.debug('Signup welcome email sent successfully', { email, displayName });
    } catch (error) {
      this.logger.error('Error sending signup welcome email', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
