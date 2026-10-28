/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  CreateProjectTypeInput,
  ProjectTypeRecord,
  UpdateProjectTypeInput,
} from './project-type.types';

type Row = Record<string, unknown>;

function failDatabase(error: { code?: string } | null): never {
  if (error?.code === '23505') marketplaceError('PROJECT_TYPE_CONFLICT');
  if (error?.code === '23514') marketplaceError('PROJECT_TYPE_INPUT_INVALID');
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

export function mapProjectType(row: Row): ProjectTypeRecord {
  const labels: Record<string, string> = {};
  if (row.labels && typeof row.labels === 'object' && !Array.isArray(row.labels)) {
    for (const [locale, label] of Object.entries(row.labels as Row)) {
      if (typeof label === 'string') labels[locale] = label;
    }
  }
  return {
    code: String(row.code ?? ''),
    labels,
    requiresDocumentNumber: row.requires_document_number !== false,
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

@Injectable()
export class ProjectTypeRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async list(): Promise<ProjectTypeRecord[]> {
    const { data, error } = await this.client
      .from('project_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapProjectType);
  }

  async find(code: string): Promise<ProjectTypeRecord | null> {
    const { data, error } = await this.client
      .from('project_types')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProjectType(data as Row) : null;
  }

  async create(input: CreateProjectTypeInput): Promise<ProjectTypeRecord> {
    const { data, error } = await this.client
      .from('project_types')
      .insert({
        code: input.code,
        labels: input.labels,
        requires_document_number: input.requiresDocumentNumber,
        sort_order: input.sortOrder ?? 100,
      })
      .select('*')
      .single();
    if (error) failDatabase(error);
    return mapProjectType(data as Row);
  }

  async update(code: string, input: UpdateProjectTypeInput): Promise<ProjectTypeRecord | null> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.labels !== undefined) patch.labels = input.labels;
    if (input.requiresDocumentNumber !== undefined) {
      patch.requires_document_number = input.requiresDocumentNumber;
    }
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    const { data, error } = await this.client
      .from('project_types')
      .update(patch)
      .eq('code', code)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProjectType(data as Row) : null;
  }

  /** Sets (or clears) the type of one project. Returns false when the project does not exist. */
  async setProjectType(projectId: string, code: string | null): Promise<boolean> {
    const { data, error } = await this.client
      .from('projects')
      .update({ project_type_code: code })
      .eq('id', projectId)
      .select('id')
      .maybeSingle();
    if (error) failDatabase(error);
    return !!data;
  }
}
