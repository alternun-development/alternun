-- Sync auth.users to public.users and backfill referral attribution once the
-- email is confirmed.
-- Called by: trg_auth_users_sync_to_app_users trigger
-- Maps: id, sub, iss, aud, email, email_verified, name, image, picture, phone,
-- phone_verified, confirmation_sent_at, last_sign_in_at
--
-- Keep this file aligned with the latest referral-aware trigger migration.

CREATE OR REPLACE FUNCTION public.resolve_referrer_from_referral_input(
  p_referral_code text DEFAULT NULL,
  p_referred_by_email text DEFAULT NULL,
  p_referred_by_username text DEFAULT NULL,
  p_exclude_user_id text DEFAULT NULL
)
RETURNS TABLE(id text, referral_code text, email text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  with normalized as (
    select
      nullif(lower(btrim(coalesce(p_referral_code, ''))), '') as referral_code,
      nullif(lower(btrim(coalesce(p_referred_by_email, ''))), '') as referred_by_email,
      nullif(lower(btrim(coalesce(p_referred_by_username, ''))), '') as referred_by_username,
      case
        when lower(btrim(coalesce(p_referral_code, ''))) ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$'
          then regexp_replace(lower(btrim(coalesce(p_referral_code, ''))), '-[a-z0-9]{6}$', '')
        else null
      end as referral_slug,
      nullif(btrim(coalesce(p_exclude_user_id, '')), '') as exclude_user_id
  ),
  candidates as (
    select u.id, u.referral_code, u.email, u.name, 1 as priority
    from public.users u, normalized n
    where n.referral_code is not null
      and lower(u.referral_code) = n.referral_code
      and (n.exclude_user_id is null or u.id <> n.exclude_user_id)

    union all

    select u.id, u.referral_code, u.email, u.name, 2 as priority
    from public.users u, normalized n
    where n.referral_slug is not null
      and lower(u.referral_code) ~ ('^' || n.referral_slug || '-[a-z0-9]{6}$')
      and (n.exclude_user_id is null or u.id <> n.exclude_user_id)

    union all

    select u.id, u.referral_code, u.email, u.name, 3 as priority
    from public.users u, normalized n
    where n.referred_by_email is not null
      and lower(u.email) = n.referred_by_email
      and (n.exclude_user_id is null or u.id <> n.exclude_user_id)

    union all

    select u.id, u.referral_code, u.email, u.name, 4 as priority
    from public.users u, normalized n
    where n.referred_by_username is not null
      and lower(u.name) = n.referred_by_username
      and (n.exclude_user_id is null or u.id <> n.exclude_user_id)
  )
  select candidates.id, candidates.referral_code, candidates.email, candidates.name
  from candidates
  order by priority
  limit 1;
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user public.users%rowtype;
  v_referrer public.users%rowtype;
  v_metadata_referral_code text;
  v_metadata_referred_by_username text;
  v_metadata_referred_by_email text;
  v_referrer_user_id text;
  v_referrer_referral_code text;
  v_referral_confirmed_at timestamptz;
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

  if v_referrer_user_id is null then
    select ref.id, ref.referral_code, ref.email, ref.name
    into v_referrer_user_id, v_referrer_referral_code, v_referrer.email, v_referrer.name
    from public.resolve_referrer_from_referral_input(
      v_metadata_referral_code,
      v_metadata_referred_by_email,
      v_metadata_referred_by_username,
      new.id::text
    ) ref
    limit 1;
  end if;

  if v_referrer_user_id is null then
    return new;
  end if;

  if v_referrer_user_id = new.id::text then
    return new;
  end if;

  v_referral_confirmed_at := case
    when new.email_confirmed_at is not null then timezone('utc', now())
    else null
  end;

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
    referral_link,
    confirmed_at
  )
  values (
    new.id::text,
    coalesce(v_metadata_referred_by_username, v_referrer.name),
    coalesce(v_metadata_referred_by_email, v_referrer.email),
    v_referrer_referral_code,
    v_referrer_user_id,
    v_referrer_referral_code,
    'https://airs.alternun.co/auth?referralCode=' || v_referrer_referral_code,
    v_referral_confirmed_at
  )
  on conflict (user_id) do update
    set referred_by_username = excluded.referred_by_username,
        referred_by_email = excluded.referred_by_email,
        invitation_code = excluded.invitation_code,
        referrer_user_id = excluded.referrer_user_id,
        referrer_referral_code = excluded.referrer_referral_code,
        referral_link = excluded.referral_link,
        confirmed_at = coalesce(confirmed_at, excluded.confirmed_at);

  return new;
end;
$function$;
