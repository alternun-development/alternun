#!/bin/bash
set -e

# Deploy API with migrations enabled using AWS Secrets

normalize_stage() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-'
}

resolve_database_secret_name() {
  local stage_name secret_name
  stage_name=$(normalize_stage "${STACK:-${SST_STAGE:-dev}}")

  if [ -n "${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME:-}" ]; then
    printf '%s\n' "${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME}"
    return 0
  fi

  case "$stage_name" in
    prod|api-prod|production|*production*)
      secret_name="alternun/api/database-url"
      ;;
    dev|api-dev|*testnet*|*development*)
      secret_name="alternun/api/database-url-dev"
      ;;
    *)
      secret_name="alternun/api/database-url"
      ;;
  esac

  printf '%s\n' "$secret_name"
}

echo "🔐 Loading Alternun AWS credentials..."
source scripts/setup-aws-account.sh

DATABASE_SECRET_NAME=$(resolve_database_secret_name)

echo "📡 Retrieving DATABASE_URL from AWS Secrets (${DATABASE_SECRET_NAME})..."
export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id "$DATABASE_SECRET_NAME" \
  --query SecretString \
  --output text)

if [ -z "$INFRA_BACKEND_API_DATABASE_URL" ]; then
  echo "❌ Failed to retrieve DATABASE_URL from secrets (${DATABASE_SECRET_NAME})"
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
