import type { OidcSession, User } from '@edcalderon/auth';
export interface SupabaseCallbackSessionPayload {
  accessToken: string;
  refreshToken: string;
}
export interface SupabaseCallbackSessionResponse {
  error?: {
    message?: string;
  } | null;
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
export declare function oidcSessionToUser(session: OidcSession, supabaseUserId?: string): User;
export declare function finalizeSupabaseCallbackSession(
  client: SupabaseCallbackClient,
  payload: SupabaseCallbackSessionPayload
): Promise<void>;
