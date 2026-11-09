export type UserMetadata = Record<string, unknown>;

export interface AccountReferralSummary {
  user_created_at?: string | null;
  referred_by_user_id?: string | null;
  referred_by_referral_code?: string | null;
  referred_by_name?: string | null;
  referred_by_email?: string | null;
}

export type TierLabelMap = {
  bronze: string;
  silver: string;
  gold: string;
  platinum: string;
};

export type AuthMethodDescriptor =
  | { kind: 'guest' }
  | { kind: 'wallet' }
  | { kind: 'email' }
  | { kind: 'session' }
  | { kind: 'provider'; provider: string };

export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  medal: string | null;
  color: string | null;
  isMe: boolean;
}
