import { Injectable, Logger, Optional } from '@nestjs/common';
import { hasPermission, type AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';
import { validateMedalImageUrl } from './medal.service';
import { HonorAwardRepository, type HonorAwardOwner } from './honor-award.repository';
import { AirsReportService } from './airs-report.service';
import { claimWaitingAirsReports } from '../auth-exchange/airs-report-claim';
import {
  claimCodeHint,
  generateClaimCode,
  hashClaimCode,
  normalizeClaimCode,
} from './honor-award-codes';
import {
  HONOR_AWARD_AUDIENCES,
  HONOR_AWARD_KINDS,
  HONOR_AWARD_TIERS,
  type CreateHonorAwardRecipeInput,
  type EnterpriseHonorAwardGrantInput,
  type HonorAwardCatalogItem,
  type HonorAwardClaimCodeCreated,
  type HonorAwardClaimCodeInput,
  type HonorAwardClaimCodeRecord,
  type HonorAwardGrantRecord,
  type HonorAwardRedeemResult,
  type HonorAwardSendResult,
  type HonorAwardGuestSummary,
  type HonorAwardRecipeInput,
  type HonorAwardRecipeRecord,
  type HonorAwardRecipientInput,
  type HonorAwardView,
} from './honor-award.types';

const TEXT_LIMITS: ReadonlyArray<[keyof HonorAwardRecipeInput, number]> = [
  ['classification', 80],
  ['purpose', 500],
  ['eventName', 120],
  ['eventDates', 80],
  ['venueName', 120],
  ['venueLocation', 160],
];
const IMAGE_FIELDS = ['badgeImageUrl', 'frontImageUrl', 'backImageUrl'] as const;
// Linear-time check (no backtracking between overlapping character classes): one @, a dot in the
// domain, no spaces. Callers also cap the length before testing.
function isEmail(value: string): boolean {
  if (value.length > 320 || /\s/.test(value)) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
const ART_PRESET_PATTERN = /^[a-z0-9_]{1,40}$/;
const REFERENCE_MAX = 80;

function invalid(): never {
  return marketplaceError('HONOR_AWARD_INPUT_INVALID');
}

/** A trimmed reference such as a reservation number, or null when blank. */
export function normalizeReference(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length > REFERENCE_MAX) invalid();
  return trimmed;
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
  if (typeof normalized.artPreset === 'string') {
    normalized.artPreset = normalized.artPreset.trim().toLowerCase() || null;
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
  if (typeof input.artPreset === 'string' && !ART_PRESET_PATTERN.test(input.artPreset)) {
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
  private readonly logger = new Logger(HonorAwardService.name);

  constructor(
    private readonly repository: HonorAwardRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    // Optional so unit tests of the recipe and grant rules can leave it out.
    @Optional() private readonly airsReports?: AirsReportService
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
    const reference =
      recipient.recipientType === 'user' ? normalizeReference(recipient.reference) : null;

    let target: { userId: string } | { enterpriseId: string };
    if (recipient.recipientType === 'user') {
      const email = recipient.email.trim().toLowerCase();
      if (!isEmail(email)) invalid();
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
      reference,
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

  /** Reporters of an ally (who can give Airs) can also give its honor awards. */
  private async requireAllyGranter(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string
  ): Promise<void> {
    if (hasPermission(principal, 'airs_reports:submit')) return;
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'honor_award',
      enterpriseId,
      requestId,
      result: 'denied',
      reasonCode: 'PERMISSION_DENIED',
    });
    marketplaceError('PERMISSION_DENIED');
  }

  /** The honor awards for people that this ally backs, which its team can give. */
  async listGrantableForEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string
  ): Promise<HonorAwardRecipeRecord[]> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    return this.repository.listRecipesForPartner(enterpriseId);
  }

  /**
   * An ally gives one of its honor awards to a person by email. An award with Airs goes through
   * an Airs report of the award's project (daily and monthly limits, approvers, ledger and the
   * recipient email with the award art); the award is given when the report is released, also
   * to people who sign up later. An award without Airs is given right away, once per person or
   * once per reference (e.g. a reservation number).
   */
  async grantFromEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    input: EnterpriseHonorAwardGrantInput
  ): Promise<HonorAwardSendResult> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    const recipe = await this.requireAllyRecipe(enterpriseId, input.recipeId);
    const email = input.email.trim().toLowerCase();
    if (!isEmail(email)) invalid();
    const trimmedNote = input.note?.trim();
    const note = trimmedNote ? trimmedNote : null;
    if (note && note.length > 300) invalid();
    const reference = normalizeReference(input.reference);
    const trimmedName = input.recipientName?.trim();
    const recipientName = trimmedName ? trimmedName : undefined;
    if (recipientName && recipientName.length > 120) invalid();
    const userId = await this.repository.findUserIdByEmail(email);

    if (recipe.airsAmount > 0) {
      const medal = recipe.projectId
        ? await this.repository.findHonorMedal(recipe.id, recipe.projectId)
        : null;
      if (!recipe.projectId || !medal || !this.airsReports) {
        marketplaceError('HONOR_AWARD_AIRS_NOT_CONFIGURED');
      }
      // Without a reference the award is given once per person, as in the direct grant.
      if (!reference) {
        const holds = userId ? await this.repository.holdsRecipe(userId, recipe.id) : false;
        const waiting = holds ? true : await this.repository.hasOpenMedalReport(email, medal.id);
        if (waiting) marketplaceError('HONOR_AWARD_ALREADY_GRANTED');
      }
      const response = await this.airsReports.submit(principal, requestId, recipe.projectId, {
        recipientEmail: email,
        recipientName,
        amount: recipe.airsAmount,
        concept: honorAwardConcept(recipe),
        medalId: medal.id,
        documentNumber: reference ?? `GALARDON-${recipe.id.slice(0, 8).toUpperCase()}`,
      });
      await this.adminRepository.audit({
        actor: actorFromPrincipal(principal),
        action: 'honor_award.sent',
        targetType: 'airs_report',
        targetId: response.report.id,
        enterpriseId,
        requestId,
        result: 'allowed',
        afterState: { recipeId: recipe.id, reportStatus: response.report.status },
      });
      return {
        kind: 'airs_report',
        reportId: response.report.id,
        reportStatus: response.report.status,
        airsAmount: recipe.airsAmount,
      };
    }

    if (!userId) marketplaceError('HONOR_AWARD_RECIPIENT_NOT_FOUND');
    const created = await this.repository.insertGrant({
      recipeId: recipe.id,
      recipientType: 'user',
      userId,
      reference,
      note,
      actor: actorFromPrincipal(principal),
    });
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'honor_award.granted',
      targetType: 'honor_award_grant',
      targetId: created.id,
      enterpriseId,
      requestId,
      result: 'allowed',
      afterState: { ...created },
    });
    return { kind: 'grant', grantId: created.id };
  }

  /** An active award for people backed by this ally, or a not-found error. */
  private async requireAllyRecipe(
    enterpriseId: string,
    recipeId: string
  ): Promise<HonorAwardRecipeRecord> {
    const recipe = await this.repository.findRecipe(recipeId);
    if (!recipe || recipe.partnerEnterpriseId !== enterpriseId || recipe.audience !== 'user') {
      marketplaceError('HONOR_AWARD_NOT_FOUND');
    }
    if (!recipe.isActive) marketplaceError('HONOR_AWARD_NOT_CLAIMABLE');
    return recipe;
  }

  /** The ally's claim codes, newest first (never the codes themselves). */
  async listClaimCodes(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string
  ): Promise<HonorAwardClaimCodeRecord[]> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    return this.repository.listClaimCodes(enterpriseId);
  }

  /**
   * A new claim code for one of the ally's awards. The code is returned once; only its hash is
   * kept. It is redeemed as if its creator gave the award, so the creator needs a verified email
   * (Airs reports by an unverified submitter are never auto-approved) and keeps needing their
   * access: each redemption checks it again.
   */
  async createClaimCode(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    input: HonorAwardClaimCodeInput
  ): Promise<HonorAwardClaimCodeCreated> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    const recipe = await this.requireAllyRecipe(enterpriseId, input.recipeId);
    if (recipe.airsAmount > 0) {
      const medal = recipe.projectId
        ? await this.repository.findHonorMedal(recipe.id, recipe.projectId)
        : null;
      if (!medal) marketplaceError('HONOR_AWARD_AIRS_NOT_CONFIGURED');
    }
    const trimmedLabel = input.label?.trim();
    const label = trimmedLabel ? trimmedLabel : null;
    if (label && label.length > 80) invalid();
    if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1) invalid();
    if (input.maxRedemptions > 10_000) invalid();
    if (!Number.isInteger(input.validDays) || input.validDays < 1 || input.validDays > 365) {
      invalid();
    }
    const email = principal.email?.trim().toLowerCase();
    if (!email || principal.emailVerified !== true) {
      marketplaceError('HONOR_CODE_CREATOR_EMAIL_REQUIRED');
    }

    const code = generateClaimCode();
    const normalized = normalizeClaimCode(code) as string;
    const actor = actorFromPrincipal(principal);
    const record = await this.repository.insertClaimCode({
      recipeId: recipe.id,
      enterpriseId,
      codeHash: hashClaimCode(normalized),
      hint: claimCodeHint(normalized),
      label,
      maxRedemptions: input.maxRedemptions,
      expiresAt: new Date(Date.now() + input.validDays * 86_400_000).toISOString(),
      creator: { issuer: actor.issuer, subject: actor.subject, roles: [...actor.roles], email },
    });
    await this.adminRepository.audit({
      actor,
      action: 'honor_award.code_created',
      targetType: 'honor_award_claim_code',
      targetId: record.id,
      enterpriseId,
      requestId,
      result: 'allowed',
      afterState: { ...record },
    });
    return { code, record };
  }

  async revokeClaimCode(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    codeId: string
  ): Promise<HonorAwardClaimCodeRecord> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    const actor = actorFromPrincipal(principal);
    const revoked = await this.repository.revokeClaimCode(codeId, enterpriseId, actor);
    if (!revoked) marketplaceError('HONOR_CODE_NOT_FOUND');
    await this.adminRepository.audit({
      actor,
      action: 'honor_award.code_revoked',
      targetType: 'honor_award_claim_code',
      targetId: revoked.id,
      enterpriseId,
      requestId,
      result: 'allowed',
      afterState: { ...revoked },
    });
    return revoked;
  }

  /**
   * A person redeems a code. The checks (window, uses, one per person, attempt limit, the
   * creator's access) and the Airs report run in one SQL function; the emails follow.
   */
  async redeemClaimCode(
    userId: string,
    code: string,
    requestId: string
  ): Promise<HonorAwardRedeemResult> {
    const normalized = normalizeClaimCode(code);
    // A malformed code never reaches the database, but it is answered like an unknown one.
    if (!normalized) marketplaceError('HONOR_CODE_INVALID');
    const result = await this.repository.redeemClaimCode(
      userId,
      hashClaimCode(normalized),
      requestId
    );
    if (result.ok !== true) {
      marketplaceError(
        typeof result.reasonCode === 'string' ? result.reasonCode : 'HONOR_CODE_INVALID'
      );
    }
    const reportId = typeof result.reportId === 'string' ? result.reportId : null;
    if (reportId) await this.airsReports?.notifyReport(reportId);
    return {
      recipeId: String(result.recipeId ?? ''),
      airsAmount: Number(result.airsAmount ?? 0),
      reportStatus: typeof result.reportStatus === 'string' ? result.reportStatus : null,
      grantId: typeof result.grantId === 'string' ? result.grantId : null,
    };
  }

  /** How many of this ally's honor awards a person holds, e.g. stays at its hotels. */
  async guestSummary(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    email: string
  ): Promise<HonorAwardGuestSummary> {
    await this.requireAllyGranter(principal, requestId, enterpriseId);
    const normalized = email.trim().toLowerCase();
    if (!isEmail(normalized)) invalid();
    const userId = await this.repository.findUserIdByEmail(normalized);
    if (!userId) return { found: false, total: 0, byRecipe: [] };
    const grants = await this.repository.listPartnerGrantsForUser(enterpriseId, userId);
    const counts = new Map<string, { recipeId: string; title: string; count: number }>();
    for (const grant of grants) {
      const current = counts.get(grant.recipeId) ?? { ...grant, count: 0 };
      current.count += 1;
      counts.set(grant.recipeId, current);
    }
    return { found: true, total: grants.length, byRecipe: Array.from(counts.values()) };
  }

  /** Pending and claimed awards of a person or enterprise, newest first. */
  listForOwner(owner: HonorAwardOwner): Promise<HonorAwardView[]> {
    return this.repository.listViews(owner, false);
  }

  /**
   * The person's awards for Legado. First releases any Airs report still waiting for their
   * email, so a medal sent before they signed up shows up when they open Legado.
   */
  async listForUser(
    userId: string,
    claim: typeof claimWaitingAirsReports = claimWaitingAirsReports
  ): Promise<HonorAwardView[]> {
    const email = await this.repository.findVerifiedEmail(userId).catch(() => null);
    if (email) await claim({ userId, email }, this.logger);
    return this.repository.listViews({ userId }, false);
  }

  /** Active medals for people that this person does not hold yet (shown locked). */
  async listCatalogForUser(userId: string): Promise<HonorAwardCatalogItem[]> {
    const [catalog, held] = await Promise.all([
      this.repository.listUserCatalog(),
      this.repository.listViews({ userId }, false),
    ]);
    const heldRecipes = new Set(held.map((view) => view.recipe.id));
    return catalog.filter((item) => !heldRecipes.has(item.recipe.id));
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

/** "Galardón Manglar Verde · Tour Callaway Colombia": the reason on the Airs report. */
export function honorAwardConcept(
  recipe: Pick<HonorAwardRecipeRecord, 'title' | 'eventName'>
): string {
  return ['Galardón', recipe.title].join(' ') + (recipe.eventName ? ` · ${recipe.eventName}` : '');
}
