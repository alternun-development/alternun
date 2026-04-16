#!/bin/bash
# validate-aws-account.sh
# Guards against accidentally using the default AWS CLI account instead of Alternun's.
#
# Alternun's AWS account ID: 124120088516
# Default/wrong account: 058264267235 (should NOT be used for deployment)
#
# Usage:
#   bash scripts/validate-aws-account.sh          # Check current account
#   bash scripts/validate-aws-account.sh enforce  # Exit with error if wrong account

set -euo pipefail

ALTERNUN_ACCOUNT_ID="124120088516"
WRONG_ACCOUNT_ID="058264267235"
ENFORCE="${1:-check}"

# Try to get caller identity; fail gracefully if not authenticated
get_current_account() {
  aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "unknown"
}

current_account=$(get_current_account)

if [ "$current_account" = "unknown" ]; then
  cat <<EOF
❌ AWS NOT CONFIGURED

No valid AWS credentials found. You must set up Alternun AWS credentials:

1. Load from .env:
   export AWS_ACCESS_KEY_ID=\$(grep AWS_KEY_ID .env | cut -d= -f2)
   export AWS_SECRET_ACCESS_KEY=\$(grep AWS_SECRET_ACCESS_KEY .env | cut -d= -f2)
   export AWS_REGION=us-east-1

2. Or use the setup-aws-account.sh helper:
   bash scripts/setup-aws-account.sh

3. Verify:
   bash scripts/validate-aws-account.sh

See CLAUDE.md section "AWS Account Guard" for details.
EOF
  exit 1
fi

# Check if using correct account
if [ "$current_account" = "$ALTERNUN_ACCOUNT_ID" ]; then
  echo "✅ Using CORRECT Alternun AWS account: $current_account"
  exit 0
fi

# Check if using WRONG account
if [ "$current_account" = "$WRONG_ACCOUNT_ID" ]; then
  cat <<EOF
❌ WRONG AWS ACCOUNT DETECTED

Current:  $current_account (DEFAULT cli-admin — DO NOT USE)
Required: $ALTERNUN_ACCOUNT_ID (Alternun project account)

You are using the default AWS CLI account instead of Alternun's.

FIX:
  1. Load Alternun credentials from .env:
     export AWS_ACCESS_KEY_ID=\$(grep AWS_KEY_ID .env | cut -d= -f2)
     export AWS_SECRET_ACCESS_KEY=\$(grep AWS_SECRET_ACCESS_KEY .env | cut -d= -f2)
     export AWS_REGION=us-east-1

  2. Or run the helper:
     bash scripts/setup-aws-account.sh

  3. Verify:
     bash scripts/validate-aws-account.sh

See CLAUDE.md section "AWS Account Guard" for details.
EOF
  if [ "$ENFORCE" = "enforce" ]; then
    exit 1
  fi
  exit 0
fi

# Unknown account
cat <<EOF
⚠️  UNKNOWN AWS ACCOUNT

Current:  $current_account
Expected: $ALTERNUN_ACCOUNT_ID (Alternun project account)

This account is not recognized as Alternun's account. Verify you're using the correct credentials.

Correct account: $ALTERNUN_ACCOUNT_ID

See CLAUDE.md section "AWS Account Guard" for details.
EOF
if [ "$ENFORCE" = "enforce" ]; then
  exit 1
fi
exit 0
