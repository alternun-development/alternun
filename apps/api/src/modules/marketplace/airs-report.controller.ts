import { randomUUID } from 'node:crypto';
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
  Res,
  UnauthorizedException,
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
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import {
  AirsReportReasonDto,
  AirsReportRecipientLookupQueryDto,
  ApproveAirsReportDto,
  ListAirsReportsQueryDto,
  SubmitAirsReportDto,
} from './airs-report.dto';
import { AirsReportService } from './airs-report.service';
import { ProjectClientService } from './project-client.service';
import { ProjectManageAccess } from './project-manage.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

// Fastify numbers requests per process (req-1, req-2, ...), so two submissions handled by
// different instances can share an id. Submit is idempotent per (actor, request id), which makes
// that collision swallow a different report. The key sent by the client (or a random one) keeps
// every submission distinct while a retry of the same submission stays idempotent.
export function submitRequestId(body: { requestKey?: string }): string {
  return body.requestKey ?? randomUUID();
}

@ApiTags('admin airs reports')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/airs-reports', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class AirsReportProjectAdminController {
  constructor(private readonly service: AirsReportService) {}

  @Get()
  @RequireMarketplacePermission('airs_reports:submit', 'project')
  @ApiOkResponse({ description: 'User Airs Reports of the project, newest first.' })
  list(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: ListAirsReportsQueryDto
  ) {
    return this.service.listForProject(projectId, query.status);
  }

  @Post()
  @RequireMarketplacePermission('airs_reports:submit', 'project')
  @ApiCreatedResponse({
    description:
      'Submitted report. Auto-approved and released or awaiting claim within the limits; pending approval otherwise.',
  })
  submit(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: SubmitAirsReportDto
  ) {
    return this.service.submit(request.adminPrincipal!, submitRequestId(body), projectId, body);
  }

  @Get('recipient')
  @RequireMarketplacePermission('airs_reports:submit', 'project')
  @ApiTooManyRequestsResponse({ type: ApiErrorDto, description: 'Lookup limit reached.' })
  @ApiOkResponse({ description: 'Whether the exact email has a verified account.' })
  lookupRecipient(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: AirsReportRecipientLookupQueryDto
  ) {
    return this.service.lookupRecipient(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      query.email
    );
  }
}

@ApiTags('admin airs reports')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/airs-reports', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class AirsReportAdminController {
  constructor(private readonly service: AirsReportService) {}

  @Get()
  @ApiOkResponse({ description: 'Reports waiting for a Grant Approver, oldest first.' })
  reviewQueue(@Req() request: FastifyAdminRequest) {
    return this.service.reviewQueue(request.adminPrincipal!, requestId(request));
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Report with the recipient daily and monthly totals.' })
  detail(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.service.detail(request.adminPrincipal!, requestId(request), id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Approved report, released or awaiting claim.' })
  approve(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ApproveAirsReportDto
  ) {
    return this.service.approve(request.adminPrincipal!, requestId(request), id, body.snapshotHash);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Rejected report.' })
  reject(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: AirsReportReasonDto
  ) {
    return this.service.reject(request.adminPrincipal!, requestId(request), id, body.reason);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Cancelled report.' })
  cancel(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: AirsReportReasonDto
  ) {
    return this.service.cancel(request.adminPrincipal!, requestId(request), id, body.reason);
  }
}

function bearer(authorization: string | undefined): string {
  if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
  return authorization;
}

/**
 * In-app review of Airs in review, authorized with the Airs session. The approver list and the
 * rule that nobody decides on their own Airs are applied by AirsReportService, as in the console.
 */
@ApiTags('me')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'me/airs-reports', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class AirsReportMeController {
  constructor(
    private readonly access: ProjectManageAccess,
    private readonly service: AirsReportService,
    private readonly clients: ProjectClientService
  ) {}

  @Get('access')
  @ApiOperation({ summary: 'Whether the signed-in person may review Airs in review.' })
  @ApiOkResponse({ description: '{ canApprove: boolean }' })
  async reviewAccess(@Headers('authorization') authorization: string | undefined) {
    const principal = await this.access.resolveApprover(bearer(authorization));
    return { canApprove: await this.service.canApprove(principal) };
  }

  @Get()
  @ApiOperation({ summary: 'Airs in review, oldest first, with project title and file flag.' })
  async reviewQueue(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined
  ) {
    const principal = await this.access.resolveApprover(bearer(authorization));
    return this.clients.reviewQueue(principal, requestId(request));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Report with the recipient daily and monthly totals.' })
  async detail(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    const principal = await this.access.resolveApprover(bearer(authorization));
    return this.service.detail(principal, requestId(request), id);
  }

  @Get(':id/proof')
  @ApiOperation({ summary: 'The supporting file of the report, to approvers; never as a URL.' })
  async proof(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Headers('authorization') authorization: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    const principal = await this.access.resolveApprover(bearer(authorization));
    const file = await this.clients.approverProofFile(principal, requestId(request), id);
    await reply
      .code(200)
      .header('cache-control', 'private, no-store')
      .header('x-content-type-options', 'nosniff')
      .header('content-disposition', `inline; filename="${file.fileName}"`)
      .type(file.contentType)
      .send(file.bytes);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve the reviewed version (snapshot hash) of the report.' })
  async approve(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ApproveAirsReportDto
  ) {
    const principal = await this.access.resolveApprover(bearer(authorization));
    return this.service.approve(principal, requestId(request), id, body.snapshotHash);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject the report with a reason.' })
  async reject(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: AirsReportReasonDto
  ) {
    const principal = await this.access.resolveApprover(bearer(authorization));
    return this.service.reject(principal, requestId(request), id, body.reason);
  }
}
