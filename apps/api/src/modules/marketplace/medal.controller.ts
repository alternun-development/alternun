import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MedalService } from './medal.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

export class CreateProjectMedalDto {
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ description: 'https image URL on a host allowed for project images.' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class UpdateProjectMedalDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'False retires the medal: it can no longer be picked.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

@ApiTags('admin project medals')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/medals', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MedalAdminController {
  constructor(private readonly service: MedalService) {}

  @Get()
  @RequireMarketplacePermission('airs_reports:submit')
  @ApiOkResponse({
    description: 'The medals of the project you can pick (all of them for Super Admins).',
  })
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string
  ) {
    return this.service.list(request.adminPrincipal!, requestId(request), projectId);
  }

  @Post()
  @RequireMarketplacePermission('medals:manage')
  @ApiCreatedResponse({ description: 'The new medal of the project.' })
  create(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: CreateProjectMedalDto
  ) {
    return this.service.create(request.adminPrincipal!, requestId(request), projectId, body);
  }

  @Patch(':medalId')
  @RequireMarketplacePermission('medals:manage')
  @ApiOkResponse({ description: 'The updated medal.' })
  update(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('medalId', new ParseUUIDPipe({ version: '4' })) medalId: string,
    @Body() body: UpdateProjectMedalDto
  ) {
    return this.service.update(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      medalId,
      body
    );
  }
}
