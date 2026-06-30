import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import {
  createWalletPreferences,
  createWalletSession,
  getWalletPreferences,
  insertWalletAccount,
  listWalletAccounts,
  recordPinFailure,
  resetPinFailures,
  type WalletAccountRecord,
} from './wallet.repository';
import { generateSessionKey, verifyPinDigest } from './wallet-pin';
import type {
  WalletAddAccountRequestDto,
  WalletSetupRequestDto,
  WalletVerifyPinResponseDto,
} from './dto/wallet.dto';

// Exponential backoff lockout (00-SPEC.md §3.2 / task 08): the first 5 failed attempts only
// increment a counter, no lockout. From the 6th failure onward, lock out for an increasing window.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BACKOFF_MINUTES = [1, 5, 15, 60, 1440]; // 1m, 5m, 15m, 1h, 24h
const SESSION_TTL_MINUTES = 5;

function resolveBackoffMinutes(failedAttemptsBeyondThreshold: number): number {
  const index = Math.min(failedAttemptsBeyondThreshold, LOCKOUT_BACKOFF_MINUTES.length - 1);
  return LOCKOUT_BACKOFF_MINUTES[Math.max(0, index)];
}

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
    const preferences = await getWalletPreferences(userId);
    if (!preferences?.hasLocalWallet) {
      throw new UnauthorizedException('No wallet exists for this account yet.');
    }

    const account = await insertWalletAccount(userId, body.account, process.env);
    return { account };
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
}
