import type {
  SignupEmailBody,
  SignupProvider,
  SignupResult,
  SignupUserRecord,
} from './signup.types';
import { resolveSupabaseSignupConfig } from './signup.utils';

export function createSupabaseSignupProvider(fetchFn: typeof fetch = fetch): SignupProvider {
  return {
    name: 'supabase',
    async signUpEmail(input: { body: SignupEmailBody }): Promise<SignupResult> {
      const config = resolveSupabaseSignupConfig(process.env);
      if (!config) {
        throw new Error('CONFIG_ERROR: Supabase sign-up API is unavailable');
      }

      const response = await fetchFn(`${config.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: input.body.email,
          password: input.body.password,
          data: {
            name: input.body.name,
            full_name: input.body.name,
            ...(input.body.locale ? { locale: input.body.locale } : {}),
            ...(input.body.referral_code ? { referral_code: input.body.referral_code } : {}),
            ...(input.body.referred_by_username
              ? { referred_by_username: input.body.referred_by_username }
              : {}),
            ...(input.body.referred_by_email
              ? { referred_by_email: input.body.referred_by_email }
              : {}),
          },
          redirect_to: input.body.callbackURL,
        }),
      });

      const rawText = await response.text();
      const parsed = rawText
        ? (JSON.parse(rawText) as Record<string, unknown>)
        : ({} as Record<string, unknown>);

      if (!response.ok) {
        throw {
          status: response.status,
          message:
            typeof parsed.msg === 'string'
              ? parsed.msg
              : typeof parsed.message === 'string'
              ? parsed.message
              : rawText || `Supabase sign-up failed [${response.status}]`,
          error: parsed,
        };
      }

      return {
        user: (parsed.user as SignupUserRecord | undefined) ?? null,
        session: (parsed.session as SignupResult['session'] | undefined) ?? null,
      };
    },
  };
}
