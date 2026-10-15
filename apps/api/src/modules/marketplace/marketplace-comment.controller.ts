import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { MarketplaceCommentService } from './marketplace-comment.service';
import {
  ApiErrorDto,
  CreateProjectCommentDto,
  ListAdminProjectCommentsQueryDto,
  ListProjectCommentsQueryDto,
  ModerateProjectCommentDto,
} from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('project comments')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiTooManyRequestsResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'projects', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceCommentPublicController {
  constructor(private readonly service: MarketplaceCommentService) {}

  @Get(':slug/comments')
  @ApiOperation({ summary: 'List visible comments for a published project.' })
  @ApiOkResponse({ description: 'Paginated visible comments without internal identity fields.' })
  list(@Param('slug') slug: string, @Query() query: ListProjectCommentsQueryDto) {
    return this.service.listVisible(slug, query.page, query.perPage);
  }

  @Post(':slug/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a comment for moderation.' })
  @ApiCreatedResponse({ description: 'Pending project comment.' })
  create(
    @Req() request: FastifyRequest,
    @Param('slug') slug: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateProjectCommentDto
  ) {
    return this.service.create(slug, authorization, body.body, requestId(request));
  }
}

@ApiTags('admin project comments')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/comments', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceCommentAdminController {
  constructor(private readonly service: MarketplaceCommentService) {}

  @Get()
  @RequireMarketplacePermission('comments:read', 'project')
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: ListAdminProjectCommentsQueryDto
  ) {
    return this.service.listAdmin(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      query.status
    );
  }

  @Post(':commentId/approve')
  @HttpCode(200)
  @RequireMarketplacePermission('comments:moderate', 'project')
  approve(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string
  ) {
    return this.service.moderate(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      commentId,
      'approve'
    );
  }

  @Post(':commentId/reject')
  @HttpCode(200)
  @RequireMarketplacePermission('comments:moderate', 'project')
  reject(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    @Body() body: ModerateProjectCommentDto
  ) {
    return this.service.moderate(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      commentId,
      'reject',
      body.reason
    );
  }

  @Post(':commentId/hide')
  @HttpCode(200)
  @RequireMarketplacePermission('comments:moderate', 'project')
  hide(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    @Body() body: ModerateProjectCommentDto
  ) {
    return this.service.moderate(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      commentId,
      'hide',
      body.reason
    );
  }

  @Post(':commentId/restore')
  @HttpCode(200)
  @RequireMarketplacePermission('comments:moderate', 'project')
  restore(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string
  ) {
    return this.service.moderate(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      commentId,
      'restore'
    );
  }
}
