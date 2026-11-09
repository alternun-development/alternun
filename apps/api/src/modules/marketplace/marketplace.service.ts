import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import {
  grantsGlobally,
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import type {
  CreateEnterpriseDto,
  CreateEnterpriseProductDto,
  CreateProjectDto,
  CreateProjectMediaDto,
  CreateUploadUrlDto,
  LinkProjectEnterpriseDto,
  ReorderMarketplaceDto,
  ReorderProjectMediaDto,
  UpdateEnterpriseDto,
  UpdateEnterpriseProductDto,
  UpdateProjectDto,
  UpdateProjectMediaDto,
} from './marketplace.dto';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository, MarketplacePublicRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type EnterpriseProductRecord,
  type EnterpriseRecord,
  type ProjectContent,
  type ProjectContentBlock,
  type ProjectMediaRecord,
  type ProjectRecord,
  type ProjectStatus,
  type PublicEnterprise,
  type PublicEnterpriseDetail,
  type PublicProject,
} from './marketplace.types';

type PublishedProjectRow = {
  project: ProjectRecord;
  enterprise: EnterpriseRecord;
  media: ProjectMediaRecord[];
};

// A published project as listed under one enterprise of the directory: its primary owner or an
// affiliated enterprise (sponsor, partner, operator).
type EnterpriseListing = {
  listedEnterprise: EnterpriseRecord;
  isPrimary: boolean;
  row: PublishedProjectRow;
};

// Fields only platform_owner / internal_admin may write: partnership state and team-only data.
const INTERNAL_PROFILE_FIELDS = [
  'partnershipStatus',
  'internalContacts',
  'pendingItems',
  'internalNotes',
] as const;
const PROJECT_PROFILE_FIELDS = [
  'alternateName',
  'locationDetails',
  'publicContact',
  ...INTERNAL_PROFILE_FIELDS,
] as const;
const MARKETPLACE_MEDIA_BUCKET = 'marketplace-media';
const UPLOAD_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) =>
    ['platform_owner', 'internal_admin', 'moderator'].includes(role)
  );
}

function hasRole(principal: AdminPrincipal, ...roles: string[]): boolean {
  return principal.roles.some((role) => roles.includes(role));
}

function resolveLocale(
  content: ProjectContent,
  requested: string | undefined,
  acceptLanguage: string | undefined,
  fallback: string
): string {
  const available = Object.keys(content);
  const candidates = [
    requested,
    ...(acceptLanguage ?? '').split(',').map((part) => part.split(';')[0]?.trim()),
    fallback,
  ].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    if (content[candidate]) return candidate;
    const base = candidate.split('-')[0];
    const matching = available.find((locale) => locale === base || locale.startsWith(`${base}-`));
    if (matching) return matching;
  }
  return fallback;
}

function publicProject(
  project: ProjectRecord,
  enterprise: EnterpriseRecord,
  media: ProjectMediaRecord[],
  requested?: string,
  acceptLanguage?: string
): PublicProject {
  const locale = resolveLocale(project.content, requested, acceptLanguage, project.defaultLocale);
  const localized = project.content[locale];
  return {
    id: project.id,
    slug: project.slug,
    status: 'published',
    categoryCode: project.categoryCode,
    locale,
    availableLocales: Object.keys(project.content).sort(),
    title: localized.title,
    location: localized.location,
    theme: localized.theme,
    description: localized.description,
    ...(localized.participationCopy === undefined
      ? {}
      : { participationCopy: localized.participationCopy }),
    ...(localized.ctaLabel === undefined ? {} : { ctaLabel: localized.ctaLabel }),
    waysToContribute: localized.waysToContribute,
    alternateName: project.alternateName ?? null,
    partnershipStatus: project.partnershipStatus ?? 'structuring',
    locationDetails: project.locationDetails ?? {},
    publicContact: project.publicContact ?? {},
    enterprise: {
      id: enterprise.id,
      slug: enterprise.slug,
      displayName: enterprise.displayName,
      countryCode: enterprise.countryCode,
      websiteUrl: safePublicHttpsUrl(enterprise.websiteUrl),
    },
    media: media.filter((item) => item.isActive),
    firstPublishedAt: project.firstPublishedAt ?? project.publishedAt ?? '',
    updatedAt: project.updatedAt,
  };
}

function safePublicHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

function publicEnterprise(
  listings: EnterpriseListing[],
  products: EnterpriseProductRecord[],
  requested?: string,
  acceptLanguage?: string
): PublicEnterprise {
  const enterprise = listings[0].listedEnterprise;
  let logo: PublicEnterprise['logo'] = null;
  if (safePublicHttpsUrl(enterprise.logoUrl)) {
    logo = { url: enterprise.logoUrl!, altText: enterprise.displayName };
  } else {
    // Without its own logo, an enterprise that owns a single project (e.g. a hotel and its stay)
    // falls back to that project's logo. With several projects there is no single logo to
    // borrow, and affiliated enterprises never borrow one: it belongs to the project.
    const owned = listings.filter((listing) => listing.isPrimary);
    const logoRow = (owned.length === 1 ? owned : [])
      .flatMap(({ row }) => row.media.map((item) => ({ item, project: row.project })))
      .find(
        ({ item }) => item.kind === 'logo' && item.isActive && safePublicHttpsUrl(item.url) !== null
      );
    if (logoRow) {
      const logoLocale = resolveLocale(
        logoRow.project.content,
        requested,
        acceptLanguage,
        logoRow.project.defaultLocale
      );
      logo = {
        url: safePublicHttpsUrl(logoRow.item.url)!,
        altText:
          logoRow.item.altText[logoLocale] ??
          Object.values(logoRow.item.altText).find(Boolean) ??
          enterprise.displayName,
      };
    }
  }
  return {
    id: enterprise.id,
    slug: enterprise.slug,
    displayName: enterprise.displayName,
    logo,
    countryCode: enterprise.countryCode,
    websiteUrl: safePublicHttpsUrl(enterprise.websiteUrl),
    projectCount: listings.length,
    kind: enterprise.kind,
    sector: enterprise.sector,
    description: enterprise.description,
    partnershipStatus: enterprise.partnershipStatus,
    location: enterprise.location,
    publicContact: enterprise.publicContact,
    bannerUrl: safePublicHttpsUrl(enterprise.bannerUrl),
    eventDetails: enterprise.eventDetails,
    sites: enterprise.sites,
    products: products
      .filter((product) => product.enterpriseId === enterprise.id && product.isActive)
      .map(({ id, name, description, airsMin, airsMax, airsNote }) => ({
        id,
        name,
        description,
        airsMin,
        airsMax,
        airsNote,
      })),
  };
}

function activeEnterpriseGroups(listings: EnterpriseListing[]): EnterpriseListing[][] {
  const groups = new Map<string, EnterpriseListing[]>();
  for (const listing of listings) {
    if (listing.row.project.status !== 'published' || listing.listedEnterprise.status !== 'active')
      continue;
    // Projects only reach the directory while their primary owner is active as well.
    if (listing.row.enterprise.status !== 'active') continue;
    const current = groups.get(listing.listedEnterprise.id) ?? [];
    if (current.some((item) => item.row.project.id === listing.row.project.id)) continue;
    current.push(listing);
    groups.set(listing.listedEnterprise.id, current);
  }
  const result: EnterpriseListing[][] = [];
  groups.forEach((group) => result.push(group));
  return result.sort(
    ([a], [b]) =>
      a.listedEnterprise.sortOrder - b.listedEnterprise.sortOrder ||
      a.listedEnterprise.displayName.localeCompare(b.listedEnterprise.displayName)
  );
}

function validateContent(content: ProjectContent, defaultLocale: string): void {
  const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
  const blocks = Object.entries(content ?? {});
  if (!blocks.length || !content[defaultLocale]) marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
  for (const [locale, value] of blocks) {
    const block = value as ProjectContentBlock | null;
    if (!localePattern.test(locale) || !block || typeof block !== 'object')
      marketplaceError('INVALID_LOCALE');
    const required: Array<[unknown, number]> = [
      [block.title, 120],
      [block.location, 120],
      [block.theme, 120],
      [block.description, 4000],
    ];
    if (
      required.some(
        ([value, max]) => typeof value !== 'string' || value.trim().length < 1 || value.length > max
      )
    )
      marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
    if (
      !Array.isArray(block.waysToContribute) ||
      block.waysToContribute.length < 1 ||
      block.waysToContribute.length > 8 ||
      block.waysToContribute.some(
        (item) => typeof item !== 'string' || item.trim().length < 1 || item.length > 160
      )
    )
      marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
    if (
      block.participationCopy != null &&
      (typeof block.participationCopy !== 'string' || block.participationCopy.length > 2000)
    )
      marketplaceError('VALIDATION_FAILED');
    if (
      block.ctaLabel != null &&
      (typeof block.ctaLabel !== 'string' || block.ctaLabel.length > 80)
    )
      marketplaceError('VALIDATION_FAILED');
  }
}

function ensureMutationInput(input: unknown): void {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.values(input).some((value) => value === null)
  ) {
    marketplaceError('VALIDATION_FAILED');
  }
}

function pickKeys(source: object, keys: string[]): Record<string, unknown> {
  const values = source as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, values[key]]));
}

// An empty string clears an optional profile text field (the API rejects null in bodies).
const CLEARABLE_FIELDS = [
  'logoUrl',
  'bannerUrl',
  'sector',
  'description',
  'internalNotes',
  'alternateName',
];
function normalizeClearable(input: object): Record<string, unknown> {
  const values = { ...(input as Record<string, unknown>) };
  for (const key of CLEARABLE_FIELDS)
    if (typeof values[key] === 'string' && !values[key].trim()) values[key] = null;
  return values;
}

function validateAirsRange(input: { airsMin?: number | null; airsMax?: number | null }): void {
  if (input.airsMin != null && input.airsMax != null && input.airsMax < input.airsMin)
    marketplaceError('VALIDATION_FAILED');
}

function validateTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format();
  } catch {
    marketplaceError('VALIDATION_FAILED');
  }
}

@Injectable()
export class MarketplacePublicService {
  constructor(private readonly repository: MarketplacePublicRepository) {}

  async list(
    locale?: string,
    acceptLanguage?: string,
    categoryCode?: string,
    page = 1,
    perPage = 20
  ): Promise<{ data: PublicProject[]; page: number; perPage: number; total: number }> {
    const rows = await this.repository.listPublished(categoryCode);
    const visible = rows
      .filter(({ project }) => project.status === 'published')
      .map(({ project, enterprise, media }) =>
        publicProject(project, enterprise, media, locale, acceptLanguage)
      );
    const start = (page - 1) * perPage;
    return { data: visible.slice(start, start + perPage), page, perPage, total: visible.length };
  }

  async findBySlug(slug: string, locale?: string, acceptLanguage?: string): Promise<PublicProject> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) {
      marketplaceError('VALIDATION_FAILED');
    }
    const row = await this.repository.findPublishedBySlug(slug);
    if (!row || row.project.status !== 'published') marketplaceError('PROJECT_NOT_FOUND');
    return publicProject(row.project, row.enterprise, row.media, locale, acceptLanguage);
  }

  private async enterpriseListings(): Promise<EnterpriseListing[]> {
    const rows = await this.repository.listPublished();
    const affiliations = await this.repository.listAffiliations(
      rows.map(({ project }) => project.id)
    );
    const listings: EnterpriseListing[] = rows.map((row) => ({
      listedEnterprise: row.enterprise,
      isPrimary: true,
      row,
    }));
    for (const { projectId, enterprise } of affiliations) {
      const row = rows.find(({ project }) => project.id === projectId);
      if (row) listings.push({ listedEnterprise: enterprise, isPrimary: false, row });
    }
    return listings;
  }

  async listEnterprises(
    locale?: string,
    acceptLanguage?: string,
    page = 1,
    perPage = 20
  ): Promise<{ data: PublicEnterprise[]; page: number; perPage: number; total: number }> {
    const groups = activeEnterpriseGroups(await this.enterpriseListings());
    const start = (page - 1) * perPage;
    const pageGroups = groups.slice(start, start + perPage);
    const products = await this.repository.listActiveProducts(
      pageGroups.map(([first]) => first.listedEnterprise.id)
    );
    return {
      data: pageGroups.map((listings) =>
        publicEnterprise(listings, products, locale, acceptLanguage)
      ),
      page,
      perPage,
      total: groups.length,
    };
  }

  async findEnterpriseBySlug(
    slug: string,
    locale?: string,
    acceptLanguage?: string
  ): Promise<PublicEnterpriseDetail> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) {
      marketplaceError('VALIDATION_FAILED');
    }
    const group = activeEnterpriseGroups(await this.enterpriseListings()).find(
      ([first]) => first.listedEnterprise.slug === slug
    );
    if (!group) marketplaceError('ENTERPRISE_NOT_FOUND');
    const products = await this.repository.listActiveProducts([group[0].listedEnterprise.id]);
    return {
      ...publicEnterprise(group, products, locale, acceptLanguage),
      projects: group.map(({ row: { project, enterprise, media } }) =>
        publicProject(project, enterprise, media, locale, acceptLanguage)
      ),
    };
  }
}

@Injectable()
export class MarketplaceAdminService {
  constructor(private readonly repository: MarketplaceAdminRepository) {}

  private async deny(
    principal: AdminPrincipal,
    code: string,
    requestId: string,
    targetType: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<never> {
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType,
      enterpriseId,
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async authorize(
    principal: AdminPrincipal,
    permission: AdminPermission,
    requestId: string,
    targetType: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<void> {
    if (!hasPermission(principal, permission))
      await this.deny(
        principal,
        'PERMISSION_DENIED',
        requestId,
        targetType,
        enterpriseId,
        projectId
      );
    let hasScope = true;
    if (enterpriseId && !grantsGlobally(principal, permission)) {
      try {
        hasScope = await this.repository.actorHasScope(
          actorFromPrincipal(principal),
          principal.roles,
          enterpriseId,
          projectId ?? null,
          rolesWithPermission(principal, permission)
        );
      } catch {
        hasScope = false;
      }
    }
    if (!hasScope) {
      await this.deny(
        principal,
        projectId ? 'PROJECT_SCOPE_DENIED' : 'ENTERPRISE_SCOPE_DENIED',
        requestId,
        targetType,
        enterpriseId,
        projectId
      );
    }
  }

  async listEnterprises(principal: AdminPrincipal, requestId: string): Promise<EnterpriseRecord[]> {
    await this.authorize(principal, 'enterprises:read', requestId, 'enterprise');
    if (isGlobal(principal)) return this.repository.listEnterprises();
    const memberships = await this.repository.listActorMemberships(actorFromPrincipal(principal));
    const enterpriseIds = [...new Set(memberships.map(({ enterpriseId }) => enterpriseId))];
    return this.repository.listEnterprises(enterpriseIds);
  }

  async createEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateEnterpriseDto
  ): Promise<EnterpriseRecord> {
    ensureMutationInput(input);
    await this.authorize(principal, 'enterprises:create', requestId, 'enterprise');
    await this.validateEnterpriseImages(input);
    const created = await this.repository.createEnterprise(
      normalizeClearable(input),
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise.created',
      targetType: 'enterprise',
      targetId: created.id,
      enterpriseId: created.id,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async getEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    id: string
  ): Promise<EnterpriseRecord> {
    const enterprise = await this.repository.findEnterprise(id);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.authorize(principal, 'enterprises:read', requestId, 'enterprise', enterprise.id);
    return enterprise;
  }

  async updateEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    input: UpdateEnterpriseDto
  ): Promise<EnterpriseRecord> {
    ensureMutationInput(input);
    const before = await this.getEnterprise(principal, requestId, id);
    await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', before.id);
    if (
      ['legalName', ...INTERNAL_PROFILE_FIELDS].some((field) => field in input) &&
      !hasRole(principal, 'platform_owner', 'internal_admin')
    )
      await this.deny(
        principal,
        'PROTECTED_FIELD_WRITE_DENIED',
        requestId,
        'enterprise',
        before.id
      );
    await this.validateEnterpriseImages(input);
    const after = await this.repository.updateEnterprise(
      id,
      normalizeClearable(input),
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise.updated',
      targetType: 'enterprise',
      targetId: id,
      enterpriseId: id,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: after as unknown as Record<string, unknown>,
    });
    return after;
  }

  async transitionEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    target: EnterpriseRecord['status'],
    reason?: string
  ): Promise<EnterpriseRecord> {
    const enterprise = await this.repository.findEnterprise(id);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.authorize(principal, 'enterprises:status', requestId, 'enterprise', enterprise.id);
    return this.repository.setEnterpriseStatus(
      id,
      target,
      actorFromPrincipal(principal),
      requestId,
      reason
    );
  }

  async reorderEnterprises(
    principal: AdminPrincipal,
    requestId: string,
    input: ReorderMarketplaceDto
  ): Promise<EnterpriseRecord[]> {
    ensureMutationInput(input);
    await this.authorize(principal, 'enterprises:reorder', requestId, 'enterprise');
    await this.repository.reorderEnterprises(input.ids, actorFromPrincipal(principal), requestId);
    return this.repository.listEnterprises();
  }

  async reorderProjects(
    principal: AdminPrincipal,
    requestId: string,
    input: ReorderMarketplaceDto
  ): Promise<ProjectRecord[]> {
    ensureMutationInput(input);
    await this.authorize(principal, 'projects:reorder', requestId, 'project');
    await this.repository.reorderProjects(input.ids, actorFromPrincipal(principal), requestId);
    return this.repository.listProjects();
  }

  async listProjects(principal: AdminPrincipal, requestId: string): Promise<ProjectRecord[]> {
    await this.authorize(principal, 'projects:read', requestId, 'project');
    if (isGlobal(principal)) return this.repository.listProjects();
    const memberships = await this.repository.listActorMemberships(actorFromPrincipal(principal));
    return this.repository.listProjects({
      enterpriseIds: [
        ...new Set(
          memberships
            .filter(({ scopeType }) => scopeType === 'enterprise')
            .map(({ enterpriseId }) => enterpriseId)
        ),
      ],
      projectIds: [
        ...new Set(
          memberships
            .filter(({ scopeType, projectId }) => scopeType === 'project' && projectId)
            .map(({ projectId }) => projectId as string)
        ),
      ],
    });
  }

  async getProject(
    principal: AdminPrincipal,
    requestId: string,
    id: string
  ): Promise<ProjectRecord> {
    const project = await this.repository.findProject(id);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    await this.authorize(
      principal,
      'projects:read',
      requestId,
      'project',
      project.enterpriseId,
      project.id
    );
    return project;
  }

  async createProject(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateProjectDto
  ): Promise<ProjectRecord> {
    ensureMutationInput(input);
    const enterprise = await this.repository.findEnterprise(input.enterpriseId);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.authorize(principal, 'projects:create', requestId, 'project', enterprise.id);
    validateContent(input.content as ProjectContent, input.defaultLocale);
    validateTimeZone(input.timeZone);
    if (!(await this.repository.categoryExists(input.categoryCode)))
      marketplaceError('CATEGORY_UNSUPPORTED');
    const created = await this.repository.createProject(
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal),
      requestId
    );
    return created;
  }

  async updateProject(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    input: UpdateProjectDto
  ): Promise<ProjectRecord> {
    ensureMutationInput(input);
    const before = await this.getProject(principal, requestId, id);
    await this.authorize(
      principal,
      'projects:update',
      requestId,
      'project',
      before.enterpriseId,
      before.id
    );
    const contentOnly = Object.keys(input).every((key) => key === 'content');
    const internalWrite = INTERNAL_PROFILE_FIELDS.some((field) => field in input);
    if (internalWrite && !hasRole(principal, 'platform_owner', 'internal_admin'))
      await this.deny(
        principal,
        'PROTECTED_FIELD_WRITE_DENIED',
        requestId,
        'project',
        before.enterpriseId,
        before.id
      );
    if (hasRole(principal, 'moderator', 'sub_admin') && !contentOnly)
      await this.deny(
        principal,
        'PROTECTED_FIELD_WRITE_DENIED',
        requestId,
        'project',
        before.enterpriseId,
        before.id
      );
    if (input.slug !== undefined && before.firstPublishedAt)
      await this.deny(
        principal,
        'PROJECT_SLUG_IMMUTABLE',
        requestId,
        'project',
        before.enterpriseId,
        before.id
      );
    const content = input.content ?? before.content;
    const defaultLocale = input.defaultLocale ?? before.defaultLocale;
    validateContent(content, defaultLocale);
    if (input.timeZone) validateTimeZone(input.timeZone);
    if (input.categoryCode && !(await this.repository.categoryExists(input.categoryCode)))
      marketplaceError('CATEGORY_UNSUPPORTED');
    const profile: Record<string, unknown> = {};
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(normalizeClearable(input)))
      ((PROJECT_PROFILE_FIELDS as readonly string[]).includes(key) ? profile : patch)[key] = value;
    let after = before;
    if (Object.keys(patch).length > 0)
      after = await this.repository.updateProject(
        id,
        patch,
        actorFromPrincipal(principal),
        requestId,
        before.enterpriseId
      );
    if (Object.keys(profile).length > 0) {
      await this.repository.updateProjectProfile(id, profile, actorFromPrincipal(principal));
      after = (await this.repository.findProject(id)) ?? after;
      await this.repository.audit({
        actor: actorFromPrincipal(principal),
        action: 'project.profile_updated',
        targetType: 'project',
        targetId: id,
        enterpriseId: before.enterpriseId,
        projectId: id,
        requestId,
        result: 'allowed',
        beforeState: pickKeys(before, Object.keys(profile)),
        afterState: pickKeys(after, Object.keys(profile)),
      });
    }
    return after;
  }

  async linkEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    enterpriseId: string,
    input: LinkProjectEnterpriseDto
  ): Promise<ProjectRecord> {
    const project = await this.getProject(principal, requestId, projectId);
    if (!hasRole(principal, 'platform_owner', 'internal_admin'))
      await this.deny(
        principal,
        'PERMISSION_DENIED',
        requestId,
        'project',
        project.enterpriseId,
        project.id
      );
    if (enterpriseId === project.enterpriseId) marketplaceError('ENTERPRISE_RELATION_CONFLICT');
    if (!(await this.repository.findEnterprise(enterpriseId)))
      marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.repository.linkEnterprise(
      projectId,
      enterpriseId,
      input.relation,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project.enterprise_linked',
      targetType: 'project',
      targetId: projectId,
      enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      afterState: { enterpriseId, relation: input.relation },
    });
    return (await this.repository.findProject(projectId)) ?? project;
  }

  async unlinkEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    enterpriseId: string
  ): Promise<ProjectRecord> {
    const project = await this.getProject(principal, requestId, projectId);
    if (!hasRole(principal, 'platform_owner', 'internal_admin'))
      await this.deny(
        principal,
        'PERMISSION_DENIED',
        requestId,
        'project',
        project.enterpriseId,
        project.id
      );
    if (enterpriseId === project.enterpriseId) marketplaceError('ENTERPRISE_RELATION_CONFLICT');
    await this.repository.unlinkEnterprise(projectId, enterpriseId);
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project.enterprise_unlinked',
      targetType: 'project',
      targetId: projectId,
      enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: { enterpriseId },
    });
    return (await this.repository.findProject(projectId)) ?? project;
  }

  async listProducts(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string
  ): Promise<EnterpriseProductRecord[]> {
    await this.getEnterprise(principal, requestId, enterpriseId);
    return this.repository.listProducts(enterpriseId);
  }

  async createProduct(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    input: CreateEnterpriseProductDto
  ): Promise<EnterpriseProductRecord> {
    ensureMutationInput(input);
    validateAirsRange(input);
    await this.getEnterprise(principal, requestId, enterpriseId);
    await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', enterpriseId);
    const created = await this.repository.createProduct(
      enterpriseId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise_product.created',
      targetType: 'enterprise_product',
      targetId: created.id,
      enterpriseId,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async updateProduct(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    productId: string,
    input: UpdateEnterpriseProductDto
  ): Promise<EnterpriseProductRecord> {
    await this.getEnterprise(principal, requestId, enterpriseId);
    await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', enterpriseId);
    const before = (await this.repository.listProducts(enterpriseId)).find(
      (product) => product.id === productId
    );
    if (!before) marketplaceError('PRODUCT_NOT_FOUND');
    validateAirsRange({ ...before, ...input });
    // null clears the optional fields; keys left out stay as they are.
    const updated = await this.repository.updateProduct(
      enterpriseId,
      productId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise_product.updated',
      targetType: 'enterprise_product',
      targetId: productId,
      enterpriseId,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async deleteProduct(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    productId: string
  ): Promise<void> {
    await this.getEnterprise(principal, requestId, enterpriseId);
    await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', enterpriseId);
    await this.repository.deleteProduct(enterpriseId, productId);
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise_product.deleted',
      targetType: 'enterprise_product',
      targetId: productId,
      enterpriseId,
      requestId,
      result: 'allowed',
    });
  }

  /**
   * Issues a one-time signed URL to upload an image to the public marketplace bucket. The client
   * uploads the file there, then saves the returned publicUrl as project media or as the
   * enterprise logo/banner through the regular endpoints, which validate it again.
   */
  async createUploadUrl(
    principal: AdminPrincipal,
    requestId: string,
    target: { type: 'project' | 'enterprise'; id: string },
    input: CreateUploadUrlDto
  ): Promise<{ uploadUrl: string; token: string; path: string; publicUrl: string }> {
    let folder: string;
    let mediaKinds: string[];
    if (target.type === 'project') {
      if (!['logo', 'cover', 'gallery_image'].includes(input.kind))
        marketplaceError('VALIDATION_FAILED');
      const project = await this.getProject(principal, requestId, target.id);
      await this.authorize(
        principal,
        'project_media:write',
        requestId,
        'project_media',
        project.enterpriseId,
        project.id
      );
      await this.authorizeBrandAsset(principal, requestId, project, [input.kind]);
      folder = `projects/${project.id}/${input.kind}`;
      mediaKinds = [input.kind];
    } else {
      if (!['logo', 'banner'].includes(input.kind)) marketplaceError('VALIDATION_FAILED');
      const enterprise = await this.getEnterprise(principal, requestId, target.id);
      await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', enterprise.id);
      folder = `enterprises/${enterprise.id}/${input.kind}`;
      mediaKinds = [input.kind === 'banner' ? 'cover' : 'logo'];
    }
    const extension = UPLOAD_EXTENSIONS[input.contentType];
    if (!extension) marketplaceError('VALIDATION_FAILED');
    const upload = await this.repository.createSignedUpload(
      MARKETPLACE_MEDIA_BUCKET,
      `${folder}/${randomUUID()}.${extension}`
    );
    // The bucket's own host must be allowed for the media kind before the URL can be saved.
    await this.repository.ensureAllowedHost(mediaKinds, new URL(upload.publicUrl).hostname);
    return upload;
  }

  // Enterprise logo and banner follow the project logo/cover host allowlist.
  private async validateEnterpriseImages(input: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
  }): Promise<void> {
    for (const [value, kind] of [
      [input.logoUrl, 'logo'],
      [input.bannerUrl, 'cover'],
    ] as const) {
      if (!value) continue;
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return marketplaceError('MEDIA_URL_INVALID');
      }
      if (url.protocol !== 'https:' || url.username || url.password || isIP(url.hostname) !== 0)
        marketplaceError('MEDIA_URL_INVALID');
      if (!(await this.repository.allowedHosts(kind)).includes(url.hostname.toLowerCase()))
        marketplaceError('MEDIA_HOST_NOT_ALLOWED');
    }
  }

  async transition(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    target: ProjectStatus,
    reason?: string
  ): Promise<ProjectRecord> {
    const before = await this.getProject(principal, requestId, id);
    const permission: AdminPermission =
      target === 'published'
        ? 'projects:publish'
        : target === 'paused'
        ? 'projects:pause'
        : 'projects:archive';
    await this.authorize(
      principal,
      permission,
      requestId,
      'project',
      before.enterpriseId,
      before.id
    );
    const result = await this.repository.transitionProject(
      id,
      target,
      actorFromPrincipal(principal),
      requestId,
      reason
    );
    if (!result.ok) marketplaceError(result.reasonCode ?? 'PROJECT_STATUS_TRANSITION_INVALID');
    return (await this.repository.findProject(id)) ?? before;
  }

  async listMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<ProjectMediaRecord[]> {
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:read',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    return this.repository.listMedia(projectId);
  }

  // Logo and cover are brand assets: only global admins and the project's partner_operator may change them.
  private async authorizeBrandAsset(
    principal: AdminPrincipal,
    requestId: string,
    project: ProjectRecord,
    kinds: readonly (string | undefined)[]
  ): Promise<void> {
    if (!kinds.some((kind) => kind === 'logo' || kind === 'cover')) return;
    if (hasRole(principal, 'platform_owner', 'internal_admin')) return;
    let allowed = false;
    if (hasRole(principal, 'partner_operator')) {
      try {
        allowed = await this.repository.actorHasScope(
          actorFromPrincipal(principal),
          principal.roles,
          project.enterpriseId,
          project.id,
          ['partner_operator']
        );
      } catch {
        allowed = false;
      }
    }
    if (!allowed)
      await this.deny(
        principal,
        'BRAND_ASSET_WRITE_DENIED',
        requestId,
        'project_media',
        project.enterpriseId,
        project.id
      );
  }

  private async validateMedia(
    project: ProjectRecord,
    input: Partial<CreateProjectMediaDto>
  ): Promise<void> {
    const kind = input.kind;
    if (
      !kind ||
      !['logo', 'cover', 'gallery_image', 'video', 'canva'].includes(kind) ||
      typeof input.url !== 'string' ||
      !input.url
    )
      marketplaceError('VALIDATION_FAILED');
    if (input.embedUrl && !['video', 'canva'].includes(kind)) marketplaceError('MEDIA_URL_INVALID');
    const hosts = await this.repository.allowedHosts(kind);
    for (const raw of [input.url, input.embedUrl].filter((value): value is string => !!value)) {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return marketplaceError('MEDIA_URL_INVALID');
      }
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        isIP(url.hostname) !== 0 ||
        (url.port && url.port !== '443')
      )
        marketplaceError('MEDIA_URL_INVALID');
      if (!hosts.includes(url.hostname.toLowerCase())) marketplaceError('MEDIA_HOST_NOT_ALLOWED');
    }
    if (['logo', 'cover', 'gallery_image'].includes(kind)) {
      const alt = input.altText?.[project.defaultLocale];
      if (typeof alt !== 'string' || !alt.trim() || alt.length > 240)
        marketplaceError('MEDIA_ALT_REQUIRED');
    }
    for (const value of Object.values(input.altText ?? {}))
      if (typeof value !== 'string' || !value.trim() || value.length > 240)
        marketplaceError('MEDIA_ALT_REQUIRED');
    for (const value of Object.values(input.caption ?? {}))
      if (typeof value !== 'string' || value.length > 500) marketplaceError('VALIDATION_FAILED');
  }

  async createMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: CreateProjectMediaDto
  ): Promise<ProjectMediaRecord> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    await this.authorizeBrandAsset(principal, requestId, project, [input.kind]);
    await this.validateMedia(project, input);
    const created = await this.repository.createMedia(
      projectId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_media.created',
      targetType: 'project_media',
      targetId: created.id,
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async updateMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    mediaId: string,
    input: UpdateProjectMediaDto
  ): Promise<ProjectMediaRecord> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    const before = await this.repository.findMedia(projectId, mediaId);
    if (!before) marketplaceError('MEDIA_NOT_FOUND');
    const retiringOnly =
      Object.keys(input).every((key) => key === 'isActive') && input.isActive === false;
    await this.authorize(
      principal,
      retiringOnly ? 'project_media:moderate' : 'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    await this.authorizeBrandAsset(principal, requestId, project, [before.kind, input.kind]);
    await this.validateMedia(project, {
      ...before,
      embedUrl: before.embedUrl ?? undefined,
      ...input,
    });
    const after = await this.repository.updateMedia(
      projectId,
      mediaId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: retiringOnly ? 'project_media.retired' : 'project_media.updated',
      targetType: 'project_media',
      targetId: mediaId,
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: after as unknown as Record<string, unknown>,
    });
    return after;
  }

  async retireMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    mediaId: string
  ): Promise<ProjectMediaRecord> {
    return this.updateMedia(principal, requestId, projectId, mediaId, { isActive: false });
  }

  async reorderMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: ReorderProjectMediaDto
  ): Promise<ProjectMediaRecord[]> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    const after = await this.repository.reorderMedia(
      projectId,
      input.items,
      actorFromPrincipal(principal),
      requestId
    );
    return after;
  }
}
