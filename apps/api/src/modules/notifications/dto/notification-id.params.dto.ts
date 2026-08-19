import { IsUUID } from 'class-validator';

export class NotificationIdParamsDto {
  @IsUUID()
  notificationId!: string;
}
