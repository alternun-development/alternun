import { HttpException, HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { SignInRequestDto } from '../dto/signin-request.dto';
import { SignInResponseDto } from '../dto/signin-response.dto';
import {
  extractErrorMessage,
  extractErrorStatus,
  hasUnverifiedAuthUserByEmail,
  normalizeSignupUser,
  resolveSupabaseSignupConfig,
} from './signup/signup.utils';
import type { SignupUserRecord } from './signup/signup.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function normalizeSessionRecord(parsed: Record<string, unknown>): SignInResponseDto['session'] {
  const session = isRecord(parsed.session) ? parsed.session : null;
  const token = firstNonEmptyTrimmed([
    typeof parsed.token === 'string' ? parsed.token : null,
    typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
    typeof parsed.access_token === 'string' ? parsed.access_token : null,
    session && typeof session.token === 'string' ? session.token : null,
    session && typeof session.accessToken === 'string' ? session.accessToken : null,
    session && typeof session.access_token === 'string' ? session.access_token : null,
  ]);
  const refreshToken = firstNonEmptyTrimmed([
    typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
    typeof parsed.refresh_token === 'string' ? parsed.refresh_token : null,
    session && typeof session.refreshToken === 'string' ? session.refreshToken : null,
    session && typeof session.refresh_token === 'string' ? session.refresh_token : null,
  ]);
  const expiresAtValue =
    typeof parsed.expiresAt === 'number'
      ? parsed.expiresAt
      : typeof parsed.expires_at === 'number'
      ? parsed.expires_at
      : session && typeof session.expiresAt === 'number'
      ? session.expiresAt
      : session && typeof session.expires_at === 'number'
      ? session.expires_at
      : null;

  if (!token && !refreshToken && expiresAtValue == null) {
    return null;
  }

  return {
    token,
    refreshToken,
    expiresAt: expiresAtValue,
  };
}

function isEmailVerificationPendingMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('email not confirmed') ||
    normalized.includes('email not verified') ||
    normalized.includes('email confirmation required') ||
    normalized.includes('confirm your email')
  );
}

@Injectable()
export class SignInService {
  private readonly logger = new Logger(SignInService.name);

  constructor(
    @Optional()
    private readonly authUserLookup: (
      email: string
    ) => Promise<boolean> = hasUnverifiedAuthUserByEmail
  ) {}

  async signIn(request: SignInRequestDto): Promise<SignInResponseDto> {
    const email = request.email.trim();
    const password = request.password;
    const config = resolveSupabaseSignupConfig(process.env);

    if (!config) {
      throw new Error('CONFIG_ERROR: Supabase sign-in API is unavailable');
    }

    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const rawText = await response.text();
    const parsed = rawText
      ? (JSON.parse(rawText) as Record<string, unknown>)
      : ({} as Record<string, unknown>);

    if (!response.ok) {
      const message =
        extractErrorMessage(parsed) || rawText || `Supabase sign-in failed [${response.status}]`;
      const status = extractErrorStatus(parsed) ?? response.status;

      if (status === 401 || status === 400) {
        const unverifiedAuthUserExists = await this.authUserLookup(email).catch(() => false);
        if (unverifiedAuthUserExists) {
          this.logger.warn(
            'Supabase sign-in redirected to verification because auth.users has an unverified email',
            {
              email,
              status,
            }
          );

          return {
            token: null,
            accessToken: null,
            session: null,
            user: null,
            needsEmailVerification: true,
            confirmationEmailSent: false,
          };
        }
      }

      if (isEmailVerificationPendingMessage(message)) {
        this.logger.warn('Supabase sign-in requires email verification', {
          email,
          status,
        });

        return {
          token: null,
          accessToken: null,
          session: null,
          user: null,
          needsEmailVerification: true,
          confirmationEmailSent: false,
        };
      }

      throw new HttpException(
        `PROVIDER_ERROR: ${message}`,
        status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.UNAUTHORIZED
      );
    }

    const user = isRecord(parsed.user)
      ? normalizeSignupUser(parsed.user as SignupUserRecord)
      : null;
    const session = normalizeSessionRecord(parsed);

    this.logger.debug('Supabase sign-in completed', {
      email,
      hasSession: Boolean(session?.token),
      emailVerified: user?.emailVerified ?? false,
    });

    return {
      token: session?.token ?? null,
      accessToken: session?.token ?? null,
      session,
      user,
      needsEmailVerification: false,
      confirmationEmailSent: false,
    };
  }
}
