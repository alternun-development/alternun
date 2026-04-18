#!/usr/bin/env bash

DEFAULT_MANAGED_PIPELINES_CSV='production,dev,identity-dev,identity-prod,dashboard-dev,dashboard-prod'

resolve_pipeline_config_path() {
  local current_infra_dir
  current_infra_dir=${INFRA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}

  if [ -n "${INFRA_CONFIG_PATH:-}" ]; then
    if [[ "${INFRA_CONFIG_PATH}" = /* ]]; then
      printf '%s\n' "${INFRA_CONFIG_PATH}"
    else
      printf '%s\n' "${current_infra_dir}/${INFRA_CONFIG_PATH}"
    fi
    return 0
  fi

  printf '%s\n' "${current_infra_dir}/config/deployment.config.json"
}

read_pipeline_config_csv() {
  local config_path
  config_path=$(resolve_pipeline_config_path)

  if [ ! -f "$config_path" ]; then
    return 0
  fi

  node -e '
    const fs = require("node:fs");
    const configPath = process.argv[1];
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const pipelines = parsed?.pipeline?.pipelines;
      if (typeof pipelines === "string") {
        process.stdout.write(pipelines);
      }
    } catch (error) {
      process.stderr.write(`ERROR: Failed to parse pipeline config ${configPath}: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  ' "$config_path"
}

normalize_managed_pipeline_key() {
  local normalized
  normalized=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

  case "$normalized" in
    production | prod) printf '%s\n' 'production' ;;
    dev) printf '%s\n' 'dev' ;;
    mobile) printf '%s\n' 'mobile' ;;
    identity | identity-dev | identitydev | auth | auth-dev | authentik | authentik-dev)
      printf '%s\n' 'identity-dev'
      ;;
    identity-prod | identityprod | identity-production | auth-prod | authentik-prod)
      printf '%s\n' 'identity-prod'
      ;;
    dashboard | dashboard-dev | dashboardapi | dashboardapi-dev | dashboard-admin | dashboard-admin-dev | admin | admin-dev | backoffice | backoffice-dev | backoffice-admin | backoffice-admin-dev | api | api-dev | backend | backend-dev | backend-api | backend-api-dev)
      printf '%s\n' 'dashboard-dev'
      ;;
    dashboard-prod | dashboard-production | dashboardapi-prod | dashboard-admin-prod | admin-prod | admin-production | backoffice-prod | backoffice-admin-prod | api-prod | api-production | backend-prod | backend-api-prod)
      printf '%s\n' 'dashboard-prod'
      ;;
    *) return 1 ;;
  esac
}

managed_pipeline_suffix_for_key() {
  case "${1:-}" in
    production) printf '%s\n' 'prod' ;;
    dev) printf '%s\n' 'dev' ;;
    mobile) printf '%s\n' 'mobile' ;;
    identity-dev) printf '%s\n' 'auth-dev' ;;
    identity-prod) printf '%s\n' 'auth-prod' ;;
    dashboard-dev) printf '%s\n' 'dash-dev' ;;
    dashboard-prod) printf '%s\n' 'dash-prod' ;;
    *) return 1 ;;
  esac
}

pipeline_name_for_key() {
  local key suffix prefix
  key=$1
  prefix=${2:-${INFRA_PIPELINE_PREFIX:-alternun}}
  suffix=$(managed_pipeline_suffix_for_key "$key") || return 1
  printf '%s\n' "${prefix}-${suffix}-pipeline"
}

require_destructive_cleanup_allowed() {
  local action=${1:-destructive cleanup}

  if is_truthy "${INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS:-false}"; then
    return 0
  fi

  echo "WARN: Skipping ${action} because INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS=false." >&2
  echo "WARN: Set INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS=true only for intentional recovery runs that must delete live DNS, CloudFront aliases, ACM validation CNAMEs, or SST state." >&2
  return 1
}

emit_pipeline_keys_from_csv() {
  local raw token key
  raw=${1:-}

  if [ -z "$raw" ]; then
    return 0
  fi

  IFS=',' read -r -a __pipeline_tokens <<< "$raw"
  for token in "${__pipeline_tokens[@]}"; do
    if key=$(normalize_managed_pipeline_key "$token" 2>/dev/null); then
      printf '%s\n' "$key"
    fi
  done | awk '!seen[$0]++'
}

resolve_selected_pipeline_csv() {
  local from_config

  if [ -n "${INFRA_PIPELINES:-}" ]; then
    printf '%s\n' "${INFRA_PIPELINES}"
    return 0
  fi

  from_config=$(read_pipeline_config_csv)
  if [ -n "$from_config" ]; then
    printf '%s\n' "$from_config"
    return 0
  fi

  printf '%s\n' "$DEFAULT_MANAGED_PIPELINES_CSV"
}

resolve_canonical_managed_pipeline_csv() {
  local from_config

  if [ -n "${INFRA_MANAGED_PIPELINES_CANONICAL:-}" ]; then
    printf '%s\n' "${INFRA_MANAGED_PIPELINES_CANONICAL}"
    return 0
  fi

  from_config=$(read_pipeline_config_csv)
  if [ -n "$from_config" ]; then
    printf '%s\n' "$from_config"
    return 0
  fi

  printf '%s\n' "$DEFAULT_MANAGED_PIPELINES_CSV"
}

emit_existing_managed_pipeline_keys() {
  local pipeline_prefix region name suffix key
  pipeline_prefix=${1:-${INFRA_PIPELINE_PREFIX:-alternun}}
  region=${2:-${AWS_REGION:-us-east-1}}

  aws codepipeline list-pipelines \
    --region "$region" \
    --query 'pipelines[].name' \
    --output text 2>/dev/null | tr '\t' '\n' | while IFS= read -r name; do
      [ -n "$name" ] || continue

      case "$name" in
        "${pipeline_prefix}-"*)
          suffix=${name#"${pipeline_prefix}-"}
          suffix=${suffix%-pipeline}
          if key=$(normalize_managed_pipeline_key "$suffix" 2>/dev/null); then
            printf '%s\n' "$key"
          fi
          ;;
      esac
    done | awk '!seen[$0]++'
}

assert_pipeline_reconciliation_safe() {
  local desired_csv stage region pipeline_prefix
  desired_csv=$1
  stage=$2
  pipeline_prefix=${3:-${INFRA_PIPELINE_PREFIX:-alternun}}
  region=${4:-${AWS_REGION:-us-east-1}}

  if [ "$stage" != 'production' ]; then
    return 0
  fi

  if ! is_truthy "${INFRA_ENFORCE_PIPELINE_DELETE_GUARD:-true}"; then
    echo "WARN: Skipping pipeline deletion guard (INFRA_ENFORCE_PIPELINE_DELETE_GUARD=${INFRA_ENFORCE_PIPELINE_DELETE_GUARD:-true})."
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: aws CLI is required for pipeline deletion guard on stack ${stage}." >&2
    return 1
  fi

  declare -A desired_set=()
  declare -A existing_set=()
  local key
  while IFS= read -r key; do
    [ -n "$key" ] && desired_set["$key"]=1
  done < <(emit_pipeline_keys_from_csv "$desired_csv")

  while IFS= read -r key; do
    [ -n "$key" ] && existing_set["$key"]=1
  done < <(emit_existing_managed_pipeline_keys "$pipeline_prefix" "$region")

  if [ "${#existing_set[@]}" -eq 0 ]; then
    return 0
  fi

  local would_delete=()
  for key in "${!existing_set[@]}"; do
    if [ -z "${desired_set[$key]:-}" ]; then
      would_delete+=("$key")
    fi
  done

  if [ "${#would_delete[@]}" -eq 0 ]; then
    return 0
  fi

  if is_truthy "${INFRA_ALLOW_PIPELINE_DELETION:-false}"; then
    echo "WARN: Allowing managed pipeline deletions because INFRA_ALLOW_PIPELINE_DELETION=true (${would_delete[*]})."
    return 0
  fi

  echo "ERROR: Refusing production pipeline-stack deploy because it would prune existing managed pipelines." >&2
  echo "ERROR: Existing managed pipelines in AWS: ${!existing_set[*]}" >&2
  echo "ERROR: Desired managed pipelines from current config: ${!desired_set[*]}" >&2
  echo "ERROR: Would delete: ${would_delete[*]}" >&2
  echo "ERROR: Update INFRA_PIPELINES/INFRA_MANAGED_PIPELINES_CANONICAL to include the missing keys," >&2
  echo "ERROR: or set INFRA_ALLOW_PIPELINE_DELETION=true only for intentional pipeline removals." >&2
  return 1
}
