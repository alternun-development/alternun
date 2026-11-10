import { Inject, Injectable, Logger } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { marketplaceError } from './marketplace.errors';
import { EnterpriseApplicationRepository } from './enterprise-application.repository';
import {
  createIpHash,
  escapeHtml,
  PROJECT_PROPOSAL_EMAIL_SENDER,
} from './project-proposal.service';
import type { ProjectProposalEmailSender } from './project-proposal.types';
import type {
  EnterpriseApplicationInput,
  EnterpriseApplicationRecord,
} from './enterprise-application.types';

/** Internal notification for the Alternun team (Spanish, like the team's other alerts). */
export function buildEnterpriseApplicationEmail(application: EnterpriseApplicationRecord) {
  const fields: Array<[string, string | null]> = [
    ['Empresa', application.companyName],
    ['Razón social', application.legalName],
    ['Sector', application.sector],
    ['Ciudad y país', application.location],
    ['Sitio web', application.websiteUrl],
    ['Tamaño', application.companySize],
    ['Productos o servicios con Airs', application.offer],
    ['Causa o proyecto de interés', application.interest],
    ['Contacto', application.contactName],
    ['Cargo', application.contactRole],
    ['Correo', application.contactEmail],
    ['Teléfono', application.contactPhone],
    ['Idioma', application.language],
  ];
  const filled = fields.filter((field): field is [string, string] => !!field[1]);
  const intro = 'Una empresa pidió unirse a Airs desde Explorar.';
  return {
    subject: `Nueva inscripción de empresa: ${application.companyName}`,
    text: [intro, '', ...filled.map(([label, value]) => `${label}: ${value}`)].join('\n'),
    html: `<p>${escapeHtml(intro)}</p><dl>${filled
      .map(
        ([label, value]) =>
          `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`
      )
      .join('')}</dl>`,
  };
}

@Injectable()
export class EnterpriseApplicationService {
  private readonly logger = new Logger(EnterpriseApplicationService.name);

  constructor(
    private readonly repository: EnterpriseApplicationRepository,
    @Inject(PROJECT_PROPOSAL_EMAIL_SENDER)
    private readonly emailSender: ProjectProposalEmailSender
  ) {}

  async submit(
    input: EnterpriseApplicationInput,
    ipAddress: string,
    env: Record<string, string | undefined> = process.env
  ): Promise<{ accepted: true }> {
    // Bots that fill the hidden field get the same answer, but nothing is stored.
    if (input.faxNumber?.trim()) return { accepted: true };
    const result = await this.repository.submit(input, createIpHash(ipAddress, env));
    if (!result.ok) marketplaceError(result.reasonCode ?? 'MARKETPLACE_UNAVAILABLE');
    if (!result.application) marketplaceError('MARKETPLACE_UNAVAILABLE');
    await this.notify(result.application, env);
    return { accepted: true };
  }

  private async notify(
    application: EnterpriseApplicationRecord,
    env: Record<string, string | undefined>
  ): Promise<void> {
    const destination = env.MARKETPLACE_CONTACT_EMAIL?.trim();
    if (!destination || !isEmail(destination)) {
      this.logger.warn(
        'Marketplace contact email is not configured; enterprise application notification skipped.'
      );
      return;
    }
    try {
      await this.emailSender(
        {
          to: destination,
          replyTo: application.contactEmail,
          email: buildEnterpriseApplicationEmail(application),
        },
        env
      );
    } catch {
      this.logger.warn(
        'Enterprise application notification failed after the application was stored.'
      );
    }
  }
}
