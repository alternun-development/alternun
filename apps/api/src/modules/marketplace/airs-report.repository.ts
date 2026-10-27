/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type { AdminActor } from './marketplace.types';
import type {
  AirsReportActorRef,
  AirsReportDecision,
  AirsReportRecipientLookupResponse,
  AirsReportRecipientTotals,
  AirsReportRewardRecord,
  AirsReportTimelineEntry,
  AirsReportRecord,
  AirsReportStatus,
  SubmitAirsReportRequest,
  SubmitAirsReportResponse,
} from './airs-report.types';

type Row = Record<string, unknown>;

/** Verified email from the admin token, used for the approver allowlist and the self-report rule. */
export interface AirsReportApprover {
  email?: string;
  emailVerified?: boolean;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object')
    : [];
}

function failDatabase(): never {
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

function actorRef(issuer: unknown, subject: unknown): AirsReportActorRef | null {
  return typeof issuer === 'string' && typeof subject === 'string' ? { issuer, subject } : null;
}

/** Maps the camelCase report returned by the database functions. */
export function mapAirsReport(value: unknown): AirsReportRecord {
  const report = record(value);
  if (!text(report.id)) failDatabase();
  const submittedBy = record(report.submittedBy);
  const decision = report.decision ? record(report.decision) : null;
  const decidedBy = decision?.decidedBy ? record(decision.decidedBy) : null;
  return {
    id: text(report.id),
    projectId: text(report.projectId),
    status: text(report.status) as AirsReportStatus,
    recipientEmail: text(report.recipientEmail),
    recipientName: nullableText(report.recipientName),
    recipientUserId: nullableText(report.recipientUserId),
    amount: Number(report.amount),
    concept: text(report.concept),
    medalId: nullableText(report.medalId),
    documentNumber: nullableText(report.documentNumber),
    documentSha256: nullableText(report.documentSha256),
    snapshotHash: text(report.snapshotHash),
    submittedBy: { issuer: text(submittedBy.issuer), subject: text(submittedBy.subject) },
    submittedAt: text(report.submittedAt),
    decision: decision
      ? ({
          kind: text(decision.kind),
          outcome: text(decision.outcome),
          decidedAt: text(decision.decidedAt),
          decidedBy: decidedBy ? actorRef(decidedBy.issuer, decidedBy.subject) : null,
          reason: nullableText(decision.reason),
        } as AirsReportDecision)
      : null,
    releasedAt: nullableText(report.releasedAt),
    ledgerEntryId: nullableText(report.ledgerEntryId),
    cancelledAt: nullableText(report.cancelledAt),
    cancellationReason: nullableText(report.cancellationReason),
    reversedAt: nullableText(report.reversedAt),
    reversalReason: nullableText(report.reversalReason),
    updatedAt: text(report.updatedAt),
  };
}

/** Maps a snake_case airs_reports row. */
function mapAirsReportRow(row: Row): AirsReportRecord {
  return mapAirsReport({
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    recipientUserId: row.recipient_user_id,
    amount: row.amount,
    concept: row.concept,
    medalId: row.medal_id,
    documentNumber: row.document_number,
    documentSha256: row.document_sha256,
    snapshotHash: row.snapshot_hash,
    submittedBy: { issuer: row.submitted_by_issuer, subject: row.submitted_by_subject },
    submittedAt: row.submitted_at,
    decision: row.decided_at
      ? {
          kind: row.decision_kind,
          outcome: row.decision_outcome,
          decidedAt: row.decided_at,
          decidedBy: row.decided_by_issuer
            ? { issuer: row.decided_by_issuer, subject: row.decided_by_subject }
            : null,
          reason: row.decision_reason,
        }
      : null,
    releasedAt: row.released_at,
    ledgerEntryId: row.ledger_entry_id,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    reversedAt: row.reversed_at,
    reversalReason: row.reversal_reason,
    updatedAt: row.updated_at,
  });
}

function mapTotals(value: unknown): AirsReportRecipientTotals {
  const totals = record(value);
  return {
    timeZone: text(totals.timeZone),
    day: text(totals.day),
    month: text(totals.month),
    dailyTotal: Number(totals.dailyTotal),
    monthlyTotal: Number(totals.monthlyTotal),
    dailyLimit: Number(totals.dailyLimit),
    monthlyLimit: Number(totals.monthlyLimit),
  };
}

@Injectable()
export class AirsReportRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  private async call(name: string, params: Row): Promise<Row> {
    const { data, error } = await this.client.rpc(name, params);
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true)
      marketplaceError(text(result.reasonCode) || 'AIRS_REPORT_INPUT_INVALID');
    return result;
  }

  async submit(
    projectId: string,
    input: SubmitAirsReportRequest,
    actor: AdminActor,
    actorEmail: AirsReportApprover,
    requestId: string
  ): Promise<SubmitAirsReportResponse> {
    const result = await this.call('marketplace_submit_airs_report', {
      p_project_id: projectId,
      p_recipient_email: input.recipientEmail,
      p_recipient_name: input.recipientName ?? null,
      p_amount: input.amount,
      p_concept: input.concept,
      p_medal_id: input.medalId ?? null,
      p_document_number: input.documentNumber ?? null,
      p_document_sha256: input.documentSha256 ?? null,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_actor_email: actorEmail.email ?? null,
      p_actor_email_verified: actorEmail.emailVerified === true,
      p_request_id: requestId,
    });
    const autoApproval = record(result.autoApproval);
    return {
      report: mapAirsReport(result.report),
      idempotent: result.idempotent === true,
      autoApproval: {
        approved: autoApproval.approved === true,
        blockedReason: nullableText(
          autoApproval.blockedReason
        ) as SubmitAirsReportResponse['autoApproval']['blockedReason'],
        totals: mapTotals(autoApproval.totals),
      },
    };
  }

  async approve(
    reportId: string,
    snapshotHash: string,
    actor: AdminActor,
    approver: AirsReportApprover,
    requestId: string
  ): Promise<{ report: AirsReportRecord; idempotent: boolean }> {
    const result = await this.call('marketplace_approve_airs_report', {
      p_report_id: reportId,
      p_snapshot_hash: snapshotHash,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_actor_email: approver.email ?? null,
      p_actor_email_verified: approver.emailVerified === true,
      p_request_id: requestId,
    });
    return { report: mapAirsReport(result.report), idempotent: result.idempotent === true };
  }

  async reject(
    reportId: string,
    reason: string,
    actor: AdminActor,
    approver: AirsReportApprover,
    requestId: string
  ): Promise<{ report: AirsReportRecord; idempotent: boolean }> {
    const result = await this.call('marketplace_reject_airs_report', {
      p_report_id: reportId,
      p_reason: reason,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_actor_email: approver.email ?? null,
      p_actor_email_verified: approver.emailVerified === true,
      p_request_id: requestId,
    });
    return { report: mapAirsReport(result.report), idempotent: result.idempotent === true };
  }

  async cancel(
    reportId: string,
    reason: string,
    actor: AdminActor,
    requestId: string
  ): Promise<{ report: AirsReportRecord; idempotent: boolean }> {
    const result = await this.call('marketplace_cancel_airs_report', {
      p_report_id: reportId,
      p_reason: reason,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    return { report: mapAirsReport(result.report), idempotent: result.idempotent === true };
  }

  async lookupRecipient(
    projectId: string,
    email: string,
    actor: AdminActor,
    requestId: string
  ): Promise<AirsReportRecipientLookupResponse> {
    const result = await this.call('marketplace_lookup_airs_report_recipient', {
      p_project_id: projectId,
      p_email: email,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    const recipient = record(result.recipient);
    return {
      email: text(recipient.email),
      hasAccount: recipient.hasAccount === true,
      displayName: nullableText(recipient.displayName),
    };
  }

  async listForProject(projectId: string, status?: AirsReportStatus): Promise<AirsReportRecord[]> {
    let query = this.client
      .from('airs_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) failDatabase();
    return rows(data).map(mapAirsReportRow);
  }

  async listByStatus(status: AirsReportStatus): Promise<AirsReportRecord[]> {
    const { data, error } = await this.client
      .from('airs_reports')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: true })
      .limit(200);
    if (error) failDatabase();
    return rows(data).map(mapAirsReportRow);
  }

  async find(reportId: string): Promise<AirsReportRecord | null> {
    const { data, error } = await this.client
      .from('airs_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();
    if (error) failDatabase();
    return data ? mapAirsReportRow(data as Row) : null;
  }

  /** History of one report, oldest first. Only what an operator needs: no actor identity. */
  async listTimeline(reportId: string): Promise<AirsReportTimelineEntry[]> {
    const { data, error } = await this.client
      .from('admin_audit_log')
      .select('action, result, reason_code, occurred_at')
      .eq('target_type', 'airs_report')
      .eq('target_id', reportId)
      .like('action', 'airs_report.%')
      .order('occurred_at', { ascending: true })
      .limit(100);
    if (error) failDatabase();
    return rows(data).map((row) => ({
      action: String(row.action ?? ''),
      result: row.result === 'denied' ? 'denied' : 'allowed',
      reasonCode: typeof row.reason_code === 'string' ? row.reason_code : null,
      occurredAt: String(row.occurred_at ?? ''),
    }));
  }

  async listRewards(reportId: string): Promise<AirsReportRewardRecord[]> {
    const { data, error } = await this.client
      .from('airs_report_rewards')
      .select('kind, amount, status, credited_at')
      .eq('report_id', reportId)
      .order('kind', { ascending: true });
    if (error) failDatabase();
    return rows(data).map((row) => ({
      kind: row.kind === 'project' ? 'project' : 'submitter',
      amount: Number(row.amount ?? 0),
      status: row.status === 'credited' || row.status === 'void' ? row.status : 'locked',
      creditedAt: typeof row.credited_at === 'string' ? row.credited_at : null,
    }));
  }

  async recipientTotals(recipientEmail: string, at: string): Promise<AirsReportRecipientTotals> {
    const { data, error } = await this.client.rpc('airs_report_recipient_totals', {
      p_recipient_email: recipientEmail,
      p_at: at,
    });
    if (error) failDatabase();
    return mapTotals(data);
  }

  async isApprover(approver: AirsReportApprover): Promise<boolean> {
    if (!approver.email || approver.emailVerified !== true) return false;
    const { data, error } = await this.client
      .from('airs_report_approvers')
      .select('email')
      .eq('email', approver.email)
      .eq('is_active', true)
      .maybeSingle();
    if (error) failDatabase();
    return !!data;
  }

  async listApproverEmails(): Promise<string[]> {
    const { data, error } = await this.client
      .from('airs_report_approvers')
      .select('email')
      .eq('is_active', true);
    if (error) failDatabase();
    return ((data ?? []) as Array<{ email: string }>).map((row) => row.email);
  }

  /** Verified email of an admin identity, so a decision can be reported back to them. */
  async findSubmitterEmail(issuer: string, subject: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('users')
      .select('email')
      .eq('iss', issuer)
      .eq('sub', subject)
      .eq('email_verified', true)
      .limit(1)
      .maybeSingle();
    if (error) failDatabase();
    const email = (data as { email?: string | null } | null)?.email;
    return typeof email === 'string' && email.trim() ? email.trim() : null;
  }
}
