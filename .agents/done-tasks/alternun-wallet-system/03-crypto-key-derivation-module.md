---
name: wallet-crypto-module
title: Complete the existing packages/wallet — 4-digit PIN UX, keystore export, hardening, KATs
priority: high
status: implemented-pending-device-verification-and-security-review
depends_on: []
completed: 2026-06-29
revision_note: >
  Rev. 2 — packages/wallet (@alternun/wallet) already implements mnemonic generation, multi-chain derivation, and
  PBKDF2+AES-GCM vault storage (commits 189b8f0a, 8a4dbbe6). This task is now "finish it", not "build it from
  scratch". Do not create a new packages/wallet-crypto package.
---

# Task 03 — Finish `packages/wallet`

See `00-SPEC.md` §3 for the locked-in design (PBKDF2-SHA256/AES-256-GCM, already implemented; device-only, no
server backup). This is still the most security-sensitive piece of work in the whole feature — run
`/security-review` on the finished package before task 04/05 build the PIN UI on top of it.

## What's already done (do not duplicate)

- `generateMnemonic`/`validateMnemonic`/`mnemonicToSeed` — `src/crypto/mnemonic.ts`.
- `deriveEvmAccount`/`deriveBitcoinAccount`/`deriveSolanaAccount`/`deriveWalletBundle` — `src/crypto/*.ts`.
- `storeMnemonic`/`unlockMnemonic`/`clearMnemonic`/`createPinDigest`/`verifyPin`/`wipeBytes` — `src/storage/secureVault.ts`.
- KAT-style tests for chain derivation (known addresses for the standard BIP-39 test mnemonic) and a round-trip
  vault test — `test/wallet.test.js`.

## Remaining scope — all items below done

1. ✅ **Entropy source audit — found a bigger gap than expected.** Confirmed `bip39` →
   `@noble/hashes/utils.randomBytes` → `globalThis.crypto.getRandomValues`, which Hermes/RN does **not** provide by
   default. Worse: `secureVault.ts`'s `getCrypto()` and the new `keystoreExport.ts` also need
   `globalThis.crypto.subtle` (PBKDF2/AES-GCM/AES-CTR), which Hermes has **never** implemented — this isn't a
   getRandomValues-only problem, the _entire_ vault/keystore layer would throw `'Web Crypto API is not available
in this runtime.'` on a real device. A JS-only `getRandomValues` polyfill (`react-native-get-random-values`)
   does not cover `subtle` at all. Fixed by installing `react-native-quick-crypto` (+ its peers
   `react-native-nitro-modules`, `react-native-quick-base64`) — a native (Nitro Modules/JSI) WebCrypto
   implementation — and calling `install()` as the first statement in `apps/mobile/app/_layout.tsx`, before any
   other import. Removed `react-native-get-random-values` since quick-crypto's polyfill is a superset.
   **This is a native module — requires `expo prebuild` + a real native build (this app has no checked-in
   `ios/`/`android/` folders, fully managed workflow) to actually link. I could not run this on a real device or
   simulator from this environment — verify on-device before relying on any wallet crypto path.**
2. ✅ Confirmed already PIN-length-agnostic — no crypto-layer change needed. 4-digit enforcement belongs in task 04.
3. ✅ **Keystore export implemented** — `src/storage/keystoreExport.ts`, `exportMnemonicKeystore`/
   `importMnemonicKeystore`. Uses `@noble/hashes/scrypt` (light params: N=4096, r=8, p=1 — geth's "light" KDF
   variant, fast enough for mobile) + WebCrypto `AES-128-CTR` + `viem`'s `keccak256` for the MAC, modeled on the
   Ethereum V3 keystore _structure_ but carrying the **mnemonic** as payload, not a single chain's private key —
   see the code comment for why a literal one-chain keystore would be wrong for a multi-chain wallet. This is _not_
   a literal geth/MyEtherWallet-importable file (different payload) — corrected the acceptance criteria below to
   reflect that honestly rather than claim cross-tool interop that doesn't exist.
4. ✅ Documented in the package README that `wipeBytes` is a consumer-side responsibility (task 06's Send flow),
   not called within this package itself.
5. ✅ Added a true KAT against a widely-published, independently-verifiable reference (the canonical "abandon...
   about" BIP-39 test mnemonic's well-known EVM address at `m/44'/60'/0'/0/0`). Bitcoin/Solana at the same mnemonic
   are recorded as **regression** tests (this implementation's own output), explicitly labeled as such in the test
   file — I could not independently verify those two against an external published vector without network access;
   flagging this honestly rather than overclaiming KAT coverage that wasn't actually checked against an outside
   source.
6. ✅ BIP-44-vs-BIP-84 deviation documented as a code comment in `bitcoinDerive.ts`.
7. ✅ `packages/wallet/README.md` rewritten: device-only security model stated plainly, full feature list, runtime
   polyfill requirement, known deviations section.

## Acceptance criteria

- [x] RN/Hermes confirmed missing both `crypto.getRandomValues` and `crypto.subtle` by default; native polyfill
      (`react-native-quick-crypto`) added and wired with an explanatory code comment.
- [ ] **Not verified on a real device/simulator** — I have no way to run an Expo native build from this
      environment. The native module requires `expo prebuild` + a real build; do this and exercise
      `generateMnemonic`/`storeMnemonic`/`unlockMnemonic`/`exportMnemonicKeystore` on-device before trusting any of
      this in task 04+'s UI. This is the single most important open item from this task.
- [x] Keystore export/import round-trips correctly (tested: correct PIN, wrong PIN, tampered ciphertext — all
      pass, in Node). **Revised from the original AC**: this is Alternun's own envelope format wrapping the
      mnemonic, not a literal geth/MyEtherWallet-compatible single-key keystore — cross-tool import is not a goal
      here, see item 3.
- [x] One true KAT (EVM, against a widely-published external reference) + two honestly-labeled regression tests
      (Bitcoin/Solana) — see item 5 for why these aren't claimed as equivalent.
- [x] `pnpm --filter @alternun/wallet run test` passes — 10/10 tests green (`node --test` runner, Node's built-in
      WebCrypto — this does **not** prove the RN/Hermes + quick-crypto path works identically, see above).
- [ ] `/security-review` **not yet run** — do this before task 04/05 build the PIN UI on top of this package. Not
      blocking continued implementation of tasks 04+ in this pass, but must happen before any real-user exposure.

## 2026-06-30 update: full Buffer-free audit (real bug, found via live browser repro)

Wallet creation was looping back to the PIN screen on web because `generateMnemonic()` (`bip39`) and
`deriveSolanaAccount()` (`ed25519-hd-key`) both call Node's `Buffer` internally with no browser fallback — confirmed
by actually running the flow in a headless Chromium browser (not just code review), which is how this got caught
(`tsc`/Metro bundling both succeed silently; only a real execution throws).

- Replaced `bip39` with `@scure/bip39` (same audited family already used for Bitcoin derivation) — identical output,
  verified via existing regression tests, zero Buffer usage.
- Replaced `ed25519-hd-key` with a from-scratch SLIP-0010 ed25519 derivation (`src/crypto/slip10Ed25519.ts`) using
  `@noble/hashes`'s HMAC-SHA512 — byte-identical to the original library's output (verified against the existing
  known-answer/regression test vectors), and this also dropped a whole secondary dependency chain
  (`create-hmac`→`cipher-base`→Node's `stream` module) that doesn't belong in a browser bundle.
- Replaced the remaining `Buffer.from(...).toString('hex'/'base64')` calls in `secureVault.ts` and
  `keystoreExport.ts` with `@noble/hashes`'s `bytesToHex`/`hexToBytes` and a small hand-written base64 codec.
- `packages/wallet/src` now has zero references to the `Buffer` global — verified by grep and by running the full
  flow (generate → derive → store → unlock → export/import keystore → sign EVM/Solana tx) in a real headless
  browser with `typeof Buffer === 'undefined'`.

## 2026-06-30 update: `expo-secure-store` web-availability detection was also wrong

After the Buffer fixes, wallet creation still failed with `ExpoSecureStore.default.setValueWithKeyAsync is not a
function`. Root cause: `expo-secure-store`'s public `setItemAsync`/`getItemAsync`/`deleteItemAsync` are real JS
functions on _every_ platform — they always exist and always pass a naive `typeof fn === 'function'` check. They
internally delegate to a native module (`setValueWithKeyAsync` etc.) that's a no-op `{}` on web, so the failure
only surfaces when actually called, not when checked. Fixed `secureVault.ts`'s `resolveSecureStore()` to use
`expo-secure-store`'s own `isAvailableAsync()` (which correctly checks `!!ExpoSecureStore.getValueWithKeyAsync` on
the underlying native module) instead of a `typeof` check on the wrapper. Verified against the real
`expo-secure-store` package (not a stub) in a real headless browser: `isAvailableAsync()` correctly returns
`false` on web, the `localStorage` fallback engages, and the full store/unlock round-trip succeeds.

This was only diagnosable because `Alert.alert` (used to surface the original error) is a documented no-op on
react-native-web (`static alert() {}` — confirmed in `react-native-web`'s source) — every wallet-flow error before
this fix was invisible to the user. Replaced all `Alert.alert` calls in the wallet creation/backup flow
(`WalletCreationFlow.tsx`, `PinSetupScreen.tsx`, `WalletBackupScreen.tsx`) with inline, visible error text, plus a
retryable `registerFailed` stage so a server-registration failure no longer discards the already-generated,
already-backed-up wallet.

## 2026-06-30 update: Bitcoin addresses were always derived as mainnet, regardless of stage (real bug, user-reported)

User report: "BTC balance is missing in UI" — the wallet card showed ETH and SOL rows but no BTC row at all (not
a zero balance, the row was absent entirely).

**Root cause**: `bitcoinDerive.ts`'s `deriveBitcoinAccount` called `p2wpkh(child.publicKey)` with no network
argument, which defaults to **mainnet** (`bc1...` addresses) unconditionally — independent of deploy stage. But
the server's chain adapters (`apps/api/.../chains/bitcoin-adapter.ts`) are stage-aware, querying testnet Esplora
in dev (`testnet.airs.alternun.co`) and mainnet Esplora in production. Every wallet ever created in dev got a
mainnet-format `bc1...` address while the server queried `https://blockstream.info/testnet/api/address/bc1...` —
confirmed this returns `400 Bad Request` (testnet Esplora rejects mainnet-prefixed addresses). `WalletService.balances()`
wraps each chain lookup in `Promise.allSettled` and silently drops rejected entries — so the failure never
surfaced as an error, just a missing row.

**Fix**:

- `deriveBitcoinAccount(mnemonic, accountIndex, network: 'mainnet' | 'testnet' = 'testnet')` — network now
  explicit, defaulting to testnet (fail-safe for a dev/testnet-branded app, matching the existing
  `DEFAULT_TESTNET_*` pattern in `evm-adapter.ts`/`solana-adapter.ts`/`bitcoin-adapter.ts`).
- `deriveWalletBundle` threads the network parameter through.
- `WalletCreationFlow.tsx` and `WalletRestoreFlow.tsx` now pass `isTestnetRuntime() ? 'testnet' : 'mainnet'`
  explicitly (same detection already used in `WalletSendModal.tsx`'s Bitcoin signing path).
- Tests updated: existing KATs (`bc1...` known-answer values) now pass `'mainnet'` explicitly; new tests confirm
  the testnet default (`tb1...`) and that bundle derivation correctly passes through an explicit network. 19/19
  passing.

**Existing affected data**: found and fixed the one dev-DB row with a mainnet address. Since the witness program
(pubkey hash) is identical between mainnet/testnet bech32 encodings of the same key — only the human-readable
prefix differs — the existing `bc1q82npg8aymnlnhr9kwhrhpa4pmczvepeas8w3gh` was decoded and re-encoded as
`tb1q82npg8aymnlnhr9kwhrhpa4pmczvepea6p4zny` **without needing the original mnemonic** (this is a pure bech32
re-encoding, not a new key derivation — verified by round-tripping decode→encode→decode and comparing payloads).
Confirmed live: the corrected address returns a valid (empty) balance from testnet Esplora; the original address
returns `400`.
