import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { CreateProjectTypeDto, SetProjectTypeDto, UpdateProjectTypeDto } from './project-type.dto';
import { ProjectTypeService } from './project-type.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('admin project types')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/project-types', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class ProjectTypeAdminController {
  constructor(private readonly service: ProjectTypeService) {}

  @Get()
  @RequireMarketplacePermission('project_types:read')
  @ApiOkResponse({ description: 'Every project type, active and retired.' })
  list(@Req() request: FastifyAdminRequest) {
    return this.service.list(request.adminPrincipal!, requestId(request));
  }

  @Post()
  @RequireMarketplacePermission('project_types:manage')
  @ApiCreatedResponse({ description: 'The new project type.' })
  create(@Req() request: FastifyAdminRequest, @Body() body: CreateProjectTypeDto) {
    return this.service.create(request.adminPrincipal!, requestId(request), body);
  }

  @Patch(':code')
  @RequireMarketplacePermission('project_types:manage')
  @ApiOkResponse({ description: 'The updated project type.' })
  update(
    @Req() request: FastifyAdminRequest,
    @Param('code') code: string,
    @Body() body: UpdateProjectTypeDto
  ) {
    return this.service.update(request.adminPrincipal!, requestId(request), code, body);
  }
}

@ApiTags('admin project types')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/type', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class ProjectTypeAssignmentController {
  constructor(private readonly service: ProjectTypeService) {}

  @Put()
  @RequireMarketplacePermission('project_types:manage')
  @ApiOkResponse({ description: 'The project type of this project after the change.' })
  set(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: SetProjectTypeDto
  ) {
    return this.service.setProjectType(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      body.projectTypeCode
    );
  }
}
