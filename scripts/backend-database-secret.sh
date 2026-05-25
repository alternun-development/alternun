#!/bin/bash

# Shared backend database secret resolver.
# Keep stage mapping in one place so deploy/bootstrap helpers cannot drift.

normalize_stage() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-'
}

resolve_backend_database_secret_name() {
  local stage_name secret_name
  stage_name=$(normalize_stage "${STACK:-${SST_STAGE:-dev}}")

  if [ -n "${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME:-}" ]; then
    printf '%s\n' "${INFRA_BACKEND_API_DATABASE_URL_SECRET_NAME}"
    return 0
  fi

  case "$stage_name" in
    prod|api-prod|production|*production*|dashboard-prod|dashboard-production)
      secret_name="alternun/api/infra-backend-api-database-url-prod"
      ;;
    dev|api-dev|dashboard-dev|*testnet*|*development*)
      secret_name="alternun/api/infra-backend-api-database-url-dev"
      ;;
    *)
      secret_name="alternun/api/infra-backend-api-database-url-prod"
      ;;
  esac

  printf '%s\n' "$secret_name"
}

resolve_backend_database_ssm_stage() {
  local stage_name
  stage_name=$(normalize_stage "${STACK:-${SST_STAGE:-dev}}")

  case "$stage_name" in
    prod|api-prod|production|*production*|dashboard-prod|dashboard-production)
      printf '%s\n' 'prod'
      ;;
    dev|api-dev|dashboard-dev|*testnet*|*development*)
      printf '%s\n' 'dev'
      ;;
    *)
      printf '%s\n' "$stage_name"
      ;;
  esac
}

resolve_backend_database_ssm_key() {
  local stage_name ssm_key
  stage_name=$(normalize_stage "${STACK:-${SST_STAGE:-dev}}")

  case "$stage_name" in
    prod|api-prod|production|*production*|dashboard-prod|dashboard-production)
      ssm_key="infra-backend-api-database-url-prod"
      ;;
    dev|api-dev|dashboard-dev|*testnet*|*development*)
      ssm_key="infra-backend-api-database-url-dev"
      ;;
    *)
      ssm_key="infra-backend-api-database-url"
      ;;
  esac

  printf '%s\n' "$ssm_key"
}
