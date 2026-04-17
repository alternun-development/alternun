export type AirsLedgerSourceKind =
  | 'allied_commerce'
  | 'validated_regenerative_action'
  | 'compensation'
  | 'profile_completion_bonus'
  | 'correction';

export interface AirsDashboardVisitState {
  userId: string;
  email: string | null;
  displayName: string | null;
  locale: string | null;
  firstDashboardRecorded: boolean;
  shouldSendWelcomeEmail: boolean;
  shouldAwardProfileBonus: boolean;
  profileComplete: boolean;
  welcomeEmailSentAt: string | null;
  profileBonusAwardedAt: string | null;
  profileCompletedAt: string | null;
  airsBalance: number;
  airsLifetimeEarned: number;
}

export interface AirsProfileBonusResult {
  awarded: boolean;
  status: 'awarded' | 'already_awarded' | 'profile_incomplete';
  ledgerEntryId: string | null;
  airsBalance: number;
  airsLifetimeEarned: number;
  profileBonusAwardedAt: string | null;
  profileCompletedAt: string | null;
}

export interface AirsWelcomeEmailSentResult {
  marked: boolean;
  status: 'marked' | 'already_marked';
  welcomeEmailSentAt: string | null;
}

export interface AirsDashboardLedgerEntry {
  id: string;
  sourceKind: AirsLedgerSourceKind;
  sourceRef: string | null;
  idempotencyKey: string | null;
  sourceCurrency: string;
  sourceAmount: number | null;
  airsRate: number;
  airsDelta: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  recordedAt: string;
  createdAt: string;
}

export interface AirsDashboardSnapshot {
  userId: string;
  email: string | null;
  displayName: string | null;
  locale: string | null;
  profileComplete: boolean;
  firstDashboardRecorded: boolean;
  welcomeEmailSentAt: string | null;
  profileBonusAwardedAt: string | null;
  profileCompletedAt: string | null;
  airsBalance: number;
  airsLifetimeEarned: number;
  recentLedgerEntries: AirsDashboardLedgerEntry[];
}

export interface AirsLedgerEntryResult {
  id: string;
  user_id: string;
  source_kind: AirsLedgerSourceKind;
  source_ref: string | null;
  idempotency_key: string | null;
  source_currency: string;
  source_amount: number | null;
  airs_rate: number;
  airs_delta: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

export interface SupabaseRpcConfig {
  url: string;
  key: string;
}

function firstNonEmptyTrimmed(values: Array<string | undefined | null>,): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

export function resolveAirsSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseRpcConfig | null {
  const url = firstNonEmptyTrimmed([
    env.SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL,
  ],);
  const key = firstNonEmptyTrimmed([
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.EXPO_PUBLIC_SUPABASE_KEY,
  ],);

  if (!url || !key) {
    return null;
  }

  return { url, key, };
}

async function readRpcBody(response: Response,): Promise<Record<string, unknown> | null> {
  const body = (await response.json().catch(() => null,)) as unknown;
  if (!body) {
    return null;
  }

  if (Array.isArray(body,)) {
    const first = body[0] as Record<string, unknown> | undefined;
    return first && typeof first === 'object' ? first : null;
  }

  return typeof body === 'object' ? (body as Record<string, unknown>) : null;
}

function asText(value: unknown,): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value: unknown,): boolean {
  return value === true;
}

function asNumber(value: unknown,): number {
  if (typeof value === 'number' && Number.isFinite(value,)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value,);
    if (Number.isFinite(parsed,)) {
      return parsed;
    }
  }

  return 0;
}

function asRecordArray(value: unknown,): Record<string, unknown>[] {
  if (!Array.isArray(value,)) {
    return [];
  }

  return value.filter((entry,): entry is Record<string, unknown> => {
    return Boolean(entry && typeof entry === 'object' && !Array.isArray(entry,),);
  },);
}

function mapDashboardLedgerEntry(entry: Record<string, unknown>,): AirsDashboardLedgerEntry {
  return {
    id: asText(entry.id,) ?? '',
    sourceKind: (asText(entry.source_kind,) as AirsLedgerSourceKind) ?? 'correction',
    sourceRef: asText(entry.source_ref,),
    idempotencyKey: asText(entry.idempotency_key,),
    sourceCurrency: asText(entry.source_currency,) ?? 'USD',
    sourceAmount: entry.source_amount == null ? null : asNumber(entry.source_amount,),
    airsRate: entry.airs_rate == null ? 5 : asNumber(entry.airs_rate,),
    airsDelta: asNumber(entry.airs_delta,),
    notes: asText(entry.notes,),
    metadata:
      entry.metadata && typeof entry.metadata === 'object'
        ? (entry.metadata as Record<string, unknown>)
        : {},
    recordedAt: asText(entry.recorded_at,) ?? new Date().toISOString(),
    createdAt: asText(entry.created_at,) ?? new Date().toISOString(),
  };
}

export async function supabaseRpc<T = Record<string, unknown>>(
  rpcName: string,
  payload: Record<string, unknown>,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  const config = resolveAirsSupabaseConfig(env,);
  if (!config) {
    throw new Error(`Supabase is not configured for AIRS RPC ${rpcName}.`,);
  }

  const response = await fetch(`${config.url.replace(/\/$/, '',)}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload,),
  },);

  if (!response.ok) {
    const text = await response.text().catch(() => '',);
    throw new Error(`Supabase RPC ${rpcName} failed [${response.status}]: ${text}`,);
  }

  const body = await readRpcBody(response,);
  return (body ?? {}) as T;
}

export async function recordAirsDashboardVisit(
  input: {
    userId: string;
    locale?: string | null;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<AirsDashboardVisitState> {
  const body = await supabaseRpc<Record<string, unknown>>(
    'airs_record_dashboard_visit',
    {
      p_user_id: input.userId,
      p_locale: input.locale ?? null,
    },
    env,
  );

  return {
    userId: asText(body.user_id,) ?? input.userId,
    email: asText(body.email,),
    displayName: asText(body.display_name,),
    locale: asText(body.locale,),
    firstDashboardRecorded: asBoolean(body.first_dashboard_recorded,),
    shouldSendWelcomeEmail: asBoolean(body.should_send_welcome_email,),
    shouldAwardProfileBonus: asBoolean(body.should_award_profile_bonus,),
    profileComplete: asBoolean(body.profile_complete,),
    welcomeEmailSentAt: asText(body.welcome_email_sent_at,),
    profileBonusAwardedAt: asText(body.profile_bonus_awarded_at,),
    profileCompletedAt: asText(body.profile_completed_at,),
    airsBalance: asNumber(body.airs_balance,),
    airsLifetimeEarned: asNumber(body.airs_lifetime_earned,),
  };
}

export async function awardAirsProfileBonus(
  input: {
    userId: string;
    bonusAmount?: number;
    sourceRef?: string | null;
    metadata?: Record<string, unknown>;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<AirsProfileBonusResult> {
  const body = await supabaseRpc<Record<string, unknown>>(
    'airs_award_profile_completion_bonus',
    {
      p_user_id: input.userId,
      p_bonus_amount: input.bonusAmount ?? 10,
      p_source_ref: input.sourceRef ?? 'profile-completion-bonus',
      p_metadata: input.metadata ?? {},
    },
    env,
  );

  return {
    awarded: asBoolean(body.awarded,),
    status:
      body.status === 'already_awarded'
        ? 'already_awarded'
        : body.status === 'profile_incomplete'
          ? 'profile_incomplete'
          : 'awarded',
    ledgerEntryId: asText(body.ledger_entry_id,),
    airsBalance: asNumber(body.airs_balance,),
    airsLifetimeEarned: asNumber(body.airs_lifetime_earned,),
    profileBonusAwardedAt: asText(body.profile_bonus_awarded_at,),
    profileCompletedAt: asText(body.profile_completed_at,),
  };
}

export async function markAirsWelcomeEmailSent(
  input: {
    userId: string;
    locale?: string | null;
    metadata?: Record<string, unknown>;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<AirsWelcomeEmailSentResult> {
  const body = await supabaseRpc<Record<string, unknown>>(
    'airs_mark_welcome_email_sent',
    {
      p_user_id: input.userId,
      p_locale: input.locale ?? null,
      p_metadata: input.metadata ?? {},
    },
    env,
  );

  return {
    marked: asBoolean(body.marked,),
    status: body.status === 'already_marked' ? 'already_marked' : 'marked',
    welcomeEmailSentAt: asText(body.welcome_email_sent_at,),
  };
}

export async function getAirsDashboardSnapshot(
  input: {
    userId: string;
    locale?: string | null;
    ledgerLimit?: number;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<AirsDashboardSnapshot> {
  const body = await supabaseRpc<Record<string, unknown>>(
    'airs_get_dashboard_snapshot',
    {
      p_user_id: input.userId,
      p_locale: input.locale ?? null,
      p_ledger_limit: input.ledgerLimit ?? 5,
    },
    env,
  );

  return {
    userId: asText(body.user_id,) ?? input.userId,
    email: asText(body.email,),
    displayName: asText(body.display_name,),
    locale: asText(body.locale,),
    profileComplete: asBoolean(body.profile_complete,),
    firstDashboardRecorded: asBoolean(body.first_dashboard_recorded,),
    welcomeEmailSentAt: asText(body.welcome_email_sent_at,),
    profileBonusAwardedAt: asText(body.profile_bonus_awarded_at,),
    profileCompletedAt: asText(body.profile_completed_at,),
    airsBalance: asNumber(body.airs_balance,),
    airsLifetimeEarned: asNumber(body.airs_lifetime_earned,),
    recentLedgerEntries: asRecordArray(body.recent_ledger_entries,).map(mapDashboardLedgerEntry,),
  };
}

export async function recordAirsLedgerEntry(
  input: {
    userId: string;
    sourceKind: AirsLedgerSourceKind;
    airsDelta: number;
    sourceRef?: string | null;
    idempotencyKey?: string | null;
    sourceCurrency?: string;
    sourceAmount?: number | null;
    airsRate?: number;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<AirsLedgerEntryResult> {
  const body = await supabaseRpc<Record<string, unknown>>(
    'airs_record_ledger_entry',
    {
      p_user_id: input.userId,
      p_source_kind: input.sourceKind,
      p_airs_delta: input.airsDelta,
      p_source_ref: input.sourceRef ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
      p_source_currency: input.sourceCurrency ?? 'USD',
      p_source_amount: input.sourceAmount ?? null,
      p_airs_rate: input.airsRate ?? 5,
      p_notes: input.notes ?? null,
      p_metadata: input.metadata ?? {},
    },
    env,
  );

  return {
    id: asText(body.id,) ?? '',
    user_id: asText(body.user_id,) ?? input.userId,
    source_kind: (asText(body.source_kind,) as AirsLedgerSourceKind) ?? input.sourceKind,
    source_ref: asText(body.source_ref,),
    idempotency_key: asText(body.idempotency_key,),
    source_currency: asText(body.source_currency,) ?? input.sourceCurrency ?? 'USD',
    source_amount: typeof body.source_amount === 'number' ? body.source_amount : null,
    airs_rate: asNumber(body.airs_rate,),
    airs_delta: asNumber(body.airs_delta,),
    notes: asText(body.notes,),
    metadata:
      body.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : input.metadata ?? {},
    recorded_at: asText(body.recorded_at,) ?? new Date().toISOString(),
    created_at: asText(body.created_at,) ?? new Date().toISOString(),
  };
}
