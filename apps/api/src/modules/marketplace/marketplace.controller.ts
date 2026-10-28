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
  ApproveActivityCompletionDto,
  CreateActivityCompletionDto,
  CreateProjectActivityDto,
  CreateEnterpriseDto,
  CreateProjectDto,
  CreateProjectMediaDto,
  ListProjectsQueryDto,
  ListEnterprisesQueryDto,
  LocaleQueryDto,
  ReorderMarketplaceDto,
  ReorderProjectMediaDto,
  RejectActivityCompletionDto,
  ReverseActivityCompletionDto,
  TransitionProjectDto,
  TransitionActivityDto,
  UpdateEnterpriseDto,
  UpdateProjectDto,
  UpdateProjectActivityDto,
  UpdateProjectMediaDto,
} from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MarketplaceAdminService, MarketplacePublicService } from './marketplace.service';
import { MarketplaceActivityService } from './marketplace-activity.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('projects')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller({ path: 'projects', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class MarketplacePublicController {
  constructor(
    private readonly service: MarketplacePublicService,
    private readonly activityService: MarketplaceActivityService
  ) {}

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

  @Get(':slug/activities')
  @ApiOperation({ summary: 'List published activities for a published project.' })
  @ApiOkResponse({ description: 'Localized public activities without award policy fields.' })
  listActivities(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string
  ) {
    return this.activityService.listPublished(slug, query.locale, acceptLanguage);
  }
}

@ApiTags('enterprises')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller({ path: 'enterprises', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceEnterprisePublicController {
  constructor(private readonly service: MarketplacePublicService) {}

  @Get()
  @ApiOperation({ summary: 'List active enterprises with published marketplace projects.' })
  @ApiOkResponse({ description: 'Public enterprise directory.' })
  list(
    @Query() query: ListEnterprisesQueryDto,
    @Headers('accept-language') acceptLanguage?: string
  ) {
    return this.service.listEnterprises(query.locale, acceptLanguage, query.page, query.perPage);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active enterprise and its published projects.' })
  @ApiOkResponse({ description: 'Public enterprise detail.' })
  find(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string
  ) {
    return this.service.findEnterpriseBySlug(slug, query.locale, acceptLanguage);
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

  @Put('order')
  @RequireMarketplacePermission('enterprises:reorder')
  @ApiOperation({ summary: 'Set the marketplace order of every enterprise.' })
  @ApiOkResponse({ description: 'Enterprises in their new order.' })
  reorder(@Req() request: FastifyAdminRequest, @Body() body: ReorderMarketplaceDto) {
    return this.service.reorderEnterprises(request.adminPrincipal!, requestId(request), body);
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

  @Post(':id/pause')
  @RequireMarketplacePermission('enterprises:status', 'enterprise')
  @ApiOperation({ summary: 'Pause an enterprise without cascading project status.' })
  pause(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transitionEnterprise(
      request.adminPrincipal!,
      requestId(request),
      id,
      'paused',
      body?.reason
    );
  }

  @Post(':id/resume')
  @RequireMarketplacePermission('enterprises:status', 'enterprise')
  @ApiOperation({ summary: 'Resume an enterprise.' })
  resume(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transitionEnterprise(
      request.adminPrincipal!,
      requestId(request),
      id,
      'active',
      body?.reason
    );
  }

  @Post(':id/archive')
  @RequireMarketplacePermission('enterprises:status', 'enterprise')
  @ApiOperation({ summary: 'Archive an enterprise without cascading project status.' })
  archive(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TransitionProjectDto
  ) {
    return this.service.transitionEnterprise(
      request.adminPrincipal!,
      requestId(request),
      id,
      'archived',
      body?.reason
    );
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

  @Put('order')
  @RequireMarketplacePermission('projects:reorder')
  @ApiOperation({ summary: 'Set the marketplace order of every project.' })
  @ApiOkResponse({ description: 'Projects in their new order.' })
  reorder(@Req() request: FastifyAdminRequest, @Body() body: ReorderMarketplaceDto) {
    return this.service.reorderProjects(request.adminPrincipal!, requestId(request), body);
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

@ApiTags('admin project activities')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/activities', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceActivityAdminController {
  constructor(private readonly service: MarketplaceActivityService) {}

  @Get()
  @RequireMarketplacePermission('activities:read', 'project')
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    return this.service.list(request.adminPrincipal!, requestId(request), projectId);
  }

  @Post()
  @RequireMarketplacePermission('activities:write', 'project')
  @ApiCreatedResponse({ description: 'Draft activity.' })
  create(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: CreateProjectActivityDto
  ) {
    return this.service.create(request.adminPrincipal!, requestId(request), projectId, body);
  }

  @Get(':activityId')
  @RequireMarketplacePermission('activities:read', 'project')
  get(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string
  ) {
    return this.service.get(request.adminPrincipal!, requestId(request), projectId, activityId);
  }

  @Patch(':activityId')
  @RequireMarketplacePermission('activities:write', 'project')
  update(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string,
    @Body() body: UpdateProjectActivityDto
  ) {
    return this.service.update(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      activityId,
      body
    );
  }

  @Post(':activityId/publish')
  @RequireMarketplacePermission('activities:publish', 'project')
  publish(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string,
    @Body() body: TransitionActivityDto
  ) {
    return this.service.publish(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      activityId,
      body?.reason
    );
  }

  @Post(':activityId/pause')
  @RequireMarketplacePermission('activities:read', 'project')
  pause(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string,
    @Body() body: TransitionActivityDto
  ) {
    return this.service.pause(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      activityId,
      body?.reason
    );
  }
}

@ApiTags('admin activity completions')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceCompletionAdminController {
  constructor(private readonly service: MarketplaceActivityService) {}

  @Get('activities/:activityId/completions')
  @RequireMarketplacePermission('completions:read', 'project')
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string
  ) {
    return this.service.listCompletions(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      activityId
    );
  }

  @Post('activities/:activityId/completions')
  @RequireMarketplacePermission('completions:create', 'project')
  @ApiCreatedResponse({ description: 'Pending activity completion.' })
  create(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('activityId', new ParseUUIDPipe({ version: '4' })) activityId: string,
    @Body() body: CreateActivityCompletionDto
  ) {
    return this.service.createCompletion(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      activityId,
      body
    );
  }

  @Post('completions/:completionId/award')
  @RequireMarketplacePermission('completions:award', 'project')
  award(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('completionId', new ParseUUIDPipe({ version: '4' })) completionId: string,
    @Body() body: ApproveActivityCompletionDto
  ) {
    return this.service.awardCompletion(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      completionId,
      body
    );
  }

  @Post('completions/:completionId/reject')
  @RequireMarketplacePermission('completions:reject', 'project')
  reject(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('completionId', new ParseUUIDPipe({ version: '4' })) completionId: string,
    @Body() body: RejectActivityCompletionDto
  ) {
    return this.service.rejectCompletion(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      completionId,
      body
    );
  }

  @Post('completions/:completionId/reverse')
  @RequireMarketplacePermission('completions:reverse', 'project')
  reverse(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('completionId', new ParseUUIDPipe({ version: '4' })) completionId: string,
    @Body() body: ReverseActivityCompletionDto
  ) {
    return this.service.reverseCompletion(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      completionId,
      body
    );
  }
}
