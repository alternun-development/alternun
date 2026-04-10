import type { OidcClaims } from '@edcalderon/auth';
import { claimsToExternalIdentity } from '../identity/claims';
import {
  externalIdentityToLinkedAccount,
  externalIdentityToPrincipal,
  principalToUserProjection,
} from '../identity/mapping';
import { createSupabaseIdentityRepository } from '../providers/supabase-legacy/SupabaseIdentityRepository';
import { resolveAuthRuntimeConfig } from '../runtime/config';

/**
 * Compatibility shim for legacy Authentik → Supabase provisioning flows.
 * New consumers should use the identity repository abstraction directly.
 */
export async function upsertOidcUser(claims: OidcClaims, provider?: string): Promise<string> {
  const runtime = resolveAuthRuntimeConfig();
  const identityRepository = createSupabaseIdentityRepository({
    supabaseUrl: runtime.supabaseUrl,
    supabaseKey: runtime.supabaseKey,
  });

  const externalIdentity = claimsToExternalIdentity(
    provider ?? claims.iss ?? 'authentik',
    claims,
    claims.sub
  );
  const principal = externalIdentityToPrincipal({
    issuer: claims.iss ?? provider ?? 'authentik',
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
