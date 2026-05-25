-- Human-readable referral codes with a username-like slug and a stable suffix.
-- Existing referral relationships stay intact because referrer_user_id remains
-- the canonical link; only the public-facing code format changes.

create or replace function public.generate_referral_code_from_user_id(
  p_user_id text,
  p_display_name text default null,
  p_email text default null
)
returns text
language sql
immutable
set search_path = public
as $$
  with slug_source as (
    select coalesce(
      nullif(
        trim(
          both '-' from regexp_replace(
            lower(coalesce(p_display_name, '')),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      nullif(
        trim(
          both '-' from regexp_replace(
            lower(split_part(coalesce(p_email, ''), '@', 1)),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'user'
    ) as slug
  ),
  suffix_source as (
    select lower(substr(md5(p_user_id), 1, 6)) as suffix
  )
  select left(slug, 24) || '-' || suffix
  from slug_source, suffix_source;
$$;

update public.users
set referral_code = public.generate_referral_code_from_user_id(id, name, email)
where referral_code is null
   or btrim(referral_code) = ''
   or referral_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$';

update public.users child
set referred_by_referral_code = parent.referral_code
from public.users parent
where child.referred_by_user_id = parent.id;

update public.referrals referral_record
set invitation_code = parent.referral_code,
    referrer_referral_code = parent.referral_code,
    referral_link = 'https://airs.alternun.co/auth/referral?code=' || parent.referral_code
from public.users parent
where referral_record.referrer_user_id = parent.id;

create or replace function public.users_set_referral_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    new.referral_code := public.generate_referral_code_from_user_id(new.id, new.name, new.email);
  else
    new.referral_code := lower(btrim(new.referral_code));
  end if;

  return new;
end;
$$;
