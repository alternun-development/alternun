/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  CreateHonorAwardRecipeInput,
  HonorAwardAudience,
  HonorAwardGrantRecord,
  HonorAwardRecipeInput,
  HonorAwardRecipeRecord,
  HonorAwardView,
} from './honor-award.types';

type Row = Record<string, unknown>;

/** Who owns a grant: a person or an enterprise. */
export type HonorAwardOwner = { userId: string } | { enterpriseId: string };

const VIEW_SELECT =
  'id, status, awarded_at, claimed_at, recipe:honor_award_recipes!inner(*, ' +
  'project:projects(id, slug, default_locale, content), ' +
  'partner:enterprises!partner_enterprise_id(id, slug, display_name, description, logo_url, website_url))';

function failDatabase(error: { code?: string } | null): never {
  if (error?.code === '23505') marketplaceError('HONOR_AWARD_ALREADY_GRANTED');
  if (error?.code === '23514' || error?.code === '23503') {
    marketplaceError('HONOR_AWARD_INPUT_INVALID');
  }
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function record(value: unknown): Row | null {
  if (Array.isArray(value)) return record(value[0]);
  return value && typeof value === 'object' ? (value as Row) : null;
}

export function mapHonorAwardRecipe(row: Row): HonorAwardRecipeRecord {
  return {
    id: String(row.id ?? ''),
    kind: row.kind === 'trophy' ? 'trophy' : 'medal',
    tier: (['gold', 'silver', 'bronze'].includes(String(row.tier))
      ? row.tier
      : 'generic') as HonorAwardRecipeRecord['tier'],
    audience: row.audience === 'enterprise' ? 'enterprise' : 'user',
    title: String(row.title ?? ''),
    classification: text(row.classification),
    purpose: text(row.purpose),
    eventName: text(row.event_name),
    eventYear: typeof row.event_year === 'number' ? row.event_year : null,
    venueName: text(row.venue_name),
    venueLocation: text(row.venue_location),
    airsAmount: Number(row.airs_amount ?? 0),
    badgeImageUrl: text(row.badge_image_url),
    frontImageUrl: text(row.front_image_url),
    backImageUrl: text(row.back_image_url),
    artPreset: text(row.art_preset),
    projectId: text(row.project_id),
    partnerEnterpriseId: text(row.partner_enterprise_id),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function mapHonorAwardGrant(row: Row): HonorAwardGrantRecord {
  return {
    id: String(row.id ?? ''),
    recipeId: String(row.recipe_id ?? ''),
    recipientType: row.recipient_type === 'enterprise' ? 'enterprise' : 'user',
    userId: text(row.user_id),
    enterpriseId: text(row.enterprise_id),
    status: row.status === 'claimed' || row.status === 'revoked' ? row.status : 'pending',
    source: row.source === 'project_medal' ? 'project_medal' : 'manual',
    reference: text(row.reference),
    note: text(row.note),
    awardedAt: String(row.awarded_at ?? ''),
    claimedAt: text(row.claimed_at),
    revokedAt: text(row.revoked_at),
  };
}

function projectTitle(project: Row): string {
  const content = record(project.content) ?? {};
  const locale = String(project.default_locale ?? '');
  const localized = record(content[locale]) ?? record(Object.values(content)[0]);
  const title = typeof localized?.title === 'string' ? localized.title.trim() : '';
  return title || String(project.slug ?? '');
}

export function mapHonorAwardView(row: Row): HonorAwardView {
  const recipeRow = record(row.recipe) ?? {};
  const recipe = mapHonorAwardRecipe(recipeRow);
  const project = record(recipeRow.project);
  const partner = record(recipeRow.partner);
  const publicRecipe: HonorAwardView['recipe'] = {
    id: recipe.id,
    kind: recipe.kind,
    tier: recipe.tier,
    audience: recipe.audience,
    title: recipe.title,
    classification: recipe.classification,
    purpose: recipe.purpose,
    eventName: recipe.eventName,
    eventYear: recipe.eventYear,
    venueName: recipe.venueName,
    venueLocation: recipe.venueLocation,
    airsAmount: recipe.airsAmount,
    badgeImageUrl: recipe.badgeImageUrl,
    frontImageUrl: recipe.frontImageUrl,
    backImageUrl: recipe.backImageUrl,
    artPreset: recipe.artPreset,
  };
  return {
    id: String(row.id ?? ''),
    status: row.status === 'claimed' ? 'claimed' : 'pending',
    awardedAt: String(row.awarded_at ?? ''),
    claimedAt: text(row.claimed_at),
    recipe: publicRecipe,
    project: project
      ? {
          id: String(project.id ?? ''),
          slug: String(project.slug ?? ''),
          title: projectTitle(project),
        }
      : null,
    partner: partner
      ? {
          id: String(partner.id ?? ''),
          slug: String(partner.slug ?? ''),
          displayName: String(partner.display_name ?? ''),
          description: text(partner.description),
          logoUrl: text(partner.logo_url),
          websiteUrl: text(partner.website_url),
        }
      : null,
  };
}

function recipeColumns(input: HonorAwardRecipeInput): Row {
  const columns: Row = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) columns[key] = value;
  };
  assign('kind', input.kind);
  assign('tier', input.tier);
  assign('audience', input.audience);
  assign('title', input.title);
  assign('classification', input.classification);
  assign('purpose', input.purpose);
  assign('event_name', input.eventName);
  assign('event_year', input.eventYear);
  assign('venue_name', input.venueName);
  assign('venue_location', input.venueLocation);
  assign('airs_amount', input.airsAmount);
  assign('badge_image_url', input.badgeImageUrl);
  assign('front_image_url', input.frontImageUrl);
  assign('back_image_url', input.backImageUrl);
  assign('art_preset', input.artPreset);
  assign('project_id', input.projectId);
  assign('partner_enterprise_id', input.partnerEnterpriseId);
  assign('is_active', input.isActive);
  assign('sort_order', input.sortOrder);
  return columns;
}

/** Escapes LIKE wildcards so an email matches only itself, ignoring case. */
function exactCaseInsensitive(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

@Injectable()
export class HonorAwardRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async listRecipes(): Promise<HonorAwardRecipeRecord[]> {
    const { data, error } = await this.client
      .from('honor_award_recipes')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapHonorAwardRecipe);
  }

  async findRecipe(recipeId: string): Promise<HonorAwardRecipeRecord | null> {
    const { data, error } = await this.client
      .from('honor_award_recipes')
      .select('*')
      .eq('id', recipeId)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapHonorAwardRecipe(data as Row) : null;
  }

  async createRecipe(
    input: CreateHonorAwardRecipeInput,
    actor: { issuer: string; subject: string }
  ): Promise<HonorAwardRecipeRecord> {
    const { data, error } = await this.client
      .from('honor_award_recipes')
      .insert({
        ...recipeColumns(input),
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error);
    return mapHonorAwardRecipe(data as Row);
  }

  async updateRecipe(
    recipeId: string,
    input: HonorAwardRecipeInput
  ): Promise<HonorAwardRecipeRecord | null> {
    const { data, error } = await this.client
      .from('honor_award_recipes')
      .update({ ...recipeColumns(input), updated_at: new Date().toISOString() })
      .eq('id', recipeId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapHonorAwardRecipe(data as Row) : null;
  }

  async listGrantsForRecipe(recipeId: string): Promise<HonorAwardGrantRecord[]> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('awarded_at', { ascending: false });
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapHonorAwardGrant);
  }

  async findGrant(grantId: string): Promise<HonorAwardGrantRecord | null> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .select('*')
      .eq('id', grantId)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapHonorAwardGrant(data as Row) : null;
  }

  async insertGrant(grant: {
    recipeId: string;
    recipientType: HonorAwardAudience;
    userId?: string;
    enterpriseId?: string;
    reference?: string | null;
    note?: string | null;
    actor: { issuer: string; subject: string };
  }): Promise<HonorAwardGrantRecord> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .insert({
        recipe_id: grant.recipeId,
        recipient_type: grant.recipientType,
        user_id: grant.userId ?? null,
        enterprise_id: grant.enterpriseId ?? null,
        reference: grant.reference ?? null,
        note: grant.note ?? null,
        awarded_by_issuer: grant.actor.issuer,
        awarded_by_subject: grant.actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error);
    return mapHonorAwardGrant(data as Row);
  }

  async revokeGrant(grantId: string): Promise<HonorAwardGrantRecord | null> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', grantId)
      .neq('status', 'revoked')
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapHonorAwardGrant(data as Row) : null;
  }

  /** Claims a pending grant of this owner; null when it is not theirs or not pending. */
  async claimGrant(grantId: string, owner: HonorAwardOwner): Promise<boolean> {
    let query = this.client
      .from('honor_award_grants')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', grantId)
      .eq('status', 'pending');
    query =
      'userId' in owner
        ? query.eq('user_id', owner.userId)
        : query.eq('enterprise_id', owner.enterpriseId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) failDatabase(error);
    return Boolean(data);
  }

  async listViews(owner: HonorAwardOwner, claimedOnly: boolean): Promise<HonorAwardView[]> {
    let query = this.client.from('honor_award_grants').select(VIEW_SELECT);
    query =
      'userId' in owner
        ? query.eq('user_id', owner.userId)
        : query.eq('enterprise_id', owner.enterpriseId);
    query = claimedOnly ? query.eq('status', 'claimed') : query.neq('status', 'revoked');
    const { data, error } = await query.order('awarded_at', { ascending: false });
    if (error) failDatabase(error);
    return ((data ?? []) as unknown as Row[]).map(mapHonorAwardView);
  }

  async findView(grantId: string): Promise<HonorAwardView | null> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .select(VIEW_SELECT)
      .eq('id', grantId)
      .neq('status', 'revoked')
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapHonorAwardView(data as unknown as Row) : null;
  }

  /** Active honor awards for people that an ally backs: the ones it can give. */
  async listRecipesForPartner(enterpriseId: string): Promise<HonorAwardRecipeRecord[]> {
    const { data, error } = await this.client
      .from('honor_award_recipes')
      .select('*')
      .eq('partner_enterprise_id', enterpriseId)
      .eq('audience', 'user')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapHonorAwardRecipe);
  }

  /** Pending and claimed grants a person holds of the honor awards an ally backs. */
  async listPartnerGrantsForUser(
    enterpriseId: string,
    userId: string
  ): Promise<Array<{ recipeId: string; title: string }>> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .select('id, recipe:honor_award_recipes!inner(id, title, partner_enterprise_id)')
      .eq('user_id', userId)
      .neq('status', 'revoked')
      .eq('recipe.partner_enterprise_id', enterpriseId);
    if (error) failDatabase(error);
    return ((data ?? []) as unknown as Row[]).map((row) => {
      const recipe = record(row.recipe) ?? {};
      return { recipeId: String(recipe.id ?? ''), title: String(recipe.title ?? '') };
    });
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id')
      .ilike('email', exactCaseInsensitive(email.trim()))
      .limit(1)
      .maybeSingle();
    if (error) failDatabase(error);
    const id = record(data)?.id;
    return id == null ? null : String(id);
  }

  async findEnterprise(
    by: { id: string } | { slug: string }
  ): Promise<{ id: string; slug: string; status: string } | null> {
    let query = this.client.from('enterprises').select('id, slug, status');
    query = 'id' in by ? query.eq('id', by.id) : query.eq('slug', by.slug);
    const { data, error } = await query.maybeSingle();
    if (error) failDatabase(error);
    const row = record(data);
    return row
      ? { id: String(row.id ?? ''), slug: String(row.slug ?? ''), status: String(row.status ?? '') }
      : null;
  }

  async projectExists(projectId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();
    if (error) failDatabase(error);
    return Boolean(data);
  }
}
