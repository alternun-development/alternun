# SEC-01 — Web: Offline PIN brute-force against a stolen localStorage vault

**Priority:** 🔴 CRITICAL — blocks real-user exposure on web  
**Status:** Partially mitigated (PBKDF2 iterations raised 210k → 600k on 2026-06-30); root cause not fixed  
**Introduced by:** `packages/wallet`'s localStorage fallback for `expo-secure-store` on web  
**Discovered:** 2026-06-30 security audit — measured empirically, not assumed

---

## What the problem is

On native (iOS/Android), the encrypted mnemonic vault lives in the platform Keychain/Keystore. Extracting it
requires physical device compromise (jailbreak/root) — a high bar.

On web, `expo-secure-store` has no equivalent: its web build is a no-op `{}`. This session added a `localStorage`
fallback so the wallet actually works on web. localStorage is readable by **any JavaScript running on the same
origin** — a single XSS vulnerability anywhere on `airs.alternun.co`, or a malicious browser extension with
page-script access, is all an attacker needs to extract the encrypted vault blob.

Once they have the blob, the **server's rate-limiting and per-user lockout do not apply**. The attacker brute-forces
the 4-digit PIN (10,000 combinations) locally, with no rate limit, no lockout, no detection:

### Measured, not estimated

Script: PBKDF2-SHA256 via Node's WebCrypto (same primitive used in-browser), single-threaded, dev-machine CPU:

| PBKDF2 iterations   | Time to exhaust all 10,000 PINs (single-thread) | Notes                                         |
| ------------------- | ----------------------------------------------- | --------------------------------------------- |
| 210,000 (original)  | **~17 minutes**                                 | Original hardcoded constant                   |
| 600,000 (after fix) | **~51 minutes**                                 | OWASP 2023 recommendation, applied 2026-06-30 |

With parallelization (multi-core, GPU, worker threads), **both are in the single-digit-minutes range** for a
motivated attacker. A 4-digit PIN has a hard ceiling: 10,000 combinations. No PBKDF2 iteration count alone solves
this — it can only slow it down, not stop it.

### Why this matters more than it sounds

The spec (`00-SPEC.md` §3.1) says "brute-forcing PIN through the app's own UI/API should take years" — that's
true of the **server-rate-limited verify-pin path**. But the offline vault path bypasses the server entirely. The
~51-minute ceiling is a materially different threat model and this distinction is not currently called out clearly
anywhere in the user-facing UI.

---

## What was done (mitigation, not fix)

**2026-06-30:** Raised `VAULT_PBKDF2_ITERATIONS` from 210,000 to 600,000, **decoupled from the PIN-digest
iteration count** (which must stay at 210,000 to match the server's `wallet-pin.ts` mirror). The iteration count
is now stored per-payload in `StoredVaultPayload.iterations` so:

- New vaults use 600,000.
- Old vaults written at 210,000 still decrypt correctly (`?? PIN_DIGEST_ITERATIONS` fallback) — backward-compatible.
- A regression test confirms this: `packages/wallet/test/wallet.test.js` "vault decryption is backward-compatible
  with payloads written before the iterations field existed".

**This triples the single-threaded brute-force time. It does not change the fundamental threat model.**

---

## The real fix

Pick one (or combine):

### Option A — WebAuthn-backed key wrapping (recommended when available)

Use the browser's [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
to wrap the vault encryption key under a platform authenticator (Touch ID, Face ID, Windows Hello, hardware key)
where available. The wrapped key can only be unwrapped by the platform authenticator — no offline brute-force
possible regardless of PIN length, since the key material never exists in raw form accessible to JS.

Implementation sketch:

1. On wallet create (web): generate a random 256-bit vault key (not PIN-derived) → wrap it via
   `navigator.credentials.create()` with a WebAuthn resident key → store the wrapped key in localStorage
   alongside the ciphertext; store the credential ID.
2. On unlock: call `navigator.credentials.get()` with the stored credential ID → unwrap the vault key → decrypt.
3. PIN still used to gate the WebAuthn prompt via `WalletService.verifyPin` (server-rate-limited re-auth before any
   decrypt operation) — defense in depth.
4. Fallback for browsers/devices without a platform authenticator: current PBKDF2-from-PIN path (with 600k iters
   and a clearly visible warning).

### Option B — Require a stronger web-specific secret

On web specifically, require a password (not just 4 digits) for vault encryption, while keeping the 4-digit PIN
for the server-side re-verification gate. This separates the "am I really the owner" (PIN, server-rate-limited)
from the "key derivation material" (password, offline-attack cost depends on entropy of the chosen password).

This requires a new UX step on web wallet creation: "choose a backup password for this device — this is different
from your PIN and is not recoverable." Harder UX to explain; higher engineering cost than A.

### Option C — Explicit risk disclosure only (accept the limitation, document it)

If A and B are not feasible in the current timeline: add a clear, prominent, on-screen warning specifically for
web users at wallet creation time explaining that web storage is less secure than a native app, that the 4-digit
PIN is the only offline protection, and recommending they use a longer PIN or set up the native app. This doesn't
fix anything but fulfils a disclosure obligation.

---

## Files to change when implementing

- `packages/wallet/src/storage/secureVault.ts` — main vault encryption logic
- `apps/mobile/components/wallet/WalletCreationFlow.tsx` — possibly add WebAuthn step or stronger-secret prompt on web
- `apps/mobile/components/wallet/WalletRestoreFlow.tsx` — corresponding restore path

---

## How to reproduce

```js
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

async function time10kPins(iterations) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const N = 50;
  const start = Date.now();
  for (let i = 0; i < N; i++) {
    const base = await subtle.importKey(
      'raw',
      new TextEncoder().encode(String(i).padStart(4, '0')),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }
  const perMs = (Date.now() - start) / N;
  console.log(
    `${iterations} iters: ${((perMs * 10000) / 1000 / 60).toFixed(
      1
    )} min to exhaust all PINs (single-thread, this CPU)`
  );
}
time10kPins(210000);
time10kPins(600000);
```
