// Hand-rolled type shims for packages that ship no .d.ts of their own.
// @scure/bip32, @scure/btc-signer, @noble/hashes, viem, @solana/web3.js ship real types — no
// shims needed for those (a hand-written `declare module` for a package with real types fully
// shadows the real .d.ts rather than augmenting it, so don't add one back for partial coverage).
// expo-secure-store also ships real types (declared as devDependency/peerDependency).

declare module 'bs58' {
  const bs58: {
    encode(input: Uint8Array): string;
  };
  export default bs58;
}
