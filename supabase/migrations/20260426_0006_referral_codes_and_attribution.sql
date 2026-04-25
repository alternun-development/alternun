-- Canonical referral code generation and attribution tracking.
-- Referral codes are derived from the user UUID so they are stable and unique.

create or replace function public.generate_referral_code_from_user_id(p_user_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select 'AIRS-' || upper(substr(md5(p_user_id), 1, 12));
$$;

alter table public.users
  add column if not exists referral_code text,
  add column if not exists referred_by_user_id text,
  add column if not exists referred_by_referral_code text;

update public.users
set referral_code = public.generate_referral_code_from_user_id(id)
where referral_code is null or btrim(referral_code) = '';

update public.users
set referral_code = upper(btrim(referral_code))
where referral_code is not null;

alter table public.users
  alter column referral_code set not null;

create unique index if not exists users_referral_code_uq on public.users (referral_code);
create index if not exists users_referred_by_user_id_idx on public.users (referred_by_user_id);

create or replace function public.users_set_referral_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    new.referral_code := public.generate_referral_code_from_user_id(new.id);
  else
    new.referral_code := upper(btrim(new.referral_code));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_set_referral_code on public.users;
create trigger trg_users_set_referral_code
before insert on public.users
for each row
execute function public.users_set_referral_code();

alter table public.referrals
  add column if not exists referrer_user_id text,
  add column if not exists referrer_referral_code text,
  add column if not exists referral_link text;

update public.referrals
set invitation_code = upper(btrim(invitation_code))
where invitation_code is not null;

create unique index if not exists referrals_user_id_uq on public.referrals (user_id);
create index if not exists referrals_referrer_user_id_idx on public.referrals (referrer_user_id);
create index if not exists referrals_referrer_referral_code_idx on public.referrals (referrer_referral_code);
