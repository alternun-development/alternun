import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { VerifyEmailConfirmationRequestDto } from '../dto/verify-email-confirmation-request.dto';
import { SignInResponseDto } from '../dto/signin-response.dto';
import {
  extractErrorMessage,
  firstNonEmptyTrimmed,
  normalizeSignupUser,
  resolveSupabaseSignupConfig,
} from './signup/signup.utils';
import type { SignupUserRecord } from './signup/signup.types';

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
  async verifyEmailConfirmation(
    request: VerifyEmailConfirmationRequestDto
  ): Promise<SignInResponseDto> {
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
        email: request.email.trim().toLowerCase(),
        token: request.code.trim().replace(/\s+/g, ''),
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
}
