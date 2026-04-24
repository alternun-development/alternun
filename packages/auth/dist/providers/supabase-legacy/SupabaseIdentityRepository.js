import { createHash } from 'node:crypto';
import { AlternunConfigError } from '../../core/errors';
import { externalIdentityToPrincipal } from '../../identity/mapping';
function stablePrincipalId(principal) {
    return createHash('sha256').update(`${principal.issuer}:${principal.subject}`).digest('hex');
}
function toOidcClaimsFromProjection(input) {
    var _a, _b;
    const externalIdentity = input.metadata.externalIdentity;
    return {
        sub: input.principal.subject,
        iss: input.principal.issuer,
        email: input.email,
        email_verified: Boolean(input.metadata.emailVerified),
        name: (_a = input.displayName) !== null && _a !== void 0 ? _a : (typeof (externalIdentity === null || externalIdentity === void 0 ? void 0 : externalIdentity.displayName) === 'string'
            ? externalIdentity.displayName
            : undefined),
        picture: (_b = input.avatarUrl) !== null && _b !== void 0 ? _b : (typeof (externalIdentity === null || externalIdentity === void 0 ? void 0 : externalIdentity.avatarUrl) === 'string' ? externalIdentity.avatarUrl : undefined),
        ...input.metadata.rawClaims,
    };
}
async function callRpc(fetchFn, supabaseUrl, supabaseKey, rpcName, payload) {
    const response = await fetchFn(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            apikey: supabaseKey,
            authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new AlternunConfigError(`Failed to call Supabase RPC ${rpcName}: ${response.status} ${response.statusText} ${text}`);
    }
    return response.json().catch(() => ({}));
}
export class SupabaseIdentityRepository {
    constructor(options = {}) {
        this.options = options;
        this.name = 'supabase';
    }
    requireTransport() {
        var _a, _b, _c;
        const supabaseUrl = (_a = this.options.supabaseUrl) === null || _a === void 0 ? void 0 : _a.trim();
        const supabaseKey = (_b = this.options.supabaseKey) === null || _b === void 0 ? void 0 : _b.trim();
        if (!supabaseUrl || !supabaseKey) {
            throw new AlternunConfigError('Supabase identity repository requires supabaseUrl and supabaseKey for persistence.');
        }
        return {
            supabaseUrl,
            supabaseKey,
            fetchFn: (_c = this.options.fetchFn) !== null && _c !== void 0 ? _c : fetch,
        };
    }
    upsertPrincipal(input) {
        void input.externalIdentity;
        void input.source;
        return Promise.resolve({
            ...input.principal,
            id: stablePrincipalId(input.principal),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    findPrincipalByExternalIdentity(input) {
        const principal = externalIdentityToPrincipal({
            issuer: input.externalIdentity.provider,
            identity: input.externalIdentity,
        });
        return Promise.resolve({
            ...principal,
            id: stablePrincipalId(principal),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    async upsertUserProjection(input) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (this.options.legacyUpsertFn) {
            const oidcClaims = toOidcClaimsFromProjection(input);
            const appUserId = await this.options.legacyUpsertFn(oidcClaims, input.metadata.externalProvider);
            return {
                ...input,
                appUserId,
            };
        }
        if (this.options.supabaseUrl && this.options.supabaseKey) {
            const transport = this.requireTransport();
            const rpcName = (_a = this.options.upsertRpcName) !== null && _a !== void 0 ? _a : 'upsert_oidc_user';
            const oidcClaims = toOidcClaimsFromProjection(input);
            const response = await callRpc(transport.fetchFn, transport.supabaseUrl, transport.supabaseKey, rpcName, {
                p_sub: oidcClaims.sub,
                p_iss: (_b = oidcClaims.iss) !== null && _b !== void 0 ? _b : '',
                p_email: (_c = oidcClaims.email) !== null && _c !== void 0 ? _c : null,
                p_email_verified: (_d = oidcClaims.email_verified) !== null && _d !== void 0 ? _d : false,
                p_name: (_e = oidcClaims.name) !== null && _e !== void 0 ? _e : null,
                p_picture: (_f = oidcClaims.picture) !== null && _f !== void 0 ? _f : null,
                p_provider: (_g = input.metadata.externalProvider) !== null && _g !== void 0 ? _g : null,
                p_raw_claims: oidcClaims,
            });
            const appUserId = typeof response === 'object' &&
                response !== null &&
                'id' in response &&
                typeof response.id === 'string'
                ? response.id
                : input.appUserId;
            return {
                ...input,
                appUserId,
            };
        }
        return input;
    }
    upsertLinkedAccount(input) {
        void input.principalId;
        void input.principal;
        return Promise.resolve(input.linkedAccount);
    }
    recordProvisioningEvent(input) {
        void input;
        return Promise.resolve();
    }
}
export function createSupabaseIdentityRepository(options = {}) {
    return new SupabaseIdentityRepository(options);
}
