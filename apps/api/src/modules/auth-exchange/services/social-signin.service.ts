import { Injectable, Optional } from '@nestjs/common';
import { SocialSignInRequestDto } from '../dto/social-signin-request.dto';
import { resolveBetterAuthDevConfig } from '../../better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../better-auth-dev/better-auth-dev.server';
import { normalizeBetterAuthRequestBody } from '../../../common/bootstrap/better-auth-request-body';

interface BetterAuthSocialSignInBody {
  provider: string;
  callbackURL?: string;
  errorCallbackURL?: string;
  newUserCallbackURL?: string;
  disableRedirect?: boolean;
}

export interface SocialSignInResult {
  provider: string;
  redirect?: boolean;
  url?: string;
  setCookies?: string[];
}

interface BetterAuthSocialSignInAuth {
  handler(request: Request): Promise<Response>;
}

type ResponseHeadersWithCookies = Omit<Headers, 'getSetCookie'> & {
  getSetCookie?: () => string[];
};

interface BetterAuthSocialSignInClient {
  handler: (request: Request) => Promise<Response>;
}

let cachedBetterAuthSocialSignInAuth: BetterAuthSocialSignInAuth | null = null;

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function extractSetCookies(response: Response): string[] {
  const headers = response.headers as ResponseHeadersWithCookies;
  const setCookies = headers.getSetCookie?.();

  if (setCookies?.length) {
    return setCookies;
  }

  const setCookie = response.headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function resolveBetterAuthSocialSignInAuth(): BetterAuthSocialSignInAuth {
  if (!cachedBetterAuthSocialSignInAuth) {
    const auth = createBetterAuthDevAuth(resolveBetterAuthDevConfig(process.env)) as
      | BetterAuthSocialSignInClient
      | undefined;
    if (!auth?.handler) {
      throw new Error('CONFIG_ERROR: Better Auth social sign-in runtime is unavailable');
    }

    cachedBetterAuthSocialSignInAuth = auth;
  }

  return cachedBetterAuthSocialSignInAuth;
}

@Injectable()
export class SocialSignInService {
  constructor(
    @Optional()
    private readonly authRuntime?: BetterAuthSocialSignInAuth
  ) {}

  async signIn(request: SocialSignInRequestDto): Promise<SocialSignInResult> {
    const normalizedProvider = request.provider.trim().toLowerCase();
    const callbackURL =
      firstNonEmptyTrimmed([request.callbackURL, request.redirectUri]) ?? undefined;
    const errorCallbackURL =
      firstNonEmptyTrimmed([request.errorCallbackURL, callbackURL]) ?? undefined;
    const newUserCallbackURL =
      firstNonEmptyTrimmed([request.newUserCallbackURL, callbackURL]) ?? undefined;
    const authRuntime = this.authRuntime ?? resolveBetterAuthSocialSignInAuth();
    const baseURL = resolveBetterAuthDevConfig(process.env).baseURL;
    const normalizedBody = normalizeBetterAuthRequestBody('/auth/sign-in/social', {
      provider: normalizedProvider,
      callbackURL,
      errorCallbackURL,
      newUserCallbackURL,
    });
    const response = await authRuntime.handler(
      new Request(new URL('/auth/sign-in/social', baseURL), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(normalizedBody as BetterAuthSocialSignInBody),
      })
    );

    const payload = (await response.json()) as Record<string, unknown>;
    const url = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!url) {
      throw new Error('CONFIG_ERROR: Better Auth social sign-in did not return a redirect URL');
    }

    return {
      provider: normalizedProvider,
      redirect: typeof payload.redirect === 'boolean' ? payload.redirect : true,
      url,
      setCookies: extractSetCookies(response),
    };
  }
}
