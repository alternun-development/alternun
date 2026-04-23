import type { SignupProvider } from './signup.types';
import { createAuthentikSignupProvider } from './authentik-signup.provider';
import { createBetterAuthSignupProvider } from './better-auth-signup.provider';
import { createSupabaseSignupProvider } from './supabase-signup.provider';
import { resolveSignupProviderName } from './signup.utils';

export function createSignupProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch
): SignupProvider {
  const provider = resolveSignupProviderName(env);

  switch (provider) {
    case 'better-auth':
      return createBetterAuthSignupProvider();
    case 'authentik':
      return createAuthentikSignupProvider();
    default:
      return createSupabaseSignupProvider(fetchFn);
  }
}
