# Alternun Wallet System — Done (Archived)

**Feature:** Non-custodial, multi-chain (EVM + Bitcoin + Solana) wallet  
**Web implementation:** complete, testnet/dev only  
**Archive date:** 2026-06-30

## Archived files (moved from active-tasks + pending-tasks)

| File                                                                                                     | What it covers                                                                                    | From          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| [01-db-schema-migration.md](./01-db-schema-migration.md)                                                 | wallet tables, FK fix (auth→public.users), RLS restore                                            | active-tasks  |
| [02-server-wallet-module-api.md](./02-server-wallet-module-api.md)                                       | full NestJS wallet module API, throttling, security guard                                         | active-tasks  |
| [03-crypto-key-derivation-module.md](./03-crypto-key-derivation-module.md)                               | Buffer-free crypto, PBKDF2 hardening, signing, 15 tests                                           | active-tasks  |
| [04-mobile-pin-setup-flow.md](./04-mobile-pin-setup-flow.md)                                             | PinPad, PinSetupScreen, PinUnlockScreen                                                           | active-tasks  |
| [05-mobile-wallet-creation-backup-flow.md](./05-mobile-wallet-creation-backup-flow.md)                   | create, backup, verify, export, restore flows                                                     | active-tasks  |
| [07-multichain-rpc-integration.md](./07-multichain-rpc-integration.md)                                   | EVM/Bitcoin/Solana chain adapters, network-params, TTL cache                                      | active-tasks  |
| [99-future-server-backup-upgrade.md](./99-future-server-backup-upgrade.md)                               | archived design (no-op, product decision to skip)                                                 | active-tasks  |
| [SEC-02-RLS-policy-redesign-wallet-tables.md](./SEC-02-RLS-policy-redesign-wallet-tables.md)             | app_user_id RLS policies applied to all wallet tables                                             | pending-tasks |
| [SEC-04-web-autofill-on-sensitive-inputs.md](./SEC-04-web-autofill-on-sensitive-inputs.md)               | autoComplete='off' on recovery-phrase inputs                                                      | pending-tasks |
| [TECH-01-service-layer-unit-tests.md](./TECH-01-service-layer-unit-tests.md)                             | 21 WalletService unit tests, CJS module-cache mocking                                             | pending-tasks |
| [08-rate-limiting-security-hardening.md](./08-rate-limiting-security-hardening.md)                       | IP throttle live-verified, logging audit empirical — /security-review in pending-tasks            | active-tasks  |
| [10-airs-prod-migrations-and-wallet-empty-state.md](./10-airs-prod-migrations-and-wallet-empty-state.md) | AIRS prod migrations + wallet empty state implemented, pending live-verification                  | active-tasks  |
| [11-multi-wallet-restore-and-default-account.md](./11-multi-wallet-restore-and-default-account.md)       | Multi-wallet, restore from phrase, default account — pending live-verification                    | active-tasks  |
| [13-web-security-review.md](./13-web-security-review.md)                                                 | Web security audit — PBKDF2/autofill/logging/RLS done; SEC-01 + /security-review in pending-tasks | active-tasks  |
| [06-mobile-wallet-home-send-receive.md](./06-mobile-wallet-home-send-receive.md)                         | Wallet home/send/receive/activity — address validation + fee-review step completed                | active-tasks  |

| [14-post-v1.1.0-wallet-improvements.md](./14-post-v1.1.0-wallet-improvements.md) | Multi-wallet mgmt, PIN change, MetaMask (EVM), vault fixes, BTC routing, CodeQL | active-tasks |

## Still in active-tasks (real remaining work or blocked)

| File                            | Why not archived yet                                           |
| ------------------------------- | -------------------------------------------------------------- |
| `09-testing-qa-plan.md`         | In-progress — real-device QA + RLS dual-user test still needed |
| `12-external-wallet-linking.md` | Todo — needs WalletConnect + ownership proof (deferred)        |

## Remaining open security/tech items

See `pending-tasks/alternun-wallet-system/` — 6 open items (1 critical).
