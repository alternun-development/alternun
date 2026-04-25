#!/bin/bash
set -e

# Apply migrations to testnet database using DATABASE_URL from AWS Secrets
# This script retrieves credentials and runs migrations for testnet

source scripts/backend-database-secret.sh

echo "🔐 Loading Alternun AWS credentials..."
source scripts/setup-aws-account.sh

# Use testnet database (which maps to dev in the backend)
STACK=dashboard-dev
DATABASE_SECRET_NAME=$(resolve_backend_database_secret_name)

echo "📡 Retrieving DATABASE_URL from AWS Secrets (${DATABASE_SECRET_NAME})..."
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id "$DATABASE_SECRET_NAME" \
  --query SecretString \
  --output text)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Failed to retrieve DATABASE_URL from secrets (${DATABASE_SECRET_NAME})"
  exit 1
fi

echo "✅ DATABASE_URL retrieved securely"

echo "🚀 Running migrations for testnet..."
export DATABASE_URL

pnpm --filter @alternun/api run db:migrate

echo "✨ Testnet migrations applied successfully!"
