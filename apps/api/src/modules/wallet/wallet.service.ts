import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import {
  createWalletPreferences,
  createWalletSession,
  getWalletPreferences,
  insertWalletAccount,
  listWalletAccounts,
  recordPinFailure,
  resetPinFailures,
  setPrimaryWalletAccount,
  upsertPrimaryWalletAccount,
  upsertWalletPreferences,
  type WalletAccountRecord,
} from './wallet.repository';
import { generateSessionKey, verifyPinDigest } from './wallet-pin';
import type {
  WalletActivityResponseDto,
  WalletAddAccountRequestDto,
  WalletBalancesResponseDto,
  WalletBroadcastRequestDto,
  WalletRestoreRequestDto,
  WalletSetupRequestDto,
  WalletVerifyPinResponseDto,
} from './dto/wallet.dto';
import { BitcoinChainAdapter } from './chains/bitcoin-adapter';
import type { ChainAdapter, NetworkParams } from './chains/chain-adapter';
import { EvmChainAdapter } from './chains/evm-adapter';
import { SolanaChainAdapter } from './chains/solana-adapter';
import { withTtlCache } from './chains/ttl-cache';

// Exponential backoff lockout (00-SPEC.md §3.2 / task 08): the first 5 failed attempts only
// increment a counter, no lockout. From the 6th failure onward, lock out for an increasing window.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BACKOFF_MINUTES = [1, 5, 15, 60, 1440]; // 1m, 5m, 15m, 1h, 24h
const SESSION_TTL_MINUTES = 5;

function resolveBackoffMinutes(failedAttemptsBeyondThreshold: number): number {
  const index = Math.min(failedAttemptsBeyondThreshold, LOCKOUT_BACKOFF_MINUTES.length - 1);
  return LOCKOUT_BACKOFF_MINUTES[Math.max(0, index)];
}

const CHAIN_ADAPTERS: Record<'evm' | 'bitcoin' | 'solana', ChainAdapter> = {
  evm: new EvmChainAdapter(),
  bitcoin: new BitcoinChainAdapter(),
  solana: new SolanaChainAdapter(),
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  async setup(
    token: string,
    body: WalletSetupRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    const userId = await resolveUserId(token);

    const existing = await getWalletPreferences(userId);
    if (existing?.hasLocalWallet) {
      throw new ConflictException('A wallet already exists for this account.');
    }

    await createWalletPreferences(
      { userId, pinSalt: body.pinSalt, pinHash: body.pinHash },
      process.env
    ).catch((error: unknown) => {
      this.logger.error(
        `Wallet setup failed creating preferences: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    });

    const account = await insertWalletAccount(
      userId,
      { ...body.account, isPrimary: true },
      process.env
    ).catch((error: unknown) => {
      this.logger.error(
        `Wallet setup failed creating account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    });

    return { account };
  }

  async addAccount(
    token: string,
    body: WalletAddAccountRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    const userId = await resolveUserId(token);

    // External wallet linking requires signature-verified ownership proof (SEC-07 / task 12) —
    // without it, any authenticated user could register someone else's address as their own and
    // redirect reward payouts to it. Block this path until the challenge/verify flow is built.
    if (body.account.walletType === 'external') {
      throw new BadRequestException(
        'External wallet linking requires a signature-verified ownership proof and is not yet available.'
      );
    }

    const preferences = await getWalletPreferences(userId);
    if (!preferences?.hasLocalWallet) {
      throw new UnauthorizedException('No wallet exists for this account yet.');
    }

    const account = await insertWalletAccount(userId, body.account, process.env);
    return { account };
  }

  // Device-change recovery (00-SPEC.md device-only recovery model): the user re-enters their
  // already-backed-up mnemonic on a new device, re-derives the same addresses client-side, and
  // picks a new PIN there. This overwrites the server's PIN digest + primary account record
  // rather than rejecting like setup() does — the session token already proves identity, the PIN
  // is just a secondary local-decryption secret being reset alongside the new device.
  async restore(
    token: string,
    body: WalletRestoreRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    const userId = await resolveUserId(token);

    await upsertWalletPreferences(
      { userId, pinSalt: body.pinSalt, pinHash: body.pinHash },
      process.env
    ).catch((error: unknown) => {
      this.logger.error(
        `Wallet restore failed updating preferences: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    });

    const account = await upsertPrimaryWalletAccount(userId, body.account, process.env).catch(
      (error: unknown) => {
        this.logger.error(
          `Wallet restore failed updating primary account: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }
    );

    return { account };
  }

  async setPrimaryAccount(
    token: string,
    accountId: string
  ): Promise<{ accounts: WalletAccountRecord[] }> {
    const userId = await resolveUserId(token);
    const accounts = await listWalletAccounts(userId);
    if (!accounts.some((a) => a.id === accountId)) {
      throw new ForbiddenException('That wallet account does not belong to this user.');
    }

    await setPrimaryWalletAccount(userId, accountId, process.env);
    return { accounts: await listWalletAccounts(userId) };
  }

  async listAccounts(token: string): Promise<{ accounts: WalletAccountRecord[] }> {
    const userId = await resolveUserId(token);
    return { accounts: await listWalletAccounts(userId) };
  }

  async verifyPin(token: string, pin: string): Promise<WalletVerifyPinResponseDto> {
    const userId = await resolveUserId(token);
    const preferences = await getWalletPreferences(userId);

    if (!preferences?.pinSalt || !preferences.pinHash) {
      throw new UnauthorizedException('No wallet PIN is set up for this account.');
    }

    if (preferences.pinLockedUntil && new Date(preferences.pinLockedUntil) > new Date()) {
      return { verified: false, lockedUntil: preferences.pinLockedUntil };
    }

    const matches = verifyPinDigest(pin, preferences.pinSalt, preferences.pinHash);

    if (!matches) {
      const failedAttempts = preferences.pinFailedAttempts + 1;
      let lockedUntil: string | null = null;

      if (failedAttempts >= LOCKOUT_THRESHOLD) {
        const backoffMinutes = resolveBackoffMinutes(failedAttempts - LOCKOUT_THRESHOLD);
        lockedUntil = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      }

      await recordPinFailure(userId, lockedUntil, failedAttempts);

      return {
        verified: false,
        lockedUntil: lockedUntil ?? undefined,
        remainingAttempts: lockedUntil ? 0 : Math.max(0, LOCKOUT_THRESHOLD - failedAttempts),
      };
    }

    await resetPinFailures(userId);

    const accounts = await listWalletAccounts(userId);
    const primaryAccount = accounts.find((a) => a.isPrimary) ?? accounts[0];
    let sessionKey: string | undefined;
    let sessionExpiresAt: string | undefined;

    if (primaryAccount) {
      sessionKey = generateSessionKey();
      sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString();
      await createWalletSession(userId, primaryAccount.id, sessionKey, sessionExpiresAt).catch(
        (error: unknown) => {
          // Non-fatal: the PIN check itself already succeeded, the session row is only a UX
          // convenience (skip the "are you sure" friction, not the actual re-derivation).
          this.logger.warn(
            `Wallet session creation failed (non-fatal): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      );
    }

    return { verified: true, sessionKey, sessionExpiresAt };
  }

  async balances(token: string): Promise<WalletBalancesResponseDto> {
    const userId = await resolveUserId(token);
    const accounts = await listWalletAccounts(userId);
    const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
    if (!primary) {
      return { balances: [] };
    }

    const addressByChain: Record<'evm' | 'bitcoin' | 'solana', string | null> = {
      evm: primary.evmAddress,
      bitcoin: primary.bitcoinAddress,
      solana: primary.solanaAddress,
    };

    const results = await Promise.allSettled(
      (Object.keys(CHAIN_ADAPTERS) as Array<'evm' | 'bitcoin' | 'solana'>).map(async (chain) => {
        const address = addressByChain[chain];
        if (!address) return null;
        const balance = await withTtlCache(`balance:${chain}:${address}`, () =>
          CHAIN_ADAPTERS[chain].getBalance(address)
        );
        return { chain, ...balance };
      })
    );

    const balances = results
      .filter(
        (
          r
        ): r is PromiseFulfilledResult<{
          chain: 'evm' | 'bitcoin' | 'solana';
          amount: string;
          unit: string;
        }> => r.status === 'fulfilled' && r.value !== null
      )
      .map((r) => r.value);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Balance lookup failed (non-fatal): ${String(result.reason)}`);
      }
    }

    return { balances };
  }

  async activity(token: string): Promise<WalletActivityResponseDto> {
    const userId = await resolveUserId(token);
    const accounts = await listWalletAccounts(userId);
    const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
    if (!primary) {
      return { activity: [] };
    }

    const addressByChain: Record<'evm' | 'bitcoin' | 'solana', string | null> = {
      evm: primary.evmAddress,
      bitcoin: primary.bitcoinAddress,
      solana: primary.solanaAddress,
    };

    const results = await Promise.allSettled(
      (Object.keys(CHAIN_ADAPTERS) as Array<'evm' | 'bitcoin' | 'solana'>).map(async (chain) => {
        const address = addressByChain[chain];
        if (!address) return [];
        const entries = await withTtlCache(`activity:${chain}:${address}`, () =>
          CHAIN_ADAPTERS[chain].getActivity(address)
        );
        return entries.map((entry) => ({ chain, ...entry }));
      })
    );

    const activity = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Activity lookup failed (non-fatal): ${String(result.reason)}`);
      }
    }

    return { activity };
  }

  async networkParams(token: string, chain: 'evm' | 'bitcoin' | 'solana'): Promise<NetworkParams> {
    const userId = await resolveUserId(token);
    const accounts = await listWalletAccounts(userId);
    const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
    if (!primary) {
      throw new BadRequestException('No wallet account exists for this user yet.');
    }

    const addressByChain: Record<'evm' | 'bitcoin' | 'solana', string | null> = {
      evm: primary.evmAddress,
      bitcoin: primary.bitcoinAddress,
      solana: primary.solanaAddress,
    };

    const address = addressByChain[chain];
    if (!address) {
      throw new BadRequestException(`No ${chain} address registered for this account.`);
    }

    return CHAIN_ADAPTERS[chain].getNetworkParams(address);
  }

  async broadcast(token: string, body: WalletBroadcastRequestDto): Promise<{ txHash: string }> {
    // Authenticated, but otherwise just a thin proxy: the client has already signed the
    // transaction locally (00-SPEC.md §6 step 5) — this never sees a private key.
    await resolveUserId(token);

    const adapter = CHAIN_ADAPTERS[body.chain];
    if (!adapter) {
      throw new BadRequestException(`Unsupported chain: ${String(body.chain)}`);
    }

    return adapter.broadcast(body.signedTransaction);
  }
}
