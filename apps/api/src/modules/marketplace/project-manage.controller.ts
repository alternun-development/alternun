import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CreateProjectMediaDto, CreateUploadUrlDto, UpdateProjectDto } from './marketplace.dto';
import { MarketplaceExceptionFilter, marketplaceError } from './marketplace.errors';
import { MarketplaceAdminService } from './marketplace.service';
import { MarketplaceCommentService } from './marketplace-comment.service';
import { MarketplaceMembershipService } from './marketplace-membership.service';
import {
  AddProjectTeamMemberDto,
  ModerateProjectCommentDto,
  RevokeProjectTeamMemberDto,
} from './project-manage.dto';
import { manageOverview, ProjectManageAccess } from './project-manage.service';
import type { CommentAction } from './project-manage.types';
import { COMMENT_STATUSES, type CommentStatus } from './marketplace.types';

const COMMENT_ACTIONS: readonly CommentAction[] = ['approve', 'reject', 'hide', 'restore'];

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

function bearer(authorization: string | undefined): string {
  if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
  return authorization;
}

/**
 * In-app "Manage project" API for project admins, sub admins and moderators (and Alternun
 * global admins), authorized with the Airs session. Each call reuses the console's services.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me/projects/:projectId/manage', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class ProjectManageController {
  constructor(
    private readonly access: ProjectManageAccess,
    private readonly projects: MarketplaceAdminService,
    private readonly memberships: MarketplaceMembershipService,
    private readonly comments: MarketplaceCommentService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Project, roles and what the user can manage on it.' })
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    const { principal, project, isGlobalAdmin } = await this.access.resolve(
      bearer(authorization),
      projectId
    );
    return manageOverview(principal, project, isGlobalAdmin);
  }

  @Patch()
  @ApiOperation({ summary: 'Edit project content and public profile.' })
  async update(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: UpdateProjectDto
  ) {
    const { principal, isGlobalAdmin } = await this.access.resolve(
      bearer(authorization),
      projectId
    );
    const project = await this.projects.updateProject(
      principal,
      requestId(request),
      projectId,
      body
    );
    return manageOverview(principal, project, isGlobalAdmin).project;
  }

  @Get('media')
  async listMedia(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.projects.listMedia(principal, requestId(request), projectId);
  }

  @Post('media/upload-url')
  async uploadUrl(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: CreateUploadUrlDto
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.projects.createUploadUrl(
      principal,
      requestId(request),
      { type: 'project', id: projectId },
      body
    );
  }

  @Post('media')
  async createMedia(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: CreateProjectMediaDto
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.projects.createMedia(principal, requestId(request), projectId, body);
  }

  @Delete('media/:mediaId')
  async retireMedia(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.projects.retireMedia(principal, requestId(request), projectId, mediaId);
  }

  @Get('team')
  async team(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.memberships.list(principal, requestId(request), { projectId });
  }

  @Post('team')
  async addTeamMember(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: AddProjectTeamMemberDto
  ) {
    const { principal, project } = await this.access.resolve(bearer(authorization), projectId);
    return this.memberships.grantByEmail(principal, requestId(request), {
      email: body.email,
      role: body.role,
      enterpriseId: project.enterpriseId,
      projectId,
      scopeType: 'project',
    });
  }

  @Post('team/:membershipId/revoke')
  async revokeTeamMember(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' })) membershipId: string,
    @Body() body: RevokeProjectTeamMemberDto
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    const membership = await this.memberships.get(principal, requestId(request), membershipId);
    // Only memberships of this project can be revoked from its manage view.
    if (membership.projectId !== projectId) marketplaceError('MEMBERSHIP_NOT_FOUND');
    return this.memberships.revoke(principal, requestId(request), membershipId, body.reason);
  }

  @Get('comments')
  async listComments(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query('status') status?: string
  ) {
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    const filter = (COMMENT_STATUSES as readonly string[]).includes(status ?? '')
      ? (status as CommentStatus)
      : undefined;
    return this.comments.listAdmin(principal, requestId(request), projectId, filter);
  }

  @Post('comments/:commentId/:action')
  async moderateComment(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    @Param('action') action: string,
    @Body() body: ModerateProjectCommentDto
  ) {
    if (!(COMMENT_ACTIONS as readonly string[]).includes(action))
      marketplaceError('VALIDATION_FAILED');
    const { principal } = await this.access.resolve(bearer(authorization), projectId);
    return this.comments.moderate(
      principal,
      requestId(request),
      projectId,
      commentId,
      action as CommentAction,
      body?.reason
    );
  }
}
