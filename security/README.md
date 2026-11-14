# Security audits

Reusable weekly AWS security verification loop for the Alternun account (`124120088516`).
**Read-only** — the loop never changes the account; it verifies and reports.

## Layout

```
security/
├── scripts/
│   ├── run-audit.sh        # runs the critical checks → findings.json
│   ├── build-reports.py    # findings.json → report-exec.html (CEO) + report-tech.html (CTO)
│   └── send-reports.py     # emails the reports via Tláo SMTP (CEO=exec, CTO=tech)
└── audits/
    └── YYYY-MM-DD/         # one folder per run, tagged by date
        ├── findings.json
        ├── report-exec.html
        ├── report-tech.html
        └── full-audit-*.html   # full narrative report (when produced)
```

## What it checks

| Check                              | Pass condition                                          |
| ---------------------------------- | ------------------------------------------------------- |
| C1 — reviewer privilege escalation | 0 of 21 privesc actions allowed for `external-reviewer` |
| C2 — reviewer secret reads         | all sensitive reads `explicitDeny`                      |
| C3a — admins without MFA           | none                                                    |
| C3b — access keys > 90 days        | none                                                    |
| C4 — account password policy       | present                                                 |
| C5 — non-admin secret readers      | none outside the allowlist (`sgomez`)                   |
| C6a — repo visibility              | not public                                              |
| C6b — git history leaks            | no AKIA/ASIA keys, private keys or JWTs                 |
| C7 — reviewer access window        | closed (warns while open, expires 2026-11-30)           |

Findings are ranked critical → warning → ok. Edit `SECRET_READER_ALLOWLIST` in
`run-audit.sh` when an authorized secret reader is added or removed.

## Run it manually

```bash
source scripts/setup-aws-account.sh
bash scripts/validate-aws-account.sh enforce
OUT="security/audits/$(date -u +%F)"
bash security/scripts/run-audit.sh "$OUT"
python3 security/scripts/build-reports.py "$OUT/findings.json" "$OUT"
# preview locally, then (only when you mean to send):
python3 security/scripts/send-reports.py "$OUT" --ceo security-ceo@alternun.example --cto edward@alternun.io --dry-run
```

## Weekly automation

`.github/workflows/weekly-security-audit.yml` runs every **Monday 11:11 Colombia
time (16:11 UTC)** and on manual dispatch. It runs the loop, uploads the reports as
a private workflow artifact (90-day retention), and emails them: executive → CEO,
technical → CTO.

### Required repo configuration (set once, by a maintainer)

- **AWS access (read-only).** Preferred: an OIDC role with `ViewOnlyAccess` +
  `SecurityAudit`, set as repo **variable** `AWS_AUDIT_ROLE_ARN`. Fallback: repo
  **secrets** `AWS_AUDIT_ACCESS_KEY_ID` / `AWS_AUDIT_SECRET_ACCESS_KEY` for a
  read-only IAM user. Do **not** use an admin key.
- **SMTP.** The mailer reads the existing `alternun/tlao/smtp` Secrets Manager
  secret using the same AWS credentials, so no extra mail secret is needed.

> The workflow needs read access to Secrets Manager for `alternun/tlao/smtp`. A pure
> `SecurityAudit`/`ViewOnlyAccess` role cannot read secret _values_; grant the audit
> role `secretsmanager:GetSecretValue` on that one secret ARN, or run the mailer with
> a separate narrowly-scoped identity.

## Notes

- `security/.gitignore` blocks accidental commits of credential/password dumps.
- The loop is safe to run repeatedly; it only reads.
