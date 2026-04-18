import { Injectable } from '@nestjs/common';
import { SocialSignInRequestDto } from '../dto/social-signin-request.dto';

@Injectable()
export class SocialSignInService {
  signIn(request: SocialSignInRequestDto): Record<string, unknown> {
    const { provider, callbackURL, errorCallbackURL, newUserCallbackURL, redirectUri } = request;

    const baseUrl =
      process.env.AUTH_BETTER_AUTH_URL ?? process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '';

    if (!baseUrl) {
      throw new Error('CONFIG_ERROR: Better Auth URL not configured');
    }

    const normalizedProvider = provider.toLowerCase();

    const params = new URLSearchParams();
    params.append('provider', normalizedProvider);

    if (callbackURL) {
      params.append('callbackURL', callbackURL);
    }

    if (errorCallbackURL) {
      params.append('errorCallbackURL', errorCallbackURL);
    }

    if (newUserCallbackURL) {
      params.append('newUserCallbackURL', newUserCallbackURL);
    }

    if (redirectUri) {
      params.append('redirectUri', redirectUri);
    }

    const signInUrl = `${baseUrl.replace(
      /\/+$/,
      ''
    )}/sign-in/${normalizedProvider}?${params.toString()}`;

    return {
      url: signInUrl,
      provider: normalizedProvider,
    };
  }
}
