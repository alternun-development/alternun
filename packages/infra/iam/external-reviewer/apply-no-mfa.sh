#!/usr/bin/env bash
# Switch external-reviewer to direct read-only access (no MFA, no role).
# Rollback: rollback-to-mfa.sh
set -euo pipefail
cd "$(dirname "$0")"
bash ../../../../scripts/validate-aws-account.sh enforce

G=alternun-external-readonly
aws iam attach-group-policy --group-name "$G" --policy-arn arn:aws:iam::aws:policy/job-function/ViewOnlyAccess
aws iam attach-group-policy --group-name "$G" --policy-arn arn:aws:iam::aws:policy/SecurityAudit
aws iam put-group-policy --group-name "$G" --policy-name ReviewAccessWindow \
  --policy-document file://group-access-window.policy.json
aws iam delete-group-policy --group-name "$G" --policy-name RequireMfa || true

U=arn:aws:iam::124120088516:user/external-reviewer
aws iam simulate-principal-policy --policy-source-arn "$U" \
  --action-names ec2:DescribeInstances iam:ListUsers cloudformation:ListStacks s3:ListAllMyBuckets \
    secretsmanager:GetSecretValue lambda:GetFunctionConfiguration s3:GetObject iam:CreateVirtualMFADevice \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
