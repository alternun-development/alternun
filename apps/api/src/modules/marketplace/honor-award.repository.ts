/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  CreateHonorAwardRecipeInput,
  HonorAwardAudience,
  HonorAwardCatalogItem,
  HonorAwardClaimCodeRecord,
  HonorAwardGrantRecord,
  HonorAwardRecipeInput,
  HonorAwardRecipeRecord,
  HonorAwardView,
} from './honor-award.types';

type Row = Record<string, unknown>;

/** Who owns a grant: a person or an enterprise. */
export type HonorAwardOwner = { userId: string } | { enterpriseId: string };

const RECIPE_LINKS =
  'project:projects(id, slug, status, default_locale, content), ' +
  'partner:enterprises!partner_enterprise_id(id, slug, display_name, description, logo_url, website_url, country_code)';
const VIEW_SELECT = `id, status, awarded_at, claimed_at, recipe:honor_award_recipes!inner(*, ${RECIPE_LINKS})`;

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
    eventDates: text(row.event_dates),
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

function projectContent(project: Row): Row {
  const content = record(project.content) ?? {};
  const locale = String(project.default_locale ?? '');
  return record(content[locale]) ?? record(Object.values(content)[0]) ?? {};
}

function contentText(content: Row, key: string): string | null {
  const value = content[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mapProjectSummary(project: Row): HonorAwardView['project'] {
  const content = projectContent(project);
  return {
    id: String(project.id ?? ''),
    slug: String(project.slug ?? ''),
    title: contentText(content, 'title') ?? String(project.slug ?? ''),
    location: contentText(content, 'location'),
    description: contentText(content, 'description'),
  };
}

/** The public side of a recipe row with its project and ally. */
function mapRecipeParts(recipeRow: Row): HonorAwardCatalogItem {
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
    eventDates: recipe.eventDates,
    venueName: recipe.venueName,
    venueLocation: recipe.venueLocation,
    airsAmount: recipe.airsAmount,
    badgeImageUrl: recipe.badgeImageUrl,
    frontImageUrl: recipe.frontImageUrl,
    backImageUrl: recipe.backImageUrl,
    artPreset: recipe.artPreset,
  };
  return {
    recipe: publicRecipe,
    project: project ? mapProjectSummary(project) : null,
    partner: partner
      ? {
          id: String(partner.id ?? ''),
          slug: String(partner.slug ?? ''),
          displayName: String(partner.display_name ?? ''),
          description: text(partner.description),
          logoUrl: text(partner.logo_url),
          websiteUrl: text(partner.website_url),
          countryCode: text(partner.country_code),
        }
      : null,
  };
}

export function mapHonorAwardView(row: Row): HonorAwardView {
  return {
    id: String(row.id ?? ''),
    status: row.status === 'claimed' ? 'claimed' : 'pending',
    awardedAt: String(row.awarded_at ?? ''),
    claimedAt: text(row.claimed_at),
    ...mapRecipeParts(record(row.recipe) ?? {}),
  };
}

/** A recipe offered in the catalog: unpublished projects are left out. */
export function mapHonorAwardCatalogItem(recipeRow: Row): HonorAwardCatalogItem {
  const item = mapRecipeParts(recipeRow);
  const project = record(recipeRow.project);
  return project && project.status !== 'published' ? { ...item, project: null } : item;
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
  assign('event_dates', input.eventDates);
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

  /** Active medals for people, with their project and ally, for the legacy catalog. */
  /** Active medals for people; optionally only an ally's or a project's. */
  async listUserCatalog(
    filter: { enterpriseId?: string; projectId?: string } = {}
  ): Promise<HonorAwardCatalogItem[]> {
    let query = this.client
      .from('honor_award_recipes')
      .select(`*, ${RECIPE_LINKS}`)
      .eq('audience', 'user')
      .eq('is_active', true);
    if (filter.enterpriseId) query = query.eq('partner_enterprise_id', filter.enterpriseId);
    if (filter.projectId) query = query.eq('project_id', filter.projectId);
    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapHonorAwardCatalogItem);
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

  /** The account's email, only when it is verified (what the Airs report claim requires). */
  async findVerifiedEmail(userId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('users')
      .select('email, email_verified')
      .eq('id', userId)
      .maybeSingle();
    if (error) failDatabase(error);
    const row = record(data);
    if (row?.email_verified !== true || typeof row.email !== 'string') return null;
    return row.email;
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
  ): Promise<{ id: string; slug: string; status: string; testnetOnly: boolean } | null> {
    let query = this.client.from('enterprises').select('id, slug, status, testnet_only');
    query = 'id' in by ? query.eq('id', by.id) : query.eq('slug', by.slug);
    const { data, error } = await query.maybeSingle();
    if (error) failDatabase(error);
    const row = record(data);
    return row
      ? {
          id: String(row.id ?? ''),
          slug: String(row.slug ?? ''),
          status: String(row.status ?? ''),
          testnetOnly: row.testnet_only === true,
        }
      : null;
  }

  /** A project by slug, with what its public page needs to know. */
  async findProjectBySlug(
    slug: string
  ): Promise<{ id: string; status: string; testnetOnly: boolean } | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, status, testnet_only')
      .eq('slug', slug)
      .maybeSingle();
    if (error) failDatabase(error);
    const row = record(data);
    return row
      ? {
          id: String(row.id ?? ''),
          status: String(row.status ?? ''),
          testnetOnly: row.testnet_only === true,
        }
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

  /** The project medal that gives this recipe through an Airs report, with its art. */
  async findHonorMedal(
    recipeId: string,
    projectId: string
  ): Promise<{ id: string; name: string; imageUrl: string } | null> {
    const { data, error } = await this.client
      .from('project_medals')
      .select('id, name, image_url')
      .eq('honor_recipe_id', recipeId)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) failDatabase(error);
    const row = data as Row | null;
    return row
      ? { id: String(row.id), name: String(row.name ?? ''), imageUrl: String(row.image_url ?? '') }
      : null;
  }

  /** Whether the person already holds this award (pending or claimed). */
  async holdsRecipe(userId: string, recipeId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('honor_award_grants')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)
      .neq('status', 'revoked')
      .limit(1);
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).length > 0;
  }

  /** A report with this medal for this email still open (waiting for review or the sign-up). */
  async hasOpenMedalReport(email: string, medalId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('airs_reports')
      .select('id')
      .eq('recipient_email', email)
      .eq('medal_id', medalId)
      .in('status', ['pending_approval', 'awaiting_claim'])
      .limit(1);
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).length > 0;
  }

  async listClaimCodes(enterpriseId: string): Promise<HonorAwardClaimCodeRecord[]> {
    const { data, error } = await this.client
      .from('honor_award_claim_codes')
      .select(`${CLAIM_CODE_COLUMNS}, recipe:honor_award_recipes!inner(title, event_name)`)
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) failDatabase(error);
    return ((data ?? []) as Row[]).map(mapClaimCode);
  }

  async insertClaimCode(code: {
    recipeId: string;
    enterpriseId: string;
    codeHash: string;
    hint: string;
    label: string | null;
    maxRedemptions: number;
    expiresAt: string;
    creator: { issuer: string; subject: string; roles: string[]; email: string };
  }): Promise<HonorAwardClaimCodeRecord> {
    const { data, error } = await this.client
      .from('honor_award_claim_codes')
      .insert({
        recipe_id: code.recipeId,
        enterprise_id: code.enterpriseId,
        code_hash: code.codeHash,
        code_hint: code.hint,
        label: code.label,
        max_redemptions: code.maxRedemptions,
        expires_at: code.expiresAt,
        created_by_issuer: code.creator.issuer,
        created_by_subject: code.creator.subject,
        created_by_roles: code.creator.roles,
        created_by_email: code.creator.email,
      })
      .select(`${CLAIM_CODE_COLUMNS}, recipe:honor_award_recipes!inner(title, event_name)`)
      .single();
    if (error) failDatabase(error);
    return mapClaimCode(data as Row);
  }

  /** Revokes an active code of this enterprise; null when there is none. */
  async revokeClaimCode(
    codeId: string,
    enterpriseId: string,
    actor: { issuer: string; subject: string }
  ): Promise<HonorAwardClaimCodeRecord | null> {
    const { data, error } = await this.client
      .from('honor_award_claim_codes')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by_issuer: actor.issuer,
        revoked_by_subject: actor.subject,
      })
      .eq('id', codeId)
      .eq('enterprise_id', enterpriseId)
      .is('revoked_at', null)
      .select(`${CLAIM_CODE_COLUMNS}, recipe:honor_award_recipes!inner(title, event_name)`)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapClaimCode(data as Row) : null;
  }

  /** Redeems a code for a person (all checks and the Airs report run in one SQL function). */
  async redeemClaimCode(userId: string, codeHash: string, requestId: string): Promise<Row> {
    const { data, error } = await this.client.rpc('honor_award_redeem_code', {
      p_user_id: userId,
      p_code_hash: codeHash,
      p_request_id: requestId,
    });
    if (error) failDatabase(error);
    return record(data) ?? {};
  }
}

const CLAIM_CODE_COLUMNS =
  'id, recipe_id, enterprise_id, code_hint, label, max_redemptions, redemption_count, ' +
  'starts_at, expires_at, created_at, revoked_at';

function mapClaimCode(row: Row): HonorAwardClaimCodeRecord {
  const recipe = record(row.recipe);
  return {
    id: String(row.id ?? ''),
    recipeId: String(row.recipe_id ?? ''),
    recipeTitle: String(recipe?.title ?? ''),
    recipeEventName: text(recipe?.event_name),
    enterpriseId: String(row.enterprise_id ?? ''),
    hint: String(row.code_hint ?? ''),
    label: text(row.label),
    maxRedemptions: Number(row.max_redemptions ?? 0),
    redemptionCount: Number(row.redemption_count ?? 0),
    startsAt: String(row.starts_at ?? ''),
    expiresAt: String(row.expires_at ?? ''),
    createdAt: String(row.created_at ?? ''),
    revokedAt: text(row.revoked_at),
  };
}
