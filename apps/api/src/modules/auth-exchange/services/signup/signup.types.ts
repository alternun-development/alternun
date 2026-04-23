export interface SignupEmailBody {
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
  locale?: string;
}

export interface SignupUserRecord {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  email: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  raw_user_meta_data?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  raw_app_meta_data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SignupSessionRecord {
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string | null;
  expires_at?: number | null;
  [key: string]: unknown;
}

export interface SignupResult {
  user: SignupUserRecord | null;
  session: SignupSessionRecord | null;
}

export type SignupProviderName = 'supabase' | 'better-auth' | 'authentik';

export interface SignupProvider {
  name: SignupProviderName;
  signUpEmail(input: { body: SignupEmailBody }): Promise<SignupResult>;
}
