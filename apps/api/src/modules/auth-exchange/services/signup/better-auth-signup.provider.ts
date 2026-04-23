import { resolveBetterAuthDevConfig } from '../../../better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../../better-auth-dev/better-auth-dev.server';
import type { SignupEmailBody, SignupProvider, SignupResult } from './signup.types';

export function createBetterAuthSignupProvider(): SignupProvider {
  const config = resolveBetterAuthDevConfig(process.env);
  const auth = createBetterAuthDevAuth(config) as {
    api?: {
      signUpEmail?: (input: { body: SignupEmailBody }) => Promise<SignupResult>;
    };
  };

  const signUpEmail = auth.api?.signUpEmail;
  if (!signUpEmail) {
    throw new Error('CONFIG_ERROR: Better Auth sign-up API is unavailable');
  }

  return {
    name: 'better-auth',
    signUpEmail,
  };
}
