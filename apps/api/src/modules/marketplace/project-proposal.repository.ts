/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  ProjectProposalInput,
  ProjectProposalRecord,
  ProjectProposalSubmitResult,
} from './project-proposal.types';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapProposal(value: unknown): ProjectProposalRecord | undefined {
  const row = record(value);
  if (!text(row.id)) return undefined;
  return {
    id: text(row.id),
    projectName: text(row.project_name),
    location: text(row.location),
    category: text(row.category) as ProjectProposalRecord['category'],
    message: typeof row.message === 'string' ? row.message : null,
    contactEmail: text(row.contact_email),
    contactName: text(row.contact_name),
    language: text(row.language) as ProjectProposalRecord['language'],
    status: text(row.status) as ProjectProposalRecord['status'],
    createdAt: text(row.created_at),
  };
}

@Injectable()
export class ProjectProposalRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async submit(input: ProjectProposalInput, ipHash: string): Promise<ProjectProposalSubmitResult> {
    const { data, error } = await this.client.rpc('marketplace_submit_project_proposal', {
      p_project_name: input.projectName,
      p_location: input.location,
      p_category: input.category,
      p_message: input.message ?? null,
      p_contact_email: input.contactEmail,
      p_contact_name: input.contactName,
      p_language: input.language,
      p_ip_hash: ipHash,
    });

    if (error) {
      throw new MarketplaceApiError(
        'MARKETPLACE_UNAVAILABLE',
        'Marketplace storage is unavailable.'
      );
    }

    const result = record(data);
    const ok = result.ok === true;
    const reasonCode = text(result.reasonCode);
    if (!ok && reasonCode === 'PROJECT_PROPOSAL_INPUT_INVALID') {
      marketplaceError(reasonCode);
    }

    return {
      ok,
      ...(reasonCode ? { reasonCode } : {}),
      ...(result.proposal ? { proposal: mapProposal(result.proposal) } : {}),
    };
  }
}
