import { z } from 'zod';
export const authExecutionProviderSchema = z.enum(['better-auth', 'supabase']);
export const authIssuerProviderSchema = z.enum(['authentik', 'supabase-legacy']);
export const authEmailProviderSchema = z.enum(['supabase', 'postmark', 'ses']);
export const authProviderSelectionSchema = z.object({
    executionProvider: authExecutionProviderSchema.default('supabase'),
    issuerProvider: authIssuerProviderSchema.default('authentik'),
    emailProvider: authEmailProviderSchema.default('supabase'),
});
export function normalizeAuthExecutionProvider(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return authExecutionProviderSchema.catch('supabase').parse(normalized);
}
export function normalizeAuthIssuerProvider(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return authIssuerProviderSchema.catch('authentik').parse(normalized);
}
export function normalizeAuthEmailProvider(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return authEmailProviderSchema.catch('supabase').parse(normalized);
}
export function parseAuthProviderSelection(input) {
    return authProviderSelectionSchema.parse({
        executionProvider: normalizeAuthExecutionProvider(input.executionProvider),
        issuerProvider: normalizeAuthIssuerProvider(input.issuerProvider),
        emailProvider: normalizeAuthEmailProvider(input.emailProvider),
    });
}
export function parseBooleanLike(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return Boolean(normalized && ['1', 'true', 'yes', 'on'].includes(normalized));
}
