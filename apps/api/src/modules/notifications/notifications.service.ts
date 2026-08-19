import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import { UpdateNotificationDto } from './dto/update-notification.dto';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface UserNotification {
  id: string;
  eventType: string;
  severity: NotificationSeverity;
  payload: Record<string, unknown>;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

interface SupabaseNotificationRow {
  id?: unknown;
  event_type?: unknown;
  severity?: unknown;
  payload?: unknown;
  read_at?: unknown;
  archived_at?: unknown;
  created_at?: unknown;
}

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

function getSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig {
  const url = (env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!url || !serviceRoleKey) {
    throw new InternalServerErrorException('Notifications storage is not configured.');
  }

  return { url, serviceRoleKey };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asSeverity(value: unknown): NotificationSeverity {
  return value === 'success' || value === 'error' || value === 'warning' ? value : 'info';
}

function mapRow(row: SupabaseNotificationRow): UserNotification {
  if (
    typeof row.id !== 'string' ||
    typeof row.event_type !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    throw new InternalServerErrorException('Notifications storage returned an invalid record.');
  }

  return {
    id: row.id,
    eventType: row.event_type,
    severity: asSeverity(row.severity),
    payload: asRecord(row.payload),
    read: typeof row.read_at === 'string',
    archived: typeof row.archived_at === 'string',
    createdAt: row.created_at,
  };
}

function notificationEndpoint(config: SupabaseConfig, query: URLSearchParams): string {
  return `${config.url}/rest/v1/user_notifications?${query.toString()}`;
}

@Injectable()
export class NotificationsService {
  async list(
    authorization: string,
    requestedLimit?: number
  ): Promise<{ notifications: UserNotification[] }> {
    const userId = await resolveUserId(authorization);
    const limit = Math.max(1, Math.min(Number(requestedLimit) || 50, 100));
    const config = getSupabaseConfig(process.env);
    const query = new URLSearchParams({
      select: 'id,event_type,severity,payload,read_at,archived_at,created_at',
      user_id: `eq.${userId}`,
      deleted_at: 'is.null',
      order: 'created_at.desc',
      limit: String(limit),
    });
    const response = await fetch(notificationEndpoint(config, query), {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Unable to load notifications.');
    }

    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows)) {
      throw new InternalServerErrorException('Notifications storage returned an invalid response.');
    }

    return { notifications: rows.map((row) => mapRow(row as SupabaseNotificationRow)) };
  }

  async update(
    authorization: string,
    notificationId: string,
    input: UpdateNotificationDto
  ): Promise<void> {
    if (!Object.values(input).some((value) => typeof value === 'boolean')) {
      throw new BadRequestException('At least one notification state is required.');
    }

    const userId = await resolveUserId(authorization);
    const config = getSupabaseConfig(process.env);
    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {};

    if (typeof input.read === 'boolean') patch.read_at = input.read ? now : null;
    if (typeof input.archived === 'boolean') patch.archived_at = input.archived ? now : null;
    if (typeof input.deleted === 'boolean') patch.deleted_at = input.deleted ? now : null;

    const query = new URLSearchParams({ id: `eq.${notificationId}`, user_id: `eq.${userId}` });
    const response = await fetch(notificationEndpoint(config, query), {
      method: 'PATCH',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Unable to update the notification.');
    }
  }

  async markAllRead(authorization: string): Promise<void> {
    const userId = await resolveUserId(authorization);
    const config = getSupabaseConfig(process.env);
    const query = new URLSearchParams({
      user_id: `eq.${userId}`,
      archived_at: 'is.null',
      deleted_at: 'is.null',
      read_at: 'is.null',
    });
    const response = await fetch(notificationEndpoint(config, query), {
      method: 'PATCH',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Unable to mark notifications as read.');
    }
  }
}
