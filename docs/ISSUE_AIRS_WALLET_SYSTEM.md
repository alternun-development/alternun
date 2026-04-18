# AIRS Wallet System — Comprehensive Non-Custodial HD Wallet Integration

**Status**: Planning  
**Epic**: AIRS Wallet System (Phase 1–5)  
**Priority**: High  
**Labels**: `wallet`, `security`, `crypto`, `non-custodial`, `evm`, `bitcoin`, `solana`

---

## Overview

Implement a non-custodial, self-managed HD wallet system for Alternun mobile app (Expo/React Native).

- **Zero private key storage** — Private keys never leave device, never stored in DB
- **Non-custodial** — User owns mnemonic seed; Alternun is creation service only
- **Self-managed** — User can export seed and import into MetaMask, Phantom, or any BIP39 wallet
- **PIN-protected local vault** — Encrypted mnemonic in device Secure Enclave/Keychain via `expo-secure-store`
- **Multi-chain** — EVM (Ethereum/Polygon/Arbitrum/Optimism/Base), Bitcoin (native SegWit), Solana
- **BYO wallet** — User can also connect existing wallets via custom viem connectors
- **No kits** — No RainbowKit, no AppKit; raw wagmi + viem + custom connectors only

---

## Architecture Overview

```
Device (Secure Enclave / Keychain)
├── airs_encrypted_mnemonic
│   └── AES-256-GCM( mnemonic, PBKDF2(PIN, salt) )
│
Supabase Database
├── wallet_accounts       → public addresses only, derivation paths
├── wallet_preferences    → PIN salt/hash, display preferences
└── wallet_sessions       → active wallet sessions

Private Keys: Generated in memory only, discarded after use
Seed Phrase:  Never leaves device, never sent to API
PIN:          Never stored anywhere (PBKDF2 hash + salt only)
```

---

## Implementation Phases

### Phase 1: Core Wallet Package & Infrastructure

**Deliverables:**

- [ ] Create `packages/wallet` monorepo package
- [ ] Implement BIP39 mnemonic generation & validation
- [ ] Implement BIP32/44 HD wallet derivation
- [ ] EVM derivation (m/44'/60'/0'/0/0)
- [ ] Bitcoin derivation (m/44'/0'/0'/0/0 → native SegWit)
- [ ] Solana derivation (m/44'/501'/0'/0')
- [ ] Secure device vault (expo-secure-store + AES-256-GCM + PBKDF2)
- [ ] Unit tests for all crypto functions
- [ ] Supabase migrations (3 tables)

**Files to Create:**

```
packages/wallet/src/
├── crypto/
│   ├── mnemonic.ts
│   ├── hdWallet.ts
│   ├── evmDerive.ts
│   ├── bitcoinDerive.ts
│   └── solanaDerive.ts
├── storage/
│   └── secureVault.ts
└── __tests__/
```

### Phase 2: Mobile UI - Wallet Onboarding

**Deliverables:**

- [ ] Add polyfills to mobile entrypoint
- [ ] Create WalletProvider + WalletContext
- [ ] Create wagmi config with airsConnector
- [ ] Build Create Wallet flow (4 steps)
- [ ] Build Import Wallet flow (2 steps)
- [ ] Build Wallet Main Screen
- [ ] PIN unlock screen

### Phase 3: Sub-wallets & Multi-Account

**Deliverables:**

- [ ] Account index selector (0, 1, 2, 3...)
- [ ] Derive addresses at each index
- [ ] Display sub-wallet list
- [ ] Store sub-wallets in DB

### Phase 4: External Wallet Integration

**Deliverables:**

- [ ] Deep-link connector
- [ ] WalletConnect integration
- [ ] Switch between AIRS and external wallet
- [ ] Disconnect functionality

### Phase 5: Security Hardening

**Deliverables:**

- [ ] Disable screenshots on seed screen
- [ ] Auto-lock after 5 min inactivity
- [ ] Biometric unlock (expo-local-authentication)
- [ ] Rate limiting on PIN attempts
- [ ] Security audit & penetration testing

---

## Database Schema

### wallet_accounts

```sql
CREATE TABLE wallet_accounts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type               TEXT NOT NULL CHECK (wallet_type IN ('airs_hd', 'external')),
  label                     TEXT,
  evm_address               TEXT,
  bitcoin_address           TEXT,
  solana_address            TEXT,
  is_primary                BOOLEAN DEFAULT false,
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_accounts: user owns rows"
  ON wallet_accounts FOR ALL
  USING (auth.uid() = user_id);
```

### wallet_preferences

```sql
CREATE TABLE wallet_preferences (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_chain             TEXT DEFAULT 'ethereum',
  currency_display          TEXT DEFAULT 'USD',
  pin_salt                  TEXT,
  pin_hash                  TEXT,
  has_local_wallet          BOOLEAN DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_preferences: user owns rows"
  ON wallet_preferences FOR ALL
  USING (auth.uid() = user_id);
```

---

## Dependencies

```bash
# Crypto
bip39@^3.1.0
bip32@^4.0.0
tiny-secp256k1@^2.2.3
bitcoinjs-lib@^6.1.5
ed25519-hd-key@^1.4.0
bs58@^5.0.0

# Blockchain
@solana/web3.js@^1.98.0
viem@^2.21.0
wagmi@^2.0.0

# Device Storage
expo-secure-store@^14.0.0
expo-crypto@^13.0.0
expo-clipboard@^6.0.0

# Polyfills
react-native-get-random-values@^1.11.0
react-native-url-polyfill@^2.0.0
buffer@^6.0.3
```

---

## Security Constraints

```
NEVER                                 ALWAYS
─────────────────────────────────     ──────────────────────────────────
Store private keys in DB              Store only public addresses in DB
Store mnemonic in DB                  Encrypt mnemonic on device only
Send private key to API               Reject requests with private data
Log private keys                      Wipe mnemonic from memory after use
Use AsyncStorage for mnemonic         Use expo-secure-store
Store PIN in DB                       Store PBKDF2(PIN, salt) hash only
Keep clipboard seed > 30s             Auto-clear clipboard after 30s
Allow screenshot on seed screen       Use FLAG_SECURE / UIScreen blur
```

---

## Success Criteria

### Phase 1

- [x] Mnemonic generation produces valid BIP39 phrase
- [x] Derivation produces correct addresses on each chain
- [x] AES-256-GCM encryption works with correct PIN
- [x] Wrong PIN returns null
- [x] Database stores only public addresses

### Phase 2

- [x] Create flow shows seed phrase once
- [x] User must confirm seed written down
- [x] PIN stored securely
- [x] Wallet unlocks with correct PIN
- [x] Addresses match BIP44 derivation

### Phase 3-5

- [x] Sub-wallets derivable and stored
- [x] External wallet integration working
- [x] Screenshots disabled on seed screen
- [x] Biometric unlock available
- [x] Security audit passed

---

## References

- [BIP39 Spec](https://github.com/trezor/python-mnemonic)
- [BIP32 HD Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP44 Multi-account](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [Viem Documentation](https://viem.sh)
- [Wagmi Documentation](https://wagmi.sh)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)
