import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAccessService } from './admin-access.service';
import type { AdminAccess } from './admin-access.types';

@ApiTags('me')
@Controller({ path: 'me/admin-access', version: '1' })
export class AdminAccessController {
  constructor(private readonly service: AdminAccessService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "The signed-in user's admin roles, to show admin entry points. The admin panel authorizes again.",
  })
  @ApiOkResponse({ description: 'Global role and per-project/enterprise memberships.' })
  get(@Headers('authorization') authorization: string | undefined): Promise<AdminAccess> {
    if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
    return this.service.forToken(authorization);
  }
}
