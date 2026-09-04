---
name: wallet-multichain-rpc-integration
title: Server-side RPC proxy — balances, activity, broadcast helpers per chain
priority: high
status: implemented
depends_on: [wallet-server-module-api]
completed: 2026-06-30
revision_note: >
  Implemented using free, keyless public RPC endpoints, testnet/devnet by default (Sepolia, Bitcoin
  testnet via Blockstream Esplora, Solana devnet) — this app is dev/testnet-branded and no real
  funds should touch an unreleased wallet feature. No Alchemy/Infura/paid-provider account was
  available to provision, so this is the unblocking default; the adapter interface lets a paid
  provider be swapped in later via env vars with zero controller/service changes.
---

# Task 07 — Multi-chain RPC integration

See `00-SPEC.md` §5 (`GET /v1/wallet/balances`, `GET /v1/wallet/activity`).

## What was built

- `apps/api/src/modules/wallet/chains/chain-adapter.ts` — the `ChainAdapter` interface
  (`getBalance`/`getActivity`/`broadcast`), exactly as scoped.
- `evm-adapter.ts` — raw JSON-RPC (`eth_getBalance`, `eth_sendRawTransaction`) against
  `WALLET_EVM_RPC_URL` (default: `https://ethereum-sepolia-rpc.publicnode.com`, free/keyless).
- `bitcoin-adapter.ts` — Blockstream's free Esplora REST API against `WALLET_BITCOIN_API_BASE`
  (default: `https://blockstream.info/testnet/api`). Balance = confirmed + mempool UTXO sum.
  Activity parses `vin`/`vout` to infer direction/counterparty/amount, capped at 25 entries.
- `solana-adapter.ts` — raw JSON-RPC (`getBalance`, `getSignaturesForAddress` + `getTransaction`,
  `sendTransaction`) against `WALLET_SOLANA_RPC_URL` (default: `https://api.devnet.solana.com`).
  Activity direction/amount inferred from `meta.preBalances`/`postBalances` deltas (best-effort —
  full counterparty resolution needs instruction parsing, not done).
- `ttl-cache.ts` — 60s in-memory TTL cache keyed by `(chain, address)`, since public RPCs are
  rate-limited and balances don't need to be real-time. Documented why in-memory is acceptable
  for v1 (Lambda warm-instance reuse) and when to revisit (shared store if cold-start misses hurt).
- Wired into `wallet.service.ts`/`wallet.controller.ts`: `GET /v1/wallet/balances`,
  `GET /v1/wallet/activity`, `POST /v1/wallet/broadcast`. Per-chain failures are caught individually
  (`Promise.allSettled`) so one chain's RPC being down doesn't blank out the other two.
- **Broadcast decision (per the task's own open question): proxy endpoint**, consistently with
  balances/activity — `POST /v1/wallet/broadcast` takes an already-signed transaction and forwards
  it to the chain. The server never signs anything or sees a private key.

## Verified — actually called the real RPCs, not just typechecked

```
EVM balance OK: { amount: '132709763149316947542298', unit: 'wei' }     (Sepolia, burn address)
BTC balance OK: { amount: '0', unit: 'satoshi' }                          (testnet, known address)
BTC activity OK, count: 25                                                (real tx history, correct shape)
SOL balance OK: { amount: '1', unit: 'lamport' }                          (devnet, System Program)
```

Auth/validation also verified live: `/balances` and `/activity` return 401 without a valid token;
`/broadcast` returns 400 with the correct field-level validation errors for a malformed body.

## Known, honest gap

- **EVM activity is empty by design**, not a bug — raw JSON-RPC has no "list transactions for an
  address" method. That needs an indexing service (Etherscan/Alchemy/a self-hosted indexer), which
  requires its own account/API key that hasn't been provisioned. Flagged clearly in the controller's
  `@ApiOperation` summary and in code comments, not silently wrong.
- Public RPCs are rate-limited and not meant for production traffic — fine for the current
  dev/testnet phase, must be swapped to a paid provider (env var change only) before any mainnet
  exposure.

## Acceptance criteria

- [x] No RPC provider API key in this implementation at all (the public endpoints used need none) —
      and the adapter interface means a future paid-provider key would live in `apps/api`'s env,
      never in the mobile bundle.
- [x] Adapter interface (`ChainAdapter`) allows swapping providers per chain without touching
      `wallet.service.ts`/`wallet.controller.ts` — only the adapter's constructor default changes.
- [x] Balance/activity responses cached with a 60s TTL (documented why: public RPC rate limits,
      balances don't need real-time freshness for a wallet UI).
- [x] Broadcast path decision documented above and implemented.
