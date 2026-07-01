# SEC-08 — expo-secure-store Keychain/Keystore backing not verified on a real native device

**Priority:** 🟢 LOW (native deferred; web is the current focus)  
**Status:** Deferred — resume when native development resumes

---

## What to verify

`packages/wallet/src/storage/secureVault.ts` uses `expo-secure-store` on native (iOS/Android) because its
`isAvailableAsync()` returns true there (backed by the platform Keychain/Keystore). This means the encrypted
vault ciphertext lives in hardware-backed secure storage rather than app-accessible memory — a materially
different, stronger guarantee than the web `localStorage` path.

But this has **never been confirmed on a real device**. Specific things to verify:

### iOS

1. Run `expo prebuild` + `eas build --profile development` to get a real native build (not Expo Go — Expo Go
   may fall back to a less-secure SecureStore implementation on some versions).
2. Call `expo-secure-store`'s `isAvailableAsync()` — confirm it returns `true`.
3. Store a value via `setItemAsync`, then run the app under a Keychain accessor (e.g., via Instruments or
   `security dump-keychain`) — confirm the value is stored in the iOS Keychain, NOT in the app's `UserDefaults`
   or `NSDocumentDirectory` (a known fallback on some old `expo-secure-store` versions).
4. Confirm the item is NOT accessible after the device is locked and before first unlock (if using
   `AFTER_FIRST_UNLOCK` accessibility level — check what `expo-secure-store`'s default accessibility is).
5. Confirm the item does NOT survive a full app reinstall (unlike `UserDefaults`, which persists across reinstalls
   in some configurations — Keychain items set without `kSecAttrSynchronizable` also persist, which is NOT what
   we want for a device-local wallet).

### Android

1. Confirm `expo-secure-store` uses the Android Keystore System (available API 23+) or EncryptedSharedPreferences
   (API 23+ fallback) rather than plain SharedPreferences.
2. Confirm the stored value is NOT readable via `adb backup` on a non-rooted device.
3. On a rooted device, confirm extracting the Keystore requires root (expected — this is the security model).

## Why this matters

The security model for native (`00-SPEC.md`) claims: "the device-only recovery model defends against a server
breach since the server has no decryption key" — and it also implicitly claims that the encrypted vault on-device
is reasonably protected. If expo-secure-store were silently storing the vault in an unprotected location on native
(a bug that has existed in older versions), the entire security model would be undermined without any error or
warning.

## Context: web verification WAS done

The equivalent web question — "does `isAvailableAsync()` correctly detect the web no-op?" — was verified this
session via a real headless browser run with the full `expo-secure-store` package (not a stub). `isAvailableAsync`
correctly returned `false` and the `localStorage` fallback engaged. The native-side equivalent has not been done.

## When to resume

Resume this task when:

1. Native development is re-prioritized (currently deferred per 2026-06-30 direction)
2. A real iOS or Android device/simulator is available in the development environment
3. Before any native app store submission

## Files/tools needed

- A real iOS device or simulator with a debug build (not Expo Go)
- `eas build --profile development` configured in `eas.json`
- Optional: `security` CLI (macOS) or iOS Instruments for Keychain inspection
