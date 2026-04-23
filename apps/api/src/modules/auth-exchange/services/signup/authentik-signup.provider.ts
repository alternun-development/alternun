import type { SignupProvider, SignupResult } from './signup.types';

export function createAuthentikSignupProvider(): SignupProvider {
  return {
    name: 'authentik',
    signUpEmail(): Promise<SignupResult> {
      return Promise.reject(
        new Error(
          'AUTHENTIK_SIGNUP_UNSUPPORTED: Authentik signup is not yet wired here. Use Supabase or Better Auth signup, or add a dedicated Authentik provisioning endpoint.'
        )
      );
    },
  };
}
