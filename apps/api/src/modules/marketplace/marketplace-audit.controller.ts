import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPropertyOptional,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';

class ListAuditQueryDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  action?: string;

  @ApiPropertyOptional({ enum: ['allowed', 'denied'] })
  @IsOptional()
  @IsIn(['allowed', 'denied'])
  result?: 'allowed' | 'denied';

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage = 20;
}

function requestId(request: FastifyAdminRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('admin project audit')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/audit', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceProjectAuditAdminController {
  constructor(private readonly service: MarketplaceAuditService) {}

  @Get()
  @RequireMarketplacePermission('audit:read', 'project')
  @ApiOkResponse({ description: 'Sanitized project audit history ordered newest first.' })
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: ListAuditQueryDto
  ) {
    return this.service.listProject(request.adminPrincipal!, requestId(request), projectId, query);
  }
}

@ApiTags('admin enterprise audit')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/enterprises/:id/audit', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceEnterpriseAuditAdminController {
  constructor(private readonly service: MarketplaceAuditService) {}

  @Get()
  @RequireMarketplacePermission('audit:read')
  @ApiOkResponse({ description: 'Sanitized enterprise audit history ordered newest first.' })
  list(
    @Req() request: FastifyAdminRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Query() query: ListAuditQueryDto
  ) {
    return this.service.listEnterprise(
      request.adminPrincipal!,
      requestId(request),
      enterpriseId,
      query
    );
  }
}
