#!/bin/bash
set -e

# Apply migrations locally using DATABASE_URL from AWS Secrets
# This script retrieves credentials and runs migrations without Lambda

echo "🔐 Loading Alternun AWS credentials..."
source scripts/setup-aws-account.sh

echo "📡 Retrieving DATABASE_URL from AWS Secrets..."
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Failed to retrieve DATABASE_URL from secrets"
  exit 1
fi

echo "✅ DATABASE_URL retrieved securely"

echo "🚀 Running migrations locally..."
export DATABASE_URL

pnpm --filter @alternun/api run db:migrate

echo "✨ Migrations applied successfully!"
