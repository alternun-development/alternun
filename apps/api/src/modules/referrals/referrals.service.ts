import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralSummaryDto } from './dto/referral-summary.dto';

interface ReferralRecord {
  id: string;
  user_id: string;
  referred_by_username: string | null;
  referred_by_email: string | null;
  invitation_code: string | null;
  referrer_user_id: string | null;
  referrer_referral_code: string | null;
  referral_link: string | null;
  created_at: string;
}

interface CurrentUserReferralRecord {
  user_id: string;
  invitation_code: string | null;
  referrer_user_id: string | null;
  referrer_referral_code: string | null;
  referral_link: string | null;
  created_at: string;
}

interface ReferralInviteeRecord {
  user_id: string;
  referral_code: string | null;
  email: string | null;
  name: string | null;
  created_at: string;
}

interface UserRecord {
  id: string;
  referral_code: string | null;
  referred_by_user_id: string | null;
  referred_by_referral_code: string | null;
  email: string | null;
  name: string | null;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

function trimRuntimeValue(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function resolveSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig | null {
  const url = trimRuntimeValue(env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL);
  const key = trimRuntimeValue(
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_KEY
  );

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    key,
  };
}

function normalizeReferralCode(value: string | null | undefined): string | null {
  const trimmed = trimRuntimeValue(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveReferralCodeSlug(value: string | null | undefined): string | null {
  const code = normalizeReferralCode(value);
  if (!code || !/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/.test(code)) {
    return null;
  }

  return code.replace(/-[a-z0-9]{6}$/, '');
}

function resolveReferralInput(dto: CreateReferralDto): string | null {
  return normalizeReferralCode(dto.referral_code ?? dto.invitation_code ?? null);
}

function resolveReferralShareBaseUrl(
  env: NodeJS.ProcessEnv,
  requestedOrigin?: string | null
): string {
  const explicit =
    trimRuntimeValue(env.EXPO_PUBLIC_ORIGIN) || trimRuntimeValue(env.AIRS_WEB_URL) || '';
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const requestOrigin = trimRuntimeValue(requestedOrigin);
  if (requestOrigin) {
    return requestOrigin.replace(/\/+$/, '');
  }

  return 'https://airs.alternun.co';
}

function buildReferralLink(
  referralCode: string,
  env: NodeJS.ProcessEnv,
  requestedOrigin?: string | null
): string {
  const baseUrl = resolveReferralShareBaseUrl(env, requestedOrigin);
  return `${baseUrl}/auth?referralCode=${encodeURIComponent(referralCode)}`;
}

function generateReferralCodeFromUser(
  user: UserRecord,
  requestedDisplayName?: string | null
): string {
  const rawSlugSource =
    trimRuntimeValue(requestedDisplayName) ||
    trimRuntimeValue(user.name) ||
    trimRuntimeValue(user.email)?.split('@')[0] ||
    'user';
  const slug = rawSlugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const normalizedSlug = slug.length > 0 ? slug : 'user';
  const suffix = createHash('md5').update(user.id).digest('hex').slice(0, 6);
  return `${normalizedSlug}-${suffix}`;
}

function normalizeInviteeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((value) => trimRuntimeValue(value)).filter(Boolean)));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseSelectOne<T>(
  path: string,
  query: Record<string, string>,
  select: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<T | null> {
  const url = new URL(`/rest/v1/${path}`, 'https://placeholder.local');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('select', select);

  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    throw new ServiceUnavailableException('Supabase referrals integration is not configured');
  }

  const response = await fetch(`${cfg.url}${url.pathname}${url.search}`, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new InternalServerErrorException(
      `Failed to read ${path}: ${response.status} ${text}`.trim()
    );
  }

  const rows = (await response.json().catch(() => [])) as T[];
  return rows[0] ?? null;
}

async function supabaseSelectMany<T>(
  path: string,
  query: Record<string, string>,
  select: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<T[]> {
  const url = new URL(`/rest/v1/${path}`, 'https://placeholder.local');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('select', select);

  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    throw new ServiceUnavailableException('Supabase referrals integration is not configured');
  }

  const response = await fetch(`${cfg.url}${url.pathname}${url.search}`, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new InternalServerErrorException(
      `Failed to read ${path}: ${response.status} ${text}`.trim()
    );
  }

  const rows = (await response.json().catch(() => [])) as T[];
  return Array.isArray(rows) ? rows : [];
}

async function supabaseUpdateOne<T>(
  path: string,
  query: Record<string, string>,
  body: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env
): Promise<T | null> {
  const url = new URL(`/rest/v1/${path}`, 'https://placeholder.local');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    throw new ServiceUnavailableException('Supabase referrals integration is not configured');
  }

  const response = await fetch(`${cfg.url}${url.pathname}${url.search}`, {
    method: 'PATCH',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new InternalServerErrorException(
      `Failed to update ${path}: ${response.status} ${text}`.trim()
    );
  }

  const rows = (await response.json().catch(() => [])) as T[];
  return rows[0] ?? null;
}

async function supabaseUpsertOne<T>(
  path: string,
  conflictKey: string,
  body: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env
): Promise<T | null> {
  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    throw new ServiceUnavailableException('Supabase referrals integration is not configured');
  }

  const response = await fetch(`${cfg.url}/rest/v1/${path}?on_conflict=${conflictKey}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new InternalServerErrorException(
      `Failed to upsert ${path}: ${response.status} ${text}`.trim()
    );
  }

  const rows = (await response.json().catch(() => [])) as T[];
  return rows[0] ?? null;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  async create(userId: string, dto: CreateReferralDto): Promise<ReferralResponseDto> {
    const cfg = resolveSupabaseConfig();
    if (!cfg) {
      this.logger.warn(
        'Supabase referrals integration is not configured; refusing referral creation.'
      );
      throw new ServiceUnavailableException('Supabase referrals integration is not configured');
    }

    const currentUser = await this.getUserByIdWithRetry(userId);
    if (!currentUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const referralCode = resolveReferralInput(dto);
    const referredByUsername = trimRuntimeValue(dto.referred_by_username) || null;
    const referredByEmail = trimRuntimeValue(dto.referred_by_email) || null;

    let resolvedReferrerUserId = currentUser.referred_by_user_id;
    let resolvedReferrerReferralCode = currentUser.referred_by_referral_code;

    if (!resolvedReferrerUserId && referralCode) {
      const referrer = await this.getUserByReferralCode(referralCode);
      if (!referrer) {
        throw new BadRequestException(`Referral code ${referralCode} is invalid`);
      }

      if (referrer.id === userId) {
        throw new BadRequestException('Self-referrals are not allowed');
      }

      const updatedUser = await supabaseUpdateOne<UserRecord>(
        'users',
        { id: `eq.${userId}` },
        {
          referred_by_user_id: referrer.id,
          referred_by_referral_code: referrer.referral_code ?? referralCode,
        }
      );

      resolvedReferrerUserId = updatedUser?.referred_by_user_id ?? referrer.id;
      resolvedReferrerReferralCode =
        updatedUser?.referred_by_referral_code ?? referrer.referral_code ?? referralCode;
    }

    if (resolvedReferrerUserId && !resolvedReferrerReferralCode) {
      const existingReferrer = await this.getUserById(resolvedReferrerUserId);
      resolvedReferrerReferralCode = existingReferrer?.referral_code ?? null;
    }

    const record = await supabaseUpsertOne<ReferralRecord>('referrals', 'user_id', {
      user_id: userId,
      referred_by_username: referredByUsername,
      referred_by_email: referredByEmail,
      invitation_code: resolvedReferrerReferralCode,
      referrer_user_id: resolvedReferrerUserId,
      referrer_referral_code: resolvedReferrerReferralCode,
      referral_link: resolvedReferrerReferralCode
        ? buildReferralLink(resolvedReferrerReferralCode, process.env)
        : null,
    });

    if (!record) {
      throw new InternalServerErrorException('Failed to persist referral record');
    }

    return this.toResponse(record);
  }

  async getMe(
    userId: string,
    requestedOrigin?: string | null,
    requestedDisplayName?: string | null
  ): Promise<ReferralSummaryDto> {
    const cfg = resolveSupabaseConfig();
    if (!cfg) {
      this.logger.warn(
        'Supabase referrals integration is not configured; refusing referral lookup.'
      );
      throw new ServiceUnavailableException('Supabase referrals integration is not configured');
    }

    const user = await this.getUserById(userId);
    const currentUser: UserRecord = user ?? {
      id: userId,
      referral_code: null,
      referred_by_user_id: null,
      referred_by_referral_code: null,
      email: null,
      name: null,
    };
    if (!user) {
      this.logger.warn(`User ${userId} not found in users table; synthesizing referral summary.`);
    }

    const currentReferralRecord = await supabaseSelectOne<CurrentUserReferralRecord>(
      'referrals',
      {
        user_id: `eq.${userId}`,
      },
      'user_id,invitation_code,referrer_user_id,referrer_referral_code,referral_link,created_at'
    );

    const referralRows = await supabaseSelectMany<ReferralRecord>(
      'referrals',
      {
        referrer_user_id: `eq.${userId}`,
        order: 'created_at.desc',
      },
      'id,user_id,created_at,referrer_user_id,referrer_referral_code,referral_link'
    );
    const referralCount = referralRows.length;
    const inviteeIds = normalizeInviteeIds(referralRows.map((row) => row.user_id));
    const inviteeRows = inviteeIds.length
      ? await supabaseSelectMany<ReferralInviteeRecord>(
          'users',
          {
            id: `in.(${inviteeIds.join(',')})`,
          },
          'user_id:id,referral_code,email,name,created_at'
        )
      : [];
    const inviteeMap = new Map(inviteeRows.map((row) => [row.user_id, row]));

    let referrer: UserRecord | null = null;
    if (currentUser.referred_by_user_id) {
      referrer = await this.getUserById(currentUser.referred_by_user_id);
    }

    const resolvedReferredByUserId =
      currentUser.referred_by_user_id ?? currentReferralRecord?.referrer_user_id ?? null;
    const resolvedReferredByReferralCode =
      currentUser.referred_by_referral_code ??
      currentReferralRecord?.referrer_referral_code ??
      currentReferralRecord?.invitation_code ??
      null;

    if (!referrer && resolvedReferredByUserId) {
      referrer = await this.getUserById(resolvedReferredByUserId);
    }

    if (!referrer && currentUser.referred_by_referral_code) {
      referrer = await this.getUserByReferralCode(currentUser.referred_by_referral_code);
    }

    if (!referrer && resolvedReferredByReferralCode) {
      referrer = await this.getUserByReferralCode(resolvedReferredByReferralCode);
    }

    if (referrer && (!currentUser.referred_by_user_id || !currentUser.referred_by_referral_code)) {
      await supabaseUpdateOne<UserRecord>(
        'users',
        { id: `eq.${userId}` },
        {
          referred_by_user_id: currentUser.referred_by_user_id ?? referrer.id,
          referred_by_referral_code:
            currentUser.referred_by_referral_code ??
            referrer.referral_code ??
            resolvedReferredByReferralCode,
        }
      ).catch((error) => {
        this.logger.warn(
          `Failed to backfill referred-by fields for user ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
    }

    const referralCode = currentUser.referral_code;
    const resolvedReferralCode =
      referralCode ?? generateReferralCodeFromUser(currentUser, requestedDisplayName);
    if (!referralCode) {
      this.logger.warn(`User ${userId} has no referral code; backfilling ${resolvedReferralCode}`);
      await supabaseUpdateOne<UserRecord>(
        'users',
        { id: `eq.${userId}` },
        { referral_code: resolvedReferralCode }
      ).catch((error) => {
        this.logger.warn(
          `Failed to backfill referral code for user ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
    }

    return {
      user_id: currentUser.id,
      referral_code: resolvedReferralCode,
      referral_link: buildReferralLink(resolvedReferralCode, process.env, requestedOrigin),
      referral_count: referralCount,
      referred_by_user_id: resolvedReferredByUserId ?? referrer?.id ?? null,
      referred_by_referral_code: resolvedReferredByReferralCode ?? referrer?.referral_code ?? null,
      referred_by_name: referrer?.name ?? null,
      referred_by_email: referrer?.email ?? null,
      referred_users: referralRows.map((record) => {
        const invitee = inviteeMap.get(record.user_id);
        return {
          user_id: record.user_id,
          referral_code: invitee?.referral_code ?? null,
          name: invitee?.name ?? null,
          email: invitee?.email ?? null,
          created_at: record.created_at,
        };
      }),
    };
  }

  private async getUserById(userId: string): Promise<UserRecord | null> {
    return supabaseSelectOne<UserRecord>(
      'users',
      { id: `eq.${userId}` },
      'id,referral_code,referred_by_user_id,referred_by_referral_code,email,name'
    );
  }

  private async getUserByIdWithRetry(userId: string, attempts = 6): Promise<UserRecord | null> {
    let delayMs = 250;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const user = await this.getUserById(userId);
      if (user) {
        return user;
      }

      if (attempt < attempts) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 4000);
      }
    }

    return null;
  }

  private async getUserByReferralCode(referralCode: string): Promise<UserRecord | null> {
    const normalizedReferralCode = normalizeReferralCode(referralCode) ?? '';
    const exactMatch = await supabaseSelectOne<UserRecord>(
      'users',
      { referral_code: `eq.${normalizedReferralCode}` },
      'id,referral_code,referred_by_user_id,referred_by_referral_code,email,name'
    );

    if (exactMatch) {
      return exactMatch;
    }

    const slug = resolveReferralCodeSlug(normalizedReferralCode);
    if (!slug) {
      return null;
    }

    const slugCandidates = await supabaseSelectMany<UserRecord>(
      'users',
      { referral_code: `ilike.${slug}-%` },
      'id,referral_code,referred_by_user_id,referred_by_referral_code,email,name'
    );
    const slugPattern = new RegExp(`^${escapeRegExp(slug)}-[a-z0-9]{6}$`, 'i');
    const matches = slugCandidates.filter(
      (candidate) => candidate.referral_code && slugPattern.test(candidate.referral_code)
    );

    return matches.length === 1 ? matches[0] ?? null : null;
  }

  private toResponse(record: ReferralRecord): ReferralResponseDto {
    return {
      id: record.id,
      user_id: record.user_id,
      referred_by_username: record.referred_by_username,
      referred_by_email: record.referred_by_email,
      invitation_code: record.invitation_code,
      referrer_user_id: record.referrer_user_id,
      referrer_referral_code: record.referrer_referral_code,
      referral_link: record.referral_link,
      created_at: record.created_at,
    };
  }
}
