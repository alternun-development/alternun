#!/usr/bin/env bash
# Restore the MFA + role setup (undo apply-no-mfa.sh).
set -euo pipefail
cd "$(dirname "$0")"
bash ../../../../scripts/validate-aws-account.sh enforce

G=alternun-external-readonly
aws iam put-group-policy --group-name "$G" --policy-name RequireMfa \
  --policy-document file://group-require-mfa.policy.json
aws iam detach-group-policy --group-name "$G" --policy-arn arn:aws:iam::aws:policy/job-function/ViewOnlyAccess
aws iam detach-group-policy --group-name "$G" --policy-arn arn:aws:iam::aws:policy/SecurityAudit
aws iam delete-group-policy --group-name "$G" --policy-name ReviewAccessWindow
