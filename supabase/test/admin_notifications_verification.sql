-- Verification for 20261029_0001 (issue #249 B10): the admin console inbox.
-- Run after all migrations on a disposable local database; always rolled back.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_result jsonb;
  v_report uuid;
  v_count integer;
begin
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'notifications-verification', 'Notifications Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_project, 'notifications-project', 'other', 'en', '{"en":{"title":"N"}}'::jsonb,
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values (v_enterprise_id, v_project, 'owner', true, 'verification', 'seed');

  v_result := public.marketplace_submit_airs_report(
    v_project, 'guest.one@example.test', 'Guest One', 10, 'Stay at the pilot hotel', null,
    'INV-NOTIFY-1', null, 'verification', 'admin-a', array['internal_admin'],
    'submitter@example.test', true, 'notify-1'
  );
  v_report := (v_result -> 'report' ->> 'id')::uuid;

  -- By email and by identity -------------------------------------------------------------
  insert into public.admin_notifications (recipient_email, event_type, report_id, project_id)
  values ('support@example.test', 'report_submitted', v_report, v_project);
  insert into public.admin_notifications (
    recipient_issuer, recipient_subject, event_type, report_id, project_id
  ) values ('verification', 'admin-a', 'report_approved', v_report, v_project);

  -- The same report, event and recipient is refused ----------------------------------------
  begin
    insert into public.admin_notifications (recipient_email, event_type, report_id, project_id)
    values ('support@example.test', 'report_submitted', v_report, v_project);
    raise exception 'a duplicate notification was stored';
  exception when unique_violation then null;
  end;
  -- Another recipient or another event is a different notification.
  insert into public.admin_notifications (recipient_email, event_type, report_id, project_id)
  values ('ops@example.test', 'report_submitted', v_report, v_project);
  insert into public.admin_notifications (recipient_email, event_type, report_id, project_id)
  values ('support@example.test', 'report_rejected', v_report, v_project);

  -- Constraints ----------------------------------------------------------------------------
  begin
    insert into public.admin_notifications (recipient_email, event_type, report_id)
    values ('support@example.test', 'not_an_event', v_report);
    raise exception 'an unknown event type was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.admin_notifications (event_type, report_id)
    values ('report_submitted', v_report);
    raise exception 'a notification without a recipient was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.admin_notifications (recipient_email, event_type, report_id)
    values ('Not.Normalized@Example.test', 'report_submitted', v_report);
    raise exception 'a non-normalized email was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.admin_notifications (recipient_issuer, event_type, report_id)
    values ('verification', 'report_submitted', v_report);
    raise exception 'an identity without a subject was accepted';
  exception when check_violation then null;
  end;

  select count(*) into v_count from public.admin_notifications where report_id = v_report;
  if v_count <> 4 then
    raise exception 'expected four notifications, found %', v_count;
  end if;

  -- Marking one read leaves the others alone ---------------------------------------------------
  update public.admin_notifications set read_at = timezone('utc', now())
  where recipient_email = 'support@example.test' and event_type = 'report_submitted';
  if (select count(*) from public.admin_notifications where read_at is not null) <> 1 then
    raise exception 'marking one notification read changed others';
  end if;

  -- No client access -------------------------------------------------------------------------------
  if has_table_privilege('anon', 'public.admin_notifications', 'select')
    or has_table_privilege('authenticated', 'public.admin_notifications', 'select')
    or has_table_privilege('authenticated', 'public.admin_notifications', 'insert')
    or has_table_privilege('authenticated', 'public.admin_notifications', 'update')
  then
    raise exception 'a client role can access admin_notifications';
  end if;
  if (select relrowsecurity from pg_class where oid = 'public.admin_notifications'::regclass) is not true then
    raise exception 'row level security is off on admin_notifications';
  end if;
end;
$$;

rollback;
