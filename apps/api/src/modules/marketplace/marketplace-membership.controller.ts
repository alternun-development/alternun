import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import {
  ApiErrorDto,
  ChangeProjectMembershipDto,
  CreateProjectMembershipDto,
  ListProjectMembershipsQueryDto,
  RevokeProjectMembershipDto,
} from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MarketplaceMembershipService } from './marketplace-membership.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('admin project memberships')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/project-memberships', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceMembershipAdminController {
  constructor(private readonly service: MarketplaceMembershipService) {}

  @Get()
  @RequireMarketplacePermission('project_memberships:read')
  @ApiOkResponse({ description: 'Memberships visible within the actor scope.' })
  list(@Req() request: FastifyAdminRequest, @Query() query: ListProjectMembershipsQueryDto) {
    return this.service.list(request.adminPrincipal!, requestId(request), query);
  }

  @Post()
  @RequireMarketplacePermission('project_memberships:assign')
  @ApiCreatedResponse({ description: 'Granted project membership.' })
  grant(@Req() request: FastifyAdminRequest, @Body() body: CreateProjectMembershipDto) {
    return this.service.grant(request.adminPrincipal!, requestId(request), body);
  }

  @Get(':id')
  @RequireMarketplacePermission('project_memberships:read')
  get(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.service.get(request.adminPrincipal!, requestId(request), id);
  }

  @Patch(':id')
  @RequireMarketplacePermission('project_memberships:assign')
  update(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ChangeProjectMembershipDto
  ) {
    return this.service.change(request.adminPrincipal!, requestId(request), id, body);
  }

  @Post(':id/revoke')
  @RequireMarketplacePermission('project_memberships:revoke')
  revoke(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: RevokeProjectMembershipDto
  ) {
    return this.service.revoke(request.adminPrincipal!, requestId(request), id, body.reason);
  }
}
