import { randomUUID } from 'node:crypto';
import type { Logger } from '@nestjs/common';
import { resolveSupabaseOidcSyncConfig } from '../authentik/supabase-sync';
import type { AirsReportClaimInput, AirsReportClaimResult } from './airs-report-claim.types';

const EMPTY_RESULT: AirsReportClaimResult = {
  skipped: false,
  ok: false,
  claimed: 0,
  reportIds: [],
  reasonCode: null,
};

function readClaimBody(raw: unknown): AirsReportClaimResult {
  const body =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!body) {
    return { ...EMPTY_RESULT };
  }

  const claimed = typeof body.claimed === 'number' && body.claimed > 0 ? body.claimed : 0;
  const reportIds = Array.isArray(body.reportIds)
    ? body.reportIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    skipped: false,
    ok: body.ok === true,
    claimed,
    reportIds,
    reasonCode: typeof body.reasonCode === 'string' ? body.reasonCode : null,
  };
}

/**
 * Releases the User Airs Reports waiting for the signed-in person's confirmed email.
 *
 * The user id comes from the server-side identity sync, never from the client. The database
 * checks the stored account too, and the claim is idempotent, so calling it on every sign-in
 * is safe. Callers must treat a failure as non-fatal.
 */
export async function claimAirsReportsViaSupabase(
  input: AirsReportClaimInput,
  env: Record<string, string | undefined> = process.env
): Promise<AirsReportClaimResult> {
  const config = resolveSupabaseOidcSyncConfig(env);
  if (!config) {
    return { ...EMPTY_RESULT, skipped: true };
  }

  const email = input.email.trim().toLowerCase();
  if (!input.emailConfirmed || !email) {
    return { ...EMPTY_RESULT, reasonCode: 'AIRS_REPORT_CLAIM_EMAIL_NOT_CONFIRMED' };
  }

  const response = await fetch(
    `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/marketplace_claim_airs_reports`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
      body: JSON.stringify({
        p_user_id: input.appUserId,
        p_session_email: email,
        p_email_confirmed: true,
        p_request_id: input.requestId ?? `claim-${randomUUID()}`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to claim Airs reports: ${response.status} ${response.statusText}`);
  }

  return readClaimBody(await response.json().catch(() => null));
}

/**
 * Releases the Airs reports (and their medals) waiting for this account's email.
 *
 * The sign-in exchange runs this claim too, but it can be skipped: on testnet the exchange fails
 * for Better Auth accounts and the app falls back to its local session without telling anyone.
 * The user id comes from the verified session, and the database releases only when the account's
 * stored email matches and is verified, so passing the stored email is safe. Idempotent and never
 * fatal for the caller.
 */
export async function claimWaitingAirsReports(
  input: { userId: string; email: string },
  logger: Pick<Logger, 'log' | 'warn'>,
  claim: typeof claimAirsReportsViaSupabase = claimAirsReportsViaSupabase
): Promise<void> {
  try {
    const result = await claim({
      appUserId: input.userId,
      email: input.email,
      emailConfirmed: true,
    });
    if (result.claimed > 0) {
      logger.log(`Released ${result.claimed} Airs report(s) claimed by user ${input.userId}`);
    } else if (result.reasonCode) {
      logger.warn(`Airs report claim for user ${input.userId} denied: ${result.reasonCode}`);
    }
  } catch (error) {
    logger.warn(
      `Failed to claim Airs reports for user ${input.userId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Turns the pending client invitations for the signed-in person's confirmed email into project
 * participants. Same trust model as the claim above: idempotent, and failures are non-fatal.
 */
export async function acceptClientInvitationsViaSupabase(
  input: AirsReportClaimInput,
  env: Record<string, string | undefined> = process.env
): Promise<{ skipped: boolean; accepted: number }> {
  const config = resolveSupabaseOidcSyncConfig(env);
  const email = input.email.trim().toLowerCase();
  if (!config || !input.emailConfirmed || !email) return { skipped: true, accepted: 0 };

  const response = await fetch(
    `${config.supabaseUrl.replace(
      /\/$/,
      ''
    )}/rest/v1/rpc/marketplace_accept_project_client_invitations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
      body: JSON.stringify({
        p_user_id: input.appUserId,
        p_session_email: email,
        p_email_confirmed: true,
        p_request_id: input.requestId ?? `client-accept-${randomUUID()}`,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to accept client invitations: ${response.status} ${response.statusText}`
    );
  }
  const body = (await response.json().catch(() => null)) as { accepted?: unknown } | null;
  return {
    skipped: false,
    accepted: typeof body?.accepted === 'number' && body.accepted > 0 ? body.accepted : 0,
  };
}
