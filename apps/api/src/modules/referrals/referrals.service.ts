import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';

interface ReferralRecord {
  id: string;
  user_id: string;
  referred_by_username: string | null;
  referred_by_email: string | null;
  invitation_code: string | null;
  created_at: string;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

function resolveSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig | null {
  const url = (env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_KEY ??
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    key,
  };
}

async function supabaseInsert<T>(
  table: string,
  body: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env
): Promise<T> {
  const cfg = resolveSupabaseConfig(env);
  if (!cfg) {
    throw new ServiceUnavailableException('Supabase referrals integration is not configured');
  }

  const res = await fetch(`${cfg.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new InternalServerErrorException(
      `Failed to create referral: ${res.status} ${text}`.trim()
    );
  }

  const rows = (await res.json()) as T[];
  if (!rows.length) {
    throw new InternalServerErrorException('Failed to create referral: empty response');
  }

  return rows[0];
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
      throw new ServiceUnavailableException(
        'Supabase referrals integration is not configured'
      );
    }

    const data = await supabaseInsert<ReferralRecord>('referrals', {
      user_id: userId,
      referred_by_username: dto.referred_by_username ?? null,
      referred_by_email: dto.referred_by_email ?? null,
      invitation_code: dto.invitation_code ?? null,
    });

    return this.toDto(data);
  }

  private toDto(data: ReferralRecord): ReferralResponseDto {
    return {
      id: data.id,
      user_id: data.user_id,
      referred_by_username: data.referred_by_username,
      referred_by_email: data.referred_by_email,
      invitation_code: data.invitation_code,
      created_at: data.created_at,
    };
  }
}
