import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthExchangeExternalIdentity,
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
import { ReferralsService } from '../referrals/referrals.service';
import {
  normalizeExecutionEmail,
  normalizeExecutionProvider,
  resolveExecutionIdentity,
  type ResolvedExecutionIdentity,
} from '../../common/auth/resolve-execution-identity';

export interface AuthExchangeServiceResult extends AuthExchangeResponseShape {}

export interface AuthExchangeCredential {
  authorization?: string;
  cookie?: string;
}

// Temporary until providerUserId migrates to linked accountIds. Wallet-only labels are not
// Better Auth identities, and wallet-only mode is disabled by default.
const TEMPORARY_BETTER_AUTH_PROVIDERS = new Set(['google', 'discord', 'email', 'github']);

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function normalizeExternalIdentity(
  input: AuthExchangeRequestShape['externalIdentity'],
  resolved: ResolvedExecutionIdentity
): AuthExchangeExternalIdentity {
  const provider = normalizeExecutionProvider(input.provider);
  const providerUserId = firstNonEmptyTrimmed([input.providerUserId]);
  const email = normalizeExecutionEmail(input.email);
  const displayName = firstNonEmptyTrimmed([input.displayName]);
  const avatarUrl = firstNonEmptyTrimmed([input.avatarUrl]);

  if (
    !provider ||
    !providerUserId ||
    providerUserId !== resolved.providerUserId ||
    !email ||
    email !== resolved.email ||
    (resolved.source === 'supabase' && provider !== resolved.provider) ||
    (resolved.source === 'better-auth' && !TEMPORARY_BETTER_AUTH_PROVIDERS.has(provider))
  ) {
    throw new UnauthorizedException('The requested identity does not match the verified session.');
  }

  return {
    // Better Auth currently exposes its internal user id to the client. Keep the body provider
    // temporarily so existing principal ids remain stable until linked-account ids are migrated.
    provider: resolved.source === 'better-auth' ? provider : resolved.provider,
    providerUserId: resolved.providerUserId,
    email: resolved.email,
    emailVerified: resolved.emailVerified,
    displayName,
    avatarUrl,
    rawClaims: {},
  };
}

@Injectable()
export class AuthExchangeService {
  private readonly logger = new Logger(AuthExchangeService.name);

  constructor(
    @Optional()
    private readonly referralsService?: ReferralsService
  ) {}

  private resolveSigningKey(): string | null {
    return (
      firstNonEmptyTrimmed([
        process.env.AUTHENTIK_JWT_SIGNING_KEY,
        process.env.AUTHENTIK_JWT_SIGNING_SECRET,
        process.env.AUTH_SESSION_SIGNING_KEY,
      ]) ?? null
    );
  }

  async exchangeIdentity(
    input: AuthExchangeRequestShape,
    credential: AuthExchangeCredential = {}
  ): Promise<AuthExchangeServiceResult> {
    const resolvedIdentity = await resolveExecutionIdentity(
      credential.authorization,
      credential.cookie
    );
    const externalIdentity = normalizeExternalIdentity(input.externalIdentity, resolvedIdentity);
    const issuer = canonicalIssuerFromEnv();
    const audience = defaultAudienceFromEnv();
    const signingKey = this.resolveSigningKey();

    if (!signingKey) {
      throw new ServiceUnavailableException('AUTHENTIK_JWT_SIGNING_KEY is not configured.');
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

    if (syncResult.appUserId && this.referralsService) {
      void this.referralsService
        .syncReferralConfirmationForUser(syncResult.appUserId)
        .catch((error) => {
          this.logger.warn(
            `Failed to sync referral confirmation for exchange user ${syncResult.appUserId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
    }

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
      appUserId: syncResult.appUserId,
      syncStatus: syncResult.skipped ? 'skipped' : 'synced',
      metadata: {
        trigger: firstNonEmptyTrimmed([input.context?.trigger]) ?? undefined,
        runtime: firstNonEmptyTrimmed([input.context?.runtime]) ?? undefined,
        app: firstNonEmptyTrimmed([input.context?.app]) ?? undefined,
        executionProvider: resolvedIdentity.source,
        compatibility: false,
      },
    });

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
}
