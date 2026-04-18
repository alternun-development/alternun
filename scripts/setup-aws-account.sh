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

# Detect repo root: try git first, then use script directory
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  :  # git found the repo
else
  # Fallback: use script directory (scripts/setup-aws-account.sh → alternun/)
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

ENV_FILE="$REPO_ROOT/.env"

# Check if running in CodeBuild (these env vars persist even after unsetting AWS_*)
if [ -n "${CODEBUILD_BUILD_ID:-}" ] || [ -n "${CODEBUILD_BUILD_SUCCEEDING:-}" ] || [ -n "${CODEBUILD_SOURCE_VERSION:-}" ]; then
  # Running in CodeBuild - use IAM role attached to the CodeBuild instance
  # AWS CLI will automatically use the IAM role credentials from the instance metadata
  echo "✅ Detected CodeBuild environment - using IAM role credentials"
  export AWS_REGION="${AWS_REGION:-us-east-1}"
  bash "$REPO_ROOT/scripts/validate-aws-account.sh"
  exit 0
fi

# Check if credentials are already set in environment (from other CI systems or local shell)
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "✅ AWS credentials already set in environment"
  export AWS_REGION="${AWS_REGION:-us-east-1}"
  bash "$REPO_ROOT/scripts/validate-aws-account.sh"
  exit 0
fi

# Local development - load from .env
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ERROR: .env file not found at $ENV_FILE"
  echo "The .env file must exist with AWS credentials for local development."
  echo ""
  echo "For CodeBuild/CI environments: ensure CodeBuild IAM role is properly configured."
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

echo "✅ Loaded Alternun AWS credentials from .env"
echo "   AWS_ACCESS_KEY_ID: ${AWS_KEY_ID:0:10}..."
echo "   AWS_REGION: $AWS_REGION"
echo ""

# Verify account
bash "$REPO_ROOT/scripts/validate-aws-account.sh"
