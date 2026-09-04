# SEC-04 — Browser autofill/autocomplete on recovery-phrase inputs

**Priority:** 🟠 HIGH → **FIXED on 2026-06-30**  
**Status:** Fixed; documented here for regression awareness and native-equivalent checklist

---

## What the issue was

`react-native-web`'s `TextInput` defaults the HTML `autocomplete` attribute to `'on'` when the `autoComplete`
prop is not set (confirmed by reading `react-native-web/dist/exports/TextInput/index.js` line 347:
`supportedProps.autoComplete = autoComplete || autoCompleteType || 'on'`).

Two wallet inputs were missing this prop:

1. **`WalletRestoreFlow.tsx`** — the free-text textarea where the user enters their full 12-24 word recovery phrase.
2. **`WalletBackupScreen.tsx`** — the individual word-entry TextInputs for the verification step.

Without `autoComplete='off'`, browsers and password managers could:

- Offer to save the recovery phrase to the browser's credential/form-fill store.
- Suggest previously entered phrases in future sessions (browser-cached form data, separate from the vault).
- Show the phrase as an autocomplete dropdown on any page with a similarly-labelled text field on the same origin.

This is especially significant for the RESTORE flow, where the user pastes their entire recovery phrase — a full
mnemonic in browser form history is a serious leak vector even if the vault itself is properly encrypted.

## Fix applied

`apps/mobile/components/wallet/WalletRestoreFlow.tsx` — mnemonic restore textarea:

```tsx
autoComplete='off'
textContentType='none'    // iOS: suppress QuickType suggestions
spellCheck={false}        // suppress browser spell-check which can send text to cloud
```

`apps/mobile/components/wallet/WalletBackupScreen.tsx` — word-verify inputs:

```tsx
autoComplete='off'
textContentType='none'
spellCheck={false}
```

## Regression checklist — verify after any TextInput addition in wallet flows

For EVERY `TextInput` that accepts a sensitive value (mnemonic, private key, seed, word from mnemonic):

- [ ] `autoComplete='off'` set
- [ ] `textContentType='none'` set (iOS)
- [ ] `spellCheck={false}` set (web)
- [ ] `autoCapitalize='none'` set
- [ ] `autoCorrect={false}` set
- [ ] `secureTextEntry={true}` set if the field is a PIN or password (masks input, also prevents screenshot on Android)

For PIN pads (button-based, no TextInput): no autofill concern, but verify no numeric `TextInput` variant is
accidentally used in place of the PinPad component.

## Native note (deferred)

On native iOS/Android, `textContentType='none'` and `importantForAutofill='no'` (Android) are the relevant
props — confirm these are set when native testing resumes.
