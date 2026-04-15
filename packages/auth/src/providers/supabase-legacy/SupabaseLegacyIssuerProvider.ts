import type { OidcClaims } from '@edcalderon/auth';
import type {
  AlternunSession,
  ClaimValidationResult,
  IdentityExchangeInput,
  IssuerDiscoveryConfig,
  IssuerSession,
} from '../../core/types';
import type { IdentityIssuerProvider, IdentityRepositoryContract } from '../../core/contracts';
import { AlternunConfigError } from '../../core/errors';
import { createAlternunSession, claimsToExternalIdentity } from '../../core/session';
import {
  buildProvisioningEvent,
  externalIdentityToLinkedAccount,
  externalIdentityToPrincipal,
  principalToUserProjection,
} from '../../identity/mapping';
import {
  getAuthentikEndpointBaseFromIssuer,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
} from '../../mobile/authentikUrls';

export interface SupabaseLegacyIssuerProviderOptions {
  identityRepository: IdentityRepositoryContract;
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
}

function resolveIssuer(options: SupabaseLegacyIssuerProviderOptions): string {
  if (options.issuer?.trim()) {
    return options.issuer.trim();
  }

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const clientId = resolveAuthentikClientId(options.clientId);
  const resolvedIssuer = resolveAuthentikIssuer(undefined, browserOrigin, clientId);
  if (!resolvedIssuer) {
    throw new AlternunConfigError('Unable to resolve the legacy issuer URL.');
  }

  return resolvedIssuer;
}

function toClaimsRecord(claims: OidcClaims | Record<string, unknown>): Record<string, unknown> {
  return { ...(claims as Record<string, unknown>) };
}

export class SupabaseLegacyIssuerProvider implements IdentityIssuerProvider {
  readonly name = 'supabase-legacy' as const;

  private cachedSession: IssuerSession | null = null;
  private readonly issuer: string;

  constructor(private readonly options: SupabaseLegacyIssuerProviderOptions) {
    this.issuer = resolveIssuer(options);
  }

  async exchangeIdentity(input: IdentityExchangeInput): Promise<AlternunSession> {
    const externalIdentity = input.externalIdentity;
    const principal = externalIdentityToPrincipal({
      issuer: this.issuer,
      identity: externalIdentity,
      extraMetadata: input.context ?? {},
    });

    const principalRecord = await this.options.identityRepository.upsertPrincipal({
      principal,
      externalIdentity,
      source: this.name,
    });

    const userProjection = principalToUserProjection({
      principal,
      externalIdentity,
      appUserId: principalRecord.id,
    });
    await this.options.identityRepository.upsertUserProjection(userProjection);

    const linkedAccount = externalIdentityToLinkedAccount(externalIdentity, 'oidc');
    await this.options.identityRepository.upsertLinkedAccount({
      principalId: principalRecord.id,
      principal,
      linkedAccount,
    });

    await this.options.identityRepository.recordProvisioningEvent(
      buildProvisioningEvent({
        eventType: 'legacy-issuer-exchange',
        aggregateType: 'principal',
        aggregateId: principalRecord.id,
        principal,
        externalIdentity,
        metadata: input.context ?? {},
      })
    );

    const issuerSession: IssuerSession = {
      issuer: this.issuer,
      accessToken: input.executionSession?.accessToken ?? '',
      refreshToken: input.executionSession?.refreshToken ?? null,
      idToken: input.executionSession?.idToken ?? null,
      expiresAt: input.executionSession?.expiresAt ?? null,
      principal,
      claims: toClaimsRecord(externalIdentity.rawClaims),
      linkedAccounts: [linkedAccount],
      raw: {
        executionSession: input.executionSession,
        context: input.context ?? {},
      },
    };

    this.cachedSession = issuerSession;
    return createAlternunSession({
      issuerSession,
      executionSession: input.executionSession ?? null,
    });
  }

  getIssuerSession(): Promise<IssuerSession | null> {
    return Promise.resolve(this.cachedSession);
  }

  refreshIssuerSession(): Promise<IssuerSession | null> {
    return Promise.resolve(this.cachedSession);
  }

  logoutIssuerSession(): Promise<void> {
    this.cachedSession = null;
    return Promise.resolve();
  }

  discoverIssuerConfig(): Promise<IssuerDiscoveryConfig> {
    const endpointBase = getAuthentikEndpointBaseFromIssuer(this.issuer);
    const clientId = resolveAuthentikClientId(this.options.clientId);
    return Promise.resolve({
      issuer: this.issuer,
      authorizationEndpoint: `${endpointBase}authorize/`,
      tokenEndpoint: `${endpointBase}token/`,
      userinfoEndpoint: `${endpointBase}userinfo/`,
      endSessionEndpoint: `${this.issuer.replace(/\/$/, '')}/end-session/`,
      jwksUri: `${endpointBase}jwks/`,
      clientId,
    });
  }

  validateClaims(claims: Record<string, unknown>): Promise<ClaimValidationResult> {
    const errors: string[] = [];
    if (typeof claims.sub !== 'string' || claims.sub.trim().length === 0) {
      errors.push('Missing claim: sub');
    }
    if (typeof claims.iss !== 'string' || claims.iss.trim().length === 0) {
      errors.push('Missing claim: iss');
    }

    if (errors.length > 0) {
      return Promise.resolve({
        valid: false,
        principal: null,
        errors,
      });
    }

    const identity = claimsToExternalIdentity(
      typeof claims.iss === 'string' ? claims.iss : this.issuer,
      claims
    );
    const principal = externalIdentityToPrincipal({
      issuer: this.issuer,
      identity,
    });

    return Promise.resolve({
      valid: true,
      principal,
      errors: [],
    });
  }
}
