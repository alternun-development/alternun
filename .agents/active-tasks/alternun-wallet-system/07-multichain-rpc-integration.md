---
name: wallet-multichain-rpc-integration
title: Server-side RPC proxy — balances, activity, broadcast helpers per chain
priority: high
status: todo
depends_on: [wallet-server-module-api]
---

# Task 07 — Multi-chain RPC integration

See `00-SPEC.md` §5 (`GET /v1/wallet/balances`, `GET /v1/wallet/activity`).

## Scope

1. Provision RPC provider credentials per chain (e.g. Alchemy/Infura for EVM, a Solana RPC provider, a Bitcoin
   node/Blockstream-style API) as new secrets following the existing AWS Secrets Manager pattern in
   `packages/infra/modules/identity-resources.ts:34-56` — do not hardcode API keys in `apps/api` env files checked
   into git.
2. `apps/api/src/modules/wallet/`: a per-chain adapter interface (`EvmChainAdapter`, `BitcoinChainAdapter`,
   `SolanaChainAdapter`) implementing `getBalance(address)`, `getActivity(address)`. Keep this behind an interface
   so a provider can be swapped without touching the controller/service.
3. Caching: balances/activity are read-mostly and rate-limited by provider quotas — add a short TTL cache
   (in-memory is fine for v1 given Lambda's per-instance lifetime; revisit if cold-start cache-misses become a
   problem) keyed by `(chain, address)`.
4. Client-side broadcast helper (in the task 03 crypto package or a sibling `packages/wallet-chains` package): the
   signed transaction is broadcast **directly from the client** to a public/RPC endpoint — decide whether this
   goes through the same provider credentials (would require a public, rate-limited, write-capable proxy endpoint
   on `apps/api`, e.g. `POST /v1/wallet/broadcast`) or a client-side public RPC URL that doesn't need a secret key.
   Recommendation: client broadcasts via a **proxy endpoint** too (`POST /v1/wallet/broadcast`), so the same
   provider-key-hiding rationale applies consistently and so abuse/rate-limiting has one consistent enforcement
   point — document the final decision here once made.

## Acceptance criteria

- [ ] No RPC provider API key ever shipped in the mobile app bundle or exposed in any client-reachable endpoint.
- [ ] Adapter interface allows swapping providers per chain without controller/service changes.
- [ ] Balance/activity responses cached with a sane TTL (document the chosen value and why).
- [ ] Broadcast path decision documented and implemented consistently with task 06's Send flow.
