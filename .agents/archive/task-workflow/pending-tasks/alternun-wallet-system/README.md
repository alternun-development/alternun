# Alternun Wallet System — Pending

> Archived index. The linked task files were moved to [`.specs/tasks/todo/`](../../../../../.specs/tasks/todo/); do not add work here.

Security findings and deferred work for the non-custodial wallet feature.
**Completed items** remain in the archived done-task history.

## Open items

| Priority    | File                                                                                                                        | Summary                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🔴 CRITICAL | [SEC-01](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-01-web-localstorage-pin-brute-force.feature.md)        | Offline brute-force on web localStorage — ~51 min even after 600k iteration mitigation; needs WebAuthn or stronger secret |
| 🟠 HIGH     | [SEC-03](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-03-formal-security-review.feature.md)                  | `/security-review` not run; mandatory before real-user exposure                                                           |
| 🟡 MEDIUM   | [SEC-05](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-05-cors-wildcard-credentials.feature.md)               | App-wide CORS `origin: true, credentials: true` — needs explicit allow-list                                               |
| 🟡 MEDIUM   | [SEC-06](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-06-throttle-lockout-alerting.feature.md)               | No alerting on PIN lockout/throttle spikes                                                                                |
| 🟡 MEDIUM   | [SEC-07](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-07-external-wallet-linking-ownership-proof.feature.md) | External wallet linking needs WalletConnect + signature-verified ownership proof                                          |
| 🟢 LOW      | [SEC-08](../../../../../.specs/tasks/todo/alternun-wallet-system-sec-08-native-keychain-verification.feature.md)            | Native Keychain/Keystore backing not verified on real device (native deferred)                                            |
