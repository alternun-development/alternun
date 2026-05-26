#!/bin/bash
set -euo pipefail

# Stage-aware migration sync wrapper for the live backend database secret.
# Use this when you want to preview or apply repo migrations against the
# stage-scoped backend DATABASE_URL that the production runtime uses.
#
# Safe defaults:
#   - no flags => dry-run
#   - --dry-run => preview pending migrations
#   - --file <migration.sql> => apply one migration at a time
#   - --all => legacy batch apply path, gated for explicit approval
#
# Examples:
#   ./scripts/sync-db-migrations.sh dev --dry-run
#   ./scripts/sync-db-migrations.sh production --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql --force-prod

usage() {
  cat <<'EOF'
Usage: ./scripts/sync-db-migrations.sh [stage] [--dry-run] [--file <migration.sql>] [--all] [--force-prod]

Stages:
  dev, testnet, dashboard-dev, backend-dev, backend-api-dev, api-dev, identity-dev,
  auth-dev, authentik-dev, admin-dev, backoffice-dev, backoffice-admin-dev
  prod, production, dashboard-prod, backend-prod, backend-api-prod, api-prod,
  api-production, identity-prod, auth-prod, authentik-prod, admin-prod,
  backoffice-prod, backoffice-admin-prod

Modes:
  --dry-run               Preview pending backend migrations.
  --file <migration.sql>  Apply exactly one migration file against the backend DB.
  --all                   Apply the full pending queue (legacy opt-in).
  --force-prod            Required for any production apply mode.
EOF
}

TARGET_STAGE="${STACK:-${SST_STAGE:-dev}}"
MIGRATION_FILE=""
MODE="dry-run"
FORCE_PROD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      MIGRATION_FILE=""
      ;;
    --file)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --file" >&2
        usage >&2
        exit 1
      fi
      MIGRATION_FILE="$2"
      MODE="file"
      shift
      ;;
    --all)
      MODE="all"
      MIGRATION_FILE=""
      ;;
    --force-prod)
      FORCE_PROD=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    dev | testnet | dashboard-dev | backend-dev | backend-api-dev | api-dev | identity-dev | auth-dev | authentik-dev | admin-dev | backoffice-dev | backoffice-admin-dev | prod | production | dashboard-prod | backend-prod | backend-api-prod | api-prod | api-production | identity-prod | auth-prod | authentik-prod | admin-prod | backoffice-prod | backoffice-admin-prod)
      TARGET_STAGE="$1"
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

export STACK="$TARGET_STAGE"
export SST_STAGE="$TARGET_STAGE"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/backend-database-secret.sh"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/setup-aws-account.sh"

DATABASE_SECRET_NAME=$(resolve_backend_database_secret_name)

echo "📡 Retrieving backend DATABASE_URL from AWS Secrets (${DATABASE_SECRET_NAME})..."
export MIGRATION_DATABASE_URL=$(
  aws secretsmanager get-secret-value \
    --secret-id "$DATABASE_SECRET_NAME" \
    --query SecretString \
    --output text
)

if [ -z "${MIGRATION_DATABASE_URL:-}" ]; then
  echo "❌ Failed to resolve the backend DATABASE_URL for stage ${TARGET_STAGE}" >&2
  exit 1
fi

echo "🔐 Syncing backend database migrations"
echo "   Stage  = ${TARGET_STAGE}"
echo "   Mode   = ${MODE}"
echo "   Secret = ${DATABASE_SECRET_NAME}"

is_production_stage=false
case "$(printf '%s' "${TARGET_STAGE}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')" in
  prod|production|*production*|dashboard-prod|dashboard-production|backend-prod|backend-api-prod|api-prod|api-production|identity-prod|auth-prod|authentik-prod|admin-prod|backoffice-prod|backoffice-admin-prod)
    is_production_stage=true
    ;;
esac

if [[ "${MODE}" != "dry-run" && "${is_production_stage}" == "true" ]]; then
  if [[ -z "${FORCE_PROD}" && "${APPROVE_PROD_MIGRATION:-}" != "true" ]]; then
    echo "⚠️  Production runtime migration selected."
    echo "    Re-run with --force-prod or APPROVE_PROD_MIGRATION=true after reviewing the dry-run output."
    exit 1
  fi
fi

if [[ "${MODE}" == "dry-run" ]]; then
  echo "🔎 Previewing pending migrations against the backend database..."
  bash "$SCRIPT_DIR/db-migrate.sh" --dry-run
  exit 0
fi

if [[ "${MODE}" == "file" ]]; then
  if [ -z "${MIGRATION_FILE}" ]; then
    echo "❌ --file requires a migration path" >&2
    exit 1
  fi

  echo "🚀 Applying single migration file: ${MIGRATION_FILE}"
  node "$REPO_ROOT/apps/api/scripts/run-migration.mjs" "$MIGRATION_FILE"
  exit 0
fi

echo "🚀 Applying the full pending queue against the backend database"
echo "   This is a legacy opt-in path. Prefer --file for one-by-one promotion."
bash "$SCRIPT_DIR/db-migrate.sh" ${FORCE_PROD:+--force-prod}
