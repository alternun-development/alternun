import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTranslator } from '@alternun/i18n';
import { isEmail } from 'class-validator';
import { marketplaceError } from './marketplace.errors';
import { ProjectProposalRepository } from './project-proposal.repository';
import type {
  ProjectProposalEmailSender,
  ProjectProposalInput,
  ProjectProposalRecord,
} from './project-proposal.types';

export const PROJECT_PROPOSAL_EMAIL_SENDER = Symbol('PROJECT_PROPOSAL_EMAIL_SENDER');

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}

function createIpHash(ipAddress: string, env: Record<string, string | undefined>): string {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) marketplaceError('MARKETPLACE_UNAVAILABLE');
  return createHmac('sha256', secret)
    .update(ipAddress || 'unknown')
    .digest('hex');
}

export function buildProjectProposalEmail(proposal: ProjectProposalRecord) {
  const translator = createTranslator({ locale: proposal.language, namespace: 'shared' });
  const t = translator.t;
  const category = t(`projectProposalEmail.categories.${proposal.category}`);
  const fields = [
    [t('projectProposalEmail.projectName'), proposal.projectName],
    [t('projectProposalEmail.location'), proposal.location],
    [t('projectProposalEmail.category'), category],
    [t('projectProposalEmail.contactName'), proposal.contactName],
    [t('projectProposalEmail.contactEmail'), proposal.contactEmail],
    [t('projectProposalEmail.language'), proposal.language],
    ...(proposal.message
      ? [[t('projectProposalEmail.message'), proposal.message] as [string, string]]
      : []),
  ];
  const text = [
    t('projectProposalEmail.intro'),
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
  const html = `<p>${escapeHtml(t('projectProposalEmail.intro'))}</p><dl>${fields
    .map(
      ([label, value]) =>
        `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`
    )
    .join('')}</dl>`;

  return {
    subject: t('projectProposalEmail.subject'),
    text,
    html,
  };
}

@Injectable()
export class ProjectProposalService {
  private readonly logger = new Logger(ProjectProposalService.name);

  constructor(
    private readonly repository: ProjectProposalRepository,
    @Inject(PROJECT_PROPOSAL_EMAIL_SENDER)
    private readonly emailSender: ProjectProposalEmailSender
  ) {}

  async submit(
    input: ProjectProposalInput,
    ipAddress: string,
    env: Record<string, string | undefined> = process.env
  ): Promise<{ accepted: true }> {
    if (input.website?.trim()) {
      return { accepted: true };
    }

    const result = await this.repository.submit(input, createIpHash(ipAddress, env));
    if (!result.ok) {
      marketplaceError(result.reasonCode ?? 'MARKETPLACE_UNAVAILABLE');
    }
    if (!result.proposal) marketplaceError('MARKETPLACE_UNAVAILABLE');

    await this.notifyContact(result.proposal, env);
    return { accepted: true };
  }

  private async notifyContact(
    proposal: ProjectProposalRecord,
    env: Record<string, string | undefined>
  ): Promise<void> {
    const destination = env.MARKETPLACE_CONTACT_EMAIL?.trim();
    if (!destination || !isEmail(destination)) {
      this.logger.warn(
        'Marketplace contact email is not configured; project proposal notification skipped.'
      );
      return;
    }

    try {
      const result = await this.emailSender(
        {
          to: destination,
          replyTo: proposal.contactEmail,
          email: buildProjectProposalEmail(proposal),
        },
        env
      );
      if (result.skipped) {
        this.logger.warn(
          'Project proposal notification skipped because transactional email is not configured.'
        );
      }
    } catch {
      this.logger.warn('Project proposal notification failed after the proposal was stored.');
    }
  }
}
