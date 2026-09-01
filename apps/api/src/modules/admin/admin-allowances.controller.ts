import { Controller, Delete, Get, HttpCode, Param, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ADMIN_PERMISSION_METADATA,
  type AdminPermission,
} from '../../common/admin-auth/admin-auth.guard';
import { AdminAuthGuard } from '../../common/admin-auth/admin-auth.nest.guard';

function requireAdminPermission(permission: AdminPermission) {
  return SetMetadata(ADMIN_PERMISSION_METADATA, permission);
}

@Controller('admin/organizations/:organizationId/allowances')
@UseGuards(AdminAuthGuard)
export class AdminAllowancesController {
  @Get()
  @requireAdminPermission('allowances:read')
  list(@Param('organizationId') organizationId: string) {
    return { data: [], organizationId };
  }

  @Delete(':allowanceId')
  @HttpCode(204)
  @requireAdminPermission('allowances:write')
  remove(
    @Param('organizationId') _organizationId: string,
    @Param('allowanceId') _allowanceId: string
  ): void {}
}
