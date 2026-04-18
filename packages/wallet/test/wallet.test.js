const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateMnemonic,
  validateMnemonic,
  deriveEvmAccount,
  deriveBitcoinAccount,
  deriveSolanaAccount,
  deriveWalletBundle,
  storeMnemonic,
  unlockMnemonic,
  clearMnemonic,
  createPinDigest,
  verifyPin,
} = require('../dist');

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

function createMemorySecureStore() {
  const memory = new Map();

  return {
    async getItemAsync(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    async setItemAsync(key, value) {
      memory.set(key, value);
    },
    async deleteItemAsync(key) {
      memory.delete(key);
    },
  };
}

test('mnemonic generation produces valid BIP39 phrase', () => {
  const mnemonic = generateMnemonic();
  assert.equal(validateMnemonic(mnemonic), true);
  assert.equal(mnemonic.split(' ').length, 12);
});

test('chain derivation returns expected account 0 addresses', () => {
  const evm = deriveEvmAccount(TEST_MNEMONIC, 0);
  const bitcoin = deriveBitcoinAccount(TEST_MNEMONIC, 0);
  const solana = deriveSolanaAccount(TEST_MNEMONIC, 0);

  assert.equal(evm.path, `m/44'/60'/0'/0/0`);
  assert.equal(evm.address, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

  assert.equal(bitcoin.path, `m/44'/0'/0'/0/0`);
  assert.equal(bitcoin.address, 'bc1qjesugmy5wq9jejy3zz0llsaynvndrauwtwj4yl');

  assert.equal(solana.path, `m/44'/501'/0'/0'`);
  assert.equal(solana.address, 'oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96');
});

test('bundle derivation includes all chains at selected index', () => {
  const bundle = deriveWalletBundle(TEST_MNEMONIC, 1);

  assert.equal(bundle.accountIndex, 1);
  assert.ok(bundle.evm.address.startsWith('0x'));
  assert.ok(bundle.bitcoin.address.startsWith('bc1'));
  assert.ok(bundle.solana.address.length > 20);
});

test('vault encryption unlocks with correct pin and rejects wrong pin', async () => {
  const store = createMemorySecureStore();

  await storeMnemonic('112233', TEST_MNEMONIC, store);

  const unlocked = await unlockMnemonic('112233', store);
  assert.equal(unlocked, TEST_MNEMONIC);

  const wrongPinResult = await unlockMnemonic('998877', store);
  assert.equal(wrongPinResult, null);

  await clearMnemonic(store);
  const empty = await unlockMnemonic('112233', store);
  assert.equal(empty, null);
});

test('PIN digest verification succeeds for valid PIN and fails for invalid PIN', async () => {
  const digest = await createPinDigest('135790');

  assert.equal(await verifyPin('135790', digest.salt, digest.hash), true);
  assert.equal(await verifyPin('135791', digest.salt, digest.hash), false);
});
