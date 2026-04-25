-- public.users.id is text UUID, while AIRS ledger rows still store uuid user_id.
-- Cast to text when the ledger trigger updates the user aggregate columns.

create or replace function public.airs_apply_ledger_entry_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set airs_balance = coalesce(airs_balance, 0) + new.airs_delta,
      airs_lifetime_earned = coalesce(airs_lifetime_earned, 0) + greatest(new.airs_delta, 0),
      airs_last_ledger_entry_at = new.recorded_at,
      airs_last_ledger_entry_id = new.id
  where id = new.user_id::text;

  return new;
end;
$$;
