-- Persist the registration locale used to select transactional-email copy.
alter table public.users
  add column if not exists locale text;

-- One recipient can hold a short-lived claim while SMTP is in flight. Failed
-- or skipped sends release the claim, allowing a later confirmed-session sync
-- to retry without duplicate delivery.
alter table public.referral_reward_distributions
  add column if not exists referrer_email_claimed_at timestamptz,
  add column if not exists referee_email_claimed_at timestamptz;
