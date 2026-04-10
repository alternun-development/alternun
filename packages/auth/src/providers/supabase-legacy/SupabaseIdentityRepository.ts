import { createHash } from 'node:crypto';
import type { OidcClaims } from '@edcalderon/auth';
import type {
  LinkedAuthAccount,
  Principal,
  PrincipalRecord,
  ProvisioningEventRecord,
  UserProjectionRecord,
} from '../../core/types';
import type { IdentityRepositoryContract } from '../../core/contracts';
import { AlternunConfigError } from '../../core/errors';
import { externalIdentityToPrincipal } from '../../identity/mapping';

export interface SupabaseIdentityRepositoryOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  fetchFn?: typeof fetch;
  upsertRpcName?: string;
  legacyUpsertFn?: (claims: OidcClaims, provider?: string) => Promise<string>;
}

function stablePrincipalId(principal: Principal): string {
  return createHash('sha256').update(`${principal.issuer}:${principal.subject}`).digest('hex');
}

function toOidcClaimsFromProjection(input: UserProjectionRecord): OidcClaims {
  const externalIdentity = input.metadata.externalIdentity as Record<string, unknown> | undefined;
  return {
    sub: input.principal.subject,
    iss: input.principal.issuer,
    email: input.email,
    email_verified: Boolean(input.metadata.emailVerified),
    name:
      input.displayName ??
      (typeof externalIdentity?.displayName === 'string'
        ? externalIdentity.displayName
        : undefined),
    picture:
      input.avatarUrl ??
      (typeof externalIdentity?.avatarUrl === 'string' ? externalIdentity.avatarUrl : undefined),
    ...(input.metadata.rawClaims as Record<string, unknown> | undefined),
  };
}

async function callRpc(
  fetchFn: typeof fetch,
  supabaseUrl: string,
  supabaseKey: string,
  rpcName: string,
  payload: Record<string, unknown>
): Promise<unknown> {
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
    throw new AlternunConfigError(
      `Failed to call Supabase RPC ${rpcName}: ${response.status} ${response.statusText} ${text}`
    );
  }

  return response.json().catch(() => ({}));
}

export class SupabaseIdentityRepository implements IdentityRepositoryContract {
  readonly name = 'supabase' as const;

  constructor(private readonly options: SupabaseIdentityRepositoryOptions = {}) {}

  private requireTransport(): { supabaseUrl: string; supabaseKey: string; fetchFn: typeof fetch } {
    const supabaseUrl = this.options.supabaseUrl?.trim();
    const supabaseKey = this.options.supabaseKey?.trim();
    if (!supabaseUrl || !supabaseKey) {
      throw new AlternunConfigError(
        'Supabase identity repository requires supabaseUrl and supabaseKey for persistence.'
      );
    }

    return {
      supabaseUrl,
      supabaseKey,
      fetchFn: this.options.fetchFn ?? fetch,
    };
  }

  upsertPrincipal(input: {
    principal: Principal;
    externalIdentity?: import('../../core/types').ExternalIdentity | null;
    source?: string;
  }): Promise<PrincipalRecord> {
    void input.externalIdentity;
    void input.source;
    return Promise.resolve({
      ...input.principal,
      id: stablePrincipalId(input.principal),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  findPrincipalByExternalIdentity(input: {
    externalIdentity: import('../../core/types').ExternalIdentity;
  }): Promise<PrincipalRecord | null> {
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

  async upsertUserProjection(input: UserProjectionRecord): Promise<UserProjectionRecord> {
    if (this.options.legacyUpsertFn) {
      const oidcClaims = toOidcClaimsFromProjection(input);
      const appUserId = await this.options.legacyUpsertFn(
        oidcClaims,
        input.metadata.externalProvider as string | undefined
      );
      return {
        ...input,
        appUserId,
      };
    }

    if (this.options.supabaseUrl && this.options.supabaseKey) {
      const transport = this.requireTransport();
      const rpcName = this.options.upsertRpcName ?? 'upsert_oidc_user';
      const oidcClaims = toOidcClaimsFromProjection(input);
      const response = await callRpc(
        transport.fetchFn,
        transport.supabaseUrl,
        transport.supabaseKey,
        rpcName,
        {
          p_sub: oidcClaims.sub,
          p_iss: oidcClaims.iss ?? '',
          p_email: oidcClaims.email ?? null,
          p_email_verified: oidcClaims.email_verified ?? false,
          p_name: oidcClaims.name ?? null,
          p_picture: oidcClaims.picture ?? null,
          p_provider: input.metadata.externalProvider ?? null,
          p_raw_claims: oidcClaims,
        }
      );

      const appUserId =
        typeof response === 'object' &&
        response !== null &&
        'id' in response &&
        typeof (response as Record<string, unknown>).id === 'string'
          ? ((response as Record<string, unknown>).id as string)
          : input.appUserId;

      return {
        ...input,
        appUserId,
      };
    }

    return input;
  }

  upsertLinkedAccount(input: {
    principalId?: string;
    principal: Principal;
    linkedAccount: LinkedAuthAccount;
  }): Promise<LinkedAuthAccount> {
    void input.principalId;
    void input.principal;
    return Promise.resolve(input.linkedAccount);
  }

  recordProvisioningEvent(input: ProvisioningEventRecord): Promise<void> {
    void input;
    return Promise.resolve();
  }
}

export function createSupabaseIdentityRepository(
  options: SupabaseIdentityRepositoryOptions = {}
): SupabaseIdentityRepository {
  return new SupabaseIdentityRepository(options);
}
