/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { renderAirsWelcomeEmail } from '@alternun/email-templates';
import { verifyIssuerJwt } from '../auth-exchange/auth-exchange-jwt';
import {
  awardAirsRegistrationBonus,
  awardAirsProfileBonus,
  getAirsDashboardSnapshot,
  getUserAchievements,
  markAirsWelcomeEmailSent,
  recordAirsDashboardVisit,
  type UserAchievement,
} from './airs.repository';
import { sendAirsWelcomeEmail } from './airs.email';

export interface AirsSessionClaims {
  appUserId: string;
  principalId: string;
  email: string | null;
  displayName: string | null;
  issuer: string;
  tokenUse: 'access' | 'id';
  emailVerified: boolean;
}

export interface AirsOnboardingInput {
  token: string;
  locale?: string | null;
}

export interface AirsDashboardSnapshotInput {
  token: string;
  locale?: string | null;
  ledgerLimit?: number;
}

export interface AirsOnboardingResult extends Awaited<ReturnType<typeof getAirsDashboardSnapshot>> {
  registrationBonusAwarded: boolean;
  registrationBonusClaimed: boolean;
  registrationBonusStatus: 'awarded' | 'already_awarded';
  welcomeEmailSent: boolean;
  welcomeEmailSkipped: boolean;
  profileBonusAwarded: boolean;
  profileBonusStatus: 'awarded' | 'already_awarded' | 'profile_incomplete';
}

export interface AirsOnboardingDependencies {
  verifySessionToken: (token: string) => Promise<AirsSessionClaims>;
  recordDashboardVisit: typeof recordAirsDashboardVisit;
  awardRegistrationBonus: typeof awardAirsRegistrationBonus;
  awardProfileBonus: typeof awardAirsProfileBonus;
  sendWelcomeEmail: typeof sendAirsWelcomeEmail;
  markWelcomeEmailSent: typeof markAirsWelcomeEmailSent;
  renderWelcomeEmail: typeof renderAirsWelcomeEmail;
  getDashboardSnapshot: typeof getAirsDashboardSnapshot;
  env?: Record<string, string | undefined>;
  dashboardUrl?: string | null;
  bonusAirs?: number;
  airsPerDollar?: number;
}

export interface AirsDashboardSnapshotDependencies {
  verifySessionToken: (token: string) => Promise<AirsSessionClaims>;
  getDashboardSnapshot: typeof getAirsDashboardSnapshot;
  env?: Record<string, string | undefined>;
  ledgerLimit?: number;
}

function resolveDashboardUrl(env: Record<string, string | undefined>): string {
  const explicit = (env.AIRS_DASHBOARD_URL ?? env.EXPO_PUBLIC_ORIGIN ?? '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const fallback = 'https://airs.alternun.co';
  return fallback;
}

function normalizeToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('AIRS onboarding requires a bearer token.');
  }

  return trimmed.startsWith('Bearer ') ? trimmed.slice('Bearer '.length).trim() : trimmed;
}

async function resolveSessionClaims(
  token: string,
  verifySessionToken: (token: string) => Promise<AirsSessionClaims>
): Promise<AirsSessionClaims> {
  const claims = await verifySessionToken(normalizeToken(token));

  if (!claims.appUserId) {
    throw new Error('AIRS onboarding token did not include app_user_id.');
  }

  return claims;
}

export async function processAirsOnboarding(
  input: AirsOnboardingInput,
  dependencies: AirsOnboardingDependencies
): Promise<AirsOnboardingResult> {
  const env = dependencies.env ?? process.env;
  const tokenClaims = await resolveSessionClaims(input.token, dependencies.verifySessionToken);

  const dashboardState = await dependencies.recordDashboardVisit(
    {
      userId: tokenClaims.appUserId,
      locale: input.locale ?? null,
    },
    env
  );

  const registrationBonusResult = await dependencies.awardRegistrationBonus(
    {
      userId: tokenClaims.appUserId,
      bonusAmount: dependencies.bonusAirs ?? 10,
    },
    env
  );

  let profileBonusAwarded = Boolean(dashboardState.profileBonusAwardedAt);
  let profileBonusStatus: AirsOnboardingResult['profileBonusStatus'] = 'already_awarded';

  if (dashboardState.shouldAwardProfileBonus) {
    const bonusResult = await dependencies.awardProfileBonus(
      {
        userId: tokenClaims.appUserId,
        bonusAmount: dependencies.bonusAirs ?? 10,
        sourceRef: 'profile-completion-bonus',
        metadata: {
          locale: input.locale ?? dashboardState.locale ?? null,
          email: dashboardState.email ?? tokenClaims.email,
          displayName: dashboardState.displayName ?? tokenClaims.displayName,
          principalId: tokenClaims.principalId,
        },
      },
      env
    );

    profileBonusAwarded = bonusResult.awarded;
    profileBonusStatus = bonusResult.status;
  } else if (!dashboardState.profileComplete) {
    profileBonusStatus = 'profile_incomplete';
  }

  let welcomeEmailSent = false;
  let welcomeEmailSkipped = false;

  if (dashboardState.shouldSendWelcomeEmail && dashboardState.email) {
    const email = dependencies.renderWelcomeEmail({
      locale: input.locale ?? dashboardState.locale ?? null,
      displayName: dashboardState.displayName ?? tokenClaims.displayName ?? dashboardState.email,
      dashboardUrl: dependencies.dashboardUrl ?? resolveDashboardUrl(env),
      bonusAirs: dependencies.bonusAirs ?? 10,
      airsPerDollar: dependencies.airsPerDollar ?? 5,
    });

    const sendResult = await dependencies.sendWelcomeEmail(
      {
        to: dashboardState.email,
        email,
      },
      env
    );

    welcomeEmailSent = sendResult.sent;
    welcomeEmailSkipped = sendResult.skipped;

    if (sendResult.sent) {
      await dependencies.markWelcomeEmailSent(
        {
          userId: tokenClaims.appUserId,
          locale: input.locale ?? dashboardState.locale ?? null,
          metadata: {
            provider: tokenClaims.issuer,
          },
        },
        env
      );
    }
  } else if (dashboardState.shouldSendWelcomeEmail && !dashboardState.email) {
    welcomeEmailSkipped = true;
  }

  const snapshot = await dependencies.getDashboardSnapshot(
    {
      userId: tokenClaims.appUserId,
      locale: input.locale ?? dashboardState.locale ?? null,
      ledgerLimit: 5,
    },
    env
  );

  return {
    ...snapshot,
    registrationBonusAwarded: registrationBonusResult.awarded,
    registrationBonusClaimed: true,
    registrationBonusStatus: registrationBonusResult.awarded ? 'awarded' : 'already_awarded',
    welcomeEmailSent,
    welcomeEmailSkipped,
    profileBonusAwarded,
    profileBonusStatus,
  };
}

export async function processAirsDashboardSnapshot(
  input: AirsDashboardSnapshotInput,
  dependencies: AirsDashboardSnapshotDependencies
): Promise<Awaited<ReturnType<typeof getAirsDashboardSnapshot>>> {
  const env = dependencies.env ?? process.env;
  const tokenClaims = await resolveSessionClaims(input.token, dependencies.verifySessionToken);

  const snapshot = await dependencies.getDashboardSnapshot(
    {
      userId: tokenClaims.appUserId,
      locale: input.locale ?? null,
      ledgerLimit: dependencies.ledgerLimit ?? input.ledgerLimit ?? 5,
    },
    env
  );

  return {
    ...snapshot,
    email: snapshot.email ?? tokenClaims.email,
    displayName: snapshot.displayName ?? tokenClaims.displayName,
    locale: input.locale ?? snapshot.locale ?? null,
  };
}

@Injectable()
export class AirsService {
  private readonly logger = new Logger(AirsService.name);

  async onboard(input: AirsOnboardingInput): Promise<AirsOnboardingResult> {
    return processAirsOnboarding(input, {
      verifySessionToken: (token: string) => {
        const signingKey =
          process.env.AUTHENTIK_JWT_SIGNING_KEY ??
          process.env.AUTHENTIK_JWT_SIGNING_SECRET ??
          process.env.AUTH_SESSION_SIGNING_KEY ??
          '';

        if (!signingKey.trim()) {
          throw new Error('AUTHENTIK_JWT_SIGNING_KEY is required for AIRS onboarding.');
        }

        const verified = verifyIssuerJwt(token, signingKey);

        return Promise.resolve({
          appUserId:
            typeof verified.claims.app_user_id === 'string' ? verified.claims.app_user_id : '',
          principalId: verified.claims.principal_id,
          email: verified.claims.email,
          displayName:
            typeof verified.claims.email === 'string' && verified.claims.email.includes('@')
              ? verified.claims.email.split('@')[0]
              : null,
          issuer: verified.claims.iss,
          tokenUse: verified.claims.token_use,
          emailVerified: verified.claims.email_verified,
        } as AirsSessionClaims);
      },
      recordDashboardVisit: recordAirsDashboardVisit,
      awardRegistrationBonus: awardAirsRegistrationBonus,
      awardProfileBonus: awardAirsProfileBonus,
      sendWelcomeEmail: sendAirsWelcomeEmail,
      markWelcomeEmailSent: markAirsWelcomeEmailSent,
      renderWelcomeEmail: renderAirsWelcomeEmail,
      getDashboardSnapshot: getAirsDashboardSnapshot,
      env: process.env,
    }).catch((error: unknown) => {
      this.logger.error(
        `AIRS onboarding failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    });
  }

  async snapshot(
    input: AirsDashboardSnapshotInput
  ): Promise<Awaited<ReturnType<typeof getAirsDashboardSnapshot>>> {
    return processAirsDashboardSnapshot(input, {
      verifySessionToken: (token: string): Promise<AirsSessionClaims> => {
        const signingKey =
          process.env.AUTHENTIK_JWT_SIGNING_KEY ??
          process.env.AUTHENTIK_JWT_SIGNING_SECRET ??
          process.env.AUTH_SESSION_SIGNING_KEY ??
          '';

        if (!signingKey.trim()) {
          throw new Error('AUTHENTIK_JWT_SIGNING_KEY is required for AIRS snapshot reads.');
        }

        const verified = verifyIssuerJwt(token, signingKey);

        return Promise.resolve({
          appUserId:
            typeof verified.claims.app_user_id === 'string' ? verified.claims.app_user_id : '',
          principalId: verified.claims.principal_id,
          email: verified.claims.email,
          displayName:
            typeof verified.claims.email === 'string' && verified.claims.email.includes('@')
              ? verified.claims.email.split('@')[0]
              : null,
          issuer: verified.claims.iss,
          tokenUse: verified.claims.token_use,
          emailVerified: verified.claims.email_verified,
        });
      },
      getDashboardSnapshot: getAirsDashboardSnapshot,
      env: process.env,
      ledgerLimit: 5,
    }).catch((error: unknown) => {
      this.logger.error(
        `AIRS snapshot failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    });
  }

  async achievements(token: string): Promise<UserAchievement[]> {
    const signingKey =
      process.env.AUTHENTIK_JWT_SIGNING_KEY ??
      process.env.AUTHENTIK_JWT_SIGNING_SECRET ??
      process.env.AUTH_SESSION_SIGNING_KEY ??
      '';

    if (!signingKey.trim()) {
      throw new Error('AUTHENTIK_JWT_SIGNING_KEY is required for AIRS achievements.');
    }

    const verified = verifyIssuerJwt(
      token.trim().startsWith('Bearer ')
        ? token.trim().slice('Bearer '.length).trim()
        : token.trim(),
      signingKey
    );

    const userId =
      typeof verified.claims.app_user_id === 'string' ? verified.claims.app_user_id : '';

    if (!userId) {
      throw new Error('Invalid or missing user ID in token');
    }

    return getUserAchievements({ userId }, process.env).catch((error: unknown) => {
      this.logger.error(
        `AIRS achievements fetch failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    });
  }
}
