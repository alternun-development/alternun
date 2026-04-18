#!/bin/bash
set -e

# Deploy API with migrations enabled using AWS Secrets

echo "🔐 Loading Alternun AWS credentials..."
source scripts/setup-aws-account.sh

echo "📡 Retrieving DATABASE_URL from AWS Secrets..."
export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text)

if [ -z "$INFRA_BACKEND_API_DATABASE_URL" ]; then
  echo "❌ Failed to retrieve DATABASE_URL from secrets"
  exit 1
fi

echo "✅ DATABASE_URL retrieved securely"

# Enable migrations (default: false - opt-in)
# To run migrations: INFRA_BACKEND_API_MIGRATIONS_ENABLED=true bash scripts/deploy-with-migrations.sh
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="${INFRA_BACKEND_API_MIGRATIONS_ENABLED:-false}"

if [ "$INFRA_BACKEND_API_MIGRATIONS_ENABLED" = "true" ]; then
  echo "🚀 Deploying API to $STACK with migrations ENABLED..."
else
  echo "🚀 Deploying API to $STACK (migrations disabled)..."
  echo "   To enable migrations: INFRA_BACKEND_API_MIGRATIONS_ENABLED=true bash scripts/deploy-with-migrations.sh"
fi

APPROVE=true STACK="${STACK:-dev}" packages/infra/scripts/sst-deploy.sh

echo "✨ Deployment complete!"
