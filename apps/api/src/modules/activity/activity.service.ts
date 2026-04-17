import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

export type ActivityVisibility = 'public' | 'followers' | 'private';

export interface ActivityFeedQuery {
  limit?: number;
  cursor?: string | null;
  type?: string | null;
}

export interface ActivityRecordInput {
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  visibility?: ActivityVisibility;
}

export interface ActivityActor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastActivityAt: string | null;
  lastSeenLabel: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  icon: string;
  message: string;
  metadata: Record<string, unknown>;
  visibility: ActivityVisibility;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  actor: ActivityActor;
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
  nextCursor: string | null;
  total: number;
}

export interface ActivityStatsResponse {
  totalActivities: number;
  activeUsers24h: number;
  topTypes: Array<{ type: string; count: number }>;
}

interface SupabaseUserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
}

interface SupabaseActivityRow {
  id: string;
  user_id: string;
  activity_type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  visibility: ActivityVisibility;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  created_at: string;
  users: SupabaseUserRow | SupabaseUserRow[] | null;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

const ACTIVITY_EMOJI_MAP: Record<string, string> = {
  airs_earned: '🌱',
  profile_completed: '✅',
  purchase: '🛍️',
  referral: '🤝',
  impact: '🌍',
  streak: '🔥',
  default: '✨',
};

function resolveSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig | null {
  const url = (env.SUPABASE_URL ?? '').trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !key) {
    return null;
  }

  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseFetch<T>(
  path: string,
  params: Record<string, string>,
  env: NodeJS.ProcessEnv = process.env
): Promise<T[]> {
  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    return [];
  }

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${cfg.url}/rest/v1/${path}${qs ? `?${qs}` : ''}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase request failed [${res.status}] ${text}`);
  }

  return res.json() as Promise<T[]>;
}

function toLastSeenLabel(isoDate: string | null, now = new Date()): string {
  if (!isoDate) return 'offline';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'offline';

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin <= 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function toActivityItem(row: SupabaseActivityRow): ActivityItem {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  const type = row.activity_type || 'default';

  const icon = Object.prototype.hasOwnProperty.call(ACTIVITY_EMOJI_MAP, type)
    ? ACTIVITY_EMOJI_MAP[type]
    : ACTIVITY_EMOJI_MAP.default;

  return {
    id: row.id,
    type,
    icon,
    message: row.message,
    metadata: row.metadata ?? {},
    visibility: row.visibility ?? 'public',
    likesCount: Number(row.likes_count ?? 0),
    commentsCount: Number(row.comments_count ?? 0),
    sharesCount: Number(row.shares_count ?? 0),
    createdAt: row.created_at,
    actor: {
      userId: row.user_id,
      username: user?.username ?? 'unknown',
      displayName: user?.display_name ?? user?.username ?? 'Unknown user',
      avatarUrl: user?.avatar_url ?? null,
      lastActivityAt: user?.last_activity_at ?? null,
      lastSeenLabel: toLastSeenLabel(user?.last_activity_at ?? null),
    },
  };
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  async getFeed(query: ActivityFeedQuery): Promise<ActivityFeedResponse> {
    const limit = Math.min(Math.max(1, Number(query.limit ?? 20)), 50);

    const params: Record<string, string> = {
      select:
        'id,user_id,activity_type,message,metadata,visibility,likes_count,comments_count,shares_count,created_at,users!inner(id,username,display_name,avatar_url,last_activity_at)',
      visibility: 'eq.public',
      order: 'created_at.desc',
      limit: String(limit),
    };

    if (query.type?.trim()) {
      params.activity_type = `eq.${query.type.trim()}`;
    }

    if (query.cursor?.trim()) {
      params.created_at = `lt.${query.cursor.trim()}`;
    }

    try {
      const rows = await supabaseFetch<SupabaseActivityRow>('user_activity', params);
      const items = rows.map(toActivityItem);
      return {
        items,
        total: items.length,
        nextCursor: items.length === limit ? items[items.length - 1]?.createdAt ?? null : null,
      };
    } catch (error) {
      this.logger.warn(`Unable to fetch activity feed from Supabase: ${String(error)}`);
      return {
        items: [],
        nextCursor: null,
        total: 0,
      };
    }
  }

  async getUserActivity(
    userId: string,
    query: Pick<ActivityFeedQuery, 'limit' | 'cursor'>
  ): Promise<ActivityFeedResponse> {
    const limit = Math.min(Math.max(1, Number(query.limit ?? 20)), 50);

    const params: Record<string, string> = {
      select:
        'id,user_id,activity_type,message,metadata,visibility,likes_count,comments_count,shares_count,created_at,users!inner(id,username,display_name,avatar_url,last_activity_at)',
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
      limit: String(limit),
    };

    if (query.cursor?.trim()) {
      params.created_at = `lt.${query.cursor.trim()}`;
    }

    try {
      const rows = await supabaseFetch<SupabaseActivityRow>('user_activity', params);
      const items = rows.map(toActivityItem);
      return {
        items,
        total: items.length,
        nextCursor: items.length === limit ? items[items.length - 1]?.createdAt ?? null : null,
      };
    } catch (error) {
      this.logger.warn(`Unable to fetch user activity from Supabase: ${String(error)}`);
      return {
        items: [],
        nextCursor: null,
        total: 0,
      };
    }
  }

  async getStats(): Promise<ActivityStatsResponse> {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [activities, users] = await Promise.all([
        supabaseFetch<{ count: number }>('user_activity', {
          select: 'count',
        }),
        supabaseFetch<SupabaseUserRow>('users', {
          select: 'id,last_activity_at',
          last_activity_at: `gte.${dayAgo}`,
        }),
      ]);

      const types = await supabaseFetch<{ activity_type: string }>('user_activity', {
        select: 'activity_type',
        order: 'created_at.desc',
        limit: '500',
      });

      const grouped = new Map<string, number>();
      for (const row of types) {
        const key = row.activity_type || 'default';
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      }

      const topTypes: Array<{ type: string; count: number }> = [...grouped.entries()]
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalActivities: Number(activities[0]?.count ?? types.length),
        activeUsers24h: users.length,
        topTypes,
      };
    } catch (error) {
      this.logger.warn(`Unable to fetch activity stats from Supabase: ${String(error)}`);
      return {
        totalActivities: 0,
        activeUsers24h: 0,
        topTypes: [],
      };
    }
  }

  async createActivity(
    input: ActivityRecordInput,
    internalApiKey: string | undefined
  ): Promise<{ ok: true }> {
    const expectedKey = (process.env.ACTIVITY_INTERNAL_API_KEY ?? '').trim();

    if (expectedKey && internalApiKey?.trim() !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key.');
    }

    const cfg = resolveSupabaseConfig();
    if (!cfg) {
      this.logger.warn('Skipping activity write because Supabase is not configured.');
      return { ok: true };
    }

    const res = await fetch(`${cfg.url}/rest/v1/user_activity`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: input.userId,
        activity_type: input.type,
        message: input.message,
        metadata: input.metadata ?? {},
        visibility: input.visibility ?? 'public',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to insert activity [${res.status}]: ${text}`);
    }

    return { ok: true };
  }
}

export const __activity = {
  toLastSeenLabel,
  toActivityItem,
};
