## 2026-07-01 update: EVM/MetaMask path is now implemented

The challenge/sign/verify flow for EVM (MetaMask) is complete:

- `walletBridge.ts` + `WalletManageModal` Connect MetaMask button
- Server endpoints: `/accounts/external/challenge` + `/accounts/external/verify`
- Signature verified via `viem.verifyMessage` before any DB row is written

**Remaining scope for this ticket (rename to `SEC-07b`):**

- WalletConnect (`@walletconnect/ethereum-provider` lazy-imported in walletBridge.ts,
  needs `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` + native build testing)
- Phantom/Solana external linking (ed25519 signMessage flow, different from EVM personal_sign)

---

# SEC-07 — External wallet linking requires signature-verified ownership proof

**Priority:** 🟡 MEDIUM — EVM/MetaMask done; WalletConnect native mobile remains  
**Status:** EVM portion DONE (2026-07-01) — WalletConnect native pending  
**See also:** `active-tasks/alternun-wallet-system/12-external-wallet-linking.md` for the full spec

---

## What the problem is

The wallet system allows `wallet_type: 'external'` accounts (schema supports it, `WalletAccountDto` accepts it,
`insertWalletAccount` stores it). The intent is to let users link an externally-owned wallet (MetaMask, Phantom,
Ledger, etc.) as a default account for receiving ATN rewards — without Alternun holding the keys.

**Without a signature-verified ownership proof, this is insecure.** If a user can register ANY arbitrary address
as "their" external wallet by just supplying it in a POST request, then:

- Alice can register Bob's ETH address as her default account.
- Alice's AIRS rewards would then be paid to Bob's address.
- This is effectively a social-engineering / reward-redirect attack with no technical enforcement.

The schema supports `walletType: 'external'` but no endpoint currently prevents this. If the `addAccount` endpoint
(`POST /v1/wallet/accounts`) were to accept a `walletType: 'external'` request with any address, it would be
immediately exploitable.

---

## Current state (safe for now)

The `walletType` field exists in the DTO and schema but:

1. The mobile UI has no working "Connect external wallet" button — it was replaced with "Restore from recovery
   phrase" for the current cycle. Users can't reach this flow.
2. No API path specifically for external linking exists — `addAccount` requires `hasLocalWallet` to be true (a
   local Alternun wallet must exist first), which already narrows the surface.
3. BUT: a technically-capable user who discovers the API could POST `walletType: 'external'` to `POST /v1/wallet/accounts` with any arbitrary address and the current code would accept it without verification.

**Mitigation to apply NOW (before this endpoint is more widely known):** Add server-side validation in `WalletService.addAccount` that if `walletType === 'external'` is supplied, reject the request with 400 until the proper ownership-proof flow is implemented.

---

## How to implement correctly

### Challenge-response ownership proof

```
Client → Server: POST /v1/wallet/external/challenge
Server → Client: { challenge: "Please sign this message to prove ownership: <nonce>", nonce: "<uuid>", expiresAt: "<iso>" }

User opens MetaMask/Phantom, signs the challenge message with their external key.

Client → Server: POST /v1/wallet/external/verify
  { address: "0x...", signature: "0x...", nonce: "<uuid>", chain: "evm" }

Server: verify that signature over the challenge message recovers to `address` (use viem's `recoverAddress`).
If valid and nonce not yet used: insert wallet_accounts row with wallet_type='external'.
```

### Implementation steps

1. Add a `wallet_external_challenges` table (or store in-memory with TTL, acceptable for single-instance Lambda
   since we don't need cross-invocation persistence — a challenge valid for 60 seconds per container is fine since
   the user flow is synchronous: open wallet → sign → verify in one session).
2. Add `POST /v1/wallet/external/challenge` endpoint.
3. Add `POST /v1/wallet/external/verify` endpoint (signature verification via `viem`'s `recoverAddress` for EVM;
   `@noble/curves/ed25519`'s `verify` for Solana using `nacl.sign.detached.verify`; Bitcoin ECDSA is more complex,
   possibly out of scope for V1).
4. The mobile client needs to actually invoke the external wallet's signing SDK — WalletConnect, wagmi, or
   a browser-injected provider (`window.ethereum` via EIP-1193) for EVM. The `w3m-modal` bundle already in this
   app (visible in build output) may already handle this.

### Immediate mitigation (add today)

In `apps/api/src/modules/wallet/wallet.service.ts`, `addAccount`:

```ts
if (body.account.walletType === 'external') {
  throw new BadRequestException(
    'External wallet linking requires a signature-verified ownership proof — not yet implemented. ' +
      'Use the dedicated external linking flow when available.'
  );
}
```

This prevents accidental or intentional misuse of the current endpoint until the proper flow exists.

---

## Files to change

- `apps/api/src/modules/wallet/wallet.service.ts` — add the guard above immediately
- New: `apps/api/src/modules/wallet/wallet-external-link.controller.ts` + `.service.ts` for the challenge/verify flow
- `apps/mobile/components/wallet/WalletConnectExternalFlow.tsx` — new modal for external linking UX
