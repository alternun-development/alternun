import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { hasPermission, type AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { sendAirsEmail } from '../airs/airs.email';
import {
  renderProjectClientInvitationEmail,
  renderProjectClientNoticeEmail,
} from './airs-report-emails';
import type { AirsReportEmailContent } from './airs-report-emails.types';
import { resolveAirsReportAppUrl } from './airs-report-notifier';
import { AirsReportRepository } from './airs-report.repository';
import { AirsReportService } from './airs-report.service';
import type { AirsReportRecord } from './airs-report.types';
import { MarketplaceParticipantRepository } from './marketplace-participant.repository';
import { MarketplaceParticipantService } from './marketplace-participant.service';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal, type ProjectRecord } from './marketplace.types';
import { ProjectClientRepository } from './project-client.repository';
import {
  AIRS_REPORT_PROOF_MAX_BYTES,
  AIRS_REPORT_PROOF_TYPES,
  type AddProjectClientRequest,
  type AddProjectClientResponse,
  type ProjectClientInvitationRecord,
  type ProjectClientProof,
  type ProjectClientProofFile,
  type ProjectClientProofUploadResponse,
  type ProjectClientRecord,
  type ProjectClientReport,
} from './project-client.types';

/** One resend per report or invitation in this window. */
const RESEND_INTERVAL_MS = 10 * 60 * 1000;

function projectTitle(project: ProjectRecord): string {
  const content = project.content[project.defaultLocale] ?? Object.values(project.content)[0];
  return content?.title?.trim() || project.slug;
}

/**
 * Clients of a project for the in-app "Clients" tab: participants with an account plus pending
 * invitations by email, each with the Airs assigned to them (User Airs Reports).
 *
 * Adding a client reuses the participant and report flows, so their scope checks, limits,
 * approvals, claim on sign-up and +5/+5 rewards apply unchanged.
 */
@Injectable()
export class ProjectClientService {
  private readonly logger = new Logger(ProjectClientService.name);
  /** Sends one email and says whether it left; replaceable in tests. */
  send: (to: string, email: AirsReportEmailContent) => Promise<boolean> = async (to, email) =>
    (await sendAirsEmail({ to, email })).sent;
  env: Record<string, string | undefined> = process.env;

  constructor(
    private readonly repository: ProjectClientRepository,
    private readonly participants: MarketplaceParticipantService,
    private readonly participantRepository: MarketplaceParticipantRepository,
    private readonly reports: AirsReportService,
    private readonly reportRepository: AirsReportRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  async list(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<ProjectClientRecord[]> {
    await this.participants.authorizeProject(principal, 'participants:read', requestId, projectId);
    return this.compose(projectId);
  }

  /** Clients of every project of the enterprise the person can read, with the project names. */
  async listForEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string
  ): Promise<{ projects: Array<{ id: string; title: string }>; clients: ProjectClientRecord[] }> {
    const projects = await this.adminRepository.listProjects({
      enterpriseIds: [enterpriseId],
      projectIds: [],
    });
    const readable: Array<{ id: string; title: string }> = [];
    const clients: ProjectClientRecord[] = [];
    for (const project of projects) {
      if (project.status === 'archived') continue;
      try {
        clients.push(...(await this.list(principal, requestId, project.id)));
        readable.push({ id: project.id, title: projectTitle(project) });
      } catch (error) {
        // A project outside the person's scope is left out; anything else is a real failure.
        if (!(error instanceof MarketplaceApiError) || error.getStatus() !== 403) throw error;
      }
    }
    return { projects: readable, clients };
  }

  async add(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: AddProjectClientRequest
  ): Promise<AddProjectClientResponse> {
    await this.participants.authorizeProject(
      principal,
      'participants:manage',
      requestId,
      projectId
    );
    const email = input.email.trim().toLowerCase();
    const name = input.name?.trim() ?? '';
    const actor = actorFromPrincipal(principal);
    const hasAccount = await this.repository.hasVerifiedAccount(email);
    if (!hasAccount && !name) marketplaceError('CLIENT_NAME_REQUIRED');

    // Airs first: if the report is refused (limits, missing document), nothing else changes.
    let report: AirsReportRecord | null = null;
    if (input.airs) {
      const proof = input.airs.proofPath
        ? await this.checkProof(projectId, input.airs.proofPath)
        : null;
      // People without an account get one invitation email with these Airs instead.
      const submitted = await this.reports.submit(
        principal,
        requestId,
        projectId,
        {
          recipientEmail: email,
          ...(name ? { recipientName: name } : {}),
          amount: input.airs.amount,
          concept: input.airs.concept.trim(),
          ...(input.airs.documentNumber?.trim()
            ? { documentNumber: input.airs.documentNumber.trim() }
            : {}),
          ...(proof ? { documentSha256: proof.sha256 } : {}),
          ...(input.airs.requestKey ? { requestKey: input.airs.requestKey } : {}),
        },
        { recipient: hasAccount }
      );
      report = submitted.report;
      if (proof) await this.repository.saveProof(report.id, proof, actor);
    }

    let alreadyClient = false;
    let invitationSent = false;
    if (hasAccount) {
      try {
        await this.participantRepository.add(projectId, email, actor, requestId);
      } catch (error) {
        if (!(error instanceof MarketplaceApiError) || error.code !== 'PARTICIPANT_CONFLICT')
          throw error;
        alreadyClient = true;
      }
    } else {
      const invited = await this.repository.invite(projectId, email, name, actor, requestId);
      alreadyClient = invited.idempotent;
      // A new invitation, or new Airs for someone already invited, gets one email. Airs still
      // in review are left out: their approval sends the claim email.
      if (!invited.idempotent || report)
        invitationSent = await this.sendInvitation(
          projectId,
          email,
          invited.invitation.name || name,
          report?.status === 'awaiting_claim'
            ? { amount: report.amount, concept: report.concept }
            : null
        );
    }

    const clients = await this.compose(projectId);
    const client = clients.find((item) => item.email.toLowerCase() === email);
    if (!client) marketplaceError('CLIENT_NOT_FOUND');
    // Nothing new (same client, no Airs): nobody needs to hear about it again.
    if (!alreadyClient || report)
      await this.noticeAdmins(principal, projectId, client, alreadyClient, report);
    return { client, alreadyClient, invitationSent, reportStatus: report?.status ?? null };
  }

  /**
   * Tells Alternun global admins and the project's admins, by email and in the app, that a
   * client was added or got Airs. Informative: approvals keep their own flow. Best effort, and
   * whoever made the change is not told about it.
   */
  private async noticeAdmins(
    principal: AdminPrincipal,
    projectId: string,
    client: ProjectClientRecord,
    alreadyClient: boolean,
    report: AirsReportRecord | null,
    reminder = false
  ): Promise<number> {
    try {
      const project = await this.adminRepository.findProject(projectId);
      if (!project) return 0;
      const actorEmail = principal.email?.trim().toLowerCase() ?? null;
      const recipients = (
        await this.repository.listClientNoticeRecipients(projectId, project.enterpriseId)
      ).filter((recipient) => recipient.email !== actorEmail);
      if (recipients.length === 0) return 0;

      const projectName = projectTitle(project);
      const airs = report
        ? { amount: report.amount, concept: report.concept, status: report.status }
        : null;
      const email = renderProjectClientNoticeEmail({
        projectId,
        projectName,
        clientName: client.name || client.email,
        clientEmail: client.email,
        clientKind: client.kind,
        alreadyClient,
        airs,
        addedBy: actorEmail,
        appUrl: resolveAirsReportAppUrl(this.env),
        reminder,
      });
      await this.repository.createNotifications(
        recipients.map((recipient) => ({
          userId: recipient.userId,
          eventType: 'project_client_added',
          severity: report?.status === 'pending_approval' ? 'warning' : 'info',
          payload: {
            projectId,
            projectName,
            clientName: client.name || client.email,
            clientEmail: client.email,
            clientKind: client.kind,
            ...(airs
              ? { amount: airs.amount, concept: airs.concept, reportStatus: airs.status }
              : {}),
            link: `/manage/${projectId}`,
          },
          // A reminder is a new notice, so it gets its own key.
          dedupeKey: `project-client:${client.id}:${report?.id ?? 'client'}${
            reminder ? `:reminder:${Date.now()}` : ''
          }`,
        }))
      );
      for (const recipient of recipients) {
        const sent = await this.send(recipient.email, email).catch(() => false);
        if (!sent) this.logger.warn(`Client notice email not sent (project ${projectId})`);
      }
      return recipients.length;
    } catch (error) {
      this.logger.warn(
        `Client notice failed (project ${projectId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return 0;
    }
  }

  async createProofUpload(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    contentType: string
  ): Promise<ProjectClientProofUploadResponse> {
    await this.participants.authorizeProject(
      principal,
      'participants:manage',
      requestId,
      projectId
    );
    if (!hasPermission(principal, 'airs_reports:submit')) marketplaceError('PERMISSION_DENIED');
    const extension = AIRS_REPORT_PROOF_TYPES[contentType];
    if (!extension) marketplaceError('CLIENT_PROOF_INVALID');
    return this.repository.createProofUpload(`${projectId}/${randomUUID()}.${extension}`);
  }

  /** The supporting file, only for people who can read the project's clients. */
  async proofFile(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    reportId: string
  ): Promise<ProjectClientProofFile> {
    await this.participants.authorizeProject(principal, 'participants:read', requestId, projectId);
    const report = await this.reportRepository.find(reportId);
    if (!report || report.projectId !== projectId) marketplaceError('CLIENT_NOT_FOUND');
    const file = await this.repository.readProof(reportId);
    if (!file) marketplaceError('CLIENT_NOT_FOUND');
    return file;
  }

  async cancelInvitation(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    invitationId: string
  ): Promise<void> {
    await this.participants.authorizeProject(
      principal,
      'participants:manage',
      requestId,
      projectId
    );
    const invitation = await this.repository.findInvitation(projectId, invitationId);
    if (!invitation) marketplaceError('CLIENT_NOT_FOUND');
    await this.repository.cancelInvitation(invitationId, actorFromPrincipal(principal), requestId);
  }

  remove(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    participantId: string,
    reason: string
  ): Promise<unknown> {
    return this.participants.remove(principal, requestId, projectId, participantId, reason);
  }

  /**
   * Sends the latest email of a pending step again: the invitation (with its Airs) to a person
   * who has not signed up, or a reminder to the admins for Airs in review. One per item every
   * 10 minutes, recorded in the audit log.
   */
  async resendReport(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    reportId: string
  ): Promise<{ sentTo: 'client' | 'admins' }> {
    await this.participants.authorizeProject(
      principal,
      'participants:manage',
      requestId,
      projectId
    );
    const report = await this.reportRepository.find(reportId);
    if (!report || report.projectId !== projectId) marketplaceError('CLIENT_NOT_FOUND');
    if (report.status !== 'awaiting_claim' && report.status !== 'pending_approval')
      marketplaceError('CLIENT_RESEND_NOT_APPLICABLE');
    await this.guardResend(reportId);

    const clients = await this.compose(projectId);
    const client = clients.find(
      (item) => item.email.toLowerCase() === report.recipientEmail.toLowerCase()
    );
    let sentTo: 'client' | 'admins';
    if (report.status === 'awaiting_claim') {
      const sent = await this.sendInvitation(
        projectId,
        report.recipientEmail,
        client?.name ?? report.recipientName ?? '',
        { amount: report.amount, concept: report.concept }
      );
      if (!sent) marketplaceError('MARKETPLACE_UNAVAILABLE');
      sentTo = 'client';
    } else {
      if (!client) marketplaceError('CLIENT_NOT_FOUND');
      const notified = await this.noticeAdmins(principal, projectId, client, true, report, true);
      if (notified === 0) marketplaceError('CLIENT_RESEND_NOT_APPLICABLE');
      sentTo = 'admins';
    }
    await this.recordResend(principal, requestId, projectId, reportId, sentTo);
    return { sentTo };
  }

  /** Sends a pending invitation again, with the latest Airs still waiting for the person. */
  async resendInvitation(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    invitationId: string
  ): Promise<{ sentTo: 'client' }> {
    await this.participants.authorizeProject(
      principal,
      'participants:manage',
      requestId,
      projectId
    );
    const invitation = await this.repository.findInvitation(projectId, invitationId);
    if (!invitation) marketplaceError('CLIENT_NOT_FOUND');
    if (invitation.status !== 'pending') marketplaceError('CLIENT_INVITATION_NOT_PENDING');
    await this.guardResend(invitationId);
    const waiting = (await this.reportRepository.listForProject(projectId)).find(
      (report) =>
        report.status === 'awaiting_claim' &&
        report.recipientEmail.toLowerCase() === invitation.email.toLowerCase()
    );
    const sent = await this.sendInvitation(
      projectId,
      invitation.email,
      invitation.name,
      waiting ? { amount: waiting.amount, concept: waiting.concept } : null
    );
    if (!sent) marketplaceError('MARKETPLACE_UNAVAILABLE');
    await this.recordResend(principal, requestId, projectId, invitationId, 'client');
    return { sentTo: 'client' };
  }

  private async guardResend(targetId: string): Promise<void> {
    const since = new Date(Date.now() - RESEND_INTERVAL_MS).toISOString();
    if ((await this.repository.countResendsSince(targetId, since)) > 0)
      marketplaceError('CLIENT_RESEND_TOO_SOON');
  }

  private recordResend(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    targetId: string,
    sentTo: 'client' | 'admins'
  ): Promise<void> {
    return this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'client.resend',
      targetType: 'project_client',
      targetId,
      projectId,
      requestId,
      result: 'allowed',
      metadata: { sentTo },
    });
  }

  private async compose(projectId: string): Promise<ProjectClientRecord[]> {
    const [members, invitations, reports] = await Promise.all([
      this.participantRepository.list(projectId, 'active'),
      this.repository.listInvitations(projectId),
      this.reportRepository.listForProject(projectId),
    ]);
    const withProof = await this.repository.proofReportIds(reports.map((report) => report.id));
    const reportsByEmail = new Map<string, ProjectClientReport[]>();
    for (const report of reports) {
      const key = report.recipientEmail.toLowerCase();
      reportsByEmail.set(key, [
        ...(reportsByEmail.get(key) ?? []),
        {
          id: report.id,
          amount: report.amount,
          concept: report.concept,
          status: report.status,
          submittedAt: report.submittedAt,
          hasProof: withProof.has(report.id),
        },
      ]);
    }
    // Invitations arrive newest first, so each email's list keeps that order.
    const invitationsByEmail = new Map<string, ProjectClientInvitationRecord[]>();
    for (const invitation of invitations) {
      const key = invitation.email.toLowerCase();
      invitationsByEmail.set(key, [...(invitationsByEmail.get(key) ?? []), invitation]);
    }
    const history = (email: string): Pick<ProjectClientRecord, 'reports' | 'invitations'> => ({
      reports: reportsByEmail.get(email.toLowerCase()) ?? [],
      invitations: (invitationsByEmail.get(email.toLowerCase()) ?? []).map((invitation) => ({
        id: invitation.id,
        status: invitation.status,
        invitedAt: invitation.invitedAt,
        cancelledAt: invitation.cancelledAt,
        acceptedAt: invitation.acceptedAt,
      })),
    });

    const memberEmails = new Set(members.map((member) => member.email.toLowerCase()));
    const pending: ProjectClientRecord[] = [];
    const cancelled: ProjectClientRecord[] = [];
    invitationsByEmail.forEach((list, email) => {
      if (memberEmails.has(email)) return;
      const open = list.find((invitation) => invitation.status === 'pending');
      // Someone whose invitations were all cancelled stays listed, as a cancelled invitation.
      const latest = open ?? list.find((invitation) => invitation.status === 'cancelled');
      if (!latest) return;
      (open ? pending : cancelled).push({
        id: latest.id,
        kind: open ? 'invitation' : 'cancelled',
        projectId,
        email: latest.email,
        name: latest.name,
        since: latest.invitedAt,
        ...history(email),
      });
    });
    return [
      ...pending,
      ...members.map((member) => ({
        id: member.id,
        kind: 'member' as const,
        projectId,
        email: member.email,
        name: member.displayName,
        since: member.addedAt,
        ...history(member.email),
      })),
      ...cancelled,
    ];
  }

  // The uploaded file must sit in this project's folder; its hash is computed here, not trusted.
  private async checkProof(projectId: string, path: string): Promise<ProjectClientProof> {
    const pattern = new RegExp(`^${projectId}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`);
    if (!pattern.test(path)) marketplaceError('CLIENT_PROOF_INVALID');
    const stored = await this.repository.inspectProof(path);
    if (
      !stored ||
      !AIRS_REPORT_PROOF_TYPES[stored.contentType] ||
      stored.sizeBytes < 1 ||
      stored.sizeBytes > AIRS_REPORT_PROOF_MAX_BYTES
    )
      marketplaceError('CLIENT_PROOF_INVALID');
    return { path, ...stored };
  }

  // Best effort, like the report emails: a failed send never undoes the invitation, but it is
  // logged (without the address) so a missing email can be traced.
  private async sendInvitation(
    projectId: string,
    email: string,
    name: string,
    airs: { amount: number; concept: string } | null
  ): Promise<boolean> {
    try {
      const project = await this.adminRepository.findProject(projectId);
      const sent = await this.send(
        email,
        renderProjectClientInvitationEmail({
          name,
          projectName: project ? projectTitle(project) : null,
          appUrl: resolveAirsReportAppUrl(this.env),
          airs,
        })
      );
      if (!sent) this.logger.warn(`Client invitation email not sent (project ${projectId})`);
      return sent;
    } catch (error) {
      this.logger.warn(
        `Client invitation email failed (project ${projectId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }
}
