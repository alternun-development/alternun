import { HttpException, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { VerifyEmailConfirmationRequestDto } from '../dto/verify-email-confirmation-request.dto';
import { SignInResponseDto } from '../dto/signin-response.dto';
import { resolveBetterAuthDevConfig } from '../../better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../better-auth-dev/better-auth-dev.server';
import {
  extractErrorMessage,
  firstNonEmptyTrimmed,
  isBetterAuthEmailProvider,
  normalizeSignupUser,
  resolveSupabaseSignupConfig,
} from './signup/signup.utils';
import type { SignupUserRecord } from './signup/signup.types';

/** The slice of the Better Auth server API used for email verification codes. */
export type BetterAuthEmailOtpApi = {
  verifyEmailOTP(input: {
    body: { email: string; otp: string };
  }): Promise<{ user?: Record<string, unknown> | null } | null>;
  sendVerificationOTP(input: {
    body: { email: string; type: 'email-verification' };
  }): Promise<unknown>;
};

let cachedBetterAuthEmailOtpApi: BetterAuthEmailOtpApi | null = null;

function resolveBetterAuthEmailOtpApi(): BetterAuthEmailOtpApi {
  if (!cachedBetterAuthEmailOtpApi) {
    const auth = createBetterAuthDevAuth(resolveBetterAuthDevConfig(process.env)) as unknown as {
      api: BetterAuthEmailOtpApi;
    };
    cachedBetterAuthEmailOtpApi = auth.api;
  }

  return cachedBetterAuthEmailOtpApi;
}

function toBetterAuthHttpException(error: unknown): HttpException {
  const record = isRecord(error) ? error : {};
  const statusCode = typeof record.statusCode === 'number' ? record.statusCode : null;
  const status = statusCode && statusCode < 500 ? statusCode : HttpStatus.BAD_REQUEST;
  const message = extractErrorMessage(error) || 'Email verification failed.';
  return new HttpException(`PROVIDER_ERROR: ${message}`, status);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function normalizeSession(parsed: Record<string, unknown>): SignInResponseDto['session'] {
  const session = isRecord(parsed.session) ? parsed.session : null;
  const token = firstNonEmptyTrimmed([
    typeof parsed.access_token === 'string' ? parsed.access_token : null,
    session && typeof session.access_token === 'string' ? session.access_token : null,
  ]);
  const refreshToken = firstNonEmptyTrimmed([
    typeof parsed.refresh_token === 'string' ? parsed.refresh_token : null,
    session && typeof session.refresh_token === 'string' ? session.refresh_token : null,
  ]);
  const expiresAt =
    typeof parsed.expires_at === 'number'
      ? parsed.expires_at
      : session && typeof session.expires_at === 'number'
      ? session.expires_at
      : null;

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken, expiresAt };
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @Optional()
    private readonly betterAuthApi: () => BetterAuthEmailOtpApi = resolveBetterAuthEmailOtpApi
  ) {}

  async verifyEmailConfirmation(
    request: VerifyEmailConfirmationRequestDto
  ): Promise<SignInResponseDto> {
    if (isBetterAuthEmailProvider(process.env)) {
      return this.verifyWithBetterAuth(request);
    }

    const config = resolveSupabaseSignupConfig(process.env);
    if (!config) {
      throw new Error('CONFIG_ERROR: Supabase email verification API is unavailable');
    }

    const response = await fetch(`${config.url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'signup',
        email: normalizeEmail(request.email),
        token: normalizeCode(request.code),
      }),
    });

    const rawText = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const message = extractErrorMessage(parsed) || rawText || 'Email verification failed.';
      const status = response.status >= 500 ? HttpStatus.BAD_GATEWAY : response.status;
      throw new HttpException(`PROVIDER_ERROR: ${message}`, status);
    }

    const session = normalizeSession(parsed);
    const user = isRecord(parsed.user)
      ? normalizeSignupUser(parsed.user as SignupUserRecord)
      : null;

    if (!session || !user) {
      throw new HttpException(
        'PROVIDER_ERROR: Supabase verification did not return a user session.',
        HttpStatus.BAD_GATEWAY
      );
    }

    return {
      token: session.token,
      accessToken: session.token,
      session,
      user,
      needsEmailVerification: false,
      confirmationEmailSent: false,
    };
  }

  /** Sends a new verification code through the provider that owns email accounts. */
  async resendEmailConfirmation(email: string): Promise<{ confirmationEmailSent: boolean }> {
    const normalizedEmail = normalizeEmail(email);

    if (isBetterAuthEmailProvider(process.env)) {
      try {
        await this.betterAuthApi().sendVerificationOTP({
          body: { email: normalizedEmail, type: 'email-verification' },
        });
      } catch (error) {
        throw toBetterAuthHttpException(error);
      }
      return { confirmationEmailSent: true };
    }

    const config = resolveSupabaseSignupConfig(process.env);
    if (!config) {
      throw new Error('CONFIG_ERROR: Supabase email verification API is unavailable');
    }

    const response = await fetch(`${config.url}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'signup', email: normalizedEmail }),
    });

    if (!response.ok) {
      const rawText = await response.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        parsed = {};
      }
      const message = extractErrorMessage(parsed) || rawText || 'Could not resend the code.';
      const status = response.status >= 500 ? HttpStatus.BAD_GATEWAY : response.status;
      throw new HttpException(`PROVIDER_ERROR: ${message}`, status);
    }

    return { confirmationEmailSent: true };
  }

  private async verifyWithBetterAuth(
    request: VerifyEmailConfirmationRequestDto
  ): Promise<SignInResponseDto> {
    let result: { user?: Record<string, unknown> | null } | null;
    try {
      result = await this.betterAuthApi().verifyEmailOTP({
        body: { email: normalizeEmail(request.email), otp: normalizeCode(request.code) },
      });
    } catch (error) {
      throw toBetterAuthHttpException(error);
    }

    // No session here: the app sends the user back to sign in with their password.
    return {
      token: null,
      accessToken: null,
      session: null,
      user: isRecord(result?.user) ? result.user : null,
      needsEmailVerification: false,
      confirmationEmailSent: false,
    };
  }
}
