function getSupabaseUrl() {
    var _a, _b;
    return (_b = (_a = process.env.EXPO_PUBLIC_SUPABASE_URL) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_SUPABASE_URI) !== null && _b !== void 0 ? _b : '';
}
function getSupabaseAnonKey() {
    var _a, _b;
    return (_b = (_a = process.env.EXPO_PUBLIC_SUPABASE_KEY) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) !== null && _b !== void 0 ? _b : '';
}
/**
 * Upserts an Authentik OIDC user into the Supabase `public.users` table
 * via the `upsert_oidc_user` SECURITY DEFINER RPC.
 * Returns the Supabase user UUID.
 */
export async function upsertOidcUser(claims, provider) {
    var _a, _b, _c, _d, _e;
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !anonKey) {
        throw new Error('CONFIG_ERROR: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set.');
    }
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_oidc_user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
            p_sub: claims.sub,
            p_iss: (_a = claims.iss) !== null && _a !== void 0 ? _a : '',
            p_email: (_b = claims.email) !== null && _b !== void 0 ? _b : null,
            p_email_verified: (_c = claims.email_verified) !== null && _c !== void 0 ? _c : false,
            p_name: (_d = claims.name) !== null && _d !== void 0 ? _d : null,
            p_picture: (_e = claims.picture) !== null && _e !== void 0 ? _e : null,
            p_provider: provider !== null && provider !== void 0 ? provider : null,
            p_raw_claims: claims,
        }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to upsert user: ${res.status} ${text}`);
    }
    const data = (await res.json());
    return data.id;
}
