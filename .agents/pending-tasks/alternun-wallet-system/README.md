# Alternun Wallet System — Pending

Security findings and deferred work for the non-custodial wallet feature.  
**Completed items** have been moved to `done-tasks/alternun-wallet-system/`.

## Open items

| Priority    | File                                                                                                     | Summary                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🔴 CRITICAL | [SEC-01-web-localStorage-PIN-brute-force.md](./SEC-01-web-localStorage-PIN-brute-force.md)               | Offline brute-force on web localStorage — ~51 min even after 600k iteration mitigation; needs WebAuthn or stronger secret |
| 🟠 HIGH     | [SEC-03-formal-security-review.md](./SEC-03-formal-security-review.md)                                   | `/security-review` not run; mandatory before real-user exposure                                                           |
| 🟡 MEDIUM   | [SEC-05-CORS-wildcard-with-credentials.md](./SEC-05-CORS-wildcard-with-credentials.md)                   | App-wide CORS `origin: true, credentials: true` — needs explicit allow-list                                               |
| 🟡 MEDIUM   | [SEC-06-throttle-lockout-alerting.md](./SEC-06-throttle-lockout-alerting.md)                             | No alerting on PIN lockout/throttle spikes                                                                                |
| 🟡 MEDIUM   | [SEC-07-external-wallet-linking-ownership-proof.md](./SEC-07-external-wallet-linking-ownership-proof.md) | External wallet linking needs WalletConnect + signature-verified ownership proof                                          |
| 🟢 LOW      | [SEC-08-native-keychain-verification.md](./SEC-08-native-keychain-verification.md)                       | Native Keychain/Keystore backing not verified on real device (native deferred)                                            |
