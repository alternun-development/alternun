import { Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import {
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type FastifyAdminRequest,
} from '../../common/admin-auth/admin-auth.guard';
import { AdminAuthGuard } from '../../common/admin-auth/admin-auth.nest.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';

const MARKETPLACE_AUTHORIZATION = 'marketplace:authorization';
type MarketplaceScope = 'none' | 'enterprise' | 'project';
interface MarketplaceAuthorizationMetadata {
  permission: AdminPermission;
  scope: MarketplaceScope;
}

export function RequireMarketplacePermission(
  permission: AdminPermission,
  scope: MarketplaceScope = 'none'
) {
  return SetMetadata(MARKETPLACE_AUTHORIZATION, {
    permission,
    scope,
  } satisfies MarketplaceAuthorizationMetadata);
}

function isGlobalRole(roles: readonly string[]): boolean {
  return roles.some((role) => ['platform_owner', 'internal_admin', 'moderator'].includes(role));
}

@Injectable()
export class MarketplaceAdminGuard implements CanActivate {
  constructor(
    private readonly authentication: AdminAuthGuard,
    private readonly repository: MarketplaceAdminRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.authentication.canActivate(context);
    const request = context.switchToHttp().getRequest<FastifyAdminRequest>();
    const principal = request.adminPrincipal!;
    const metadata = Reflect.getMetadata(MARKETPLACE_AUTHORIZATION, context.getHandler()) as
      | MarketplaceAuthorizationMetadata
      | undefined;
    if (!metadata) return true;

    const params = (request.params ?? {}) as Record<string, string | undefined>;
    let enterpriseId: string | undefined;
    let projectId: string | undefined;
    if (metadata.scope === 'enterprise') {
      enterpriseId = params.enterpriseId ?? params.id;
    } else if (metadata.scope === 'project') {
      projectId = params.projectId ?? params.id;
      if (projectId) {
        const project = await this.repository.findProject(projectId);
        if (!project) marketplaceError('PROJECT_NOT_FOUND');
        enterpriseId = project.enterpriseId;
      }
    }

    const permissionGranted = hasPermission(principal, metadata.permission);
    let hasScope = true;
    if (permissionGranted && enterpriseId && !isGlobalRole(principal.roles)) {
      hasScope = await this.repository.actorHasScope(
        actorFromPrincipal(principal),
        principal.roles,
        enterpriseId,
        projectId ?? null,
        rolesWithPermission(principal, metadata.permission)
      );
    }
    if (!permissionGranted || !hasScope) {
      const reasonCode = !hasScope
        ? projectId
          ? 'PROJECT_SCOPE_DENIED'
          : 'ENTERPRISE_SCOPE_DENIED'
        : 'PERMISSION_DENIED';
      await this.repository.audit({
        actor: actorFromPrincipal(principal),
        action: 'authorization.denied',
        targetType: projectId ? 'project' : enterpriseId ? 'enterprise' : 'marketplace',
        enterpriseId,
        projectId,
        requestId: String(request.id ?? request.headers['x-request-id'] ?? 'unknown'),
        result: 'denied',
        reasonCode,
      });
      marketplaceError(reasonCode);
    }
    return true;
  }
}
