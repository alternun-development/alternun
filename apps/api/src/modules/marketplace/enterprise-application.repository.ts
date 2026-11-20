/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  EnterpriseApplicationInput,
  EnterpriseApplicationRecord,
  EnterpriseApplicationSubmitResult,
} from './enterprise-application.types';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function nullable(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function mapApplication(value: unknown): EnterpriseApplicationRecord | undefined {
  const row = record(value);
  if (!text(row.id)) return undefined;
  return {
    id: text(row.id),
    companyName: text(row.company_name),
    legalName: nullable(row.legal_name),
    sector: text(row.sector),
    location: text(row.location),
    websiteUrl: nullable(row.website_url),
    companySize: nullable(row.company_size) as EnterpriseApplicationRecord['companySize'],
    offer: text(row.offer),
    interest: nullable(row.interest),
    contactName: text(row.contact_name),
    contactRole: nullable(row.contact_role),
    contactEmail: text(row.contact_email),
    contactPhone: nullable(row.contact_phone),
    language: text(row.language) as EnterpriseApplicationRecord['language'],
    createdAt: text(row.created_at),
  };
}

@Injectable()
export class EnterpriseApplicationRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async submit(
    input: EnterpriseApplicationInput,
    ipHash: string
  ): Promise<EnterpriseApplicationSubmitResult> {
    // The honeypot never reaches storage.
    const application: Record<string, unknown> = { ...input };
    delete application.faxNumber;
    const { data, error } = await this.client.rpc('marketplace_submit_enterprise_application', {
      p_application: application,
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
    if (!ok && reasonCode === 'ENTERPRISE_APPLICATION_INPUT_INVALID') marketplaceError(reasonCode);
    return {
      ok,
      ...(reasonCode ? { reasonCode } : {}),
      ...(result.application ? { application: mapApplication(result.application) } : {}),
    };
  }
}
