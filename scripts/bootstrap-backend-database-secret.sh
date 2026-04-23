#!/bin/bash
set -euo pipefail

normalize_stage() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-'
}

resolve_backend_database_names() {
  local stage_name secret_name ssm_key
  stage_name=$(normalize_stage "${STACK:-${SST_STAGE:-dev}}")

  if [ -n "${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME:-}" ]; then
    secret_name="${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME}"
  else
    case "$stage_name" in
      prod|api-prod|production|*production*)
        secret_name="alternun/api/infra-backend-api-database-url-prod"
        ;;
      dev|api-dev|*testnet*|*development*)
        secret_name="alternun/api/infra-backend-api-database-url-dev"
        ;;
      *)
        secret_name="alternun/api/infra-backend-api-database-url-prod"
        ;;
    esac
  fi

  case "$stage_name" in
    prod|api-prod|production|*production*)
      ssm_key="infra-backend-api-database-url-prod"
      ;;
    dev|api-dev|*testnet*|*development*)
      ssm_key="infra-backend-api-database-url-dev"
      ;;
    *)
      ssm_key="infra-backend-api-database-url"
      ;;
  esac

  printf '%s\t%s\n' "$secret_name" "$ssm_key"
}

extract_database_url() {
  local value="${INFRA_BACKEND_API_DATABASE_URL:-${DATABASE_URL:-${SUPABASE_DATABASE_URL:-}}}"
  printf '%s\n' "$value"
}

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required." >&2
  exit 1
fi

source scripts/setup-aws-account.sh

IFS=$'\t' read -r SECRET_NAME SSM_KEY < <(resolve_backend_database_names)
DATABASE_URL_VALUE=$(extract_database_url)

if [ -z "$DATABASE_URL_VALUE" ]; then
  echo "ERROR: Set INFRA_BACKEND_API_DATABASE_URL, DATABASE_URL, or SUPABASE_DATABASE_URL before bootstrapping." >&2
  exit 1
fi

echo "Writing backend database secret for stage '${STACK:-${SST_STAGE:-dev}}'"
echo "  Secrets Manager: ${SECRET_NAME}"
echo "  SSM parameter:   /${INFRA_APP_NAME:-alternun-infra}/${STACK:-${SST_STAGE:-dev}}/${SSM_KEY}"

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "${AWS_REGION:-us-east-1}" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$DATABASE_URL_VALUE" \
    --region "${AWS_REGION:-us-east-1}" >/dev/null
else
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --secret-string "$DATABASE_URL_VALUE" \
    --region "${AWS_REGION:-us-east-1}" >/dev/null
fi

aws ssm put-parameter \
  --name "/${INFRA_APP_NAME:-alternun-infra}/${STACK:-${SST_STAGE:-dev}}/${SSM_KEY}" \
  --type SecureString \
  --value "$DATABASE_URL_VALUE" \
  --overwrite \
  --region "${AWS_REGION:-us-east-1}" >/dev/null

echo "Done."
