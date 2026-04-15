export function oidcSessionToUser(session, supabaseUserId) {
    return {
        id: supabaseUserId !== null && supabaseUserId !== void 0 ? supabaseUserId : session.claims.sub,
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
export async function finalizeSupabaseCallbackSession(client, payload) {
    var _a, _b;
    const authModule = (_a = client.supabase) === null || _a === void 0 ? void 0 : _a.auth;
    if (!authModule || typeof authModule.setSession !== 'function') {
        throw new Error('CONFIG_ERROR: Unsupported client for Supabase callback finalization');
    }
    const result = await authModule.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
    });
    if ((_b = result.error) === null || _b === void 0 ? void 0 : _b.message) {
        throw new Error(result.error.message);
    }
}
