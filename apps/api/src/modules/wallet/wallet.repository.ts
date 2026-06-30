// Direct PostgREST table access (not Postgres RPC functions like apps/api/src/modules/airs uses) —
// these are plain CRUD operations with no business logic that needs to live in the database. Uses
// the Supabase service role key, same as airs.repository.ts, so RLS is bypassed and ownership is
// enforced here at the application layer by always filtering on the userId resolved from the
// bearer token — never trust a userId supplied directly by the client in a request body.

export type WalletAccountType = 'airs_hd' | 'external';

export interface WalletAccountInput {
  derivationIndex: number;
  evmAddress: string;
  bitcoinAddress: string;
  solanaAddress: string;
  isPrimary?: boolean;
  walletType?: WalletAccountType;
  label?: string;
}

export interface WalletAccountRecord {
  id: string;
  derivationIndex: number;
  evmAddress: string | null;
  bitcoinAddress: string | null;
  solanaAddress: string | null;
  isPrimary: boolean;
  walletType: WalletAccountType;
  label: string | null;
}

export interface WalletPreferencesRecord {
  userId: string;
  pinSalt: string | null;
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: string | null;
  hasLocalWallet: boolean;
}

interface SupabaseRestConfig {
  url: string;
  key: string;
}

function resolveWalletSupabaseConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseRestConfig | null {
  const url = (env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_KEY ??
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

async function restRequest<T>(
  path: string,
  init: RequestInit,
  env: Record<string, string | undefined>
): Promise<T> {
  const config = resolveWalletSupabaseConfig(env);
  if (!config) {
    throw new Error('Supabase is not configured for the wallet module.');
  }

  const response = await fetch(`${config.url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Prefer: 'return=representation',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${path} failed [${response.status}]: ${text}`);
  }

  const body = (await response.json().catch(() => null)) as unknown;
  return (body ?? []) as T;
}

function mapPreferencesRow(row: Record<string, unknown>): WalletPreferencesRecord {
  return {
    userId: String(row.user_id ?? ''),
    pinSalt: typeof row.pin_salt === 'string' ? row.pin_salt : null,
    pinHash: typeof row.pin_hash === 'string' ? row.pin_hash : null,
    pinFailedAttempts: typeof row.pin_failed_attempts === 'number' ? row.pin_failed_attempts : 0,
    pinLockedUntil: typeof row.pin_locked_until === 'string' ? row.pin_locked_until : null,
    hasLocalWallet: row.has_local_wallet === true,
  };
}

function mapAccountRow(row: Record<string, unknown>): WalletAccountRecord {
  return {
    id: String(row.id ?? ''),
    derivationIndex: typeof row.derivation_index === 'number' ? row.derivation_index : 0,
    evmAddress: typeof row.evm_address === 'string' ? row.evm_address : null,
    bitcoinAddress: typeof row.bitcoin_address === 'string' ? row.bitcoin_address : null,
    solanaAddress: typeof row.solana_address === 'string' ? row.solana_address : null,
    isPrimary: row.is_primary === true,
    walletType: row.wallet_type === 'external' ? 'external' : 'airs_hd',
    label: typeof row.label === 'string' ? row.label : null,
  };
}

export async function getWalletPreferences(
  userId: string,
  env: Record<string, string | undefined> = process.env
): Promise<WalletPreferencesRecord | null> {
  const rows = await restRequest<Record<string, unknown>[]>(
    `wallet_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*`,
    { method: 'GET' },
    env
  );

  return rows[0] ? mapPreferencesRow(rows[0]) : null;
}

export async function createWalletPreferences(
  input: { userId: string; pinSalt: string; pinHash: string },
  env: Record<string, string | undefined> = process.env
): Promise<WalletPreferencesRecord> {
  const rows = await restRequest<Record<string, unknown>[]>(
    'wallet_preferences',
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.userId,
        pin_salt: input.pinSalt,
        pin_hash: input.pinHash,
        has_local_wallet: true,
      }),
    },
    env
  );

  return mapPreferencesRow(rows[0] ?? {});
}

export async function recordPinFailure(
  userId: string,
  lockedUntil: string | null,
  failedAttempts: number,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  await restRequest(
    `wallet_preferences?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        pin_failed_attempts: failedAttempts,
        pin_locked_until: lockedUntil,
      }),
    },
    env
  );
}

export async function resetPinFailures(
  userId: string,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  await restRequest(
    `wallet_preferences?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ pin_failed_attempts: 0, pin_locked_until: null }),
    },
    env
  );
}

export async function insertWalletAccount(
  userId: string,
  input: WalletAccountInput,
  env: Record<string, string | undefined> = process.env
): Promise<WalletAccountRecord> {
  const rows = await restRequest<Record<string, unknown>[]>(
    'wallet_accounts',
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        wallet_type: input.walletType ?? 'airs_hd',
        label: input.label ?? null,
        derivation_index: input.derivationIndex,
        evm_address: input.evmAddress,
        bitcoin_address: input.bitcoinAddress,
        solana_address: input.solanaAddress,
        is_primary: input.isPrimary ?? false,
      }),
    },
    env
  );

  return mapAccountRow(rows[0] ?? {});
}

export async function listWalletAccounts(
  userId: string,
  env: Record<string, string | undefined> = process.env
): Promise<WalletAccountRecord[]> {
  const rows = await restRequest<Record<string, unknown>[]>(
    `wallet_accounts?user_id=eq.${encodeURIComponent(userId)}&select=*&order=derivation_index.asc`,
    { method: 'GET' },
    env
  );

  return rows.map(mapAccountRow);
}

// Restore (device-change recovery): the user is already authenticated via their session token —
// that's the actual identity proof, the wallet PIN is a separate, secondary local-decryption
// secret. So restoring on a new device is allowed to overwrite the PIN digest and primary
// account addresses for an already-authenticated user, rather than rejecting because
// `has_local_wallet` is already true (unlike createWalletPreferences, used only for first-ever
// setup).
export async function upsertWalletPreferences(
  input: { userId: string; pinSalt: string; pinHash: string },
  env: Record<string, string | undefined> = process.env
): Promise<WalletPreferencesRecord> {
  const existing = await getWalletPreferences(input.userId, env);

  if (!existing) {
    return createWalletPreferences(input, env);
  }

  const rows = await restRequest<Record<string, unknown>[]>(
    `wallet_preferences?user_id=eq.${encodeURIComponent(input.userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        pin_salt: input.pinSalt,
        pin_hash: input.pinHash,
        has_local_wallet: true,
        pin_failed_attempts: 0,
        pin_locked_until: null,
      }),
    },
    env
  );

  return mapPreferencesRow(rows[0] ?? {});
}

export async function upsertPrimaryWalletAccount(
  userId: string,
  input: WalletAccountInput,
  env: Record<string, string | undefined> = process.env
): Promise<WalletAccountRecord> {
  const accounts = await listWalletAccounts(userId, env);
  const existingPrimary = accounts.find((a) => a.isPrimary);

  if (!existingPrimary) {
    return insertWalletAccount(userId, { ...input, isPrimary: true }, env);
  }

  const rows = await restRequest<Record<string, unknown>[]>(
    `wallet_accounts?id=eq.${encodeURIComponent(existingPrimary.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        derivation_index: input.derivationIndex,
        evm_address: input.evmAddress,
        bitcoin_address: input.bitcoinAddress,
        solana_address: input.solanaAddress,
      }),
    },
    env
  );

  return mapAccountRow(rows[0] ?? {});
}

export async function setPrimaryWalletAccount(
  userId: string,
  accountId: string,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  // Unset the current primary first — the partial unique index on (user_id) where is_primary is
  // true only allows one true value at a time, so setting the new row to true before unsetting
  // the old one would conflict.
  await restRequest(
    `wallet_accounts?user_id=eq.${encodeURIComponent(userId)}&is_primary=eq.true`,
    { method: 'PATCH', body: JSON.stringify({ is_primary: false }) },
    env
  );
  await restRequest(
    `wallet_accounts?id=eq.${encodeURIComponent(accountId)}&user_id=eq.${encodeURIComponent(
      userId
    )}`,
    { method: 'PATCH', body: JSON.stringify({ is_primary: true }) },
    env
  );
}

export async function deleteWalletAccount(
  userId: string,
  accountId: string,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  await restRequest(
    `wallet_accounts?id=eq.${encodeURIComponent(accountId)}&user_id=eq.${encodeURIComponent(
      userId
    )}`,
    { method: 'DELETE' },
    env
  );
}

export async function createWalletSession(
  userId: string,
  walletAccountId: string,
  sessionKey: string,
  expiresAt: string,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  await restRequest(
    'wallet_sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        wallet_account_id: walletAccountId,
        session_key: sessionKey,
        expires_at: expiresAt,
      }),
    },
    env
  );
}
