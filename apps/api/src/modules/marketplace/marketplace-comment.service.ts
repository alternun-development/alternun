import { Inject, Injectable } from '@nestjs/common';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import {
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import { MarketplaceCommentRepository } from './marketplace-comment.repository';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository, MarketplacePublicRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type CommentStatus,
  type ProjectCommentRecord,
  type PublicProjectComment,
} from './marketplace.types';

export type ResolveCommentUserId = (authorization: string) => Promise<string>;
export const MARKETPLACE_COMMENT_USER_RESOLVER = Symbol('MARKETPLACE_COMMENT_USER_RESOLVER');

export const marketplaceCommentUserResolver: ResolveCommentUserId = (authorization) =>
  resolveUserId(authorization);

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) =>
    ['platform_owner', 'internal_admin', 'moderator'].includes(role)
  );
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80)
    marketplaceError('VALIDATION_FAILED');
}

function validatedBody(body: string): string {
  const trimmed = typeof body === 'string' ? body.trim() : '';
  if ([...trimmed].length < 1 || [...trimmed].length > 1000 || /\p{Cc}/u.test(trimmed))
    marketplaceError('COMMENT_INPUT_INVALID');
  return trimmed;
}

@Injectable()
export class MarketplaceCommentService {
  constructor(
    private readonly repository: MarketplaceCommentRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    private readonly publicRepository: MarketplacePublicRepository,
    @Inject(MARKETPLACE_COMMENT_USER_RESOLVER)
    private readonly resolveCommentUserId: ResolveCommentUserId
  ) {}

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    code: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'project_comment',
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async authorizeProject(
    principal: AdminPrincipal,
    permission: AdminPermission,
    requestId: string,
    projectId: string
  ): Promise<void> {
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    if (!hasPermission(principal, permission))
      await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
    if (!isGlobal(principal)) {
      const allowed = await this.adminRepository.actorHasScope(
        actorFromPrincipal(principal),
        principal.roles,
        project.enterpriseId,
        projectId,
        rolesWithPermission(principal, permission)
      );
      if (!allowed) await this.deny(principal, requestId, projectId, 'PROJECT_SCOPE_DENIED');
    }
  }

  async listVisible(
    slug: string,
    page = 1,
    perPage = 20
  ): Promise<{ data: PublicProjectComment[]; page: number; perPage: number; total: number }> {
    validateSlug(slug);
    const published = await this.publicRepository.findPublishedBySlug(slug);
    if (!published || published.project.status !== 'published')
      marketplaceError('PROJECT_NOT_FOUND');
    const comments = await this.repository.listVisible(published.project.id);
    const start = (page - 1) * perPage;
    return {
      data: comments.slice(start, start + perPage),
      page,
      perPage,
      total: comments.length,
    };
  }

  async create(
    slug: string,
    authorization: string | undefined,
    body: string,
    requestId: string
  ): Promise<{ id: string; status: 'pending'; body: string; createdAt: string }> {
    if (!authorization?.trim()) marketplaceError('USER_AUTH_REQUIRED');
    let userId: string;
    try {
      userId = await this.resolveCommentUserId(authorization);
    } catch {
      return marketplaceError('USER_AUTH_REQUIRED');
    }
    const author = await this.repository.findVerifiedAuthor(userId);
    if (!author) marketplaceError('USER_AUTH_REQUIRED');
    validateSlug(slug);
    const published = await this.publicRepository.findPublishedBySlug(slug);
    if (!published || published.project.status !== 'published')
      marketplaceError('PROJECT_NOT_FOUND');
    const comment = await this.repository.create(
      published.project.id,
      author,
      validatedBody(body),
      requestId
    );
    return { id: comment.id, status: 'pending', body: comment.body, createdAt: comment.createdAt };
  }

  async listAdmin(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    status?: CommentStatus
  ): Promise<ProjectCommentRecord[]> {
    await this.authorizeProject(principal, 'comments:read', requestId, projectId);
    return this.repository.listAdmin(projectId, status);
  }

  async moderate(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    commentId: string,
    action: 'approve' | 'reject' | 'hide' | 'restore',
    reason?: string
  ): Promise<ProjectCommentRecord> {
    await this.authorizeProject(principal, 'comments:moderate', requestId, projectId);
    const targetStatus =
      action === 'reject' ? 'rejected' : action === 'hide' ? 'hidden' : 'visible';
    const cleanReason = reason?.trim();
    if ((action === 'reject' || action === 'hide') && !cleanReason)
      marketplaceError('COMMENT_REASON_REQUIRED');
    const existing = await this.repository.findAdmin(projectId, commentId);
    if (!existing) marketplaceError('COMMENT_NOT_FOUND');
    return this.repository.moderate(
      commentId,
      targetStatus,
      actorFromPrincipal(principal),
      requestId,
      cleanReason
    );
  }
}
