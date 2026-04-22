import { Injectable, Logger, Optional } from '@nestjs/common';
import { SignUpRequestDto } from '../dto/signup-request.dto';
import { SignUpResponseDto } from '../dto/signup-response.dto';
import { resolveBetterAuthDevConfig } from '../../better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../better-auth-dev/better-auth-dev.server';

interface BetterAuthSignUpBody {
  name: string;
  email: string;
  password: string;
  image?: string;
  callbackURL?: string;
  rememberMe?: boolean;
}

interface BetterAuthSignUpUser {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  [key: string]: unknown;
}

interface BetterAuthSignUpResult {
  token: string | null;
  user: BetterAuthSignUpUser;
}

interface BetterAuthSignUpApi {
  signUpEmail(input: { body: BetterAuthSignUpBody }): Promise<BetterAuthSignUpResult>;
}

interface BetterAuthSignUpClient {
  api: BetterAuthSignUpApi;
}

let cachedBetterAuthSignUpApi: BetterAuthSignUpApi | null = null;

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

function deriveSignupName(email: string, providedName?: string): string {
  const trimmedName = providedName?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const localPart = email.split('@')[0]?.trim();
  if (localPart) {
    return localPart;
  }

  return email.trim();
}

function resolveVerificationCallbackUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicitUrl = env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI ?? env.AUTHENTIK_REDIRECT_URI;
  if (explicitUrl?.trim()) {
    return explicitUrl.trim().replace(/\/+$/, '');
  }

  const baseUrl =
    env.EXPO_PUBLIC_BETTER_AUTH_URL ?? env.AUTH_BETTER_AUTH_URL ?? env.BETTER_AUTH_URL;
  if (baseUrl?.trim()) {
    try {
      const url = new URL(baseUrl.trim().replace(/\/+$/, ''));
      const hostnameParts = url.hostname.split('.');
      const apiIndex = hostnameParts.indexOf('api');
      if (apiIndex >= 0) {
        hostnameParts[apiIndex] = 'airs';
        url.hostname = hostnameParts.join('.');
      }
      url.pathname = '/auth/callback';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/+$/, '');
    } catch {
      return baseUrl.trim().replace(/\/+$/, '');
    }
  }

  return 'https://testnet.airs.alternun.co/auth/callback';
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isRecord(error)) {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (isRecord(error.error) && typeof error.error.message === 'string') {
      return error.error.message;
    }
  }

  return 'Unable to create account. Please try again.';
}

function extractErrorStatus(error: unknown): number | null {
  if (isRecord(error) && typeof error.status === 'number' && Number.isFinite(error.status)) {
    return error.status;
  }

  return null;
}

function isDuplicateSignupError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const status = extractErrorStatus(error);

  return (
    status === 409 ||
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('exists')
  );
}

function normalizeBetterAuthUser(user: BetterAuthSignUpUser): Record<string, unknown> {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    ...(user.image ? { image: user.image } : {}),
  };
}

function resolveBetterAuthSignupApi(): BetterAuthSignUpApi {
  if (!cachedBetterAuthSignUpApi) {
    const auth = createBetterAuthDevAuth(resolveBetterAuthDevConfig(process.env)) as
      | BetterAuthSignUpClient
      | undefined;

    if (!auth?.api?.signUpEmail) {
      throw new Error('CONFIG_ERROR: Better Auth sign-up API is unavailable');
    }

    cachedBetterAuthSignUpApi = auth.api;
  }

  return cachedBetterAuthSignUpApi;
}

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    @Optional()
    private readonly authApi?: BetterAuthSignUpApi
  ) {}

  async signUp(request: SignUpRequestDto): Promise<SignUpResponseDto> {
    const email = request.email.trim();
    const password = request.password;
    const name = deriveSignupName(email, request.name);
    const locale = firstNonEmptyTrimmed([request.locale]);
    const authApi = this.authApi ?? resolveBetterAuthSignupApi();
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

      const isEmailVerified = Boolean(response.user?.emailVerified);
      const token = isEmailVerified && typeof response.token === 'string' ? response.token : null;
      const accessToken = isEmailVerified ? token : null;
      const user = normalizeBetterAuthUser(response.user);
      const needsEmailVerification = !isEmailVerified;

      this.logger.debug('Better Auth signup completed', {
        email,
        name,
        needsEmailVerification,
        hasToken: Boolean(accessToken),
        emailVerified: isEmailVerified,
      });

      return {
        needsEmailVerification,
        emailAlreadyRegistered: false,
        confirmationEmailSent: needsEmailVerification,
        token,
        accessToken,
        user,
      };
    } catch (error) {
      if (isDuplicateSignupError(error)) {
        this.logger.warn('Better Auth signup rejected because the account already exists', {
          email,
          name,
        });

        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: true,
          confirmationEmailSent: false,
        };
      }

      const message = extractErrorMessage(error);
      const status = extractErrorStatus(error);
      this.logger.error('Better Auth signup failed', {
        email,
        name,
        status,
        error: message,
      });

      throw new Error(`PROVIDER_ERROR: ${message}`);
    }
  }
}
