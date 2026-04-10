import { claimsToExternalIdentity } from '../identity/claims.js';
import { externalIdentityToLinkedAccount, externalIdentityToPrincipal, principalToUserProjection } from '../identity/mapping.js';
import { createSupabaseIdentityRepository } from '../providers/supabase-legacy/SupabaseIdentityRepository.js';
import { resolveAuthRuntimeConfig } from '../runtime/config.js';
/**
 * Compatibility shim for legacy Authentik → Supabase provisioning flows.
 * New consumers should use the identity repository abstraction directly.
 */
export async function upsertOidcUser(claims, provider) {
    var _a, _b, _c;
    const runtime = resolveAuthRuntimeConfig();
    const identityRepository = createSupabaseIdentityRepository({
        supabaseUrl: runtime.supabaseUrl,
        supabaseKey: runtime.supabaseKey,
    });
    const externalIdentity = claimsToExternalIdentity((_a = provider !== null && provider !== void 0 ? provider : claims.iss) !== null && _a !== void 0 ? _a : 'authentik', claims, claims.sub);
    const principal = externalIdentityToPrincipal({
        issuer: (_c = (_b = claims.iss) !== null && _b !== void 0 ? _b : provider) !== null && _c !== void 0 ? _c : 'authentik',
        identity: externalIdentity,
    });
    const principalRecord = await identityRepository.upsertPrincipal({
        principal,
        externalIdentity,
        source: 'compat-upsert-oidc-user',
    });
    const projection = principalToUserProjection({
        principal: principalRecord,
        externalIdentity,
        appUserId: principalRecord.id,
    });
    await identityRepository.upsertUserProjection(projection);
    await identityRepository.upsertLinkedAccount({
        principalId: principalRecord.id,
        principal: principalRecord,
        linkedAccount: externalIdentityToLinkedAccount(externalIdentity, 'oidc'),
    });
    return principalRecord.id;
}
