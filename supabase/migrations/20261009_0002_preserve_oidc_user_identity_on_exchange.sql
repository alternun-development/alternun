-- Preserve the app user ID when the backend exchange adopts a new canonical
-- subject/issuer pair for an identity that was provisioned by the legacy client
-- upsert path.
create or replace function public.upsert_oidc_user_compat(
  p_sub           text,
  p_iss           text,
  p_email         text         default null,
  p_email_verified boolean     default false,
  p_name          text         default null,
  p_picture       text         default null,
  p_provider      text         default null,
  p_raw_claims    jsonb        default '{}'::jsonb,
  p_legacy_sub    text         default null,
  p_legacy_iss    text         default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  -- Prefer an already-adopted canonical identity so retries remain idempotent.
  select *
    into v_user
  from public.users
  where sub = p_sub
    and iss = p_iss
  limit 1
  for update;

  if found then
    update public.users
    set email          = p_email,
        email_verified = p_email_verified,
        name           = p_name,
        picture        = p_picture,
        provider       = p_provider,
        raw_claims     = p_raw_claims,
        updated_at     = timezone('utc', now())
    where id = v_user.id
    returning * into v_user;

    return v_user;
  end if;

  -- Before creating the exchange identity, adopt the legacy row in place. This
  -- preserves its ID and therefore all AIRS, referral, wallet, and badge links.
  if nullif(btrim(p_legacy_sub), '') is not null
     and nullif(btrim(p_legacy_iss), '') is not null then
    select *
      into v_user
    from public.users
    where sub = p_legacy_sub
      and iss = p_legacy_iss
    limit 1
    for update;

    if found then
      update public.users
      set sub            = p_sub,
          iss            = p_iss,
          email          = p_email,
          email_verified = p_email_verified,
          name           = p_name,
          picture        = p_picture,
          provider       = p_provider,
          raw_claims     = p_raw_claims,
          updated_at     = timezone('utc', now())
      where id = v_user.id
      returning * into v_user;

      return v_user;
    end if;
  end if;

  insert into public.users (sub, iss, email, email_verified, name, picture, provider, raw_claims)
  values (p_sub, p_iss, p_email, p_email_verified, p_name, p_picture, p_provider, p_raw_claims)
  returning * into v_user;

  return v_user;
end;
$$;

revoke all on function public.upsert_oidc_user_compat(
  text, text, text, boolean, text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_oidc_user_compat(
  text, text, text, boolean, text, text, text, jsonb, text, text
) to service_role;
