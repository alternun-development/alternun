-- Issue #249 B8: the submitter's +5 reward must reach accounts synced by the Authentik
-- webhook.
--
-- The reward records the panel token's issuer and subject, where the subject is the
-- Authentik user UUID. Accounts synced by the webhook store a hashed principal in
-- users.sub and keep that UUID in raw_claims, so the exact issuer/subject match of
-- 20261027_0005 never found them and the reward stayed locked. The lookup now prefers
-- the exact match and otherwise takes the account whose raw_claims carry that UUID.

begin;

create or replace function public.airs_report_unlock_rewards(
  p_user_id text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c_threshold constant numeric := 20;
  v_user_id text := btrim(coalesce(p_user_id, ''));
  v_paid numeric;
  v_reward public.airs_report_rewards;
  v_report public.airs_reports;
  v_beneficiary text;
  v_entry_id uuid;
  v_unlocked integer := 0;
  v_waiting integer := 0;
begin
  if v_user_id = '' or nullif(btrim(coalesce(p_request_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'reasonCode', 'AIRS_REPORT_INPUT_INVALID');
  end if;

  if not exists (
    select 1
    from public.airs_report_rewards reward
    join public.airs_reports report on report.id = reward.report_id
    where reward.status = 'locked'
      and report.status = 'released'
      and report.recipient_user_id = v_user_id
  ) then
    return jsonb_build_object('ok', true, 'unlocked', 0, 'waiting', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('airs-report-unlock:' || v_user_id, 0)
  );

  select coalesce(sum(entry.airs_delta), 0) into v_paid
  from public.airs_ledger_entries entry
  where entry.user_id::text = v_user_id
    and entry.source_kind in ('allied_commerce', 'admin_airs_report');

  if v_paid < c_threshold then
    return jsonb_build_object(
      'ok', true, 'unlocked', 0, 'waiting', 0,
      'paidAirs', v_paid, 'threshold', c_threshold
    );
  end if;

  -- A reward voided by a reversal while we waited for its row lock is skipped: the
  -- status filter is evaluated again once the lock is granted.
  for v_reward in
    select reward.*
    from public.airs_report_rewards reward
    join public.airs_reports report on report.id = reward.report_id
    where reward.status = 'locked'
      and report.status = 'released'
      and report.recipient_user_id = v_user_id
    order by report.released_at, reward.kind, reward.id
    for update of reward
  loop
    v_beneficiary := null;
    select * into v_report from public.airs_reports report where report.id = v_reward.report_id;

    if v_reward.kind = 'submitter' then
      select app_user.id::text into v_beneficiary
      from public.users app_user
      where (app_user.iss = v_reward.beneficiary_issuer
          and app_user.sub = v_reward.beneficiary_subject)
        or app_user.raw_claims ->> 'uuid' = v_reward.beneficiary_subject
      order by (app_user.iss = v_reward.beneficiary_issuer
        and app_user.sub = v_reward.beneficiary_subject) desc
      limit 1;
    else
      select coalesce(
        nullif(btrim(coalesce(v_reward.beneficiary_user_id, '')), ''),
        nullif(btrim(coalesce(project.project_account_user_id, '')), '')
      ) into v_beneficiary
      from public.projects project
      where project.id = v_report.project_id;
    end if;

    if v_beneficiary is null then
      v_waiting := v_waiting + 1;
      continue;
    end if;

    v_entry_id := public.airs_report_write_reward_ledger(
      v_beneficiary,
      v_reward.idempotency_key,
      v_reward.amount,
      v_report,
      v_reward.id,
      v_report.concept
    );

    update public.airs_report_rewards
    set status = 'credited',
        beneficiary_user_id = v_beneficiary,
        ledger_entry_id = v_entry_id,
        credited_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = v_reward.id;

    perform public.airs_report_audit(
      'system', 'airs-report-unlock', '{}'::text[], 'airs_report.reward_unlocked',
      v_report.id, v_report.project_id, btrim(p_request_id), 'allowed', null,
      null, null,
      jsonb_build_object(
        'rewardId', v_reward.id, 'kind', v_reward.kind, 'amount', v_reward.amount,
        'beneficiaryUserId', v_beneficiary, 'ledgerEntryId', v_entry_id,
        'paidAirs', v_paid
      )
    );

    v_unlocked := v_unlocked + 1;
  end loop;

  return jsonb_build_object(
    'ok', true, 'unlocked', v_unlocked, 'waiting', v_waiting,
    'paidAirs', v_paid, 'threshold', c_threshold
  );
end;
$$;

revoke all on function public.airs_report_unlock_rewards(text, text)
  from public, anon, authenticated;
grant execute on function public.airs_report_unlock_rewards(text, text) to service_role;

commit;
