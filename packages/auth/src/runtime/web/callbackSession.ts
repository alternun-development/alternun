import type { OidcSession, User } from '@edcalderon/auth';

export interface SupabaseCallbackSessionPayload {
  accessToken: string;
  refreshToken: string;
}

export interface SupabaseCallbackSessionResponse {
  error?: { message?: string } | null;
}

export interface SupabaseCallbackAuthShape {
  setSession?: (payload: {
    access_token: string;
    refresh_token: string;
  }) => Promise<SupabaseCallbackSessionResponse>;
}

export interface SupabaseCallbackClient {
  supabase?: {
    auth?: SupabaseCallbackAuthShape;
  };
}

export function oidcSessionToUser(session: OidcSession, supabaseUserId?: string): User {
  return {
    id: supabaseUserId ?? session.claims.sub,
    email: session.claims.email,
    avatarUrl: session.claims.picture,
    provider: session.provider,
    metadata: {
      ...session.claims,
      name: session.claims.name,
      picture: session.claims.picture,
      emailVerified: session.claims.email_verified,
    },
  };
}

export async function finalizeSupabaseCallbackSession(
  client: SupabaseCallbackClient,
  payload: SupabaseCallbackSessionPayload
): Promise<void> {
  const authModule = client.supabase?.auth;
  if (!authModule || typeof authModule.setSession !== 'function') {
    throw new Error('CONFIG_ERROR: Unsupported client for Supabase callback finalization');
  }

  const result = await authModule.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  });

  if (result.error?.message) {
    throw new Error(result.error.message);
  }
}
