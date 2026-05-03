import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import type { PendingReferralData } from './referralStorage';

interface ReferralSummaryAttribution {
  referred_by_user_id?: string | null;
  referred_by_referral_code?: string | null;
}

export function buildReferralPersistenceKey(
  userId: string,
  referralData: PendingReferralData
): string {
  return JSON.stringify({
    user_id: userId,
    referral_code: referralData.referral_code,
    invitation_code: referralData.invitation_code,
    referred_by_username: referralData.referred_by_username,
    referred_by_email: referralData.referred_by_email,
  });
}

function hasPersistedReferralAttribution(summary: ReferralSummaryAttribution | null): boolean {
  return Boolean(summary?.referred_by_user_id ?? summary?.referred_by_referral_code);
}

async function fetchReferralAttribution(
  apiBaseUrl: string,
  userId: string
): Promise<ReferralSummaryAttribution | null> {
  const referralUrl = new URL(`${apiBaseUrl}/v1/referrals/me`);
  referralUrl.searchParams.set('user_id', userId);

  const response = await fetch(referralUrl.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  try {
    return (await response.json()) as ReferralSummaryAttribution;
  } catch {
    return null;
  }
}

export async function savePendingReferralData(
  userId: string,
  referralData: PendingReferralData
): Promise<void> {
  const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
  const attempts = 3;
  let delayMs = 250;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/v1/referrals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        ...referralData,
      }),
    }).catch(() => null);

    if (response?.ok) {
      return;
    }

    const attribution = await fetchReferralAttribution(apiBaseUrl, userId);
    if (hasPersistedReferralAttribution(attribution)) {
      return;
    }

    if (response && response.status >= 400 && response.status < 500) {
      break;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 4000);
    }
  }

  throw new Error('Failed to persist pending referral data');
}
