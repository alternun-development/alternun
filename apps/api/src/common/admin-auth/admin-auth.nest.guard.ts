import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ADMIN_PERMISSION_METADATA,
  authenticateAdminPrincipal,
  hasOrganizationScope,
  hasPermission,
  resolveAdminRuntimeOptions,
  type AdminPermission,
  type FastifyAdminRequest,
} from './admin-auth.guard';

/** Nest adapter for production admin controllers. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = resolveAdminRuntimeOptions();
    if (!options) {
      throw new UnauthorizedException('Admin authentication is not configured.');
    }

    const request = context.switchToHttp().getRequest<FastifyAdminRequest>();
    const principal = await authenticateAdminPrincipal(request.headers.authorization, options);
    if (principal === 'forbidden') {
      throw new ForbiddenException('Admin role is insufficient.');
    }
    if (!principal) {
      throw new UnauthorizedException('Invalid or expired admin token.');
    }

    const permission = Reflect.getMetadata(ADMIN_PERMISSION_METADATA, context.getHandler()) as
      | AdminPermission
      | undefined;
    const organizationId = (request.params as { organizationId?: string } | undefined)
      ?.organizationId;
    if (
      permission &&
      (!organizationId ||
        !hasPermission(principal, permission) ||
        !hasOrganizationScope(principal, organizationId))
    ) {
      throw new ForbiddenException('Admin permission or organization scope is insufficient.');
    }

    request.adminPrincipal = principal;
    return true;
  }
}
