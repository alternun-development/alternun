import { Injectable } from '@nestjs/common';
import { hasPermission, type AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';
import { validateMedalImageUrl } from './medal.service';
import { HonorAwardRepository, type HonorAwardOwner } from './honor-award.repository';
import {
  HONOR_AWARD_AUDIENCES,
  HONOR_AWARD_KINDS,
  HONOR_AWARD_TIERS,
  type CreateHonorAwardRecipeInput,
  type HonorAwardGrantRecord,
  type HonorAwardRecipeInput,
  type HonorAwardRecipeRecord,
  type HonorAwardRecipientInput,
  type HonorAwardView,
} from './honor-award.types';

const TEXT_LIMITS: ReadonlyArray<[keyof HonorAwardRecipeInput, number]> = [
  ['classification', 80],
  ['purpose', 500],
  ['eventName', 120],
  ['venueName', 120],
  ['venueLocation', 160],
];
const IMAGE_FIELDS = ['badgeImageUrl', 'frontImageUrl', 'backImageUrl'] as const;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function invalid(): never {
  return marketplaceError('HONOR_AWARD_INPUT_INVALID');
}

/** Trims text fields and turns blank optional text into null. */
export function normalizeRecipeInput<T extends HonorAwardRecipeInput>(input: T): T {
  const normalized: HonorAwardRecipeInput = { ...input };
  if (normalized.title !== undefined) normalized.title = normalized.title.trim();
  for (const [field] of TEXT_LIMITS) {
    const value = normalized[field];
    if (typeof value === 'string') {
      (normalized as Record<string, unknown>)[field] = value.trim() || null;
    }
  }
  for (const field of IMAGE_FIELDS) {
    const value = normalized[field];
    if (typeof value === 'string') normalized[field] = value.trim() || null;
  }
  return normalized as T;
}

export function checkRecipeInput(input: HonorAwardRecipeInput): void {
  if (input.title !== undefined && (input.title.length < 1 || input.title.length > 80)) invalid();
  if (input.kind !== undefined && !HONOR_AWARD_KINDS.includes(input.kind)) invalid();
  if (input.tier !== undefined && !HONOR_AWARD_TIERS.includes(input.tier)) invalid();
  if (input.audience !== undefined && !HONOR_AWARD_AUDIENCES.includes(input.audience)) invalid();
  for (const [field, max] of TEXT_LIMITS) {
    const value = input[field];
    if (typeof value === 'string' && value.length > max) invalid();
  }
  if (
    input.eventYear !== undefined &&
    input.eventYear !== null &&
    (!Number.isInteger(input.eventYear) || input.eventYear < 2000 || input.eventYear > 2100)
  ) {
    invalid();
  }
  if (
    input.airsAmount !== undefined &&
    (!Number.isInteger(input.airsAmount) || input.airsAmount < 0 || input.airsAmount > 1_000_000)
  ) {
    invalid();
  }
}

@Injectable()
export class HonorAwardService {
  constructor(
    private readonly repository: HonorAwardRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  private async requireManager(principal: AdminPrincipal, requestId: string): Promise<void> {
    if (hasPermission(principal, 'medals:manage')) return;
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'honor_award',
      requestId,
      result: 'denied',
      reasonCode: 'PERMISSION_DENIED',
    });
    marketplaceError('PERMISSION_DENIED');
  }

  private async checkLinks(input: HonorAwardRecipeInput): Promise<void> {
    for (const field of IMAGE_FIELDS) {
      const value = input[field];
      if (typeof value === 'string') {
        await validateMedalImageUrl(value, () =>
          this.adminRepository.allowedHosts('gallery_image')
        );
      }
    }
    if (input.projectId && !(await this.repository.projectExists(input.projectId))) {
      marketplaceError('PROJECT_NOT_FOUND');
    }
    if (
      input.partnerEnterpriseId &&
      !(await this.repository.findEnterprise({ id: input.partnerEnterpriseId }))
    ) {
      marketplaceError('ENTERPRISE_NOT_FOUND');
    }
  }

  async listRecipes(
    principal: AdminPrincipal,
    requestId: string
  ): Promise<HonorAwardRecipeRecord[]> {
    await this.requireManager(principal, requestId);
    return this.repository.listRecipes();
  }

  async createRecipe(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateHonorAwardRecipeInput
  ): Promise<HonorAwardRecipeRecord> {
    await this.requireManager(principal, requestId);
    const normalized = normalizeRecipeInput(input);
    checkRecipeInput(normalized);
    await this.checkLinks(normalized);
    const created = await this.repository.createRecipe(normalized, actorFromPrincipal(principal));
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'honor_award_recipe.created',
      targetType: 'honor_award_recipe',
      targetId: created.id,
      projectId: created.projectId ?? undefined,
      requestId,
      result: 'allowed',
      afterState: { ...created },
    });
    return created;
  }

  async updateRecipe(
    principal: AdminPrincipal,
    requestId: string,
    recipeId: string,
    input: HonorAwardRecipeInput
  ): Promise<HonorAwardRecipeRecord> {
    await this.requireManager(principal, requestId);
    if (Object.values(input).every((value) => value === undefined)) invalid();
    const normalized = normalizeRecipeInput(input);
    checkRecipeInput(normalized);
    await this.checkLinks(normalized);
    const before = await this.repository.findRecipe(recipeId);
    if (!before) marketplaceError('HONOR_AWARD_NOT_FOUND');
    const updated = await this.repository.updateRecipe(recipeId, normalized);
    if (!updated) marketplaceError('HONOR_AWARD_NOT_FOUND');
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'honor_award_recipe.updated',
      targetType: 'honor_award_recipe',
      targetId: recipeId,
      requestId,
      result: 'allowed',
      beforeState: { ...before },
      afterState: { ...updated },
    });
    return updated;
  }

  async listGrants(
    principal: AdminPrincipal,
    requestId: string,
    recipeId: string
  ): Promise<HonorAwardGrantRecord[]> {
    await this.requireManager(principal, requestId);
    if (!(await this.repository.findRecipe(recipeId))) marketplaceError('HONOR_AWARD_NOT_FOUND');
    return this.repository.listGrantsForRecipe(recipeId);
  }

  /** Gives a recipe to a person (by account email) or an enterprise; it waits to be claimed. */
  async grant(
    principal: AdminPrincipal,
    requestId: string,
    recipeId: string,
    recipient: HonorAwardRecipientInput
  ): Promise<HonorAwardGrantRecord> {
    await this.requireManager(principal, requestId);
    const recipe = await this.repository.findRecipe(recipeId);
    if (!recipe) marketplaceError('HONOR_AWARD_NOT_FOUND');
    if (!recipe.isActive) marketplaceError('HONOR_AWARD_NOT_CLAIMABLE');
    if (recipe.audience !== recipient.recipientType)
      marketplaceError('HONOR_AWARD_AUDIENCE_MISMATCH');
    const trimmedNote = recipient.note?.trim();
    const note = trimmedNote ? trimmedNote : null;
    if (note && note.length > 300) invalid();

    let target: { userId: string } | { enterpriseId: string };
    if (recipient.recipientType === 'user') {
      const email = recipient.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email) || email.length > 320) invalid();
      const userId = await this.repository.findUserIdByEmail(email);
      if (!userId) marketplaceError('HONOR_AWARD_RECIPIENT_NOT_FOUND');
      target = { userId };
    } else {
      const enterprise = await this.repository.findEnterprise({ id: recipient.enterpriseId });
      if (!enterprise) marketplaceError('HONOR_AWARD_RECIPIENT_NOT_FOUND');
      target = { enterpriseId: enterprise.id };
    }

    const created = await this.repository.insertGrant({
      recipeId,
      recipientType: recipient.recipientType,
      ...target,
      note,
      actor: actorFromPrincipal(principal),
    });
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'honor_award.granted',
      targetType: 'honor_award_grant',
      targetId: created.id,
      enterpriseId: created.enterpriseId ?? undefined,
      requestId,
      result: 'allowed',
      afterState: { ...created },
    });
    return created;
  }

  async revoke(
    principal: AdminPrincipal,
    requestId: string,
    grantId: string
  ): Promise<HonorAwardGrantRecord> {
    await this.requireManager(principal, requestId);
    const before = await this.repository.findGrant(grantId);
    if (!before) marketplaceError('HONOR_AWARD_NOT_FOUND');
    const revoked = await this.repository.revokeGrant(grantId);
    if (!revoked) marketplaceError('HONOR_AWARD_NOT_CLAIMABLE');
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'honor_award.revoked',
      targetType: 'honor_award_grant',
      targetId: grantId,
      enterpriseId: revoked.enterpriseId ?? undefined,
      requestId,
      result: 'allowed',
      beforeState: { ...before },
      afterState: { ...revoked },
    });
    return revoked;
  }

  /** Pending and claimed awards of a person or enterprise, newest first. */
  listForOwner(owner: HonorAwardOwner): Promise<HonorAwardView[]> {
    return this.repository.listViews(owner, false);
  }

  /** What anyone can see on an enterprise page: only the awards it already claimed. */
  async listPublicForEnterprise(slug: string): Promise<HonorAwardView[]> {
    const enterprise = await this.repository.findEnterprise({ slug });
    if (!enterprise || enterprise.status !== 'active') marketplaceError('ENTERPRISE_NOT_FOUND');
    return this.repository.listViews({ enterpriseId: enterprise.id }, true);
  }

  async claim(owner: HonorAwardOwner, grantId: string): Promise<HonorAwardView> {
    const claimed = await this.repository.claimGrant(grantId, owner);
    if (!claimed) marketplaceError('HONOR_AWARD_NOT_CLAIMABLE');
    const view = await this.repository.findView(grantId);
    if (!view) marketplaceError('HONOR_AWARD_NOT_FOUND');
    return view;
  }
}
