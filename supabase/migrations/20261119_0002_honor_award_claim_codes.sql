-- Honor awards, part 4: claim codes.
--
-- An ally's team (partner_operator or sub_admin of the enterprise) or an Airs global admin
-- creates a code for one of the ally's honor awards and shares it, for example with the players
-- of a tournament. A person types it in "Legado → Reclamar medalla" and gets the award and its
-- Airs.
--
-- Security:
--   * Only the SHA-256 of the code is stored; the API shows the code once, when it is created.
--     Codes are 60 random bits, so a hash without salt cannot be reversed by guessing.
--   * Every code has a window (at most a year) and a maximum number of uses; a person redeems a
--     code once; a code can be revoked.
--   * Failed attempts are recorded per person: after 5 in 15 minutes the person must wait.
--   * The Airs go through the regular Airs report of the award's project, submitted as the
--     person who created the code. Their access is checked again at every redemption (a
--     removed team member's codes stop working) and the daily and monthly limits apply: over
--     the limit the report waits for an approver. When the report is released, the project
--     medal linked to the recipe gives the honor award (user_medal_honor_award).
--   * Everything runs in one security-definer function, executable only by service_role, with
--     the code row locked, so concurrent redemptions cannot exceed the maximum.

begin;

create table public.honor_award_claim_codes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.honor_award_recipes(id) on delete restrict,
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  code_hash text not null unique,
  code_hint text not null,
  label text,
  max_redemptions integer not null,
  redemption_count integer not null default 0,
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  created_by_issuer text not null,
  created_by_subject text not null,
  created_by_roles text[] not null,
  created_by_email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by_issuer text,
  revoked_by_subject text,
  constraint honor_award_claim_codes_hash_chk check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint honor_award_claim_codes_hint_chk check (code_hint ~ '^[0-9A-Z]{4}$'),
  constraint honor_award_claim_codes_label_chk check (
    label is null or char_length(btrim(label)) between 1 and 80
  ),
  constraint honor_award_claim_codes_uses_chk check (
    max_redemptions between 1 and 10000
    and redemption_count between 0 and max_redemptions
  ),
  constraint honor_award_claim_codes_window_chk check (
    expires_at > starts_at and expires_at <= starts_at + interval '366 days'
  ),
  constraint honor_award_claim_codes_creator_chk check (
    char_length(btrim(created_by_issuer)) > 0
    and char_length(btrim(created_by_subject)) > 0
    and cardinality(created_by_roles) > 0
    and created_by_email = lower(btrim(created_by_email))
    and created_by_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint honor_award_claim_codes_revoked_chk check (
    (revoked_at is null) = (revoked_by_issuer is null and revoked_by_subject is null)
  )
);

create index honor_award_claim_codes_enterprise_idx
  on public.honor_award_claim_codes (enterprise_id, created_at desc);

alter table public.honor_award_claim_codes enable row level security;
revoke all on table public.honor_award_claim_codes from public, anon, authenticated;
grant select, insert, update on table public.honor_award_claim_codes to service_role;

create table public.honor_award_claim_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.honor_award_claim_codes(id) on delete restrict,
  user_id text not null,
  report_id uuid references public.airs_reports(id) on delete restrict,
  grant_id uuid references public.honor_award_grants(id) on delete restrict,
  redeemed_at timestamptz not null default timezone('utc', now()),
  constraint honor_award_claim_redemptions_once unique (code_id, user_id),
  constraint honor_award_claim_redemptions_result_chk check (
    report_id is not null or grant_id is not null
  )
);

alter table public.honor_award_claim_redemptions enable row level security;
revoke all on table public.honor_award_claim_redemptions from public, anon, authenticated;
grant select on table public.honor_award_claim_redemptions to service_role;

create table public.honor_award_claim_attempts (
  id bigint generated always as identity primary key,
  user_id text not null,
  succeeded boolean not null,
  reason_code text,
  attempted_at timestamptz not null default timezone('utc', now())
);

create index honor_award_claim_attempts_user_idx
  on public.honor_award_claim_attempts (user_id, attempted_at desc);

alter table public.honor_award_claim_attempts enable row level security;
revoke all on table public.honor_award_claim_attempts from public, anon, authenticated;
grant select on table public.honor_award_claim_attempts to service_role;

-- The project medal that gives a recipe through an Airs report (its art is the medal image).
create index if not exists project_medals_honor_recipe_idx
  on public.project_medals (honor_recipe_id) where honor_recipe_id is not null;

create or replace function public.honor_award_redeem_code(
  p_user_id text,
  p_code_hash text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text := btrim(coalesce(p_user_id, ''));
  v_user public.users;
  v_code public.honor_award_claim_codes;
  v_recipe public.honor_award_recipes;
  v_now timestamptz := timezone('utc', now());
  v_failed integer;
  v_reason text;
  v_medal_id uuid;
  v_submit jsonb;
  v_report_id uuid;
  v_report_status text;
  v_grant_id uuid;
begin
  if v_user_id = ''
    or coalesce(p_code_hash, '') !~ '^[0-9a-f]{64}$'
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'HONOR_CODE_INVALID');
  end if;

  -- One attempt at a time per person, so the attempt limit cannot be raced.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('honor-code-user:' || v_user_id, 0)
  );

  select count(*) into v_failed
  from public.honor_award_claim_attempts attempt
  where attempt.user_id = v_user_id
    and not attempt.succeeded
    and attempt.attempted_at > v_now - interval '15 minutes';
  if v_failed >= 5 then
    insert into public.honor_award_claim_attempts (user_id, succeeded, reason_code)
    values (v_user_id, false, 'HONOR_CODE_RATE_LIMITED');
    return jsonb_build_object('ok', false, 'reasonCode', 'HONOR_CODE_RATE_LIMITED');
  end if;

  select * into v_user from public.users where id = v_user_id;
  if v_user.id is null
    or nullif(btrim(coalesce(v_user.email, '')), '') is null
    or not coalesce(v_user.email_verified, false)
  then
    v_reason := 'HONOR_CODE_ACCOUNT_UNVERIFIED';
  end if;

  if v_reason is null then
    select * into v_code
    from public.honor_award_claim_codes code
    where code.code_hash = p_code_hash
    for update;

    if v_code.id is null then
      v_reason := 'HONOR_CODE_INVALID';
    elsif v_code.revoked_at is not null then
      v_reason := 'HONOR_CODE_REVOKED';
    elsif v_now < v_code.starts_at then
      v_reason := 'HONOR_CODE_NOT_STARTED';
    elsif v_now >= v_code.expires_at then
      v_reason := 'HONOR_CODE_EXPIRED';
    elsif exists (
      select 1 from public.honor_award_claim_redemptions redemption
      where redemption.code_id = v_code.id and redemption.user_id = v_user_id
    ) then
      v_reason := 'HONOR_CODE_ALREADY_REDEEMED';
    elsif v_code.redemption_count >= v_code.max_redemptions then
      v_reason := 'HONOR_CODE_EXHAUSTED';
    end if;
  end if;

  if v_reason is null then
    select * into v_recipe from public.honor_award_recipes where id = v_code.recipe_id;
    if v_recipe.id is null
      or not v_recipe.is_active
      or v_recipe.audience <> 'user'
      or v_recipe.partner_enterprise_id is distinct from v_code.enterprise_id
    then
      v_reason := 'HONOR_AWARD_NOT_CLAIMABLE';
    -- The creator must still hold their access: a global admin still on the active list,
    -- or a partner_operator / sub_admin still an active member of the ally.
    elsif v_code.created_by_roles && array['platform_owner', 'internal_admin'] then
      if not exists (
        select 1 from public.platform_admins admin
        where admin.email = v_code.created_by_email
          and admin.is_active
          and admin.role = any(v_code.created_by_roles)
      ) then
        v_reason := 'HONOR_CODE_ISSUER_INACTIVE';
      end if;
    elsif not public.marketplace_actor_has_scope(
      v_code.created_by_issuer, v_code.created_by_subject, v_code.created_by_roles,
      v_code.enterprise_id, null, array['partner_operator', 'sub_admin']
    ) then
      v_reason := 'HONOR_CODE_ISSUER_INACTIVE';
    end if;
  end if;

  if v_reason is null and v_recipe.airs_amount > 0 then
    select medal.id into v_medal_id
    from public.project_medals medal
    where medal.honor_recipe_id = v_recipe.id
      and medal.project_id = v_recipe.project_id
      and medal.is_active
    order by medal.created_at
    limit 1;
    if v_medal_id is null then
      v_reason := 'HONOR_AWARD_AIRS_NOT_CONFIGURED';
    end if;
  end if;

  if v_reason is null and v_recipe.airs_amount > 0 then
    v_submit := public.marketplace_submit_airs_report(
      v_recipe.project_id,
      v_user.email,
      v_user.name,
      v_recipe.airs_amount,
      'Galardón ' || v_recipe.title
        || coalesce(' · ' || v_recipe.event_name, '')
        || ' (código de reclamo)',
      v_medal_id,
      'GALARDON-' || upper(left(replace(v_code.id::text, '-', ''), 8)),
      null,
      v_code.created_by_issuer,
      v_code.created_by_subject,
      v_code.created_by_roles,
      v_code.created_by_email,
      true,
      'honor-code:' || v_code.id || ':' || v_user_id
    );
    if not coalesce((v_submit ->> 'ok')::boolean, false) then
      v_reason := coalesce(v_submit ->> 'reasonCode', 'HONOR_AWARD_NOT_CLAIMABLE');
    else
      v_report_id := (v_submit -> 'report' ->> 'id')::uuid;
      v_report_status := v_submit -> 'report' ->> 'status';
      -- Released right away: the medal trigger already created the honor award to claim.
      select award.id into v_grant_id
      from public.honor_award_grants award
      join public.user_medals medal on medal.id = award.user_medal_id
      where medal.report_id = v_report_id;
    end if;
  elsif v_reason is null then
    -- An award without Airs is given directly, once per person.
    begin
      insert into public.honor_award_grants (
        recipe_id, recipient_type, user_id, source, note, awarded_by_issuer, awarded_by_subject
      )
      values (
        v_recipe.id, 'user', v_user_id, 'manual',
        'Código de reclamo ' || v_code.code_hint,
        v_code.created_by_issuer, v_code.created_by_subject
      )
      returning id into v_grant_id;
    exception when unique_violation then
      v_reason := 'HONOR_CODE_ALREADY_REDEEMED';
    end;
  end if;

  if v_reason is not null then
    insert into public.honor_award_claim_attempts (user_id, succeeded, reason_code)
    values (v_user_id, false, v_reason);
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.honor_award_claim_codes
  set redemption_count = redemption_count + 1
  where id = v_code.id;

  insert into public.honor_award_claim_redemptions (code_id, user_id, report_id, grant_id)
  values (v_code.id, v_user_id, v_report_id, v_grant_id);

  insert into public.honor_award_claim_attempts (user_id, succeeded, reason_code)
  values (v_user_id, true, null);

  return jsonb_build_object(
    'ok', true,
    'codeId', v_code.id,
    'recipeId', v_recipe.id,
    'enterpriseId', v_code.enterprise_id,
    'airsAmount', v_recipe.airs_amount,
    'reportId', v_report_id,
    'reportStatus', v_report_status,
    'grantId', v_grant_id
  );
end;
$$;

revoke all on function public.honor_award_redeem_code(text, text, text)
  from public, anon, authenticated;
grant execute on function public.honor_award_redeem_code(text, text, text) to service_role;

commit;
