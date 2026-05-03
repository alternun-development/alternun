-- Keep auth.users -> public.users sync authoritative and backfill referrals
-- once the email is confirmed.
--
-- This migration updates the auth trigger function so confirmed users carry the
-- referral attribution into both public.users and public.referrals. Existing
-- confirmed users are backfilled immediately so the DB heals on deploy.

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user public.users%rowtype;
  v_referrer public.users%rowtype;
  v_metadata_referral_code text;
  v_metadata_referred_by_username text;
  v_metadata_referred_by_email text;
  v_referrer_user_id text;
  v_referrer_referral_code text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.is_anonymous then
    return new;
  end if;

  insert into public.users (
    id,
    sub,
    iss,
    aud,
    email,
    email_verified,
    name,
    image,
    picture,
    phone,
    phone_verified,
    confirmation_sent_at,
    last_sign_in_at
  )
  values (
    new.id::text,
    new.id::text,
    'better-auth',
    coalesce(new.raw_app_meta_data->>'aud', 'authenticated'),
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.phone,
    new.phone_confirmed_at is not null,
    new.confirmation_sent_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set sub            = excluded.sub,
        iss            = excluded.iss,
        aud            = excluded.aud,
        email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        image          = excluded.image,
        picture        = excluded.picture,
        phone          = excluded.phone,
        phone_verified = excluded.phone_verified,
        confirmation_sent_at = excluded.confirmation_sent_at,
        last_sign_in_at = excluded.last_sign_in_at,
        updated_at     = timezone('utc', now())
  returning * into v_user;

  if new.email_confirmed_at is null then
    return new;
  end if;

  v_metadata_referred_by_username := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data->>'referred_by_username',
        new.raw_user_meta_data->>'referrer_username',
        ''
      )
    ),
    ''
  );
  v_metadata_referred_by_email := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data->>'referred_by_email',
        new.raw_user_meta_data->>'referrer_email',
        ''
      )
    ),
    ''
  );
  v_metadata_referral_code := nullif(
    lower(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'referral_code',
          new.raw_user_meta_data->>'referralCode',
          new.raw_user_meta_data->>'invitation_code',
          new.raw_user_meta_data->>'referred_by_referral_code',
          ''
        )
      )
    ),
    ''
  );

  v_referrer_user_id := nullif(btrim(v_user.referred_by_user_id), '');
  v_referrer_referral_code := nullif(lower(btrim(v_user.referred_by_referral_code)), '');

  if v_referrer_user_id is not null and v_referrer_referral_code is null then
    select *
    into v_referrer
    from public.users
    where id = v_referrer_user_id
    limit 1;

    if found then
      v_referrer_referral_code := v_referrer.referral_code;
    end if;
  end if;

  if v_referrer_user_id is null and v_referrer_referral_code is not null then
    select *
    into v_referrer
    from public.users
    where lower(referral_code) = v_referrer_referral_code
    limit 1;

    if found then
      v_referrer_user_id := v_referrer.id;
    end if;
  end if;

  if v_referrer_user_id is null and v_metadata_referral_code is not null then
    select *
    into v_referrer
    from public.users
    where lower(referral_code) = v_metadata_referral_code
    limit 1;

    if found then
      v_referrer_user_id := v_referrer.id;
      v_referrer_referral_code := v_referrer.referral_code;
    end if;
  end if;

  if v_referrer_user_id is null and v_metadata_referred_by_email is not null then
    select *
    into v_referrer
    from public.users
    where lower(email) = lower(v_metadata_referred_by_email)
    limit 1;

    if found then
      v_referrer_user_id := v_referrer.id;
      v_referrer_referral_code := v_referrer.referral_code;
    end if;
  end if;

  if v_referrer_user_id is null and v_metadata_referred_by_username is not null then
    select *
    into v_referrer
    from public.users
    where lower(name) = lower(v_metadata_referred_by_username)
    limit 1;

    if found then
      v_referrer_user_id := v_referrer.id;
      v_referrer_referral_code := v_referrer.referral_code;
    end if;
  end if;

  if v_referrer_user_id is null then
    return new;
  end if;

  if v_referrer_user_id = new.id::text then
    return new;
  end if;

  update public.users
  set referred_by_user_id = coalesce(referred_by_user_id, v_referrer_user_id),
      referred_by_referral_code = coalesce(referred_by_referral_code, v_referrer_referral_code),
      updated_at = timezone('utc', now())
  where id = new.id::text
    and (
      referred_by_user_id is null
      or referred_by_referral_code is null
    );

  insert into public.referrals (
    user_id,
    referred_by_username,
    referred_by_email,
    invitation_code,
    referrer_user_id,
    referrer_referral_code,
    referral_link
  )
  values (
    new.id::text,
    coalesce(v_metadata_referred_by_username, v_referrer.name),
    coalesce(v_metadata_referred_by_email, v_referrer.email),
    v_referrer_referral_code,
    v_referrer_user_id,
    v_referrer_referral_code,
    'https://airs.alternun.co/auth?mode=signup&referralCode=' || v_referrer_referral_code
  )
  on conflict (user_id) do update
    set referred_by_username = excluded.referred_by_username,
        referred_by_email = excluded.referred_by_email,
        invitation_code = excluded.invitation_code,
        referrer_user_id = excluded.referrer_user_id,
        referrer_referral_code = excluded.referrer_referral_code,
        referral_link = excluded.referral_link;

  return new;
end;
$function$;

drop trigger if exists trg_auth_users_sync_to_app_users on auth.users;
create trigger trg_auth_users_sync_to_app_users
after insert or update of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function public.sync_auth_user_to_app_users();

create temporary table tmp_referral_backfill_candidates on commit drop as
select
  u.id as user_id,
  u.referred_by_user_id as existing_referred_by_user_id,
  u.referred_by_referral_code as existing_referred_by_referral_code,
  nullif(
    lower(
      btrim(
        coalesce(
          au.raw_user_meta_data->>'referral_code',
          au.raw_user_meta_data->>'referralCode',
          au.raw_user_meta_data->>'invitation_code',
          au.raw_user_meta_data->>'referred_by_referral_code',
          ''
        )
      )
    ),
    ''
  ) as metadata_referral_code,
  nullif(
    btrim(
      coalesce(
        au.raw_user_meta_data->>'referred_by_username',
        au.raw_user_meta_data->>'referrer_username',
        ''
      )
    ),
    ''
  ) as metadata_referred_by_username,
  nullif(
    btrim(
      coalesce(
        au.raw_user_meta_data->>'referred_by_email',
        au.raw_user_meta_data->>'referrer_email',
        ''
      )
    ),
    ''
  ) as metadata_referred_by_email
from public.users u
left join auth.users au
  on au.id::text = u.id
where au.id is null
   or au.email_confirmed_at is not null;

create temporary table tmp_referral_backfill_resolved on commit drop as
select
  rc.user_id,
  rc.metadata_referred_by_username,
  rc.metadata_referred_by_email,
  coalesce(
    rc.existing_referred_by_user_id,
    code_ref.id,
    email_ref.id,
    username_ref.id
  ) as resolved_referred_by_user_id,
  coalesce(
    rc.existing_referred_by_referral_code,
    code_ref.referral_code,
    email_ref.referral_code,
    username_ref.referral_code
  ) as resolved_referred_by_referral_code
from tmp_referral_backfill_candidates rc
left join public.users code_ref
  on lower(code_ref.referral_code) = rc.metadata_referral_code
left join public.users email_ref
  on lower(email_ref.email) = lower(rc.metadata_referred_by_email)
left join public.users username_ref
  on lower(username_ref.name) = lower(rc.metadata_referred_by_username);

update public.users u
set referred_by_user_id = resolved.resolved_referred_by_user_id,
    referred_by_referral_code = resolved.resolved_referred_by_referral_code,
    updated_at = timezone('utc', now())
from tmp_referral_backfill_resolved resolved
where u.id = resolved.user_id
  and resolved.resolved_referred_by_user_id is not null
  and (
    u.referred_by_user_id is distinct from resolved.resolved_referred_by_user_id
    or u.referred_by_referral_code is distinct from resolved.resolved_referred_by_referral_code
  );

insert into public.referrals (
  user_id,
  referred_by_username,
  referred_by_email,
  invitation_code,
  referrer_user_id,
  referrer_referral_code,
  referral_link
)
select
  resolved.user_id,
  coalesce(
    resolved.metadata_referred_by_username,
    referrer.name
  ) as referred_by_username,
  coalesce(
    resolved.metadata_referred_by_email,
    referrer.email
  ) as referred_by_email,
  resolved.resolved_referred_by_referral_code,
  resolved.resolved_referred_by_user_id,
  resolved.resolved_referred_by_referral_code,
  'https://airs.alternun.co/auth?mode=signup&referralCode=' || resolved.resolved_referred_by_referral_code
from tmp_referral_backfill_resolved resolved
left join public.users referrer
  on referrer.id = resolved.resolved_referred_by_user_id
where resolved.resolved_referred_by_user_id is not null
on conflict (user_id) do update
  set referred_by_username = excluded.referred_by_username,
      referred_by_email = excluded.referred_by_email,
      invitation_code = excluded.invitation_code,
      referrer_user_id = excluded.referrer_user_id,
      referrer_referral_code = excluded.referrer_referral_code,
      referral_link = excluded.referral_link;
