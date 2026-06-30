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
  exportMnemonicKeystore,
  importMnemonicKeystore,
} = require('../dist');

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

// Canonical all-zero-entropy BIP-39 test mnemonic, used across the ecosystem (MetaMask docs,
// ethers.js fixtures, Hardhat/Ganache, etc). The EVM address below at m/44'/60'/0'/0/0 is a
// widely independently-published reference value for this exact mnemonic+path combination —
// a true known-answer test, not just a regression snapshot of this package's own output.
const CANONICAL_TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

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

test('EVM derivation matches the widely-published known-answer value for the canonical test mnemonic', () => {
  const evm = deriveEvmAccount(CANONICAL_TEST_MNEMONIC, 0);
  assert.equal(evm.path, `m/44'/60'/0'/0/0`);
  assert.equal(evm.address, '0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
});

test('Bitcoin/Solana derivation is stable for the canonical test mnemonic (regression, not an externally-published vector)', () => {
  const bitcoin = deriveBitcoinAccount(CANONICAL_TEST_MNEMONIC, 0);
  const solana = deriveSolanaAccount(CANONICAL_TEST_MNEMONIC, 0);

  assert.equal(bitcoin.path, `m/44'/0'/0'/0/0`);
  assert.equal(bitcoin.address, 'bc1qmxrw6qdh5g3ztfcwm0et5l8mvws4eva24kmp8m');

  assert.equal(solana.path, `m/44'/501'/0'/0'`);
  assert.equal(solana.address, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
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

test('keystore export/import round-trips the mnemonic with the correct PIN', async () => {
  const keystore = await exportMnemonicKeystore('445566', TEST_MNEMONIC);

  assert.equal(keystore.alternunKeystoreVersion, 1);
  assert.equal(keystore.crypto.cipher, 'aes-128-ctr');
  assert.equal(keystore.crypto.kdf, 'scrypt');

  const recovered = await importMnemonicKeystore('445566', keystore);
  assert.equal(recovered, TEST_MNEMONIC);
});

test('keystore import rejects the wrong PIN', async () => {
  const keystore = await exportMnemonicKeystore('445566', TEST_MNEMONIC);
  const result = await importMnemonicKeystore('000000', keystore);
  assert.equal(result, null);
});

test('keystore import rejects a tampered ciphertext', async () => {
  const keystore = await exportMnemonicKeystore('445566', TEST_MNEMONIC);
  const tampered = {
    ...keystore,
    crypto: {
      ...keystore.crypto,
      ciphertext: keystore.crypto.ciphertext.replace(/^./, keystore.crypto.ciphertext[0] === '0' ? '1' : '0'),
    },
  };

  const result = await importMnemonicKeystore('445566', tampered);
  assert.equal(result, null);
});
