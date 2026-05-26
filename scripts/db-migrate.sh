#!/bin/bash
set -e

# Database migration runner with environment detection
# Usage: ./scripts/db-migrate.sh [--dry-run] [--force-prod]

DRY_RUN=""
FORCE_PROD=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --force-prod)
      FORCE_PROD=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./scripts/db-migrate.sh [--dry-run] [--force-prod]"
      exit 1
      ;;
  esac
done

# Load AWS account setup
echo "🔐 Loading AWS credentials..."
source scripts/setup-aws-account.sh

# Detect environment
if [[ -n "$MIGRATION_DATABASE_URL" ]]; then
  DATABASE_URL="$MIGRATION_DATABASE_URL"
  ENV_SOURCE="MIGRATION_DATABASE_URL"
elif [[ -n "$INFRA_BACKEND_API_DATABASE_URL" ]]; then
  DATABASE_URL="$INFRA_BACKEND_API_DATABASE_URL"
  ENV_SOURCE="INFRA_BACKEND_API_DATABASE_URL"
elif [[ -n "$DATABASE_URL_DEV" ]]; then
  DATABASE_URL="$DATABASE_URL_DEV"
  ENV_SOURCE="DATABASE_URL_DEV"
elif [[ -n "$DATABASE_URL_PROD" ]]; then
  DATABASE_URL="$DATABASE_URL_PROD"
  ENV_SOURCE="DATABASE_URL_PROD"
elif [[ -n "$DATABASE_URL" ]]; then
  ENV_SOURCE="DATABASE_URL"
else
  echo "❌ No database URL found in environment"
  exit 1
fi

# Determine environment
if [[ "$DATABASE_URL" == *"rjebeugdvwbjpaktrrbx"* ]] || [[ "$ENV_SOURCE" == "DATABASE_URL_PROD" ]]; then
  ENVIRONMENT="PRODUCTION"
  EMOJI="🔴"
else
  ENVIRONMENT="DEVELOPMENT"
  EMOJI="🟢"
fi

# Display info
echo ""
echo "🔧 Database Migration Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${EMOJI} Environment: $ENVIRONMENT"
echo "📍 Source: $ENV_SOURCE"
if [[ -n "$DRY_RUN" ]]; then
  echo "📋 Mode: DRY RUN"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Production safety check
# Allow production dry-runs without approval so operators can preview pending
# migrations before choosing to apply them.
if [[ "$ENVIRONMENT" == "PRODUCTION" && -z "$DRY_RUN" ]]; then
  if [[ -z "$FORCE_PROD" ]]; then
    echo "⚠️  PRODUCTION ENVIRONMENT DETECTED!"
    echo ""
    echo "To proceed with production migrations, run:"
    echo "  APPROVE_PROD_MIGRATION=true pnpm db:migrate"
    echo ""
    echo "Or use this script with --force-prod flag:"
    echo "  ./scripts/db-migrate.sh --force-prod $DRY_RUN"
    exit 1
  fi
  APPROVE_PROD_MIGRATION=true
fi

# Run migrations
echo "🚀 Running migrations..."
export DATABASE_URL
export APPROVE_PROD_MIGRATION

if [[ -n "$DRY_RUN" ]]; then
  pnpm --filter @alternun/api run db:migrate -- $DRY_RUN
else
  pnpm --filter @alternun/api run db:migrate
fi

MIGRATION_EXIT_CODE=$?

if [[ $MIGRATION_EXIT_CODE -eq 0 ]]; then
  echo ""
  echo "✨ Migration completed successfully!"
else
  echo ""
  echo "❌ Migration failed with exit code: $MIGRATION_EXIT_CODE"
  exit $MIGRATION_EXIT_CODE
fi
