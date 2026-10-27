/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  CreateProjectMedalInput,
  ProjectMedalRecord,
  UpdateProjectMedalInput,
} from './medal.types';

type Row = Record<string, unknown>;

function failDatabase(error: { code?: string } | null): never {
  if (error?.code === '23514') marketplaceError('MEDAL_INPUT_INVALID');
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

export function mapProjectMedal(row: Row): ProjectMedalRecord {
  return {
    id: String(row.id ?? ''),
    projectId: String(row.project_id ?? ''),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    imageUrl: String(row.image_url ?? ''),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ''),
  };
}

@Injectable()
export class MedalRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async list(projectId: string, activeOnly: boolean): Promise<ProjectMedalRecord[]> {
    let query = this.client
      .from('project_medals')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapProjectMedal);
  }

  async find(projectId: string, medalId: string): Promise<ProjectMedalRecord | null> {
    const { data, error } = await this.client
      .from('project_medals')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', medalId)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProjectMedal(data as Row) : null;
  }

  async create(
    projectId: string,
    input: CreateProjectMedalInput,
    actor: { issuer: string; subject: string }
  ): Promise<ProjectMedalRecord> {
    const { data, error } = await this.client
      .from('project_medals')
      .insert({
        project_id: projectId,
        name: input.name,
        description: input.description ?? null,
        image_url: input.imageUrl,
        sort_order: input.sortOrder ?? 100,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error);
    return mapProjectMedal(data as Row);
  }

  async update(
    projectId: string,
    medalId: string,
    input: UpdateProjectMedalInput
  ): Promise<ProjectMedalRecord | null> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    const { data, error } = await this.client
      .from('project_medals')
      .update(patch)
      .eq('project_id', projectId)
      .eq('id', medalId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProjectMedal(data as Row) : null;
  }
}
