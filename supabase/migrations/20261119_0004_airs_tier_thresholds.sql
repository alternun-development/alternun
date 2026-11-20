-- Airs tiers follow the T&C Status thresholds, with Bronze as the first tier: below 1.000 Airs
-- there is no tier yet; Bronze 1.000, Silver 3.000, Gold 7.000 (Platinum 12.000 has no avatar).
-- Same function as 20261114_0003, with the new tier avatar thresholds.

begin;

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
    v_threshold := case v_ref when 'bronze' then 1000 when 'silver' then 3000 when 'gold' then 7000 end;
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

commit;
