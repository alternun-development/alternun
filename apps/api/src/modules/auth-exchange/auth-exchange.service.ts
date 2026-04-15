import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  AuthExchangeContext,
  AuthExchangeExternalIdentity,
  AuthExchangeExecutionSession,
  AuthExchangeRequestShape,
  AuthExchangeResponseShape,
} from './auth-exchange.mapper';
import {
  canonicalIssuerFromEnv,
  createExchangeResponse,
  defaultAudienceFromEnv,
} from './auth-exchange.mapper';
import { mintIssuerAccessToken, mintIssuerIdToken } from './auth-exchange-jwt';
import { upsertOidcUserViaSupabase } from '../authentik/supabase-sync';

export interface AuthExchangeServiceResult extends AuthExchangeResponseShape {}

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function isTruthyEnvValue(value: string | undefined | null): boolean {
  const normalized = firstNonEmptyTrimmed([value])?.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function normalizeExternalIdentity(
  input: AuthExchangeRequestShape['externalIdentity']
): AuthExchangeExternalIdentity {
  const email = firstNonEmptyTrimmed([input.email]);
  const displayName = firstNonEmptyTrimmed([input.displayName]);
  const avatarUrl = firstNonEmptyTrimmed([input.avatarUrl]);

  return {
    provider: input.provider.trim(),
    providerUserId: input.providerUserId.trim(),
    email: email ? email.toLowerCase() : null,
    emailVerified: Boolean(input.emailVerified),
    displayName,
    avatarUrl,
    rawClaims: input.rawClaims ?? {},
  };
}

function normalizeExecutionSession(
  input?: AuthExchangeRequestShape['executionSession']
): AuthExchangeExecutionSession | undefined {
  if (!input) {
    return undefined;
  }

  return {
    provider: input.provider.trim(),
    accessToken: input.accessToken ?? null,
    refreshToken: input.refreshToken ?? null,
    idToken: input.idToken ?? null,
    expiresAt: input.expiresAt ?? null,
    linkedAccounts: input.linkedAccounts ?? [],
  };
}

function normalizeContext(
  input?: AuthExchangeRequestShape['context']
): AuthExchangeContext | undefined {
  if (!input) {
    return undefined;
  }

  return {
    trigger: firstNonEmptyTrimmed([input.trigger]) ?? undefined,
    runtime: firstNonEmptyTrimmed([input.runtime]) ?? undefined,
    app: firstNonEmptyTrimmed([input.app]) ?? undefined,
    audience: firstNonEmptyTrimmed([input.audience]) ?? undefined,
    issuerAccessToken: input.issuerAccessToken ?? null,
    issuerRefreshToken: input.issuerRefreshToken ?? null,
    issuerIdToken: input.issuerIdToken ?? null,
    issuerExpiresAt: input.issuerExpiresAt ?? null,
  };
}

@Injectable()
export class AuthExchangeService {
  private readonly logger = new Logger(AuthExchangeService.name);

  private resolveSigningKey(): string | null {
    return (
      firstNonEmptyTrimmed([
        process.env.AUTHENTIK_JWT_SIGNING_KEY,
        process.env.AUTHENTIK_JWT_SIGNING_SECRET,
        process.env.AUTH_SESSION_SIGNING_KEY,
      ]) ?? null
    );
  }

  private requiresIssuerOwnedExchange(): boolean {
    return isTruthyEnvValue(process.env.AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED);
  }

  async exchangeIdentity(input: AuthExchangeRequestShape): Promise<AuthExchangeServiceResult> {
    const externalIdentity = normalizeExternalIdentity(input.externalIdentity);
    const executionSession = normalizeExecutionSession(input.executionSession);
    const context = normalizeContext(input.context);
    const issuer = canonicalIssuerFromEnv();
    const audience = context?.audience ?? defaultAudienceFromEnv();
    const signingKey = this.resolveSigningKey();
    const requireIssuerOwnedExchange = this.requiresIssuerOwnedExchange();

    if (requireIssuerOwnedExchange && !signingKey) {
      throw new ServiceUnavailableException(
        'AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED is enabled, but AUTHENTIK_JWT_SIGNING_KEY is not configured.'
      );
    }

    const syncResult = await upsertOidcUserViaSupabase(
      {
        sub: `${externalIdentity.provider}:${externalIdentity.providerUserId}`,
        iss: issuer,
        email: externalIdentity.email,
        emailVerified: externalIdentity.emailVerified,
        name: externalIdentity.displayName,
        picture: externalIdentity.avatarUrl,
        provider: externalIdentity.provider,
        rawClaims: externalIdentity.rawClaims,
      },
      process.env
    );

    if (syncResult.skipped) {
      this.logger.warn(
        'Supabase compatibility sync is not configured; proceeding without persistence.'
      );
    } else {
      this.logger.log(
        `Synced exchange identity for ${externalIdentity.provider}:${
          externalIdentity.providerUserId
        } -> ${syncResult.appUserId ?? syncResult.principalId}`
      );
    }

    const response = createExchangeResponse({
      issuer,
      audience,
      externalIdentity,
      executionSession,
      issuerSession: context
        ? {
            accessToken: context.issuerAccessToken,
            refreshToken: context.issuerRefreshToken,
            idToken: context.issuerIdToken,
            expiresAt: context.issuerExpiresAt,
          }
        : undefined,
      appUserId: syncResult.appUserId,
      syncStatus: syncResult.skipped ? 'skipped' : 'synced',
      metadata: {
        trigger: context?.trigger,
        runtime: context?.runtime,
        app: context?.app,
        executionProvider: executionSession?.provider,
        compatibility: true,
      },
    });

    if (signingKey) {
      const accessToken = mintIssuerAccessToken({
        issuer,
        audience,
        principal: response.principal,
        claims: response.claims,
        signingKey,
      });
      const idToken = mintIssuerIdToken({
        issuer,
        audience,
        principal: response.principal,
        claims: response.claims,
        signingKey,
      });

      this.logger.log(
        `Minted issuer-owned exchange session for ${externalIdentity.provider}:${externalIdentity.providerUserId} -> ${response.principal.subject}`
      );

      return {
        ...response,
        exchangeMode: 'issuer-owned',
        issuerAccessToken: accessToken.token,
        issuerRefreshToken: null,
        issuerIdToken: idToken.token,
        issuerExpiresAt: accessToken.expiresAt,
      };
    }

    if (!response.issuerAccessToken) {
      this.logger.warn(
        'No issuer access token was supplied to /auth/exchange; returning execution-layer compatibility fallback.'
      );
    }

    return response;
  }
}
