-- Referral rewards are distributed atomically by the database. Persist the
-- notification delivery state separately so each recipient receives one
-- companion email after the matching ledger credit exists.

alter table public.referral_reward_distributions
  add column if not exists referrer_email_sent_at timestamptz,
  add column if not exists referee_email_sent_at timestamptz;
