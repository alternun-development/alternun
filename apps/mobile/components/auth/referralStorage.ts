export interface PendingReferralData {
  referred_by_username: string | null;
  referred_by_email: string | null;
  referral_code: string | null;
  invitation_code: string | null;
}

const PENDING_REFERRAL_STORAGE_KEY = 'pendingReferralData';

function getWindowSessionStorage(): Storage | null {
  if (typeof window?.sessionStorage === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

export function readPendingReferralData(): PendingReferralData | null {
  const storage = getWindowSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(PENDING_REFERRAL_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingReferralData>;
    return {
      referred_by_username:
        typeof parsed.referred_by_username === 'string' ? parsed.referred_by_username : null,
      referred_by_email:
        typeof parsed.referred_by_email === 'string' ? parsed.referred_by_email : null,
      referral_code: typeof parsed.referral_code === 'string' ? parsed.referral_code : null,
      invitation_code: typeof parsed.invitation_code === 'string' ? parsed.invitation_code : null,
    };
  } catch {
    return null;
  }
}

export function readPendingReferralCode(): string | null {
  const pending = readPendingReferralData();
  const code = pending?.referral_code ?? pending?.invitation_code;
  if (typeof code !== 'string') {
    return null;
  }

  const trimmed = code.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function writePendingReferralData(data: PendingReferralData): void {
  const storage = getWindowSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PENDING_REFERRAL_STORAGE_KEY, JSON.stringify(data));
}

export function clearPendingReferralData(): void {
  const storage = getWindowSessionStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
}

export function hasPendingReferralData(): boolean {
  return readPendingReferralData() !== null;
}
