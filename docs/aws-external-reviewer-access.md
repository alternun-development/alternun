# AWS External Reviewer Access (read-only)

Read-only AWS access for external reviewers (audits, code/infra review) in the Alternun account (`124120088516`).
Policy sources live in [`packages/infra/iam/external-reviewer/`](../packages/infra/iam/external-reviewer/).

## Current mode: direct read-only, no MFA (since 2026-10-29)

The reviewers could not get past MFA enrollment (CloudTrail 2026-10-29: no `CreateVirtualMFADevice` attempt, only AccessDenied on console pages), so the MFA + role flow was replaced by `apply-no-mfa.sh`:

- Group `alternun-external-readonly` gets `ViewOnlyAccess` + `SecurityAudit` directly; the reviewer uses the access key or console password as-is (no role, no MFA).
- `alternun-external-reviewer-deny-sensitive` stays on the group: secrets, data and env-var config remain blocked.
- Inline `ReviewAccessWindow` (`group-access-window.policy.json`) denies everything after **2026-11-30 23:59 UTC**.
- `RequireMfa` removed. The role is left in place, unused. Undo with `rollback-to-mfa.sh`.

Trade-off: a leaked key/password now gives read-only access without a second factor until the window closes. Rotate key `AKIA…YLZR` and disable the user when the review ends.

## Design (MFA + role, before 2026-10-29)

```
IAM user  external-reviewer ──member of──▶ group alternun-external-readonly
                                                │  RequireMfa (inline)               MFA self-service, AssumeRole, deny-all-without-MFA
                                                │  alternun-external-reviewer-deny-sensitive (managed)
                                                ▼
                                   sts:AssumeRole (trust requires MFA)
                                                ▼
                         role alternun-external-reviewer-readonly
                           ├─ AWS ViewOnlyAccess
                           ├─ AWS SecurityAudit
                           └─ alternun-external-reviewer-deny-sensitive
```

- The **user has no read permissions**. Reads come only from the role, assumed with MFA (1 hour sessions).
- The **deny policy** blocks reads of secrets, data and config that embeds plaintext (see below). Explicit deny wins over any allow.
- Virtual MFA devices may be created with any name, but deleted only if named after the user (`mfa/${aws:username}`).

| File                            | Applied as                                                                  |
| ------------------------------- | --------------------------------------------------------------------------- |
| `group-require-mfa.policy.json` | Group inline policy `RequireMfa`                                            |
| `deny-sensitive.policy.json`    | Managed policy `alternun-external-reviewer-deny-sensitive`, on role + group |
| `role-trust.json`               | Trust policy of the role (only `external-reviewer`, MFA required)           |

## Why reviewers see `explicit deny`

1. **No MFA yet (most common).** `RequireMfa` → `DenyEverythingElseWithoutMfa` denies every action except MFA setup and `sts:AssumeRole`. A plain access key with no MFA session gets "explicit deny in an identity-based policy" on everything (`ListUsers`, `DescribeInstances`, `ListStacks`, ...). First observed 2026-10-22: all calls were made without MFA.
2. **Not using the role.** The user itself has no read permissions. Calls made as the user (even with MFA) are implicit-denied; they must go through `alternun-external-reviewer-readonly`.
3. **Intentional denies** (even with MFA and the role). These return secrets or plaintext env vars:
   - Secrets: `secretsmanager:GetSecretValue`, `ssm:GetParameter*`, `kms:Decrypt`, registry/auth tokens
   - Data: `s3:GetObject`, DynamoDB reads, `sqs:ReceiveMessage`, CloudWatch Logs reads
   - Config with env vars/code: `lambda:ListFunctions`, `lambda:GetFunction[Configuration]`, `codebuild:BatchGetProjects`, `ecs:DescribeTaskDefinition`, `cloudformation:GetTemplate`, launch templates, AWS Config history
   - Console pages that call these APIs will show partial errors.

The error text names the denying policy; use it to trace the cause.

## Reviewer setup

1. Sign in to the console as the reviewer user → IAM → Security credentials → **Assign MFA device** (Authenticator app). Note the device ARN.
2. `~/.aws/credentials`:
   ```ini
   [alternun-base]
   aws_access_key_id = AKIA...
   aws_secret_access_key = ...
   ```
3. `~/.aws/config`:

   ```ini
   [profile alternun-base]
   region = us-east-1

   [profile alternun-review]
   role_arn = arn:aws:iam::124120088516:role/alternun-external-reviewer-readonly
   source_profile = alternun-base
   mfa_serial = arn:aws:iam::124120088516:mfa/<device-name>
   region = us-east-1
   ```

4. `aws sts get-caller-identity --profile alternun-review` (prompts for the MFA code; session cached ~1h).

Console: Switch role → account `124120088516`, role `alternun-external-reviewer-readonly`.

## Findings (2026-10-23 review)

- Original setup (group-attached `ViewOnlyAccess` + `SecurityAudit`) left plaintext secrets readable via `lambda:GetFunctionConfiguration`, `codebuild:BatchGetProjects`, `ecs:DescribeTaskDefinition`, `cloudformation:GetTemplate`. Mitigated by the deny policy.
- **Plaintext secrets exist in env vars** (names only reviewed): prod/dev API Lambdas (`DATABASE_URL`, `AUTHENTIK_JWT_SIGNING_KEY`, `*_CLIENT_SECRET`, `BETTER_AUTH_SECRET`) and six CodeBuild projects (`INFRA_BACKEND_API_DATABASE_URL`, `..._JWT_SIGNING_KEY`, `..._GITHUB_CLIENT_SECRET`, ...). The deny hides them from reviewers but not from other principals.
- CloudTrail (7 days): no successful secret-bearing API call by the reviewer.
- `DeleteVirtualMFADevice` was allowed on all `mfa/*`; now scoped to the user's own device.

## Known limitations / future improvements

- **One shared user = one identity.** CloudTrail shows `external-reviewer` for everyone; no per-person revocation; a leaked key affects all. Preferred: one IAM user per reviewer in the group, role trust widened to the account root (still MFA-required), plus `sts:RoleSessionName == ${aws:username}` so CloudTrail attributes actions.
- **Best long-term:** IAM Identity Center (or IAM SAML federation via Authentik) — no long-term keys, central MFA, per-person audit.
- **MFA enrollment without MFA** is the AWS-standard pattern but lets a holder of key+password enroll a device before the legitimate reviewer. Enroll on a call, then remove enroll permissions from the group (keep `iam:ListMFADevices`, `iam:GetUser`).
- **Move secrets out of plaintext env vars** (Secrets Manager / SSM SecureString references) in Lambda and CodeBuild — the real fix; the deny is containment.
- Scan covered `us-east-1` only; other regions not reviewed.
- Rotate access key `AKIA…YLZR` once the reviewer is set up.
- Policies are applied manually with the AWS CLI; consider managing them in SST/Terraform.
