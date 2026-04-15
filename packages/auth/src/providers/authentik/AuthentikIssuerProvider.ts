import type { OidcClaims, OidcSession } from '@edcalderon/auth';
import type {
  AlternunSession,
  ClaimValidationResult,
  ExecutionSession,
  IdentityExchangeInput,
  IssuerDiscoveryConfig,
  IssuerSession,
  ExternalIdentity,
  LinkedAuthAccount,
  Principal,
} from '../../core/types';
import type { IdentityIssuerProvider, IdentityRepositoryContract } from '../../core/contracts';
import { AlternunConfigError, AlternunProviderError } from '../../core/errors';
import {
  createAlternunSession,
  claimsToExternalIdentity,
  issuerSessionToUser,
} from '../../core/session';
import {
  buildProvisioningEvent,
  externalIdentityToLinkedAccount,
  externalIdentityToPrincipal,
  principalToUserProjection,
} from '../../identity/mapping';
import { clearOidcSession, readOidcSession } from '../../mobile/authentikClient';
import { getAuthentikEndpointBaseFromIssuer } from '../../mobile/authentikUrls';
import {
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  resolveAuthentikRedirectUri,
} from '../../mobile/authentikUrls';

export interface AuthentikIssuerProviderOptions {
  identityRepository: IdentityRepositoryContract;
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
  sessionStorage?: Storage;
  defaultAudience?: string;
  authExchangeUrl?: string;
  fetchFn?: typeof fetch;
}

interface BackendAuthExchangePrincipal {
  issuer?: string | null;
  subject?: string | null;
  email?: string | null;
  roles?: unknown;
  metadata?: Record<string, unknown> | null;
}

interface BackendAuthExchangeLinkedAccount {
  provider?: string | null;
  providerUserId?: string | null;
  type?: string | null;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface BackendAuthExchangeResponse {
  issuerAccessToken?: string | null;
  issuerRefreshToken?: string | null;
  issuerIdToken?: string | null;
  issuerExpiresAt?: number | null;
  principal?: BackendAuthExchangePrincipal | null;
  linkedAccounts?: BackendAuthExchangeLinkedAccount[] | null;
  claims?: Record<string, unknown> | null;
  appUserId?: string | null;
  exchangeMode?: string | null;
  syncStatus?: string | null;
}

function resolveIssuer(options: AuthentikIssuerProviderOptions): string {
  if (options.issuer?.trim()) {
    return options.issuer.trim();
  }

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const clientId = resolveAuthentikClientId(options.clientId);
  const resolvedIssuer = resolveAuthentikIssuer(undefined, browserOrigin, clientId);
  if (!resolvedIssuer) {
    throw new AlternunConfigError('Unable to resolve the Authentik issuer URL.');
  }

  return resolvedIssuer;
}

function resolveRedirectUri(options: AuthentikIssuerProviderOptions): string {
  if (options.redirectUri?.trim()) {
    return options.redirectUri.trim();
  }

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const redirectUri = resolveAuthentikRedirectUri(undefined, browserOrigin);
  if (!redirectUri) {
    throw new AlternunConfigError('Unable to resolve the Authentik redirect URI.');
  }

  return redirectUri;
}

function toClaimsRecord(claims: OidcClaims | Record<string, unknown>): Record<string, unknown> {
  return { ...(claims as Record<string, unknown>) };
}

function normalizeOptionalTrimmedString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeBackendRoles(roles: unknown, fallback: string[]): string[] {
  if (!Array.isArray(roles)) {
    return fallback;
  }

  const normalized = roles
    .map((role) => (typeof role === 'string' ? role.trim() : ''))
    .filter((role) => role.length > 0);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeBackendLinkedAccountType(value: unknown): LinkedAuthAccount['type'] {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalized === 'email' || normalized === 'password') {
    return 'password';
  }

  if (normalized === 'wallet') {
    return 'wallet';
  }

  if (normalized === 'oidc' || normalized === 'authentik') {
    return 'oidc';
  }

  return 'social';
}

function normalizeBackendLinkedAccounts(
  linkedAccounts: BackendAuthExchangeLinkedAccount[] | null | undefined,
  fallbackIdentity: ExternalIdentity
): LinkedAuthAccount[] {
  if (!Array.isArray(linkedAccounts) || linkedAccounts.length === 0) {
    return [externalIdentityToLinkedAccount(fallbackIdentity, 'oidc')];
  }

  return linkedAccounts.map((account) => ({
    provider:
      typeof account.provider === 'string' && account.provider.trim().length > 0
        ? account.provider.trim()
        : fallbackIdentity.provider,
    providerUserId:
      typeof account.providerUserId === 'string' && account.providerUserId.trim().length > 0
        ? account.providerUserId.trim()
        : fallbackIdentity.providerUserId,
    type: normalizeBackendLinkedAccountType(account.type),
    email:
      typeof account.email === 'string' && account.email.trim().length > 0
        ? account.email.trim()
        : fallbackIdentity.email ?? undefined,
    displayName:
      typeof account.displayName === 'string' && account.displayName.trim().length > 0
        ? account.displayName.trim()
        : fallbackIdentity.displayName ?? undefined,
    avatarUrl:
      typeof account.avatarUrl === 'string' && account.avatarUrl.trim().length > 0
        ? account.avatarUrl.trim()
        : fallbackIdentity.avatarUrl ?? undefined,
    metadata: {
      emailVerified: fallbackIdentity.emailVerified ?? false,
      ...(account.metadata ?? {}),
    },
  }));
}

function normalizeBackendPrincipal(
  issuer: string,
  externalIdentity: ExternalIdentity,
  principal: BackendAuthExchangePrincipal | null | undefined,
  appUserId: string | null,
  fallbackMetadata: Record<string, unknown> = {}
): Principal {
  const basePrincipal = externalIdentityToPrincipal({
    issuer,
    identity: externalIdentity,
    extraMetadata: fallbackMetadata,
  });

  return {
    ...basePrincipal,
    issuer:
      typeof principal?.issuer === 'string' && principal.issuer.trim().length > 0
        ? principal.issuer.trim()
        : basePrincipal.issuer,
    subject:
      typeof principal?.subject === 'string' && principal.subject.trim().length > 0
        ? principal.subject.trim()
        : basePrincipal.subject,
    email:
      typeof principal?.email === 'string' && principal.email.trim().length > 0
        ? principal.email.trim()
        : basePrincipal.email,
    roles: normalizeBackendRoles(principal?.roles, basePrincipal.roles),
    metadata: {
      ...basePrincipal.metadata,
      ...(principal?.metadata ?? {}),
      appUserId,
    },
  };
}

function buildIssuerSessionFromOidc(
  session: OidcSession,
  issuer: string,
  principalId: string
): IssuerSession {
  const externalIdentity = claimsToExternalIdentity(session.provider, session.claims);
  const principal = externalIdentityToPrincipal({
    issuer,
    identity: externalIdentity,
  });

  return {
    issuer,
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken ?? null,
    idToken: session.tokens.idToken ?? null,
    expiresAt: session.tokens.expiresAt ?? null,
    principal: {
      ...principal,
      subject: normalizeOptionalTrimmedString(principalId) ?? principal.subject,
    },
    claims: toClaimsRecord(session.claims),
    linkedAccounts: [externalIdentityToLinkedAccount(externalIdentity, 'oidc')],
    raw: {
      oidcSession: session,
    },
  };
}

export class AuthentikIssuerProvider implements IdentityIssuerProvider {
  readonly name = 'authentik' as const;

  private cachedSession: IssuerSession | null = null;
  private readonly issuer: string;
  private readonly redirectUri: string;
  private readonly clientId: string;
  private readonly authExchangeUrl: string | null;

  constructor(private readonly options: AuthentikIssuerProviderOptions) {
    this.issuer = resolveIssuer(options);
    this.redirectUri = resolveRedirectUri(options);
    this.clientId = resolveAuthentikClientId(options.clientId);
    this.authExchangeUrl = normalizeOptionalTrimmedString(options.authExchangeUrl);
  }

  private get fetchFn(): typeof fetch {
    const fetchFn = this.options.fetchFn ?? globalThis.fetch;
    if (!fetchFn) {
      throw new AlternunConfigError(
        'Auth exchange URL is configured but fetch is unavailable in this runtime.'
      );
    }

    return fetchFn;
  }

  private buildBackendExchangeRequest(input: IdentityExchangeInput): Record<string, unknown> {
    const executionSession = input.executionSession;

    return {
      externalIdentity: input.externalIdentity,
      executionSession: executionSession
        ? {
            provider: executionSession.provider,
            accessToken: executionSession.accessToken ?? null,
            refreshToken: executionSession.refreshToken ?? null,
            idToken: executionSession.idToken ?? null,
            expiresAt: executionSession.expiresAt ?? null,
            linkedAccounts: executionSession.linkedAccounts ?? [],
          }
        : undefined,
      context: {
        ...(input.context ?? {}),
        authExchangeUrl: this.authExchangeUrl,
      },
      claims: input.claims ?? input.externalIdentity.rawClaims,
      redirectTo: input.redirectTo ?? null,
    };
  }

  private normalizeBackendExchangeResponse(
    response: BackendAuthExchangeResponse,
    input: IdentityExchangeInput
  ): AlternunSession | null {
    const issuerAccessToken = response.issuerAccessToken?.trim();
    if (!issuerAccessToken) {
      return null;
    }

    const issuer = normalizeOptionalTrimmedString(response.principal?.issuer) ?? this.issuer;
    const linkedAccounts = normalizeBackendLinkedAccounts(
      response.linkedAccounts,
      input.externalIdentity
    );
    const principal = normalizeBackendPrincipal(
      issuer,
      input.externalIdentity,
      response.principal ?? null,
      response.appUserId ?? null,
      {
        backendExchange: true,
        exchangeMode: response.exchangeMode ?? 'remote',
        syncStatus: response.syncStatus ?? 'unknown',
      }
    );

    const issuerSession: IssuerSession = {
      issuer,
      accessToken: issuerAccessToken,
      refreshToken: response.issuerRefreshToken ?? null,
      idToken: response.issuerIdToken ?? null,
      expiresAt: response.issuerExpiresAt ?? null,
      principal,
      claims: {
        ...(response.claims ?? input.externalIdentity.rawClaims),
        iss: issuer,
        sub: principal.subject,
        email: principal.email ?? input.externalIdentity.email ?? null,
        email_verified: Boolean(input.externalIdentity.emailVerified),
        roles: principal.roles,
        alternun_roles: principal.roles,
      },
      linkedAccounts,
      raw: {
        backendResponse: response,
        request: this.buildBackendExchangeRequest(input),
      },
    };

    this.cachedSession = issuerSession;
    return createAlternunSession({
      issuerSession,
      executionSession: input.executionSession ?? null,
    });
  }

  private async exchangeIdentityViaBackend(
    input: IdentityExchangeInput
  ): Promise<AlternunSession | null> {
    if (!this.authExchangeUrl) {
      return null;
    }

    const response = await this.fetchFn(this.authExchangeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(this.buildBackendExchangeRequest(input)),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AlternunProviderError(
        `Auth exchange request failed (${response.status} ${response.statusText}): ${text}`
      );
    }

    const json = (await response.json().catch(() => null)) as BackendAuthExchangeResponse | null;
    if (!json) {
      throw new AlternunProviderError('Auth exchange request returned an empty response body.');
    }

    return this.normalizeBackendExchangeResponse(json, input);
  }

  private async exchangeIdentityLocally(input: IdentityExchangeInput): Promise<AlternunSession> {
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
        eventType: 'issuer-exchange',
        aggregateType: 'principal',
        aggregateId: principalRecord.id,
        principal,
        externalIdentity,
        metadata: input.context ?? {},
      })
    );

    const issuerSession: IssuerSession = {
      issuer: this.issuer,
      accessToken:
        (input.context?.issuerAccessToken as string | undefined) ??
        input.executionSession?.accessToken ??
        '',
      refreshToken:
        (input.context?.issuerRefreshToken as string | undefined) ??
        input.executionSession?.refreshToken ??
        null,
      idToken:
        (input.context?.issuerIdToken as string | undefined) ??
        input.executionSession?.idToken ??
        null,
      expiresAt:
        (input.context?.issuerExpiresAt as number | undefined) ??
        input.executionSession?.expiresAt ??
        null,
      principal,
      claims: toClaimsRecord(input.claims ?? externalIdentity.rawClaims),
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

  async exchangeIdentity(input: IdentityExchangeInput): Promise<AlternunSession> {
    const backendSession = await this.exchangeIdentityViaBackend(input).catch(() => null);
    if (backendSession) {
      return backendSession;
    }

    return this.exchangeIdentityLocally(input);
  }

  getIssuerSession(): Promise<IssuerSession | null> {
    if (this.cachedSession) {
      return Promise.resolve(this.cachedSession);
    }

    const session = readOidcSession({
      issuer: this.issuer,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      sessionStorage: this.options.sessionStorage,
    });

    if (!session) {
      return Promise.resolve(null);
    }

    const issuerSession = buildIssuerSessionFromOidc(session, this.issuer, session.claims.sub);
    this.cachedSession = issuerSession;
    return Promise.resolve(issuerSession);
  }

  refreshIssuerSession(): Promise<IssuerSession | null> {
    this.cachedSession = null;
    return this.getIssuerSession();
  }

  logoutIssuerSession(options?: { reason?: string; redirectTo?: string | null }): Promise<void> {
    clearOidcSession({
      issuer: this.issuer,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      sessionStorage: this.options.sessionStorage,
    });
    this.cachedSession = null;
    void options;
    return Promise.resolve();
  }

  discoverIssuerConfig(): Promise<IssuerDiscoveryConfig> {
    const endpointBase = getAuthentikEndpointBaseFromIssuer(this.issuer);
    return Promise.resolve({
      issuer: this.issuer,
      authorizationEndpoint: `${endpointBase}authorize/`,
      tokenEndpoint: `${endpointBase}token/`,
      userinfoEndpoint: `${endpointBase}userinfo/`,
      endSessionEndpoint: `${this.issuer.replace(/\/$/, '')}/end-session/`,
      jwksUri: `${endpointBase}jwks/`,
      clientId: this.clientId,
    });
  }

  validateClaims(
    claims: Record<string, unknown>,
    options?: { issuer?: string; audience?: string | string[] }
  ): Promise<ClaimValidationResult> {
    const errors: string[] = [];
    const issuer = typeof claims.iss === 'string' ? claims.iss.trim() : '';
    const subject = typeof claims.sub === 'string' ? claims.sub.trim() : '';
    if (!issuer) {
      errors.push('Missing claim: iss');
    }
    if (!subject) {
      errors.push('Missing claim: sub');
    }

    const expectedIssuer = normalizeOptionalTrimmedString(options?.issuer) ?? this.issuer;
    if (issuer && expectedIssuer && issuer !== expectedIssuer) {
      errors.push(`Unexpected issuer: ${issuer}`);
    }

    if (errors.length > 0) {
      return Promise.resolve({
        valid: false,
        principal: null,
        errors,
      });
    }

    const identity = claimsToExternalIdentity(
      normalizeOptionalTrimmedString(issuer) ?? this.issuer,
      claims
    );
    const principal = externalIdentityToPrincipal({
      issuer: expectedIssuer,
      identity,
    });

    void options?.audience;
    return Promise.resolve({
      valid: true,
      principal,
      errors: [],
    });
  }
}

export function oidcSessionToExecutionSession(session: OidcSession): ExecutionSession {
  return {
    provider: session.provider,
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken ?? null,
    idToken: session.tokens.idToken ?? null,
    expiresAt: session.tokens.expiresAt ?? null,
    externalIdentity: claimsToExternalIdentity(session.provider, session.claims),
    linkedAccounts: [
      externalIdentityToLinkedAccount(
        claimsToExternalIdentity(session.provider, session.claims),
        'oidc'
      ),
    ],
    raw: {
      oidcSession: session,
    },
  };
}

export function issuerSessionToCompatUser(session: IssuerSession | null) {
  return issuerSessionToUser(session);
}
