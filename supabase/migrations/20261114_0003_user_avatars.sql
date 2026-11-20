-- Profile avatars: people choose how they appear in Airs.
--
-- By default the app shows the photo of the social account they signed in with (Google,
-- Discord). They can also pick one of the app's illustrations or a badge they hold: an Airs
-- tier they reached, an Airs milestone they passed or an honor award they claimed. The
-- choice is checked here, so nobody can wear a badge they do not hold.
--
-- avatar_kind / avatar_ref keep the choice apart from users.picture, which the sign-in flow
-- rewrites on every login. The leaderboard shows the chosen art of each person but never
-- their social photo, so masked names stay anonymous.

begin;

alter table public.users
  add column if not exists avatar_kind text,
  add column if not exists avatar_ref text,
  add column if not exists avatar_updated_at timestamptz;

alter table public.users
  add constraint users_avatar_kind_chk check (
    avatar_kind is null
    or avatar_kind in ('social', 'preset', 'tier', 'achievement', 'honor_award')
  ),
  add constraint users_avatar_ref_chk check (
    avatar_ref is null or char_length(avatar_ref) between 1 and 80
  );

-- Art for an avatar choice, in the shape the app draws (honor awards need their recipe art).
create or replace function public.airs_avatar_art(p_kind text, p_ref text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_kind = 'honor_award' then (
      select jsonb_build_object(
        'title', recipe.title,
        'tier', recipe.tier,
        'kind', recipe.kind,
        'artPreset', recipe.art_preset,
        'badgeImageUrl', recipe.badge_image_url
      )
      from public.honor_award_grants grant_row
      join public.honor_award_recipes recipe on recipe.id = grant_row.recipe_id
      where grant_row.id::text = p_ref
    )
    else null
  end;
$$;

revoke all on function public.airs_avatar_art(text, text) from public, anon, authenticated;
grant execute on function public.airs_avatar_art(text, text) to service_role;

create or replace function public.airs_get_user_avatar(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'kind', u.avatar_kind,
    'ref', u.avatar_ref,
    'art', public.airs_avatar_art(u.avatar_kind, u.avatar_ref)
  )
  from public.users u
  where u.id::text = btrim(coalesce(p_user_id, ''));
$$;

revoke all on function public.airs_get_user_avatar(text) from public, anon, authenticated;
grant execute on function public.airs_get_user_avatar(text) to service_role;

-- Saves an avatar choice after checking the person holds it. A null kind goes back to the
-- default (social photo, then initials). Raises AVATAR_NOT_ALLOWED otherwise.
create or replace function public.airs_set_user_avatar(p_user_id text, p_kind text, p_ref text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user public.users;
  v_kind text := nullif(btrim(coalesce(p_kind, '')), '');
  v_ref text := nullif(btrim(coalesce(p_ref, '')), '');
  v_score numeric;
  v_threshold numeric;
begin
  select * into v_user from public.users where id::text = btrim(coalesce(p_user_id, ''));
  if not found then
    raise exception 'AVATAR_USER_NOT_FOUND';
  end if;
  v_score := greatest(coalesce(v_user.airs_balance, 0), coalesce(v_user.airs_lifetime_earned, 0));

  if v_kind is null or v_kind = 'social' then
    v_ref := null;
  elsif v_kind = 'preset' then
    if v_ref is null or v_ref not in (
      'mangrove', 'leaf', 'wave', 'mountain', 'sun', 'coral', 'hummingbird', 'turtle'
    ) then
      raise exception 'AVATAR_NOT_ALLOWED';
    end if;
  elsif v_kind = 'tier' then
    v_threshold := case v_ref when 'bronze' then 0 when 'silver' then 1000 when 'gold' then 5000 end;
    if v_threshold is null or v_score < v_threshold then
      raise exception 'AVATAR_NOT_ALLOWED';
    end if;
  elsif v_kind = 'achievement' then
    v_threshold := case v_ref
      when 'first_10_airs' then 10
      when 'fifty_airs' then 50
      when 'first_100_airs' then 100
      when 'first_500_airs' then 500
      when 'first_1000_airs' then 1000
      when 'first_5000_airs' then 5000
      when 'first_10000_airs' then 10000
      when 'first_50000_airs' then 50000
    end;
    if v_threshold is null or v_score < v_threshold then
      raise exception 'AVATAR_NOT_ALLOWED';
    end if;
  elsif v_kind = 'honor_award' then
    if v_ref is null or not exists (
      select 1 from public.honor_award_grants grant_row
      where grant_row.id::text = v_ref
        and grant_row.user_id = v_user.id::text
        and grant_row.status = 'claimed'
    ) then
      raise exception 'AVATAR_NOT_ALLOWED';
    end if;
  else
    raise exception 'AVATAR_NOT_ALLOWED';
  end if;

  update public.users
  set avatar_kind = v_kind,
      avatar_ref = v_ref,
      avatar_updated_at = timezone('utc', now())
  where id = v_user.id;

  return jsonb_build_object(
    'kind', v_kind,
    'ref', v_ref,
    'art', public.airs_avatar_art(v_kind, v_ref)
  );
end;
$$;

revoke all on function public.airs_set_user_avatar(text, text, text) from public, anon, authenticated;
grant execute on function public.airs_set_user_avatar(text, text, text) to service_role;

-- The leaderboard adds each person's chosen art. Social photos are never returned: a person
-- who keeps their photo shows their initials to others.
drop function if exists public.airs_get_leaderboard_page(text, int, int);

create function public.airs_get_leaderboard_page(
  p_requesting_user_id text,
  p_limit int default 7,
  p_page int default 1
)
returns table (
  rank bigint,
  user_id text,
  display_name text,
  airs_balance numeric,
  airs_lifetime_earned numeric,
  is_me boolean,
  avatar_kind text,
  avatar_ref text,
  avatar_art jsonb
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (order by u.airs_balance desc, u.created_at asc) as rank,
      u.id::text as user_id,
      u.name,
      u.email,
      u.airs_balance,
      u.airs_lifetime_earned,
      case when u.avatar_kind = 'social' then null else u.avatar_kind end as avatar_kind,
      case when u.avatar_kind = 'social' then null else u.avatar_ref end as avatar_ref
    from public.users u
    where u.airs_balance > 0
  )
  select
    r.rank,
    r.user_id,
    case
      when r.user_id = btrim(coalesce(p_requesting_user_id, '')) then coalesce(nullif(btrim(r.name), ''), split_part(r.email, '@', 1))
      when r.name is not null and btrim(r.name) <> '' then left(btrim(r.name), 1) || repeat('*', greatest(0, length(btrim(r.name)) - 1))
      when r.email is not null then left(split_part(r.email, '@', 1), 1) || '***'
      else 'User #' || r.rank::text
    end,
    r.airs_balance,
    r.airs_lifetime_earned,
    r.user_id = btrim(coalesce(p_requesting_user_id, '')),
    r.avatar_kind,
    r.avatar_ref,
    public.airs_avatar_art(r.avatar_kind, r.avatar_ref)
  from ranked r
  order by r.rank
  offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(least(coalesce(p_limit, 7), 50), 1)
  limit greatest(least(coalesce(p_limit, 7), 50), 1);
$$;

-- Same access as before this change: only the backend (service_role) reads the leaderboard.
revoke all on function public.airs_get_leaderboard_page(text, int, int) from public, anon, authenticated;
grant execute on function public.airs_get_leaderboard_page(text, int, int) to service_role;

commit;
