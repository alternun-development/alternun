# AIRS security hardening

Migration `20261017_0001_harden_security_definer_functions.sql` closes the
public execution path for every `SECURITY DEFINER` function in `public`.

- `anon` and `authenticated` cannot execute privileged functions.
- `service_role` is the only application role granted execution.
- PostgreSQL's default function `EXECUTE` grant is revoked for the `postgres`
  migration owner.
- AIRS RPC calls require `SUPABASE_SERVICE_ROLE_KEY`; public Supabase keys are
  not a fallback.
- Internal activity writes require `ACTIVITY_INTERNAL_API_KEY`; missing
  configuration fails closed.

The migration was applied and verified independently:

| Environment | `SECURITY DEFINER` functions | Open to `anon`/`authenticated` |
| --- | ---: | ---: |
| Development | 51 | 0 |
| Production | 41 | 0 |

Verification uses:

```bash
psql "$DATABASE_URL_DEV" -f supabase/test/airs_security_hardening_verification.sql
psql "$DATABASE_URL_PROD" -f supabase/test/airs_security_hardening_verification.sql
```

The live non-mutating API smoke checks returned `200` for community total and
`401` for each private AIRS route in both testnet and production. The
authenticated smoke script is available at
`scripts/smoke-airs-security.sh`; it intentionally does not call onboarding,
because onboarding awards bonuses and can send email.

Supabase's managed `supabase_admin` default ACL is not editable through the
`postgres` migration connection. The migration runner uses `postgres`, whose
default function privileges are hardened; the verification output keeps the
managed ACL visible rather than masking this platform limitation.
