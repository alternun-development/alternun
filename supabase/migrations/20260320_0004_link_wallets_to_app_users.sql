-- Add a soft link from user_wallets to our vendor-independent public.users table.
-- The column is nullable so existing wallet rows are unaffected; the old
-- user_id → auth.users FK remains intact for backwards compatibility.

alter table public.user_wallets
  add column if not exists app_user_id uuid references public.users(id) on delete set null;

create index if not exists user_wallets_app_user_id_idx
  on public.user_wallets (app_user_id)
  where app_user_id is not null;

-- Helper: link a wallet address to an app_user after OIDC sign-in.
-- Called by the mobile client via supabase.rpc() using the anon key.
create or replace function public.link_wallet_to_app_user(
  p_app_user_id         uuid,
  p_chain               text,
  p_wallet_address_norm text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_wallets
     set app_user_id = p_app_user_id,
         updated_at  = timezone('utc', now())
   where chain                    = p_chain
     and wallet_address_normalized = p_wallet_address_norm;
end;
$$;

grant execute on function public.link_wallet_to_app_user(uuid, text, text)
  to anon, authenticated;
