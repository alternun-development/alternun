---
name: wallet-post-v1.1.0-improvements
title: Post-v1.1.0 wallet UX fixes, multi-wallet management, PIN change, security hardening
priority: high
status: done
completed: 2026-07-01
---

# Wallet system post-v1.1.0 improvements

All work shipped after the v1.1.0 release, fixing real user-reported issues and completing the
wallet management feature set.

## What was built / fixed

### Multi-wallet management UI (WalletManageModal.tsx)

- Full "Your wallets" screen: list all accounts, switch default, delete with safety warnings
- New card design: type badge (HD Wallet / External), EVM + SOL address shown, action row
- "Add" sub-menu routes to correct flow: Create new / Restore phrase / Import keystore / MetaMask

### WalletAddAccountFlow.tsx (new)

- Derives next HD account (index N+1) from existing mnemonic — no new phrase needed
- `vaultExists()` checked on open so users never reach PIN screen only to get "not on device"
- Routes only when airs_hd account exists; external-only → WalletCreationFlow

### WalletChangePinFlow.tsx (new)

- Enter current PIN (server rate-limited + local vault verify) → new PIN → re-encrypt + update server digest
- Accessible via "Change PIN" on the wallet card

### WalletImportKeystoreFlow.tsx (new)

- Paste AlternunKeystoreV1 JSON + enter export-time PIN → decrypt → re-derive → restore server

### External wallet linking — EVM/MetaMask (SEC-07 EVM portion)

- `POST /v1/wallet/accounts/external/challenge` — one-time nonce
- `POST /v1/wallet/accounts/external/verify` — EIP-191 personal_sign verified via `viem.verifyMessage`
- `WalletManageModal` "Connect MetaMask" connects via `walletBridge.ts` (existing EIP-1193),
  signs challenge, and registers the verified address
- `addAccount` blocks `walletType:'external'` without the verified path (prevents unverified address claims)

### Security fixes

- `packages/wallet`: `slip10Ed25519.ts` replace(`'`,`''`) → `/'/g` (CodeQL #62, incomplete sanitization)
- `packages/wallet`: `base64.ts` `/=+$/` regex → loop trim (CodeQL #61, polynomial ReDoS)
- `walletApiClient.ts`: `Content-Type: application/json` only set when body exists (fixed Fastify
  "Body cannot be empty" on challenge POST and other bodyless endpoints)
- `unlockMnemonicWithDiagnosis()` added — distinguishes `wrong_pin` vs `no_vault` so export/send/add
  never show "Incorrect PIN" when the vault simply isn't on this device

### UX fixes

- Bitcoin addresses derived per-stage (mainnet `bc1...` vs testnet `tb1...`) — was always deriving
  mainnet regardless of `isTestnetRuntime()`, causing BTC balances to silently fail (testnet Esplora
  returns 400 for mainnet addresses). Existing dev DB row migrated via bech32 re-encode.
- `WalletManageModal` layout gap: `title` style had `flex:1` which expanded text to fill entire View,
  pushing all other content below screen bounds with React Native's default `overflow:visible`
- `mi-perfil.tsx` tab URL sync snapping back instantly: `tabs` in useEffect dependency caused re-run
  every render (useAppTranslation's `t` is a fresh reference each render). Fixed to depend only on
  `params.tab`; added `router.setParams()` to keep URL in sync when switching tabs.
- Network indicator badge in wallet card: shows "Testnet" / "Mainnet" + per-chain RPC label
  (Sepolia / BTC Testnet / Devnet vs Ethereum / Bitcoin / Mainnet Beta)

### Performance

- `ProgressiveImage` component (`components/common/ProgressiveImage.tsx`): wraps expo-image with
  neutral blurhash placeholder, cross-dissolve 300ms fade, memory+disk cache. Landing page images
  upgraded to use it.

## Known remaining

- WalletConnect (native mobile) for external wallet linking — needs `@walletconnect/modal` or wagmi
  SDK integration; EIP-1193 path (window.ethereum) is web-only. See pending-tasks/SEC-07 update.
- Native Keychain/Keystore verification on real device still unverified (SEC-08, deferred).
