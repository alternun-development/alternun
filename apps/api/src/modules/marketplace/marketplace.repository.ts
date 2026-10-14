/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import type {
  AdminActor,
  AuditInput,
  EnterpriseRecord,
  MediaKind,
  ProjectContent,
  ProjectMediaRecord,
  ProjectRecord,
  ProjectStatus,
} from './marketplace.types';

export const MARKETPLACE_SUPABASE = Symbol('MARKETPLACE_SUPABASE');

export interface MarketplaceSupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export function resolveMarketplaceSupabaseConfig(
  env: Record<string, string | undefined> = process.env
): MarketplaceSupabaseConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

export function createMarketplaceSupabaseClient(
  env: Record<string, string | undefined> = process.env
): SupabaseClient {
  const config = resolveMarketplaceSupabaseConfig(env);
  if (!config) {
    throw new Error(
      'Marketplace requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; public keys are not accepted.'
    );
  }
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}
function rowArray(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object')
    : [];
}

function mapEnterprise(row: Row): EnterpriseRecord {
  return {
    id: text(row.id),
    slug: text(row.slug),
    displayName: text(row.display_name),
    legalName: nullableText(row.legal_name),
    status: text(row.status) as EnterpriseRecord['status'],
    countryCode: nullableText(row.country_code),
    websiteUrl: nullableText(row.website_url),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function primaryEnterpriseId(row: Row): string {
  return (
    text(row.enterprise_id) ||
    text(rowArray(row.enterprise_projects).find((item) => item.is_primary)?.enterprise_id)
  );
}

function mapProject(row: Row): ProjectRecord {
  const relationships = rowArray(row.enterprise_projects);
  const media = rowArray(row.project_media).map(mapMedia);
  return {
    id: text(row.id),
    enterpriseId: primaryEnterpriseId(row),
    slug: text(row.slug),
    status: text(row.status) as ProjectStatus,
    categoryCode: text(row.category_code),
    countryCode: nullableText(row.country_code),
    timeZone: text(row.time_zone),
    defaultLocale: text(row.default_locale),
    content: record(row.content) as ProjectContent,
    firstPublishedAt: nullableText(row.first_published_at),
    publishedAt: nullableText(row.published_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    enterprises: relationships.map((relationship) => ({
      enterpriseId: text(relationship.enterprise_id),
      projectId: text(relationship.project_id) || text(row.id),
      relation: text(relationship.relation),
      isPrimary: relationship.is_primary === true,
      createdAt: text(relationship.created_at),
    })),
    media,
    createdBy: { issuer: text(row.created_by_issuer), subject: text(row.created_by_subject) },
    updatedBy: { issuer: text(row.updated_by_issuer), subject: text(row.updated_by_subject) },
  };
}

function mapMedia(row: Row): ProjectMediaRecord {
  return {
    id: text(row.id),
    projectId: text(row.project_id),
    kind: text(row.kind) as MediaKind,
    url: text(row.url),
    embedUrl: nullableText(row.embed_url),
    altText: record(row.alt_text) as Record<string, string>,
    caption: record(row.caption) as Record<string, string>,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active === true,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function failDatabase(
  error: { code?: string; message?: string } | null,
  conflictCode?: string
): never {
  if (error?.code === '23505' && conflictCode) marketplaceError(conflictCode);
  if (error?.message?.includes('PROJECT_SLUG_IMMUTABLE'))
    marketplaceError('PROJECT_SLUG_IMMUTABLE');
  if (error?.message?.includes('MEDIA_HOST_NOT_ALLOWED'))
    marketplaceError('MEDIA_HOST_NOT_ALLOWED');
  if (error?.message?.includes('MEDIA_ALT_REQUIRED')) marketplaceError('MEDIA_ALT_REQUIRED');
  if (error?.message?.includes('MEDIA_URL_INVALID')) marketplaceError('MEDIA_URL_INVALID');
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

@Injectable()
export class MarketplacePublicRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async listPublished(categoryCode?: string): Promise<
    Array<{
      project: ProjectRecord;
      enterprise: EnterpriseRecord;
      media: ProjectMediaRecord[];
    }>
  > {
    let query = this.client
      .from('projects')
      .select('*, enterprise_projects!inner(*, enterprises!inner(*)), project_media(*)')
      .eq('status', 'published')
      .eq('enterprise_projects.is_primary', true)
      .eq('project_media.is_active', true)
      .order('published_at', { ascending: false });
    if (categoryCode) query = query.eq('category_code', categoryCode);
    const { data, error } = await query;
    if (error) failDatabase(error);
    return rowArray(data).map((row) => {
      const relation = rowArray(row.enterprise_projects)[0] ?? {};
      return {
        project: mapProject(row),
        enterprise: mapEnterprise(record(relation.enterprises)),
        media: rowArray(row.project_media).map(mapMedia),
      };
    });
  }

  async findPublishedBySlug(slug: string): Promise<{
    project: ProjectRecord;
    enterprise: EnterpriseRecord;
    media: ProjectMediaRecord[];
  } | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*, enterprise_projects!inner(*, enterprises!inner(*)), project_media(*)')
      .eq('status', 'published')
      .eq('slug', slug)
      .eq('enterprise_projects.is_primary', true)
      .eq('project_media.is_active', true)
      .maybeSingle();
    if (error) failDatabase(error);
    if (!data) return null;
    const row = data as Row;
    const relation = rowArray(row.enterprise_projects)[0] ?? {};
    return {
      project: mapProject(row),
      enterprise: mapEnterprise(record(relation.enterprises)),
      media: rowArray(row.project_media).map(mapMedia),
    };
  }
}

@Injectable()
export class MarketplaceAdminRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async audit(input: AuditInput): Promise<void> {
    const { error } = await this.client.from('admin_audit_log').insert({
      actor_issuer: input.actor?.issuer ?? null,
      actor_subject: input.actor?.subject ?? null,
      actor_roles: input.actor?.roles ?? [],
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      enterprise_id: input.enterpriseId ?? null,
      project_id: input.projectId ?? null,
      request_id: input.requestId ?? null,
      result: input.result,
      reason_code: input.reasonCode ?? null,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) failDatabase(error);
  }

  async listEnterprises(enterpriseIds?: readonly string[]): Promise<EnterpriseRecord[]> {
    let query = this.client.from('enterprises').select('*').order('display_name');
    if (enterpriseIds) query = query.in('id', [...enterpriseIds]);
    const { data, error } = await query;
    if (error) failDatabase(error);
    return rowArray(data).map(mapEnterprise);
  }

  async findEnterprise(id: string): Promise<EnterpriseRecord | null> {
    const { data, error } = await this.client
      .from('enterprises')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapEnterprise(data as Row) : null;
  }

  async createEnterprise(input: Row, actor: AdminActor): Promise<EnterpriseRecord> {
    const { data, error } = await this.client
      .from('enterprises')
      .insert({
        slug: input.slug,
        display_name: input.displayName,
        legal_name: input.legalName ?? null,
        country_code: input.countryCode ?? null,
        website_url: input.websiteUrl ?? null,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error, 'ENTERPRISE_SLUG_CONFLICT');
    return mapEnterprise(data as Row);
  }

  async updateEnterprise(id: string, input: Row, actor: AdminActor): Promise<EnterpriseRecord> {
    const values: Row = { updated_by_issuer: actor.issuer, updated_by_subject: actor.subject };
    if ('slug' in input) values.slug = input.slug;
    if ('displayName' in input) values.display_name = input.displayName;
    if ('legalName' in input) values.legal_name = input.legalName;
    if ('countryCode' in input) values.country_code = input.countryCode;
    if ('websiteUrl' in input) values.website_url = input.websiteUrl;
    const { data, error } = await this.client
      .from('enterprises')
      .update(values)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error, 'ENTERPRISE_SLUG_CONFLICT');
    if (!data) marketplaceError('ENTERPRISE_NOT_FOUND');
    return mapEnterprise(data as Row);
  }

  async listProjects(enterpriseIds?: readonly string[]): Promise<ProjectRecord[]> {
    let query = this.client
      .from('projects')
      .select('*, enterprise_projects!inner(*), project_media(*)')
      .eq('enterprise_projects.is_primary', true)
      .order('created_at', { ascending: false });
    if (enterpriseIds) query = query.in('enterprise_projects.enterprise_id', [...enterpriseIds]);
    const { data, error } = await query;
    if (error) failDatabase(error);
    return rowArray(data).map(mapProject);
  }

  async findProject(id: string): Promise<ProjectRecord | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*, enterprise_projects!inner(*), project_media(*)')
      .eq('id', id)
      .eq('enterprise_projects.is_primary', true)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProject(data as Row) : null;
  }

  async createProject(input: Row, actor: AdminActor): Promise<ProjectRecord> {
    const { data, error } = await this.client
      .from('projects')
      .insert({
        slug: input.slug,
        status: 'draft',
        category_code: input.categoryCode,
        country_code: input.countryCode ?? null,
        time_zone: input.timeZone,
        default_locale: input.defaultLocale,
        content: input.content,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error, 'PROJECT_SLUG_CONFLICT');
    const project = mapProject({ ...(data as Row), enterprise_id: input.enterpriseId });
    const relation = await this.client.from('enterprise_projects').insert({
      enterprise_id: input.enterpriseId,
      project_id: project.id,
      relation: 'owner',
      is_primary: true,
      created_by_issuer: actor.issuer,
      created_by_subject: actor.subject,
    });
    if (relation.error) failDatabase(relation.error);
    project.enterprises = [
      {
        enterpriseId: text(input.enterpriseId),
        projectId: project.id,
        relation: 'owner',
        isPrimary: true,
        createdAt: project.createdAt,
      },
    ];
    project.media = [];
    return project;
  }

  async updateProject(id: string, input: Row, actor: AdminActor): Promise<ProjectRecord> {
    const values: Row = { updated_by_issuer: actor.issuer, updated_by_subject: actor.subject };
    for (const [camel, snake] of Object.entries({
      slug: 'slug',
      categoryCode: 'category_code',
      countryCode: 'country_code',
      timeZone: 'time_zone',
      defaultLocale: 'default_locale',
      content: 'content',
    })) {
      if (camel in input) values[snake] = input[camel];
    }
    const { data, error } = await this.client
      .from('projects')
      .update(values)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error, 'PROJECT_SLUG_CONFLICT');
    if (!data) marketplaceError('PROJECT_NOT_FOUND');
    const existing = await this.findProject(id);
    return existing ?? mapProject(data as Row);
  }

  async categoryExists(code: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('project_categories')
      .select('code')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (error) failDatabase(error);
    return !!data;
  }

  async transitionProject(
    projectId: string,
    targetStatus: ProjectStatus,
    actor: AdminActor,
    requestId: string,
    reason?: string
  ): Promise<{ ok: boolean; reasonCode?: string; idempotent?: boolean; project?: Row }> {
    const { data, error } = await this.client.rpc('marketplace_transition_project_status', {
      p_project_id: projectId,
      p_target_status: targetStatus,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (error) failDatabase(error);
    return record(data) as {
      ok: boolean;
      reasonCode?: string;
      idempotent?: boolean;
      project?: Row;
    };
  }

  async listMedia(projectId: string): Promise<ProjectMediaRecord[]> {
    const { data, error } = await this.client
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('id');
    if (error) failDatabase(error);
    return rowArray(data).map(mapMedia);
  }

  async allowedHosts(kind: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('project_media_allowed_hosts')
      .select('host')
      .eq('media_kind', kind);
    if (error) failDatabase(error);
    return rowArray(data).map((row) => text(row.host));
  }

  async findMedia(projectId: string, mediaId: string): Promise<ProjectMediaRecord | null> {
    const { data, error } = await this.client
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', mediaId)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapMedia(data as Row) : null;
  }

  async createMedia(projectId: string, input: Row, actor: AdminActor): Promise<ProjectMediaRecord> {
    const { data, error } = await this.client
      .from('project_media')
      .insert({
        project_id: projectId,
        kind: input.kind,
        url: input.url,
        embed_url: input.embedUrl ?? null,
        alt_text: input.altText ?? {},
        caption: input.caption ?? {},
        sort_order: input.sortOrder ?? 0,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error, 'MEDIA_KIND_CONFLICT');
    return mapMedia(data as Row);
  }

  async updateMedia(
    projectId: string,
    mediaId: string,
    input: Row,
    actor: AdminActor
  ): Promise<ProjectMediaRecord> {
    const values: Row = { updated_by_issuer: actor.issuer, updated_by_subject: actor.subject };
    for (const [camel, snake] of Object.entries({
      kind: 'kind',
      url: 'url',
      embedUrl: 'embed_url',
      altText: 'alt_text',
      caption: 'caption',
      sortOrder: 'sort_order',
      isActive: 'is_active',
    }))
      if (camel in input) values[snake] = input[camel];
    const { data, error } = await this.client
      .from('project_media')
      .update(values)
      .eq('project_id', projectId)
      .eq('id', mediaId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error, 'MEDIA_KIND_CONFLICT');
    if (!data) marketplaceError('MEDIA_NOT_FOUND');
    return mapMedia(data as Row);
  }

  async reorderMedia(
    projectId: string,
    items: Array<{ id: string; sortOrder: number }>,
    actor: AdminActor
  ): Promise<ProjectMediaRecord[]> {
    for (const item of items)
      await this.updateMedia(projectId, item.id, { sortOrder: item.sortOrder }, actor);
    return this.listMedia(projectId);
  }
}
