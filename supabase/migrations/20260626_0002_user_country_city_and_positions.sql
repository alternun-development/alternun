-- Add country and city to users for location-based AIRS ranking.
-- Adds airs_get_user_positions() RPC returning global, country, and city ranks.

-- ─── 1. User location columns ────────────────────────────────────────────────

alter table public.users
  add column if not exists country text,
  add column if not exists city    text;

create index if not exists users_country_idx on public.users (country)
  where country is not null;

create index if not exists users_city_idx on public.users (country, city)
  where country is not null and city is not null;

-- ─── 2. Profile update function ──────────────────────────────────────────────
-- Lets authenticated users update their own display name, country and city.

create or replace function public.airs_update_user_profile(
  p_user_id text,
  p_name    text   default null,
  p_country text   default null,
  p_city    text   default null
)
returns table (
  user_id  text,
  name     text,
  country  text,
  city     text,
  updated  boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  select * into v_user
  from public.users
  where id::text = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  update public.users
  set
    name    = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    country = case
                when p_country is not null then nullif(btrim(p_country), '')
                else country
              end,
    city    = case
                when p_city is not null then nullif(btrim(p_city), '')
                else city
              end
  where id::text = p_user_id;

  return query
    select
      u.id::text,
      u.name,
      u.country,
      u.city,
      true
    from public.users u
    where u.id::text = p_user_id;
end;
$$;

grant execute on function public.airs_update_user_profile(text, text, text, text) to anon, authenticated;

-- ─── 3. User positions RPC ───────────────────────────────────────────────────
-- Returns the requesting user's rank in three scopes:
--   global    → all users with airs_balance > 0
--   country   → users with same country (null country = no country rank)
--   city      → users with same country+city (null city = no city rank)

create or replace function public.airs_get_user_positions(p_user_id text)
returns table (
  global_rank    bigint,
  country_rank   bigint,
  city_rank      bigint,
  global_total   bigint,
  country_total  bigint,
  city_total     bigint,
  country        text,
  city           text,
  airs_balance   numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  select * into v_user
  from public.users
  where id::text = p_user_id;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  return query
    with all_ranked as (
      select
        u.id::text                                                               as uid,
        u.airs_balance,
        u.country,
        u.city,
        -- global rank: all users who have any AIRS
        row_number() over (order by u.airs_balance desc, u.created_at asc)      as g_rank,
        count(*) over ()                                                         as g_total,
        -- country rank: only within same country, null country excluded
        case
          when v_user.country is not null and u.country = v_user.country then
            row_number() over (
              partition by (u.country = v_user.country and v_user.country is not null)
              order by u.airs_balance desc, u.created_at asc
            )
          else null
        end                                                                      as c_rank,
        case
          when v_user.country is not null and u.country = v_user.country then
            count(*) over (
              partition by (u.country = v_user.country and v_user.country is not null)
            )
          else null
        end                                                                      as c_total,
        -- city rank: only within same country+city, null excluded
        case
          when v_user.country is not null and v_user.city is not null
               and u.country = v_user.country and u.city = v_user.city then
            row_number() over (
              partition by (
                u.country = v_user.country and v_user.country is not null
                and u.city = v_user.city and v_user.city is not null
              )
              order by u.airs_balance desc, u.created_at asc
            )
          else null
        end                                                                      as ci_rank,
        case
          when v_user.country is not null and v_user.city is not null
               and u.country = v_user.country and u.city = v_user.city then
            count(*) over (
              partition by (
                u.country = v_user.country and v_user.country is not null
                and u.city = v_user.city and v_user.city is not null
              )
            )
          else null
        end                                                                      as ci_total
      from public.users u
      where u.airs_balance > 0
    )
    select
      r.g_rank,
      r.c_rank,
      r.ci_rank,
      r.g_total,
      r.c_total,
      r.ci_total,
      v_user.country,
      v_user.city,
      v_user.airs_balance
    from all_ranked r
    where r.uid = p_user_id;
end;
$$;

grant execute on function public.airs_get_user_positions(text) to anon, authenticated;
