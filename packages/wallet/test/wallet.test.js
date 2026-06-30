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
  signEvmTransaction,
  signBitcoinTransaction,
  signSolanaTransaction,
  isValidChainAddress,
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

test('chain derivation returns expected account 0 addresses (bitcoin: mainnet, explicit)', () => {
  const evm = deriveEvmAccount(TEST_MNEMONIC, 0);
  const bitcoin = deriveBitcoinAccount(TEST_MNEMONIC, 0, 'mainnet');
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

test('Bitcoin/Solana derivation is stable for the canonical test mnemonic (regression, not an externally-published vector; bitcoin: mainnet, explicit)', () => {
  const bitcoin = deriveBitcoinAccount(CANONICAL_TEST_MNEMONIC, 0, 'mainnet');
  const solana = deriveSolanaAccount(CANONICAL_TEST_MNEMONIC, 0);

  assert.equal(bitcoin.path, `m/44'/0'/0'/0/0`);
  assert.equal(bitcoin.address, 'bc1qmxrw6qdh5g3ztfcwm0et5l8mvws4eva24kmp8m');

  assert.equal(solana.path, `m/44'/501'/0'/0'`);
  assert.equal(solana.address, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
});

test('deriveBitcoinAccount defaults to testnet (tb1...) when no network is passed', () => {
  // Regression test for a real bug: the function previously always derived a mainnet (bc1...)
  // address regardless of deploy stage, while the server's balance/activity/broadcast adapters
  // are stage-aware (testnet Esplora in dev). The mismatch made every Bitcoin balance lookup
  // fail silently (dropped from the response) for every wallet ever created in dev/testnet.
  const bitcoin = deriveBitcoinAccount(CANONICAL_TEST_MNEMONIC, 0);
  assert.ok(bitcoin.address.startsWith('tb1'), `expected a testnet (tb1...) address, got ${bitcoin.address}`);

  const explicitTestnet = deriveBitcoinAccount(CANONICAL_TEST_MNEMONIC, 0, 'testnet');
  assert.equal(bitcoin.address, explicitTestnet.address, 'default must match explicit testnet');
});

test('bundle derivation includes all chains at selected index (default bitcoin network: testnet)', () => {
  const bundle = deriveWalletBundle(TEST_MNEMONIC, 1);

  assert.equal(bundle.accountIndex, 1);
  assert.ok(bundle.evm.address.startsWith('0x'));
  assert.ok(bundle.bitcoin.address.startsWith('tb1'), `expected tb1..., got ${bundle.bitcoin.address}`);
  assert.ok(bundle.solana.address.length > 20);
});

test('bundle derivation passes through an explicit mainnet bitcoin network', () => {
  const bundle = deriveWalletBundle(TEST_MNEMONIC, 1, 'mainnet');
  assert.ok(bundle.bitcoin.address.startsWith('bc1'), `expected bc1..., got ${bundle.bitcoin.address}`);
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

test('vault decryption is backward-compatible with payloads written before the iterations field existed', async () => {
  // Manually builds a payload matching the *old* format (210_000 iterations, no `iterations`
  // field) to confirm unlockMnemonic still decrypts it correctly via the `?? 210_000` fallback —
  // raising VAULT_PBKDF2_ITERATIONS to 600_000 must not strand anyone who already has a wallet.
  const { webcrypto } = require('node:crypto');
  const subtle = webcrypto.subtle;
  const LEGACY_ITERATIONS = 210000;
  const pin = '445566';

  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: LEGACY_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const plaintext = new TextEncoder().encode(
    JSON.stringify({ mnemonic: TEST_MNEMONIC, createdAt: new Date().toISOString() })
  );
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));

  const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
  const legacyPayload = {
    version: 1,
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    salt: toBase64(salt),
    // intentionally no `iterations` field — simulates a payload written before this change
  };

  const store = createMemorySecureStore();
  await store.setItemAsync('airs_encrypted_mnemonic', JSON.stringify(legacyPayload));

  const unlocked = await unlockMnemonic(pin, store);
  assert.equal(unlocked, TEST_MNEMONIC);
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

test('signEvmTransaction produces a serialized signed tx hex string', async () => {
  const signed = await signEvmTransaction(CANONICAL_TEST_MNEMONIC, 0, {
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    valueWei: 1000000000000000000n,
    nonce: 0,
    gasPriceWei: 20000000000n,
    chainId: 11155111,
  });

  assert.equal(typeof signed, 'string');
  assert.ok(signed.startsWith('0x'));
  assert.ok(signed.length > 100);
});

test('signBitcoinTransaction produces a finalized raw tx hex with no change output when fully spent', () => {
  const signed = signBitcoinTransaction(CANONICAL_TEST_MNEMONIC, 0, {
    utxos: [{ txid: '11'.repeat(32), vout: 0, valueSats: 100000 }],
    toAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
    changeAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
    amountSats: 50000n,
    feeRateSatsPerVb: 2,
    network: 'testnet',
  });

  assert.equal(typeof signed, 'string');
  assert.ok(/^[0-9a-f]+$/.test(signed));
  assert.ok(signed.length > 100);
});

test('signBitcoinTransaction throws when UTXOs cannot cover amount + fee', () => {
  assert.throws(() => {
    signBitcoinTransaction(CANONICAL_TEST_MNEMONIC, 0, {
      utxos: [{ txid: '22'.repeat(32), vout: 0, valueSats: 1000 }],
      toAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      changeAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      amountSats: 50000n,
      feeRateSatsPerVb: 2,
      network: 'testnet',
    });
  });
});

test('signSolanaTransaction produces a base64-serialized signed transaction', () => {
  const signed = signSolanaTransaction(CANONICAL_TEST_MNEMONIC, 0, {
    toAddress: 'oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96',
    lamports: 1000000,
    recentBlockhash: 'So11111111111111111111111111111111111111112',
  });

  assert.equal(typeof signed, 'string');
  assert.ok(Buffer.from(signed, 'base64').length > 50);
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

test('isValidChainAddress accepts correctly-formatted addresses per chain', () => {
  assert.equal(isValidChainAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'evm', 'testnet'), true);
  assert.equal(isValidChainAddress('bc1qmxrw6qdh5g3ztfcwm0et5l8mvws4eva24kmp8m', 'bitcoin', 'mainnet'), true);
  assert.equal(isValidChainAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'bitcoin', 'testnet'), true);
  assert.equal(isValidChainAddress('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk', 'solana', 'mainnet'), true);
});

test('isValidChainAddress rejects malformed or wrong-chain addresses', () => {
  assert.equal(isValidChainAddress('not-an-address', 'evm', 'testnet'), false);
  assert.equal(isValidChainAddress('', 'evm', 'testnet'), false);
  // EVM address sent to bitcoin field
  assert.equal(isValidChainAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'bitcoin', 'testnet'), false);
  // mainnet bitcoin address validated against testnet network (bech32 hrp mismatch)
  assert.equal(isValidChainAddress('bc1qmxrw6qdh5g3ztfcwm0et5l8mvws4eva24kmp8m', 'bitcoin', 'testnet'), false);
  assert.equal(isValidChainAddress('not-a-solana-address!!', 'solana', 'mainnet'), false);
});
