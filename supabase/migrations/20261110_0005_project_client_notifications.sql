-- In-app notice for Alternun global admins and project admins when someone adds a client to a
-- project or assigns Airs to one. Informative only: approval rules do not change.

begin;

alter table public.user_notifications
  drop constraint if exists user_notifications_event_type_chk;

alter table public.user_notifications
  add constraint user_notifications_event_type_chk check (
    event_type in (
      'registration_completed',
      'airs_credited',
      'referral_confirmed',
      'wallet_connected',
      'profile_completed',
      'airs_report_submitted',
      'airs_report_pending_approval',
      'airs_report_approved',
      'airs_report_rejected',
      'airs_report_released',
      'airs_report_rewards_unlocked',
      'project_client_added'
    )
  );

notify pgrst, 'reload schema';

commit;
