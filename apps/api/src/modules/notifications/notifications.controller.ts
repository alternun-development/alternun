import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationIdParamsDto } from './dto/notification-id.params.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService, type UserNotification } from './notifications.service';

@ApiTags('notifications')
@Controller({ path: 'notifications', version: VERSION_NEUTRAL })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the authenticated user's notifications." })
  @ApiOkResponse({ description: 'The user notification feed.' })
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query('limit') limit?: number
  ): Promise<{ notifications: UserNotification[] }> {
    return this.notificationsService.list(this.requireAuthorization(authorization), limit);
  }

  @Patch(':notificationId')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update read, archive, or delete state for one notification.' })
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: NotificationIdParamsDto,
    @Body() input: UpdateNotificationDto
  ): Promise<void> {
    return this.notificationsService.update(
      this.requireAuthorization(authorization),
      params.notificationId,
      input
    );
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark every active notification as read.' })
  async markAllRead(@Headers('authorization') authorization: string | undefined): Promise<void> {
    return this.notificationsService.markAllRead(this.requireAuthorization(authorization));
  }

  private requireAuthorization(authorization: string | undefined): string {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing notification bearer token.');
    }

    return authorization;
  }
}
