import { Injectable, Optional } from '@nestjs/common';
import { SocialSignInRequestDto } from '../dto/social-signin-request.dto';
import { resolveBetterAuthDevConfig } from '../../better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../better-auth-dev/better-auth-dev.server';

interface BetterAuthSocialSignInBody {
  provider: string;
  callbackURL?: string;
  errorCallbackURL?: string;
  newUserCallbackURL?: string;
  disableRedirect?: boolean;
}

interface BetterAuthSocialSignInResult {
  redirect?: boolean;
  url?: string;
}

interface BetterAuthSocialSignInApi {
  signInSocial(input: { body: BetterAuthSocialSignInBody }): Promise<BetterAuthSocialSignInResult>;
}

interface BetterAuthSocialSignInClient {
  api: BetterAuthSocialSignInApi;
}

let cachedBetterAuthSocialSignInApi: BetterAuthSocialSignInApi | null = null;

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function resolveBetterAuthSocialSignInApi(): BetterAuthSocialSignInApi {
  if (!cachedBetterAuthSocialSignInApi) {
    const auth = createBetterAuthDevAuth(resolveBetterAuthDevConfig(process.env)) as
      | BetterAuthSocialSignInClient
      | undefined;
    if (!auth?.api?.signInSocial) {
      throw new Error('CONFIG_ERROR: Better Auth social sign-in API is unavailable');
    }

    cachedBetterAuthSocialSignInApi = auth.api;
  }

  return cachedBetterAuthSocialSignInApi;
}

@Injectable()
export class SocialSignInService {
  constructor(
    @Optional()
    private readonly authApi?: BetterAuthSocialSignInApi
  ) {}

  async signIn(request: SocialSignInRequestDto): Promise<Record<string, unknown>> {
    const normalizedProvider = request.provider.trim().toLowerCase();
    const callbackURL =
      firstNonEmptyTrimmed([request.callbackURL, request.redirectUri]) ?? undefined;
    const errorCallbackURL =
      firstNonEmptyTrimmed([request.errorCallbackURL, callbackURL]) ?? undefined;
    const newUserCallbackURL =
      firstNonEmptyTrimmed([request.newUserCallbackURL, callbackURL]) ?? undefined;
    const response = await (this.authApi ?? resolveBetterAuthSocialSignInApi()).signInSocial({
      body: {
        provider: normalizedProvider,
        callbackURL,
        errorCallbackURL,
        newUserCallbackURL,
      },
    });

    const url = response.url?.trim();
    if (!url) {
      throw new Error('CONFIG_ERROR: Better Auth social sign-in did not return a redirect URL');
    }

    return {
      provider: normalizedProvider,
      redirect: response.redirect ?? true,
      url,
    };
  }
}
