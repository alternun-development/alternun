import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import {
  ApiErrorDto,
  CreateEnterpriseDto,
  CreateProjectDto,
  CreateProjectMediaDto,
  ListProjectsQueryDto,
  LocaleQueryDto,
  ReorderProjectMediaDto,
  TransitionProjectDto,
  UpdateEnterpriseDto,
  UpdateProjectDto,
  UpdateProjectMediaDto,
} from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MarketplaceAdminService, MarketplacePublicService } from './marketplace.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('projects')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller({ path: 'projects', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class MarketplacePublicController {
  constructor(private readonly service: MarketplacePublicService) {}

  @Get()
  @ApiOperation({ summary: 'List published marketplace projects.' })
  @ApiOkResponse({ description: 'Published projects localized for the request.' })
  list(@Query() query: ListProjectsQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.service.list(
      query.locale,
      acceptLanguage,
      query.categoryCode,
      query.page,
      query.perPage
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published marketplace project by immutable slug.' })
  @ApiOkResponse({ description: 'Published project localized for the request.' })
  find(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string
  ) {
    return this.service.findBySlug(slug, query.locale, acceptLanguage);
  }
}

@ApiTags('admin enterprises')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/enterprises', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceEnterpriseAdminController {
  constructor(private readonly service: MarketplaceAdminService) {}

  @Get()
  @RequireMarketplacePermission('enterprises:read')
  @ApiOperation({ summary: 'List enterprises visible to the admin principal.' })
  @ApiOkResponse({ description: 'Scoped enterprise list.' })
  list(@Req() request: FastifyAdminRequest) {
    return this.service.listEnterprises(request.adminPrincipal!, requestId(request));
  }

  @Post()
  @RequireMarketplacePermission('enterprises:create')
  @ApiOperation({ summary: 'Create an active enterprise.' })
  @ApiCreatedResponse({ description: 'Created enterprise.' })
  create(@Req() request: FastifyAdminRequest, @Body() body: CreateEnterpriseDto) {
    return this.service.createEnterprise(request.adminPrincipal!, requestId(request), body);
  }

  @Get(':id')
  @RequireMarketplacePermission('enterprises:read', 'enterprise')
  @ApiOperation({ summary: 'Get an enterprise.' })
  get(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.service.getEnterprise(request.adminPrincipal!, requestId(request), id);
  }

  @Patch(':id')
  @RequireMarketplacePermission('enterprises:update', 'enterprise')
  @ApiOperation({ summary: 'Edit enterprise fields allowed for the admin role.' })
  update(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateEnterpriseDto
  ) {
    return this.service.updateEnterprise(request.adminPrincipal!, requestId(request), id, body);
  }
}

@ApiTags('admin projects')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceProjectAdminController {
  constructor(private readonly service: MarketplaceAdminService) {}

  @Get()
  @RequireMarketplacePermission('projects:read')
  @ApiOperation({ summary: 'List projects visible to the admin principal.' })
  list(@Req() request: FastifyAdminRequest) {
    return this.service.listProjects(request.adminPrincipal!, requestId(request));
  }

  @Post()
  @RequireMarketplacePermission('projects:create')
  @ApiOperation({ summary: 'Create a project in draft status.' })
  @ApiCreatedResponse({ description: 'Draft project.' })
  create(@Req() request: FastifyAdminRequest, @Body() body: CreateProjectDto) {
    return this.service.createProject(request.adminPrincipal!, requestId(request), body);
  }

  @Get(':id')
  @RequireMarketplacePermission('projects:read', 'project')
  get(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.service.getProject(request.adminPrincipal!, requestId(request), id);
  }

  @Patch(':id')
  @RequireMarketplacePermission('projects:update', 'project')
  update(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateProjectDto
  ) {
    return this.service.updateProject(request.adminPrincipal!, requestId(request), id, body);
  }

  @Post(':id/publish')
  @RequireMarketplacePermission('projects:publish', 'project')
  publish(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transition(
      request.adminPrincipal!,
      requestId(request),
      id,
      'published',
      body?.reason
    );
  }

  @Post(':id/pause')
  @RequireMarketplacePermission('projects:pause', 'project')
  pause(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transition(
      request.adminPrincipal!,
      requestId(request),
      id,
      'paused',
      body?.reason
    );
  }

  @Post(':id/resume')
  @RequireMarketplacePermission('projects:publish', 'project')
  resume(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transition(
      request.adminPrincipal!,
      requestId(request),
      id,
      'published',
      body?.reason
    );
  }

  @Post(':id/archive')
  @RequireMarketplacePermission('projects:archive', 'project')
  archive(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transition(
      request.adminPrincipal!,
      requestId(request),
      id,
      'archived',
      body?.reason
    );
  }

  @Get(':projectId/media')
  @RequireMarketplacePermission('project_media:read', 'project')
  listMedia(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    return this.service.listMedia(request.adminPrincipal!, requestId(request), projectId);
  }

  @Post(':projectId/media')
  @RequireMarketplacePermission('project_media:write', 'project')
  createMedia(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: CreateProjectMediaDto
  ) {
    return this.service.createMedia(request.adminPrincipal!, requestId(request), projectId, body);
  }

  @Patch(':projectId/media/:mediaId')
  @RequireMarketplacePermission('project_media:moderate', 'project')
  updateMedia(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @Body() body: UpdateProjectMediaDto
  ) {
    return this.service.updateMedia(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      mediaId,
      body
    );
  }

  @Put(':projectId/media/order')
  @RequireMarketplacePermission('project_media:write', 'project')
  reorderMedia(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: ReorderProjectMediaDto
  ) {
    return this.service.reorderMedia(request.adminPrincipal!, requestId(request), projectId, body);
  }

  @Delete(':projectId/media/:mediaId')
  @HttpCode(204)
  @RequireMarketplacePermission('project_media:moderate', 'project')
  async retireMedia(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string
  ): Promise<void> {
    await this.service.retireMedia(request.adminPrincipal!, requestId(request), projectId, mediaId);
  }
}
