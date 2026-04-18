import type { AIRSEntry, AirsDashboardSnapshot, } from './types';

function asText(value: unknown,): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

function parseDate(value: unknown,): Date {
  const text = asText(value,);
  if (!text) {
    return new Date();
  }

  const date = new Date(text,);
  return Number.isNaN(date.getTime(),) ? new Date() : date;
}

function parseLedgerEntry(entry: unknown,): AIRSEntry | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry,)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const amountAIRS = asNumber(record.airsDelta ?? record.airs_delta,);

  return {
    id: asText(record.id,) ?? '',
    reason:
      asText(record.notes,) ??
      (asText(record.sourceKind ?? record.source_kind,) === 'profile_completion_bonus'
        ? 'Bono de perfil'
        : 'Movimiento AIRS'),
    referenceType:
      (asText(record.sourceKind ?? record.source_kind,) as AIRSEntry['referenceType']) ??
      'correction',
    amountAIRS,
    timestamp: parseDate(record.recordedAt ?? record.recorded_at,),
    reference:
      asText(record.sourceRef ?? record.source_ref,) ??
      asText(record.idempotencyKey ?? record.idempotency_key,) ??
      asText(record.id,) ??
      '',
    sourceAmount:
      record.sourceAmount == null && record.source_amount == null
        ? null
        : asNumber(record.sourceAmount ?? record.source_amount,),
    sourceCurrency: asText(record.sourceCurrency ?? record.source_currency,) ?? 'USD',
  };
}

export function normalizeAirsDashboardSnapshot(value: unknown,): AirsDashboardSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value,)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    userId: asText(record.userId ?? record.user_id,) ?? '',
    email: asText(record.email,),
    displayName: asText(record.displayName ?? record.display_name,),
    locale: asText(record.locale,),
    profileComplete: Boolean(record.profileComplete ?? record.profile_complete,),
    firstDashboardRecorded: Boolean(
      record.firstDashboardRecorded ?? record.first_dashboard_recorded,
    ),
    welcomeEmailSentAt: asText(record.welcomeEmailSentAt ?? record.welcome_email_sent_at,),
    profileBonusAwardedAt: asText(record.profileBonusAwardedAt ?? record.profile_bonus_awarded_at,),
    profileCompletedAt: asText(record.profileCompletedAt ?? record.profile_completed_at,),
    balanceAIRS: asNumber(record.balanceAIRS ?? record.airsBalance ?? record.airs_balance,),
    lifetimeEarnedAIRS: asNumber(
      record.lifetimeEarnedAIRS ?? record.airsLifetimeEarned ?? record.airs_lifetime_earned,
    ),
    recentEntries: Array.isArray(record.recentEntries ?? record.recentLedgerEntries,)
      ? ((record.recentEntries ?? record.recentLedgerEntries) as unknown[])
        .map(parseLedgerEntry,)
        .filter((entry,): entry is AIRSEntry => Boolean(entry,),)
      : [],
  };
}
