import { randomUUID } from 'node:crypto';
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
