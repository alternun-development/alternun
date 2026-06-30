---
name: wallet-web-security-review
title: Web-specific security audit for wallet creation/interaction (web is current priority, native deferred)
priority: high
status: in-progress
depends_on: [wallet-server-module-api, wallet-crypto-module, wallet-mobile-creation-backup-flow]
completed: 2026-06-30
---

# Task 13 — Web security review

Web is the current development priority (native deferred per 2026-06-30 direction — see `09-testing-qa-plan.md`).
This audit covers web-specific attack surface for wallet creation/interaction that doesn't apply (or applies
differently) on native, where `expo-secure-store` is backed by the platform Keychain/Keystore.

## Findings

### 1. (Fixed) Offline PIN brute-force against a stolen `localStorage` vault blob

**The most serious finding.** On native, the encrypted mnemonic lives in the platform Keychain/Keystore —
extracting it requires device compromise (jailbreak/root), a high bar. On web, it lives in `localStorage` (added
this session as the fallback for `expo-secure-store`'s web no-op — see `03-crypto-key-derivation-module.md`),
readable by any JS running on the page. An attacker who can read `localStorage` (via an XSS vulnerability
anywhere on the origin, or a malicious browser extension with page-script access) gets the encrypted blob, and
can then brute-force the 4-digit PIN **fully offline, with zero rate limiting** — the per-user lockout in
`WalletService.verifyPin` only protects the _server-verified_ PIN digest, not the locally-encrypted vault.

**Measured, not estimated**: wrote a Node script using the same WebCrypto PBKDF2 primitives this app uses and
timed it on ordinary dev-machine hardware, single-threaded:

- At the original 210,000 iterations: **~17 minutes** to exhaust all 10,000 possible PINs.
- This is dramatically weaker than the "years" framing in `00-SPEC.md` §3.1, which describes the
  _server-rate-limited_ path, not this one.

**Fix**: raised vault-encryption PBKDF2 iterations to 600,000 (OWASP's current 2023 recommendation for
PBKDF2-SHA256), **decoupled from the PIN-digest iteration count** (which must stay at 210,000 to match the
server's hardcoded mirror in `apps/api/src/modules/wallet/wallet-pin.ts` — these are different secrets with
different threat models). Stored per-payload (`StoredVaultPayload.iterations`) rather than just bumped in place,
so existing vaults written at the old iteration count still decrypt correctly — verified via a new regression
test (`packages/wallet/test/wallet.test.js`: "vault decryption is backward-compatible with payloads written
before the iterations field existed").

- Re-measured at 600,000 iterations: **~51 minutes** single-threaded — roughly 3x, as expected.

**This is a mitigation, not a fix.** 51 minutes single-threaded is still well within reach of a motivated
attacker with parallelization (multiple cores, a GPU, or just running guesses across browser tabs/workers) — a
4-digit PIN (10,000 combinations) has a hard ceiling no iteration count alone solves. The actual fix is reducing
reliance on `localStorage` for this threat model entirely (e.g. WebAuthn-backed key wrapping using a platform
authenticator where available, or requiring a stronger user secret specifically on web) — that's a larger,
separate piece of work, not done here. Documented as a known, accepted limitation for now: the device-only
recovery model's web fallback has a measurably weaker offline-brute-force ceiling than native, and this should be
called out explicitly before any real-user exposure, not left implicit.

### 2. (Fixed) Browser autofill/autocomplete on recovery-phrase inputs

`react-native-web`'s `TextInput` defaults the HTML `autocomplete` attribute to `'on'` when the `autoComplete` prop
isn't explicitly set (confirmed by reading the library source, not assumed). This meant the mnemonic-restore
textarea (`WalletRestoreFlow.tsx`) and the word-verification inputs (`WalletBackupScreen.tsx`) were exposed to
browser/password-manager autofill capture and suggestion history — a real, if lower-severity, leak vector (a
browser's saved-form-data store is yet another place the recovery phrase could persist beyond the user's control,
separate from the `localStorage` vault). Fixed: added `autoComplete='off'`, `textContentType='none'`,
`spellCheck={false}` to both inputs.

### 3. Reviewed, no issue found

- **XSS/injection surface**: grepped the entire wallet component tree for `dangerouslySetInnerHTML`/`innerHTML` —
  none found. All rendered values (addresses, mnemonic words, account labels) go through React's default
  text-escaping, no raw HTML interpolation anywhere.
- **Logging/secret leakage**: re-audited specifically for the web context (extends the task 08 audit) — all
  `console.error` calls in the wallet flow log only `error.message` or a non-Error thrown value, never a
  mnemonic/PIN/pinHash/pinSalt variable directly. Traced every thrown `Error` in `packages/wallet/src` — none
  embed sensitive input in their message text.
- **Sensitive React state lifecycle**: confirmed `mnemonic`/`pin`/`mnemonicInput` state is explicitly cleared
  (`setMnemonic('')` etc.) on cancel _and_ on successful completion in `WalletCreationFlow.tsx`,
  `WalletRestoreFlow.tsx`, and `mi-perfil.tsx`'s export flow — not just on unmount. Accepted, unavoidable exposure
  window: while a reveal/backup screen is open, the mnemonic necessarily exists in React state and is inspectable
  via React DevTools by anyone with access to that browser tab — inherent to needing to show the user their own
  recovery phrase, bounded by explicit user action (closing the screen), not a bug.
- **Send/broadcast endpoint**: `WalletService.broadcast` is a thin, authenticated proxy — the signed transaction
  is forwarded as-is to a fixed, server-configured RPC endpoint per chain (not user-controlled), so no SSRF
  surface; malformed transactions are rejected by the blockchain node itself, not parsed/executed by this app.

### 4. Noted, not changed (app-wide, pre-existing, out of scope for a wallet-specific pass)

- **CORS**: `app.enableCors({ origin: true, credentials: true })` in `create-app.ts` reflects any origin with
  credentials enabled — a notably permissive configuration. Not changed here: it's app-wide (predates this
  session, affects every module not just wallet), and this app authenticates via `Authorization: Bearer` headers
  rather than cookies, so it isn't a classic cookie-based CSRF vector for the wallet endpoints specifically. Worth
  a dedicated, separate review across the whole API surface rather than a unilateral change scoped to this pass.

## Acceptance criteria

- [x] Offline brute-force cost of the web vault measured empirically (not assumed), and meaningfully raised.
- [x] Backward compatibility for the iteration-count change verified via an automated regression test.
- [x] Browser autofill disabled on all recovery-phrase-adjacent inputs.
- [x] No secret leakage found in logs/errors (web-context re-audit, extending task 08's server-side audit).
- [x] No XSS/injection surface found in wallet UI rendering.
- [ ] `/security-review` (the project's formal review command) not yet run — this document is a focused manual
      audit, not a substitute for it. Still required before real-user exposure per the system README's
      non-negotiables.
- [ ] The underlying limitation (PIN-only protection on `localStorage` has a hard ceiling) is mitigated, not
      solved. A proper fix (WebAuthn-backed wrapping, or a stronger web-specific secret) is a separate, larger
      follow-up — not scoped or scheduled yet.
