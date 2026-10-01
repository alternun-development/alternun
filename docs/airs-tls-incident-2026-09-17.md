# AIRS certificate expiry incident — September 17, 2026

## Status

Production AIRS and AIRS testnet recovered on September 18, 2026, following explicit
maintainer approval. Both now serve replacement Amazon-issued certificates valid
through **April 3, 2027, 23:59:59 UTC**. Strict TLS and HTTP 200 were verified against
all four resolved CloudFront addresses for each host. Both distributions reached
`Deployed`, both replacement certificates are eligible for managed renewal, and the
authenticated audit verified their public renewal-validation CNAMEs.

All three missing validation CNAMEs were restored and verified through authoritative
DNS and public resolvers. Admin testnet remains on its original, currently valid
certificate: ACM automatic renewal is still `PENDING_VALIDATION` as of recovery.
Its September 23 expiry remains an open operational follow-up until renewed validity
is confirmed. The manual renewal API rejected a retry because this certificate is
not exported; that call made no change. Do not mark admin-testnet renewal complete
merely because the DNS prerequisite has been repaired.

Local validation: 76 infrastructure tests and the infra type check passed. The
scheduled monitoring workflow is prepared locally and requires merge to activate.

## Confirmed cause and impact

At investigation, CloudFront was serving an expired Amazon-issued ACM certificate for `airs.alternun.co`.
It expired **September 17 at 23:59:59 UTC / 18:59:59 Bogotá**. A strict TLS connection
failed with `certificate has expired`; this occurs before the browser can receive the app.
DNS still resolves to CloudFront. This is a certificate-renewal failure, not evidence of
an application outage or a certificate being suddenly disabled.

The corresponding ACM validation CNAME was absent from both the authoritative Route53
zone and public DNS. ACM reported `EXPIRED`, renewal `PENDING_VALIDATION`, and renewal
eligibility `INELIGIBLE`. Original issuance validation still says `SUCCESS`; that field
is historical and does not establish current renewal health.

| Host                        | Certificate expiry (UTC) | Renewal evidence at investigation          |
| --------------------------- | ------------------------ | ------------------------------------------ |
| `airs.alternun.co`          | September 17, 23:59:59   | Expired; validation CNAME missing          |
| `testnet.airs.alternun.co`  | September 18, 23:59:59   | Renewal pending validation; CNAME missing  |
| `testnet.admin.alternun.co` | September 23, 23:59:59   | Renewal pending validation; CNAME missing  |
| `testnet.alternun.co`       | November 2, 23:59:59     | Eligible; matching public validation CNAME |
| `ed.alternun.co`            | November 2, 23:59:59     | Eligible; matching public validation CNAME |
| `admin.alternun.co`         | November 4, 23:59:59     | Eligible; matching public validation CNAME |

The AIRS testnet is **not protected from this incident**: it has the same missing-DNS
condition and expires one day later. The separate dashboard at `testnet.alternun.co`
has a different certificate issued in April and an intact validation record. Its
current certificate and renewal prerequisites are healthy.

## Why renewal stopped

[ACM DNS renewal requirements](https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html)
require the certificate to remain associated with an AWS service and all validation
CNAMEs to remain publicly resolvable. The affected certificates are attached to live
CloudFront distributions, but their validation CNAMEs are missing. This explains
ACM's pending renewal validation and the eventual expiry.

The exact deletion event and actor are **not established**. A read-only search of the
available 90-day CloudTrail Route53 history returned 36 changes, no pagination, and no
deletion of these validation records. The only AIRS changes in that window were A and
AAAA UPSERTs on August 20. Older retained CloudTrail/S3 or deployment logs are needed
to attribute the deletion.

Two repository lifecycle paths were examined:

- `scripts/predeploy-checks.sh` could explicitly delete underscore CNAMEs using a
  broad domain substring. Root-domain cleanup could match other subdomains. The
  function defaulted its validation-deletion flag to true, although current build
  defaults set it false. Destructive and auto-cleanup flags were also required.
  This is a confirmed hazardous capability, not proof that it caused this incident.
- Certificate migration in `scripts/sst-deploy.sh` removed known managed certificate
  resources from SST state. Pinned SST implementation also repairs orphaned child
  state, so it is not valid to conclude that this migration deleted DNS records
  merely because their names were absent from the wrapper's list. Preservation is
  now explicit and checked rather than relying on implicit repair behavior.

## Recovery procedure

1. Restore the exact three CNAMEs from the attached certificates' ACM
   `DomainValidationOptions`, using Route53 UPSERT. Preserve these records permanently.
2. Request a DNS-validated replacement production certificate in `us-east-1`, confirm
   `ISSUED`, then attach it to the existing production distribution using its current
   configuration and ETag. Preserve origins, aliases, caching, and TLS security policy.
   An expired certificate cannot be recovered through managed renewal.
3. Monitor AIRS-testnet renewal immediately. With less than a day remaining, prepare
   a replacement if ACM does not renew promptly. Verify the admin-testnet renewal too.
4. Persist replacement references in the authoritative deployment configuration;
   otherwise a later deployment could reattach an old certificate. Reconcile the
   production environment and any testnet buildspec override that changed.
5. Wait for CloudFront deployment and confirm strict TLS trust, hostname matching,
   certificate expiry, and HTTPS response on each affected hostname. Test multiple
   resolved edge addresses; one successful edge does not establish global propagation.

AWS documents that [expired certificates are not eligible for managed renewal](https://repost.aws/knowledge-center/acm-dns-certificate-renewal).
Do not delete the existing certificate during recovery or suppress TLS verification.

## Prevention and verification

Local changes remove automatic validation-CNAME deletion, make managed-certificate
state migration explicitly preserve its entire descendant tree, and add behavior tests.

`node packages/infra/scripts/check-tls.ts` validates public TLS trust, hostname and
at least 30 days of remaining validity on all six CloudFront hosts. It needs no AWS
credentials. `--acm` additionally discovers the attached certificates, checks managed
renewal eligibility/status and resolves every expected validation CNAME. It is read-only
and needs `cloudfront:ListDistributions` and `acm:DescribeCertificate` in `us-east-1`.
Use the normal infra environment loader when running the authenticated audit locally.

The proposed `TLS certificate health` GitHub workflow runs hourly and on manual
request, independent of deployments. Pull requests run monitor tests without checking
production. It becomes active only after merging to the default branch. Maintainers
must enable and verify GitHub Actions failure notifications; adding a workflow alone
does not prove an alert was delivered. Schedules can be delayed or disabled by GitHub.
For a second alert channel, configure ACM renewal/expiry EventBridge events and a
confirmed operations notification destination in AWS; this has not been provisioned.

Validation must include the infra tests/type check, shell syntax, monitor unit tests,
and the live audit. Before recovery, the live audit is expected to fail on precisely
the three affected hosts; this is evidence that detection works, not a completed repair.

## Applied recovery and deployment safeguards

- Restored the exact validation CNAMEs for production AIRS, AIRS testnet and admin
  testnet with Route53 UPSERT; no traffic-routing records were changed.
- Issued and attached replacement production and AIRS-testnet certificates to their
  existing distributions. Preserved aliases, origins, caching and TLS policy. The
  old certificates were retained rather than deleted during incident recovery.
- Updated production and testnet certificate references in the private infra
  environment and all six Alternun CodeBuild projects. Read back every project
  to verify the old references were gone.
- Added a live canonical testnet override to protect against the old buildspec
  until the repository fix merges. Removed the fixed canonical testnet certificate
  from the local buildspec and added a regression test for repeated rotations.
- Explicitly disabled ACM validation deletion, automatic conflicting-DNS cleanup
  and destructive deployment cleanup in all six live build projects and the private
  infra environment. Local code also removes validation-CNAME deletion completely.
- Exported production/dev SST state backups privately. No broad infrastructure
  deployment or refresh was run. SST's targeted refresh includes dependents, so it
  was unnecessary during this focused recovery. The next deployment must load the
  updated desired certificate references; restoring old environment backups would
  reintroduce the problem.

The full infrastructure suite passed **76 tests**, and infra type-check, shell syntax
and whitespace checks passed. Strict TLS and HTTP 200 passed on all eight resolved
AIRS/AIRS-testnet edge addresses. Original detection correctly failed on all three
affected hosts; admin testnet remains expected to fail the 30-day monitor until ACM
completes its renewal. No GitHub workflow activation or notification delivery has
been performed. Existing codebase-memory working-tree changes were left untouched.
