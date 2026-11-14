/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import type {
  AdminActor,
  AuditInput,
  EnterpriseProductRecord,
  EnterpriseRecord,
  MediaKind,
  ProjectContent,
  ProjectMediaRecord,
  ProjectMembershipScope,
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
function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
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
    sortOrder: Number(row.sort_order ?? 0),
    kind: (text(row.kind) || 'company') as EnterpriseRecord['kind'],
    sector: nullableText(row.sector),
    description: nullableText(row.description),
    partnershipStatus: (text(row.partnership_status) ||
      'in_conversation') as EnterpriseRecord['partnershipStatus'],
    location: record(row.location),
    publicContact: record(row.public_contact),
    logoUrl: nullableText(row.logo_url),
    bannerUrl: nullableText(row.banner_url),
    eventDetails: record(row.event_details),
    sites: rowArray(row.sites) as unknown as EnterpriseRecord['sites'],
    internalContacts: rowArray(
      row.internal_contacts
    ) as unknown as EnterpriseRecord['internalContacts'],
    pendingItems: stringArray(row.pending_items),
    internalNotes: nullableText(row.internal_notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapProduct(row: Row): EnterpriseProductRecord {
  return {
    id: text(row.id),
    enterpriseId: text(row.enterprise_id),
    name: text(row.name),
    description: nullableText(row.description),
    airsMin: nullableNumber(row.airs_min),
    airsMax: nullableNumber(row.airs_max),
    airsNote: nullableText(row.airs_note),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active === true,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

// Writable enterprise columns, keyed by their API (camelCase) name.
const ENTERPRISE_COLUMNS: Record<string, string> = {
  slug: 'slug',
  displayName: 'display_name',
  legalName: 'legal_name',
  countryCode: 'country_code',
  websiteUrl: 'website_url',
  kind: 'kind',
  sector: 'sector',
  description: 'description',
  partnershipStatus: 'partnership_status',
  location: 'location',
  publicContact: 'public_contact',
  logoUrl: 'logo_url',
  bannerUrl: 'banner_url',
  eventDetails: 'event_details',
  sites: 'sites',
  internalContacts: 'internal_contacts',
  pendingItems: 'pending_items',
  internalNotes: 'internal_notes',
};

// Profile columns of a project that live outside the localized `content` (and its RPC).
const PROJECT_PROFILE_COLUMNS: Record<string, string> = {
  alternateName: 'alternate_name',
  partnershipStatus: 'partnership_status',
  locationDetails: 'location_details',
  publicContact: 'public_contact',
  internalContacts: 'internal_contacts',
  pendingItems: 'pending_items',
  internalNotes: 'internal_notes',
};

const PRODUCT_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  airsMin: 'airs_min',
  airsMax: 'airs_max',
  airsNote: 'airs_note',
  sortOrder: 'sort_order',
  isActive: 'is_active',
};

function pickColumns(input: Row, columns: Record<string, string>): Row {
  const values: Row = {};
  for (const [camel, snake] of Object.entries(columns))
    if (camel in input) values[snake] = input[camel];
  return values;
}

function primaryEnterpriseId(row: Row): string {
  return (
    text(row.enterprise_id) ||
    text(rowArray(row.enterprise_projects).find((item) => item.is_primary)?.enterprise_id)
  );
}

function mapProject(row: Row): ProjectRecord {
  // The list query filters `enterprise_projects` to the primary owner; `related_enterprises` keeps
  // every relationship so callers can see all enterprises tied to the project.
  const relationships = rowArray(row.related_enterprises ?? row.enterprise_projects);
  const media = rowArray(row.project_media).map(mapMedia);
  return {
    id: text(row.id),
    enterpriseId: primaryEnterpriseId(row),
    slug: text(row.slug),
    status: text(row.status) as ProjectStatus,
    categoryCode: text(row.category_code),
    projectTypeCode: nullableText(row.project_type_code),
    requiresDocumentNumber: record(row.project_types).requires_document_number !== false,
    countryCode: nullableText(row.country_code),
    timeZone: text(row.time_zone),
    defaultLocale: text(row.default_locale),
    content: record(row.content) as ProjectContent,
    firstPublishedAt: nullableText(row.first_published_at),
    publishedAt: nullableText(row.published_at),
    sortOrder: Number(row.sort_order ?? 0),
    alternateName: nullableText(row.alternate_name),
    partnershipStatus: (text(row.partnership_status) ||
      'structuring') as ProjectRecord['partnershipStatus'],
    locationDetails: record(row.location_details),
    publicContact: record(row.public_contact),
    internalContacts: rowArray(
      row.internal_contacts
    ) as unknown as ProjectRecord['internalContacts'],
    pendingItems: stringArray(row.pending_items),
    internalNotes: nullableText(row.internal_notes),
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

function mapMembershipScope(row: Row): ProjectMembershipScope {
  return {
    enterpriseId: text(row.enterprise_id),
    projectId: nullableText(row.project_id),
    scopeType: text(row.scope_type) as ProjectMembershipScope['scopeType'],
    role: text(row.role),
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
      .order('sort_order')
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

  /** Non-primary enterprises (sponsors, partners, operators) related to the given projects. */
  async listAffiliations(
    projectIds: readonly string[]
  ): Promise<Array<{ projectId: string; enterprise: EnterpriseRecord }>> {
    if (projectIds.length === 0) return [];
    const { data, error } = await this.client
      .from('enterprise_projects')
      .select('project_id, enterprises!inner(*)')
      .eq('is_primary', false)
      .in('project_id', [...projectIds]);
    if (error) failDatabase(error);
    return rowArray(data).map((row) => ({
      projectId: text(row.project_id),
      enterprise: mapEnterprise(record(row.enterprises)),
    }));
  }

  async listActiveProducts(enterpriseIds: readonly string[]): Promise<EnterpriseProductRecord[]> {
    if (enterpriseIds.length === 0) return [];
    const { data, error } = await this.client
      .from('enterprise_products')
      .select('*')
      .eq('is_active', true)
      .in('enterprise_id', [...enterpriseIds])
      .order('sort_order')
      .order('id');
    if (error) failDatabase(error);
    return rowArray(data).map(mapProduct);
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

  async actorHasScope(
    actor: AdminActor,
    roles: readonly string[],
    enterpriseId: string,
    projectId: string | null,
    requiredRoles: readonly string[]
  ): Promise<boolean> {
    try {
      const { data, error } = await this.client.rpc('marketplace_actor_has_scope', {
        p_member_issuer: actor.issuer,
        p_member_subject: actor.subject,
        p_roles: [...roles],
        p_enterprise_id: enterpriseId,
        p_project_id: projectId,
        p_required_roles: [...requiredRoles],
      });
      return !error && data === true;
    } catch {
      return false;
    }
  }

  async listActorMemberships(actor: AdminActor): Promise<ProjectMembershipScope[]> {
    if (actor.roles.length === 0) return [];
    const { data, error } = await this.client
      .from('project_memberships')
      .select('enterprise_id, project_id, scope_type, role')
      .eq('member_issuer', actor.issuer)
      .eq('member_subject', actor.subject)
      .eq('status', 'active')
      .in('role', [...actor.roles]);
    if (error) failDatabase(error);
    return rowArray(data).map(mapMembershipScope);
  }

  async listEnterprises(enterpriseIds?: readonly string[]): Promise<EnterpriseRecord[]> {
    if (enterpriseIds?.length === 0) return [];
    let query = this.client
      .from('enterprises')
      .select('*')
      .order('sort_order')
      .order('display_name');
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
        ...pickColumns(input, ENTERPRISE_COLUMNS),
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
    const values: Row = {
      ...pickColumns(input, ENTERPRISE_COLUMNS),
      updated_by_issuer: actor.issuer,
      updated_by_subject: actor.subject,
    };
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

  async listProducts(enterpriseId: string): Promise<EnterpriseProductRecord[]> {
    const { data, error } = await this.client
      .from('enterprise_products')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('sort_order')
      .order('id');
    if (error) failDatabase(error);
    return rowArray(data).map(mapProduct);
  }

  async createProduct(
    enterpriseId: string,
    input: Row,
    actor: AdminActor
  ): Promise<EnterpriseProductRecord> {
    const { data, error } = await this.client
      .from('enterprise_products')
      .insert({
        ...pickColumns(input, PRODUCT_COLUMNS),
        enterprise_id: enterpriseId,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error);
    return mapProduct(data as Row);
  }

  async updateProduct(
    enterpriseId: string,
    productId: string,
    input: Row,
    actor: AdminActor
  ): Promise<EnterpriseProductRecord> {
    const { data, error } = await this.client
      .from('enterprise_products')
      .update({
        ...pickColumns(input, PRODUCT_COLUMNS),
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .eq('enterprise_id', enterpriseId)
      .eq('id', productId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    if (!data) marketplaceError('PRODUCT_NOT_FOUND');
    return mapProduct(data as Row);
  }

  async deleteProduct(enterpriseId: string, productId: string): Promise<void> {
    const { data, error } = await this.client
      .from('enterprise_products')
      .delete()
      .eq('enterprise_id', enterpriseId)
      .eq('id', productId)
      .select('id');
    if (error) failDatabase(error);
    if (rowArray(data).length === 0) marketplaceError('PRODUCT_NOT_FOUND');
  }

  async updateProjectProfile(id: string, input: Row, actor: AdminActor): Promise<void> {
    const { data, error } = await this.client
      .from('projects')
      .update({
        ...pickColumns(input, PROJECT_PROFILE_COLUMNS),
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .eq('id', id)
      .select('id');
    if (error) failDatabase(error);
    if (rowArray(data).length === 0) marketplaceError('PROJECT_NOT_FOUND');
  }

  async linkEnterprise(
    projectId: string,
    enterpriseId: string,
    relation: string,
    actor: AdminActor
  ): Promise<void> {
    const { error } = await this.client.from('enterprise_projects').upsert(
      {
        project_id: projectId,
        enterprise_id: enterpriseId,
        relation,
        is_primary: false,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
      },
      { onConflict: 'enterprise_id,project_id' }
    );
    if (error) failDatabase(error);
  }

  async unlinkEnterprise(projectId: string, enterpriseId: string): Promise<void> {
    const { data, error } = await this.client
      .from('enterprise_projects')
      .delete()
      .eq('project_id', projectId)
      .eq('enterprise_id', enterpriseId)
      .eq('is_primary', false)
      .select('enterprise_id');
    if (error) failDatabase(error);
    if (rowArray(data).length === 0) marketplaceError('ENTERPRISE_NOT_FOUND');
  }

  async createSignedUpload(
    bucket: string,
    path: string
  ): Promise<{ uploadUrl: string; token: string; path: string; publicUrl: string }> {
    const storage = this.client.storage.from(bucket);
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error ?? !data) failDatabase({ message: error?.message });
    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: storage.getPublicUrl(data.path).data.publicUrl,
    };
  }

  async ensureAllowedHost(kinds: readonly string[], host: string): Promise<void> {
    const { error } = await this.client.from('project_media_allowed_hosts').upsert(
      kinds.map((media_kind) => ({ media_kind, host })),
      { onConflict: 'media_kind,host', ignoreDuplicates: true }
    );
    if (error) failDatabase(error);
  }

  async setEnterpriseStatus(
    enterpriseId: string,
    targetStatus: EnterpriseRecord['status'],
    actor: AdminActor,
    requestId: string,
    reason?: string
  ): Promise<EnterpriseRecord> {
    const { data, error } = await this.client.rpc('marketplace_set_enterprise_status', {
      p_enterprise_id: enterpriseId,
      p_target_status: targetStatus,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'VALIDATION_FAILED');
    return mapEnterprise(record(result.enterprise));
  }

  async reorderEnterprises(
    ids: readonly string[],
    actor: AdminActor,
    requestId: string
  ): Promise<void> {
    const { data, error } = await this.client.rpc('marketplace_reorder_enterprises', {
      p_ids: [...ids],
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'SORT_ORDER_INVALID');
  }

  async reorderProjects(
    ids: readonly string[],
    actor: AdminActor,
    requestId: string
  ): Promise<void> {
    const { data, error } = await this.client.rpc('marketplace_reorder_projects', {
      p_ids: [...ids],
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'SORT_ORDER_INVALID');
  }

  async listProjects(scope?: {
    enterpriseIds: readonly string[];
    projectIds: readonly string[];
  }): Promise<ProjectRecord[]> {
    const select =
      '*, enterprise_projects!inner(*), related_enterprises:enterprise_projects(*), project_media(*)';
    if (!scope) {
      const { data, error } = await this.client
        .from('projects')
        .select(select)
        .eq('enterprise_projects.is_primary', true)
        .order('sort_order')
        .order('created_at', { ascending: false });
      if (error) failDatabase(error);
      return rowArray(data).map(mapProject);
    }

    const rows: Row[] = [];
    if (scope.enterpriseIds.length > 0) {
      const { data, error } = await this.client
        .from('projects')
        .select(select)
        .eq('enterprise_projects.is_primary', true)
        .in('enterprise_projects.enterprise_id', [...scope.enterpriseIds])
        .order('sort_order')
        .order('created_at', { ascending: false });
      if (error) failDatabase(error);
      rows.push(...rowArray(data));
    }
    if (scope.projectIds.length > 0) {
      const { data, error } = await this.client
        .from('projects')
        .select(select)
        .eq('enterprise_projects.is_primary', true)
        .in('id', [...scope.projectIds])
        .order('sort_order')
        .order('created_at', { ascending: false });
      if (error) failDatabase(error);
      rows.push(...rowArray(data));
    }

    const seen = new Set<string>();
    return rows
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
          text(b.created_at).localeCompare(text(a.created_at))
      )
      .filter((row) => {
        const id = text(row.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(mapProject);
  }

  async findProject(id: string): Promise<ProjectRecord | null> {
    const { data, error } = await this.client
      .from('projects')
      .select(
        '*, enterprise_projects!inner(*), related_enterprises:enterprise_projects(*), project_media(*), project_types(requires_document_number)'
      )
      .eq('id', id)
      .eq('enterprise_projects.is_primary', true)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapProject(data as Row) : null;
  }

  async createProject(input: Row, actor: AdminActor, requestId: string): Promise<ProjectRecord> {
    const { data, error } = await this.client.rpc('marketplace_create_project', {
      p_enterprise_id: input.enterpriseId,
      p_slug: input.slug,
      p_category_code: input.categoryCode,
      p_country_code: input.countryCode ?? null,
      p_time_zone: input.timeZone,
      p_default_locale: input.defaultLocale,
      p_content: input.content,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'VALIDATION_FAILED');
    const project = mapProject({ ...record(result.project), enterprise_id: input.enterpriseId });
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

  async updateProject(
    id: string,
    input: Row,
    actor: AdminActor,
    requestId: string,
    enterpriseId: string
  ): Promise<ProjectRecord> {
    const { data, error } = await this.client.rpc('marketplace_update_project', {
      p_project_id: id,
      p_patch: input,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'VALIDATION_FAILED');
    return mapProject({ ...record(result.project), enterprise_id: enterpriseId });
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
    actor: AdminActor,
    requestId: string
  ): Promise<ProjectMediaRecord[]> {
    const { data, error } = await this.client.rpc('marketplace_reorder_project_media', {
      p_project_id: projectId,
      p_items: items,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'MEDIA_ORDER_INVALID');
    return rowArray(result.media).map(mapMedia);
  }
}
