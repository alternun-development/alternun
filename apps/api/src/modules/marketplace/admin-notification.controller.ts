import { Body, Controller, Get, HttpCode, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { AdminNotificationService } from './admin-notification.service';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';

export class MarkNotificationsReadDto {
  @ApiProperty({
    required: false,
    type: [String],
    description: 'Notification ids to mark read. Leave out to mark all of yours.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids?: string[];
}

@ApiTags('admin notifications')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/notifications', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class AdminNotificationController {
  constructor(private readonly service: AdminNotificationService) {}

  @Get()
  @RequireMarketplacePermission('notifications:read')
  @ApiOkResponse({ description: 'Your latest console notifications and how many are unread.' })
  list(@Req() request: FastifyAdminRequest) {
    return this.service.list(request.adminPrincipal!);
  }

  @Post('read')
  @HttpCode(200)
  @RequireMarketplacePermission('notifications:read')
  @ApiOkResponse({ description: 'Marks your own notifications read.' })
  markRead(@Req() request: FastifyAdminRequest, @Body() body: MarkNotificationsReadDto) {
    return this.service.markRead(request.adminPrincipal!, body.ids);
  }
}
