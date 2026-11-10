import { Inject, Injectable } from '@nestjs/common';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import { hasPermission, type AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { AdminAccessRepository } from './admin-access.service';
import { GLOBAL_ADMIN_ROLES } from './admin-access.types';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import type { EnterpriseRecord, ProjectRecord } from './marketplace.types';
import type { EnterpriseManageOverview, ProjectManageOverview } from './project-manage.types';

const APP_AUDIENCE = 'airs-app';

// Alternun-team fields; project admins never read them from the app.
const INTERNAL_PROJECT_FIELDS = ['internalContacts', 'pendingItems', 'internalNotes'] as const;

/**
 * Bridges an Airs app session to the admin principal the marketplace services expect, so the
 * in-app "Manage project" view reuses their permissions, validation and audit unchanged.
 *
 * - Alternun global admins (platform_admins, verified email) act as their global role.
 * - Everyone else acts with the roles of their active memberships covering the project, and the
 *   issuer/subject stored on those memberships, so scope checks match exactly as in the console.
 */
@Injectable()
export class ProjectManageAccess {
  /** Bearer token -> app user id; replaceable in tests. */
  resolveUser: (token: string) => Promise<string> = (token) => resolveUserId(token);
  /** Environment (ADMIN_AUTH_ISSUER); replaceable in tests. */
  env: Record<string, string | undefined> = process.env;

  constructor(
    @Inject(AdminAccessRepository) private readonly access: AdminAccessRepository,
    @Inject(MarketplaceAdminRepository) private readonly projects: MarketplaceAdminRepository
  ) {}

  async resolve(
    token: string,
    projectId: string
  ): Promise<{ principal: AdminPrincipal; project: ProjectRecord; isGlobalAdmin: boolean }> {
    const userId = await this.resolveUser(token);
    const project = await this.projects.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    const access = await this.principalFor(userId, project.enterpriseId, project.id);
    if (!access) marketplaceError('PROJECT_SCOPE_DENIED');
    return { project, ...access };
  }

  /** Same bridge for the in-app enterprise view: global admins or enterprise-wide members. */
  async resolveEnterprise(
    token: string,
    enterpriseId: string
  ): Promise<{ principal: AdminPrincipal; enterprise: EnterpriseRecord; isGlobalAdmin: boolean }> {
    const userId = await this.resolveUser(token);
    const enterprise = await this.projects.findEnterprise(enterpriseId);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    const access = await this.principalFor(userId, enterprise.id, null);
    if (!access) marketplaceError('ENTERPRISE_SCOPE_DENIED');
    return { enterprise, ...access };
  }

  private async principalFor(
    userId: string,
    enterpriseId: string,
    projectId: string | null
  ): Promise<{ principal: AdminPrincipal; isGlobalAdmin: boolean } | null> {
    const email = await this.access.findVerifiedEmail(userId);
    const globalRole = email ? await this.access.findGlobalRole(email) : null;
    if (globalRole && (GLOBAL_ADMIN_ROLES as readonly string[]).includes(globalRole)) {
      return {
        isGlobalAdmin: true,
        principal: {
          // The console's issuer, so memberships granted from the app also work there.
          iss: (this.env.ADMIN_AUTH_ISSUER ?? '').trim() || APP_AUDIENCE,
          aud: APP_AUDIENCE,
          sub: `airs-user:${userId}`,
          roles: [globalRole],
          organizationIds: [],
          email: email ?? undefined,
          emailVerified: true,
        },
      };
    }

    const identities = await this.access.listProjectMembershipIdentities(
      userId,
      enterpriseId,
      projectId
    );
    if (identities.length === 0) return null;
    const [first] = identities;
    return {
      isGlobalAdmin: false,
      principal: {
        iss: first.issuer,
        aud: APP_AUDIENCE,
        sub: first.subject,
        roles: [
          ...new Set(
            identities
              .filter((item) => item.issuer === first.issuer && item.subject === first.subject)
              .map((item) => item.role)
          ),
        ],
        organizationIds: [],
        email: email ?? undefined,
        emailVerified: Boolean(email),
      },
    };
  }
}

export function manageOverview(
  principal: AdminPrincipal,
  project: ProjectRecord,
  isGlobalAdmin: boolean
): ProjectManageOverview {
  const contentOnly = principal.roles.every((role) => ['sub_admin', 'moderator'].includes(role));
  const editContent = hasPermission(principal, 'projects:update');
  const visible: Record<string, unknown> = { ...project };
  if (!isGlobalAdmin) for (const field of INTERNAL_PROJECT_FIELDS) delete visible[field];
  return {
    project: visible as unknown as ProjectRecord,
    roles: [...principal.roles],
    isGlobalAdmin,
    can: {
      editContent,
      editProfile: editContent && !contentOnly,
      media:
        hasPermission(principal, 'project_media:write') ||
        hasPermission(principal, 'project_media:moderate'),
      team: hasPermission(principal, 'project_memberships:assign'),
      comments: hasPermission(principal, 'comments:moderate'),
    },
  };
}

// Alternun-team fields of an enterprise; enterprise admins never read them from the app.
const INTERNAL_ENTERPRISE_FIELDS = ['internalContacts', 'pendingItems', 'internalNotes'] as const;

export function enterpriseManageOverview(
  principal: AdminPrincipal,
  enterprise: EnterpriseRecord,
  isGlobalAdmin: boolean
): EnterpriseManageOverview {
  const visible: Record<string, unknown> = { ...enterprise };
  if (!isGlobalAdmin) for (const field of INTERNAL_ENTERPRISE_FIELDS) delete visible[field];
  const edit = hasPermission(principal, 'enterprises:update');
  return {
    enterprise: visible as unknown as EnterpriseRecord,
    roles: [...principal.roles],
    isGlobalAdmin,
    can: {
      editInfo: edit,
      images: edit,
      products: edit,
      team: hasPermission(principal, 'project_memberships:assign'),
    },
  };
}
