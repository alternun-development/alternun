-- Alternun Wallet System — encrypted seed storage + PIN lockout columns.
-- See .agents/active-tasks/alternun-wallet-system/00-SPEC.md §4 for full rationale.
--
-- Private keys/seeds are never stored raw. The seed ciphertext here is encrypted client-side
-- with a key derived from the user's PIN combined with a server-held "wallet binding secret"
-- (see §3.1/§3.2). The server never has both halves of the encryption material in one place:
-- the binding secret is envelope-encrypted under an AWS KMS key (§4.3 approach a) and stored
-- here only as ciphertext, decrypted on-demand by the API at PIN-verification time.

create table if not exists public.wallet_encrypted_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  kdf_params jsonb not null,
  kek_version smallint not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists wallet_encrypted_seeds_user_id_idx
  on public.wallet_encrypted_seeds (user_id);

drop trigger if exists trg_wallet_encrypted_seeds_set_updated_at on public.wallet_encrypted_seeds;
create trigger trg_wallet_encrypted_seeds_set_updated_at
before update on public.wallet_encrypted_seeds
for each row
execute function public.wallet_records_set_updated_at();

alter table public.wallet_encrypted_seeds enable row level security;

drop policy if exists wallet_encrypted_seeds_user_owns_rows on public.wallet_encrypted_seeds;
create policy wallet_encrypted_seeds_user_owns_rows
on public.wallet_encrypted_seeds
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.wallet_encrypted_seeds to authenticated;

-- Per-user PIN lockout (independent of any IP-based throttling — see §8 of the spec's task 08).
alter table public.wallet_preferences
  add column if not exists pin_failed_attempts integer not null default 0,
  add column if not exists pin_locked_until timestamptz;

-- Envelope-encrypted wallet binding secret (§4.3 approach a — AWS KMS). The ciphertext is opaque
-- to Postgres; only the API's Lambda execution role can decrypt it via kms:Decrypt on the
-- dedicated wallet-binding KMS key provisioned in task 02/packages/infra.
alter table public.wallet_preferences
  add column if not exists wallet_binding_secret_ciphertext text,
  add column if not exists wallet_binding_secret_key_id text;
