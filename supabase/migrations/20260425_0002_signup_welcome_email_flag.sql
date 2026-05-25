-- Add signup welcome email tracking flag
-- Tracks whether the signup welcome email has been sent to each user

alter table public.users add column if not exists signup_welcome_email_sent boolean default false;

create or replace function public.mark_signup_welcome_email_sent(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set signup_welcome_email_sent = true
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.mark_signup_welcome_email_sent(uuid) to anon, authenticated;
