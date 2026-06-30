/**
 * WalletService unit tests — mocked-repository isolation (TECH-01).
 *
 * Uses CJS module-cache patching (not mock.module(), which requires ESM)
 * to intercept imports before loading the service under test.
 */
const { describe, test, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ─── Test fixtures ─────────────────────────────────────────────────────────

const TEST_USER_ID = 'user-test-001';
const FAKE_TOKEN = 'Bearer fake-token';

function makePrefs(overrides = {}) {
  return {
    userId: TEST_USER_ID,
    pinSalt: 'salt',
    pinHash: 'hash',
    pinFailedAttempts: 0,
    pinLockedUntil: null,
    hasLocalWallet: true,
    ...overrides,
  };
}

function makeAccount(overrides = {}) {
  return {
    id: 'acc-001',
    derivationIndex: 0,
    evmAddress: '0xAAA',
    bitcoinAddress: 'bcAAA',
    solanaAddress: 'solAAA',
    isPrimary: true,
    walletType: 'airs_hd',
    label: null,
    ...overrides,
  };
}

// ─── Mutable stub holders ──────────────────────────────────────────────────

const stubs = {
  resolveUserId: async () => TEST_USER_ID,
  getWalletPreferences: async () => makePrefs(),
  createWalletPreferences: async () => makePrefs(),
  insertWalletAccount: async () => makeAccount(),
  listWalletAccounts: async () => [makeAccount()],
  recordPinFailure: async () => {},
  resetPinFailures: async () => {},
  createWalletSession: async () => {},
  upsertWalletPreferences: async () => makePrefs(),
  upsertPrimaryWalletAccount: async () => makeAccount(),
  setPrimaryWalletAccount: async () => {},
};

const calls = Object.fromEntries(Object.keys(stubs).map((k) => [k, []]));

function trackCalls(fn, name) {
  return async (...args) => {
    calls[name].push(args);
    return stubs[name](...args);
  };
}

// ─── Module cache injection ─────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

function patchCache() {
  const resolveUserIdPath = require.resolve(`${ROOT}/src/common/auth/resolve-user-id.ts`);
  const repositoryPath = require.resolve(`${ROOT}/src/modules/wallet/wallet.repository.ts`);

  // Inject mocked versions into the require cache BEFORE loading wallet.service
  require.cache[resolveUserIdPath] = {
    id: resolveUserIdPath,
    filename: resolveUserIdPath,
    loaded: true,
    exports: { resolveUserId: trackCalls(stubs.resolveUserId, 'resolveUserId') },
    children: [],
    paths: [],
    parent: module,
  };

  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: Object.fromEntries(
      [
        'getWalletPreferences', 'createWalletPreferences', 'insertWalletAccount',
        'listWalletAccounts', 'recordPinFailure', 'resetPinFailures', 'createWalletSession',
        'upsertWalletPreferences', 'upsertPrimaryWalletAccount', 'setPrimaryWalletAccount',
      ].map((name) => [name, trackCalls(stubs[name], name)])
    ),
    children: [],
    paths: [],
    parent: module,
  };
}

function resetCalls() {
  for (const k of Object.keys(calls)) {
    calls[k] = [];
  }
}

// ─── Load service under test ────────────────────────────────────────────────

let WalletService;

describe('WalletService — mocked repository', () => {
  before(() => {
    patchCache();
    // Delete any prior load of wallet.service so it re-requires with mocked deps
    const svcPath = require.resolve(`${ROOT}/src/modules/wallet/wallet.service.ts`);
    delete require.cache[svcPath];
    const svcMod = require(`${ROOT}/src/modules/wallet/wallet.service.ts`);
    WalletService = svcMod.WalletService;
  });

  afterEach(() => {
    resetCalls();
    // Reset stubs to their default implementations after each test
    stubs.getWalletPreferences = async () => makePrefs();
    stubs.listWalletAccounts = async () => [makeAccount()];
    stubs.createWalletPreferences = async () => makePrefs();
    stubs.insertWalletAccount = async () => makeAccount();
    stubs.upsertWalletPreferences = async () => makePrefs();
    stubs.upsertPrimaryWalletAccount = async () => makeAccount();
  });

  // ─── setup() ─────────────────────────────────────────────────────────────

  describe('setup()', () => {
    test('creates preferences and primary account on first setup', async () => {
      stubs.getWalletPreferences = async () => null;
      const svc = new WalletService();
      const result = await svc.setup(FAKE_TOKEN, {
        pinSalt: 'salt1', pinHash: 'hash1',
        account: { derivationIndex: 0, evmAddress: '0x1', bitcoinAddress: 'b1', solanaAddress: 's1' },
      });
      assert.equal(result.account.id, 'acc-001');
      assert.equal(calls.createWalletPreferences.length, 1);
      assert.equal(calls.insertWalletAccount.length, 1);
      assert.equal(calls.insertWalletAccount[0][1].isPrimary, true);
    });

    test('throws ConflictException when wallet already exists', async () => {
      stubs.getWalletPreferences = async () => makePrefs({ hasLocalWallet: true });
      const svc = new WalletService();
      await assert.rejects(
        () => svc.setup(FAKE_TOKEN, {
          pinSalt: 'salt1', pinHash: 'hash1',
          account: { derivationIndex: 0, evmAddress: '0x1', bitcoinAddress: 'b1', solanaAddress: 's1' },
        }),
        { name: 'ConflictException' }
      );
      assert.equal(calls.createWalletPreferences.length, 0);
    });
  });

  // ─── verifyPin() lockout logic ────────────────────────────────────────────

  describe('verifyPin() — lockout logic', () => {
    test('increments failedAttempts and returns remainingAttempts on wrong PIN (below threshold)', async () => {
      stubs.getWalletPreferences = async () =>
        makePrefs({ pinSalt: 'XSALT', pinHash: 'WRONGHASH', pinFailedAttempts: 2 });
      const svc = new WalletService();
      const result = await svc.verifyPin(FAKE_TOKEN, '9999');
      assert.equal(result.verified, false);
      assert.equal(result.lockedUntil, undefined);
      assert.ok(typeof result.remainingAttempts === 'number' && result.remainingAttempts > 0);
      assert.equal(calls.recordPinFailure.length, 1);
      assert.equal(calls.resetPinFailures.length, 0);
    });

    test('sets lockedUntil when failedAttempts reaches the lockout threshold (5)', async () => {
      stubs.getWalletPreferences = async () =>
        makePrefs({ pinSalt: 'XSALT', pinHash: 'WRONGHASH', pinFailedAttempts: 5 });
      const svc = new WalletService();
      const result = await svc.verifyPin(FAKE_TOKEN, '9999');
      assert.equal(result.verified, false);
      assert.ok(typeof result.lockedUntil === 'string', `lockedUntil should be a string, got ${result.lockedUntil}`);
      assert.ok(new Date(result.lockedUntil).getTime() > Date.now());
      assert.equal(result.remainingAttempts, 0);
      const [, lockedUntilArg] = calls.recordPinFailure[0];
      assert.equal(typeof lockedUntilArg, 'string');
    });

    test('returns current lockedUntil immediately when still locked, no new PIN comparison', async () => {
      const lockedUntil = new Date(Date.now() + 60_000).toISOString();
      stubs.getWalletPreferences = async () =>
        makePrefs({ pinSalt: 'S', pinHash: 'H', pinFailedAttempts: 6, pinLockedUntil: lockedUntil });
      const svc = new WalletService();
      const result = await svc.verifyPin(FAKE_TOKEN, '1234');
      assert.equal(result.verified, false);
      assert.equal(result.lockedUntil, lockedUntil);
      assert.equal(calls.recordPinFailure.length, 0, 'must not record another failure while locked');
    });

    test('throws UnauthorizedException when no PIN is configured', async () => {
      stubs.getWalletPreferences = async () => makePrefs({ pinSalt: null, pinHash: null });
      const svc = new WalletService();
      await assert.rejects(() => svc.verifyPin(FAKE_TOKEN, '1234'), { name: 'UnauthorizedException' });
    });
  });

  // ─── Lockout backoff math ─────────────────────────────────────────────────
  // LOCKOUT_BACKOFF_MINUTES = [1, 5, 15, 60, 1440] — first lockout at 6 failures (5+1)

  describe('verifyPin() — lockout backoff escalation', () => {
    const EXPECTED = [1, 5, 15, 60, 1440]; // minutes per backoff step

    for (let i = 0; i < EXPECTED.length; i++) {
      // First lockout (1 min) triggers when DB has 4 existing failures; service adds 1 making
      // total=5=threshold, beyondThreshold=0, BACKOFF[0]=1min.
      const existingFailures = 4 + i;
      const expectedMinutes = EXPECTED[i];

      test(`failure #${existingFailures + 1} (${i} beyond threshold) → ~${expectedMinutes} min lockout`, async () => {
        stubs.getWalletPreferences = async () =>
          makePrefs({ pinSalt: 'S', pinHash: 'H', pinFailedAttempts: existingFailures });
        const svc = new WalletService();
        const t0 = Date.now();
        const result = await svc.verifyPin(FAKE_TOKEN, '0000');
        assert.equal(result.verified, false);
        assert.ok(typeof result.lockedUntil === 'string', 'should be locked after reaching threshold');
        const actualMs = new Date(result.lockedUntil).getTime() - t0;
        const actualMinutes = actualMs / 60_000;
        assert.ok(
          Math.abs(actualMinutes - expectedMinutes) < 1,
          `Expected ~${expectedMinutes} min lockout, got ${actualMinutes.toFixed(2)} min`
        );
      });
    }
  });

  // ─── restore() ───────────────────────────────────────────────────────────

  describe('restore()', () => {
    test('upserts preferences and primary account (succeeds even when wallet already exists)', async () => {
      stubs.getWalletPreferences = async () => makePrefs({ hasLocalWallet: true }); // already set up
      const svc = new WalletService();
      const result = await svc.restore(FAKE_TOKEN, {
        pinSalt: 'newSalt', pinHash: 'newHash',
        account: { derivationIndex: 0, evmAddress: '0xNEW', bitcoinAddress: 'bcNEW', solanaAddress: 'solNEW' },
      });
      assert.ok(result.account);
      assert.equal(calls.upsertWalletPreferences.length, 1);
      assert.equal(calls.upsertPrimaryWalletAccount.length, 1);
    });

    test('works on first-time restore (no existing wallet)', async () => {
      stubs.upsertWalletPreferences = async () => makePrefs({ hasLocalWallet: false });
      const svc = new WalletService();
      // Should not throw ConflictException unlike setup()
      const result = await svc.restore(FAKE_TOKEN, {
        pinSalt: 'salt', pinHash: 'hash',
        account: { derivationIndex: 0, evmAddress: '0x1', bitcoinAddress: 'b1', solanaAddress: 's1' },
      });
      assert.ok(result.account);
    });
  });

  // ─── addAccount() ────────────────────────────────────────────────────────

  describe('addAccount()', () => {
    test('rejects walletType=external (SEC-07: ownership proof required)', async () => {
      const svc = new WalletService();
      await assert.rejects(
        () => svc.addAccount(FAKE_TOKEN, {
          account: { derivationIndex: 0, evmAddress: '0x1', bitcoinAddress: 'b1', solanaAddress: 's1', walletType: 'external' },
        }),
        { name: 'BadRequestException' }
      );
      assert.equal(calls.insertWalletAccount.length, 0);
    });

    test('rejects when hasLocalWallet is false', async () => {
      stubs.getWalletPreferences = async () => makePrefs({ hasLocalWallet: false });
      const svc = new WalletService();
      await assert.rejects(
        () => svc.addAccount(FAKE_TOKEN, {
          account: { derivationIndex: 1, evmAddress: '0x2', bitcoinAddress: 'b2', solanaAddress: 's2' },
        }),
        { name: 'UnauthorizedException' }
      );
    });

    test('inserts a new account when local wallet exists and type is airs_hd', async () => {
      const svc = new WalletService();
      const result = await svc.addAccount(FAKE_TOKEN, {
        account: { derivationIndex: 1, evmAddress: '0x2', bitcoinAddress: 'b2', solanaAddress: 's2' },
      });
      assert.ok(result.account);
      assert.equal(calls.insertWalletAccount.length, 1);
    });
  });

  // ─── setPrimaryAccount() ──────────────────────────────────────────────────

  describe('setPrimaryAccount()', () => {
    test('allows switching to another owned account', async () => {
      stubs.listWalletAccounts = async () => [makeAccount({ id: 'acc-001' }), makeAccount({ id: 'acc-002', isPrimary: false })];
      const svc = new WalletService();
      const result = await svc.setPrimaryAccount(FAKE_TOKEN, 'acc-002');
      assert.ok(result.accounts);
      assert.equal(calls.setPrimaryWalletAccount.length, 1);
    });

    test('throws ForbiddenException for an account that does not belong to this user', async () => {
      stubs.listWalletAccounts = async () => [makeAccount({ id: 'acc-001' })];
      const svc = new WalletService();
      await assert.rejects(
        () => svc.setPrimaryAccount(FAKE_TOKEN, 'acc-SOMEONE-ELSE'),
        { name: 'ForbiddenException' }
      );
      assert.equal(calls.setPrimaryWalletAccount.length, 0);
    });
  });
});
