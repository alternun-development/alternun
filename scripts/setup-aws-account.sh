#!/bin/bash
# setup-aws-account.sh
# Helper to load Alternun AWS account credentials from .env
# Run this before deploying, or source it in your shell.
#
# Usage:
#   bash scripts/setup-aws-account.sh                    # Load credentials
#   source scripts/setup-aws-account.sh                  # Load and keep in current shell
#   . scripts/setup-aws-account.sh && bash scripts/... # Load then run command

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ERROR: .env file not found at $ENV_FILE"
  echo "The .env file must exist with AWS credentials."
  exit 1
fi

# Extract AWS credentials from .env (handle special characters in values)
AWS_KEY_ID=$(grep "^AWS_KEY_ID=" "$ENV_FILE" | cut -d= -f2- | tr -d '\n')
AWS_SECRET_ACCESS_KEY=$(grep "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE" | cut -d= -f2- | tr -d '\n')

if [ -z "$AWS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ ERROR: AWS credentials not found in .env"
  echo "Required variables:"
  echo "  AWS_KEY_ID"
  echo "  AWS_SECRET_ACCESS_KEY"
  exit 1
fi

# Export credentials
export AWS_ACCESS_KEY_ID="$AWS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_REGION="us-east-1"

echo "✅ Loaded Alternun AWS credentials"
echo "   AWS_ACCESS_KEY_ID: ${AWS_KEY_ID:0:10}..."
echo "   AWS_REGION: $AWS_REGION"
echo ""

# Verify account
bash "$REPO_ROOT/scripts/validate-aws-account.sh"
