-- Issue #249 B10: the admin console inbox.
--
-- In-app notifications for the people who work in the admin console: approvers and support
-- (known by email), and the person who submitted a report (known by their token issuer and
-- subject). They are separate from user_notifications, which belongs to Airs app users.
-- Rows are written by the API only (service role); RLS stays deny-all. Each notification is
-- stored once per report, event and recipient, so a replayed request never adds a second one.

begin;

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_issuer text,
  recipient_subject text,
  recipient_email text,
  event_type text not null,
  report_id uuid references public.airs_reports(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  constraint admin_notifications_event_type_chk check (
    event_type in (
      'report_submitted',
      'report_needs_review',
      'report_approved',
      'report_rejected'
    )
  ),
  constraint admin_notifications_recipient_chk check (
    (
      nullif(btrim(coalesce(recipient_issuer, '')), '') is not null
      and nullif(btrim(coalesce(recipient_subject, '')), '') is not null
    )
    or (
      recipient_email is not null
      and recipient_email = lower(btrim(recipient_email))
      and recipient_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    )
  ),
  constraint admin_notifications_payload_chk check (jsonb_typeof(payload) = 'object')
);

-- One notification per report, event and recipient.
create unique index admin_notifications_dedupe_uidx
  on public.admin_notifications (
    event_type,
    report_id,
    coalesce(recipient_email, ''),
    coalesce(recipient_issuer, ''),
    coalesce(recipient_subject, '')
  );
create index admin_notifications_email_idx
  on public.admin_notifications (recipient_email, created_at desc)
  where recipient_email is not null;
create index admin_notifications_identity_idx
  on public.admin_notifications (recipient_issuer, recipient_subject, created_at desc)
  where recipient_issuer is not null;

alter table public.admin_notifications enable row level security;
revoke all on table public.admin_notifications from public, anon, authenticated;
grant select, insert, update on table public.admin_notifications to service_role;

commit;
