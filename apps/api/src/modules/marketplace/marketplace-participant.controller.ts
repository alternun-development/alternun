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
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MarketplaceParticipantService } from './marketplace-participant.service';

class ListProjectParticipantsQueryDto {
  @IsOptional()
  @IsIn(['active', 'removed'])
  status?: 'active' | 'removed';
}

class AddProjectParticipantDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

class RemoveProjectParticipantDto {
  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

function requestId(request: FastifyAdminRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('admin project participants')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
@ApiServiceUnavailableResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/projects/:projectId/participants', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class MarketplaceParticipantAdminController {
  constructor(private readonly service: MarketplaceParticipantService) {}

  @Get()
  @RequireMarketplacePermission('participants:read', 'project')
  @ApiOkResponse({ description: 'Project participants with approved completion totals.' })
  list(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: ListProjectParticipantsQueryDto
  ) {
    return this.service.list(request.adminPrincipal!, requestId(request), projectId, query.status);
  }

  @Post()
  @RequireMarketplacePermission('participants:manage', 'project')
  @ApiCreatedResponse({ description: 'Active project participant.' })
  add(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() body: AddProjectParticipantDto
  ) {
    return this.service.add(request.adminPrincipal!, requestId(request), projectId, body.email);
  }

  @Post(':participantId/remove')
  @HttpCode(200)
  @RequireMarketplacePermission('participants:manage', 'project')
  remove(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantId: string,
    @Body() body: RemoveProjectParticipantDto
  ) {
    return this.service.remove(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      participantId,
      body.reason
    );
  }

  @Get(':participantId/history')
  @RequireMarketplacePermission('participants:read', 'project')
  @ApiOkResponse({ description: 'Participant activity and AIRS assignment history.' })
  history(
    @Req() request: FastifyAdminRequest,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantId: string
  ) {
    return this.service.history(
      request.adminPrincipal!,
      requestId(request),
      projectId,
      participantId
    );
  }
}
