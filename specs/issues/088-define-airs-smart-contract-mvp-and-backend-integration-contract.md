# Issue #88: Define AIRS smart-contract MVP and backend integration contract

**Status:** open
**Created:** 2026-03-12T23:19:48Z
**Updated:** 2026-10-09T15:13:52Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/88

## Description

## Summary

Define the AIRS on-chain MVP contract surface and the off-chain backend integration contract required to support token, pool, certificate, and ledger flows.

Parent: #84

## Scope

- define MVP responsibilities for ImpactToken, PoolVault, PositionNFT, and SBT/certificate contracts
- define emitted events and the off-chain data that backend/indexing flows must consume
- define how wallet ownership, compensation flows, and AIRS ledger entries connect to chain activity
- define MVP assumptions for chain environment, deployment sequencing, and trust boundaries
- keep the smart-contract scope explicit enough that backend and wallet work can integrate without guessing

## Deliverables

- reviewed smart-contract surface for MVP
- event and indexing contract for backend/off-chain consumers
- clear mapping between on-chain actions and AIRS ledger / certificate behavior

## Acceptance Criteria

- core contract responsibilities are explicit and non-overlapping
- event payloads and backend integration points are defined
- wallet/backend dependencies for Web2 and Web3 flows are documented
- MVP boundaries are clear enough to schedule implementation work after the spec

## Dependencies

- #87 wallet integration flow
- #85 database schema baseline

## Reference

- `docs/airs-impact-token-spec.md`

## Labels

type:spec, area:wallet, area:blockchain, status:planned, priority:p1

## Assignees

edcalderon
