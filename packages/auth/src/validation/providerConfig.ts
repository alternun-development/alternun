import { z } from 'zod';
import type {
  AuthExecutionProviderName,
  EmailProviderName,
  IdentityIssuerProviderName,
} from '../core/types';

export const authExecutionProviderSchema = z.enum(['better-auth', 'supabase']);
export const authIssuerProviderSchema = z.enum(['authentik', 'supabase-legacy']);
export const authEmailProviderSchema = z.enum(['supabase', 'postmark', 'ses']);

export const authProviderSelectionSchema = z.object({
  executionProvider: authExecutionProviderSchema.default('supabase'),
  issuerProvider: authIssuerProviderSchema.default('authentik'),
  emailProvider: authEmailProviderSchema.default('supabase'),
});

export function normalizeAuthExecutionProvider(
  value: string | undefined | null
): AuthExecutionProviderName {
  const normalized = value?.trim().toLowerCase();
  return authExecutionProviderSchema.catch('supabase').parse(normalized);
}

export function normalizeAuthIssuerProvider(
  value: string | undefined | null
): IdentityIssuerProviderName {
  const normalized = value?.trim().toLowerCase();
  return authIssuerProviderSchema.catch('authentik').parse(normalized);
}

export function normalizeAuthEmailProvider(value: string | undefined | null): EmailProviderName {
  const normalized = value?.trim().toLowerCase();
  return authEmailProviderSchema.catch('supabase').parse(normalized);
}

export function parseAuthProviderSelection(input: {
  executionProvider?: string | null;
  issuerProvider?: string | null;
  emailProvider?: string | null;
}): z.infer<typeof authProviderSelectionSchema> {
  return authProviderSelectionSchema.parse({
    executionProvider: normalizeAuthExecutionProvider(input.executionProvider),
    issuerProvider: normalizeAuthIssuerProvider(input.issuerProvider),
    emailProvider: normalizeAuthEmailProvider(input.emailProvider),
  });
}

export function parseBooleanLike(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && ['1', 'true', 'yes', 'on'].includes(normalized));
}
