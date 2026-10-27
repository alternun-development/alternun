export interface AirsReportClaimInput {
  /** Application user id (public.users.id) returned by the identity sync. */
  appUserId: string;
  /** Email of the verified session. */
  email: string;
  /** True only when the session proves the email was confirmed. */
  emailConfirmed: boolean;
  requestId?: string;
}

export interface AirsReportClaimResult {
  /** True when Supabase is not configured, so nothing was attempted. */
  skipped: boolean;
  ok: boolean;
  claimed: number;
  reportIds: string[];
  reasonCode: string | null;
}
