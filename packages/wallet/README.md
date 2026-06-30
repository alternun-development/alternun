# @alternun/wallet

Non-custodial HD wallet primitives for Alternun's internal (Airs) wallet flows.

Full design rationale and the broader feature plan: `.agents/active-tasks/alternun-wallet-system/00-SPEC.md`.

## Security model — device-only, no server backup

The seed/mnemonic this package generates is encrypted with a key derived from the user's PIN
(`storeMnemonic`/`unlockMnemonic`) and persisted **only** in the device's hardware-backed secure storage
(`expo-secure-store`, i.e. iOS Keychain / Android Keystore). There is no server-side copy. If the device is lost
without the user having exported a backup (`exportMnemonicKeystore`), the wallet is unrecoverable — this is by
design, the same model MetaMask mobile uses, not a bug.

This package never sends a mnemonic, private key, or PIN-derived encryption key anywhere over the network. The
only thing that ever leaves the device is a PIN _verifier_ hash (`createPinDigest`), used server-side purely as a
rate-limited re-authentication gate before sensitive UI actions (Send/Export) — see the spec §3.2. That hash alone
cannot decrypt anything.

## Features

- `generateMnemonic`/`validateMnemonic`/`mnemonicToSeed` — BIP-39.
- `deriveEvmAccount`/`deriveBitcoinAccount`/`deriveSolanaAccount`/`deriveWalletBundle` — multi-chain HD derivation
  (BIP-32/44, SLIP-0010), matching MetaMask/Phantom conventions. See `src/crypto/bitcoinDerive.ts` for a documented
  deviation from BIP-84 on the Bitcoin path.
- `storeMnemonic`/`unlockMnemonic`/`clearMnemonic` — PIN-encrypted vault on top of `expo-secure-store`
  (PBKDF2-SHA256, 210,000 iterations + AES-256-GCM, via native WebCrypto).
- `createPinDigest`/`verifyPin` — PIN verifier helpers for the server-side re-authentication gate.
- `wipeBytes` — zero out a `Uint8Array` once a consumer is done with decrypted secret material.
- `exportMnemonicKeystore`/`importMnemonicKeystore` — Alternun's own encrypted backup envelope (scrypt +
  AES-128-CTR + keccak256 MAC, modeled on the Ethereum V3 keystore structure but carrying the mnemonic, not a
  single chain's private key — see `src/storage/keystoreExport.ts` for why).

## Runtime requirement

`generateMnemonic`, the vault, and the keystore export all require `globalThis.crypto.getRandomValues` and (for
the vault/keystore) `globalThis.crypto.subtle`. React Native/Hermes does not provide these by default — the
consuming app (`apps/mobile`) must polyfill them before this package is used (see
`apps/mobile/app/_layout.tsx`'s `react-native-get-random-values` import, which must run before any other code that
might touch this package). Without it, every function above throws rather than silently using a weak RNG.

## Known, deliberate deviations

- Bitcoin addresses are derived at `m/44'/0'/0'/0/{i}` (BIP-44 purpose) while producing native segwit (`bc1...`)
  addresses, which BIP-84 conventionally labels with purpose `84'`. See the comment in
  `src/crypto/bitcoinDerive.ts` — do not "fix" this without a migration plan, it would change every previously
  derived address.
