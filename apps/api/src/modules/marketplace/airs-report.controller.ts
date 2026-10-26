import {
  Body,
  Controller,
  Get,
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
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
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

function requestId(request: FastifyAdminRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
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
    return this.service.submit(request.adminPrincipal!, requestId(request), projectId, body);
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
