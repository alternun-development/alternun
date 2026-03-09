#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
INFRA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STACK=${STACK:-${1:-${SST_STAGE:-production}}}
export STACK
export SST_STAGE="${SST_STAGE:-$STACK}"

stage_normalized=$(echo "$STACK" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
is_identity_stage=false
if [ "$stage_normalized" = "identity-dev" ] || \
  [ "$stage_normalized" = "identity-prod" ] || \
  [ "$stage_normalized" = "identity-production" ] || \
  [ "$stage_normalized" = "auth-dev" ] || \
  [ "$stage_normalized" = "auth-prod" ] || \
  [ "$stage_normalized" = "authentik-dev" ] || \
  [ "$stage_normalized" = "authentik-prod" ]; then
  is_identity_stage=true
fi

if [ "${INFRA_ENABLE_EXPO_SITE:-true}" = "false" ] && \
  [ "$is_identity_stage" != "true" ]; then
  # In CI we always auto-correct to protect shared app stacks from identity-only flags.
  if [ -n "${CODEBUILD_BUILD_ID:-}" ] || [ "${CI:-}" = "true" ]; then
    echo "WARN: INFRA_ENABLE_EXPO_SITE=false received for non-identity stage ${STACK} in CI; forcing INFRA_ENABLE_EXPO_SITE=true."
    export INFRA_ENABLE_EXPO_SITE=true
  else
    case "${INFRA_AUTO_FORCE_EXPO_SITE:-true}" in
      0 | false | FALSE | no | NO | off | OFF)
        echo "ERROR: INFRA_ENABLE_EXPO_SITE=false is only allowed on identity stack stages." >&2
        echo "ERROR: Use STACK=identity-dev or STACK=identity-prod for identity-only deployments." >&2
        echo "ERROR: Set INFRA_AUTO_FORCE_EXPO_SITE=true to auto-correct this." >&2
        exit 1
        ;;
      *)
        echo "WARN: INFRA_ENABLE_EXPO_SITE=false received for non-identity stage ${STACK}; forcing INFRA_ENABLE_EXPO_SITE=true."
        export INFRA_ENABLE_EXPO_SITE=true
        ;;
    esac
  fi
fi

if [ "$is_identity_stage" = "true" ] && \
  [ "${INFRA_IDENTITY_ENABLED:-false}" != "true" ] && \
  [ "${INFRA_ALLOW_IDENTITY_DISABLE:-false}" != "true" ]; then
  echo "ERROR: Refusing to deploy identity stack ${STACK} with INFRA_IDENTITY_ENABLED=${INFRA_IDENTITY_ENABLED:-false}." >&2
  echo "ERROR: Set INFRA_IDENTITY_ENABLED=true for identity stack deploys." >&2
  echo "ERROR: If you intentionally need a destructive identity disable, set INFRA_ALLOW_IDENTITY_DISABLE=true." >&2
  exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
  case "$STACK" in
    production)
      export DOMAIN="${DOMAIN_PRODUCTION:-${DOMAIN_ROOT:-}}"
      ;;
    dev)
      export DOMAIN="${DOMAIN_DEV:-dev.${DOMAIN_ROOT:-}}"
      ;;
    mobile)
      export DOMAIN="${DOMAIN_MOBILE:-mobile.${DOMAIN_ROOT:-}}"
      ;;
    *)
      export DOMAIN="${DOMAIN_CUSTOM:-${STACK}.${DOMAIN_ROOT:-}}"
      ;;
  esac
fi

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

normalize_identity_db_mode() {
  case "$(echo "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')" in
    ec2 | local | local-ec2) echo "ec2" ;;
    *) echo "rds" ;;
  esac
}

sanitize_secret_name() {
  local raw=${1:-}
  raw="${raw#/}"
  raw="${raw%/}"
  echo "$raw"
}

scope_secret_name() {
  local secret_name stage_name normalized
  secret_name=${1:-}
  stage_name=${2:-}
  normalized=$(sanitize_secret_name "$secret_name")

  if [ -z "$normalized" ]; then
    echo ""
    return 0
  fi

  if [[ "$normalized" == */"$stage_name" ]] || [[ "$normalized" == *-"$stage_name" ]]; then
    echo "$normalized"
    return 0
  fi

  echo "${normalized}/${stage_name}"
}

validate_identity_database_mode_transition() {
  if [ "$is_identity_stage" != "true" ]; then
    return 0
  fi

  if [ "${INFRA_IDENTITY_ENABLED:-false}" != "true" ]; then
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; skipping identity database mode safety check." >&2
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "WARN: jq not found; skipping identity database mode safety check." >&2
    return 0
  fi

  local expected_mode default_secret_name secret_name scoped_secret_name secret_json current_mode current_host
  expected_mode=$(normalize_identity_db_mode "${INFRA_IDENTITY_DATABASE_MODE:-rds}")
  default_secret_name="${INFRA_APP_NAME:-alternun-infra}/identity/database-credentials"
  secret_name=${INFRA_IDENTITY_SECRET_DB_CREDENTIALS_NAME:-$default_secret_name}
  scoped_secret_name=$(scope_secret_name "$secret_name" "$STACK")

  if [ -z "$scoped_secret_name" ]; then
    echo "WARN: Identity database mode safety check skipped because secret name is empty." >&2
    return 0
  fi

  if ! secret_json=$(aws secretsmanager get-secret-value \
    --secret-id "$scoped_secret_name" \
    --query 'SecretString' \
    --output text 2>/dev/null); then
    echo "Identity database mode safety check: no existing secret at ${scoped_secret_name}; assuming first deploy."
    return 0
  fi

  current_mode=$(printf '%s' "$secret_json" | jq -r '.mode // empty')
  if [ -z "$current_mode" ] || [ "$current_mode" = "null" ]; then
    current_host=$(printf '%s' "$secret_json" | jq -r '.host // empty')
    if [ "$current_host" = "postgres" ]; then
      current_mode="ec2"
    elif [ -n "$current_host" ] && [ "$current_host" != "null" ]; then
      current_mode="rds"
    fi
  fi

  if [ -z "$current_mode" ]; then
    echo "WARN: Could not determine existing identity database mode from ${scoped_secret_name}; continuing."
    return 0
  fi

  current_mode=$(normalize_identity_db_mode "$current_mode")
  if [ "$current_mode" = "$expected_mode" ]; then
    echo "Identity database mode safety check passed: mode=${current_mode}"
    return 0
  fi

  if is_truthy "${INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE:-false}"; then
    echo "WARN: Identity database mode change allowed by INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE=true (${current_mode} -> ${expected_mode})."
    return 0
  fi

  echo "ERROR: Refusing deploy because identity database mode would change (${current_mode} -> ${expected_mode})." >&2
  echo "ERROR: This can cause downtime/data loss. Set INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE=true only for planned migrations." >&2
  exit 1
}

remove_state_resource() {
  local target=$1

  if [ -z "$target" ]; then
    return 0
  fi

  echo "Pruning legacy managed certificate state for ${target}..."

  local remove_output
  if remove_output=$(
    printf 'y\n' | (
      cd "$INFRA_DIR" &&
        SST_TELEMETRY_DISABLED=1 npx sst state remove --stage "$STACK" "$target"
    ) 2>&1
  ); then
    echo "Removed state resource: ${target}"
    return 0
  fi

  if printf '%s' "$remove_output" | grep -q "No changes made"; then
    echo "No legacy state changes required for ${target}."
    return 0
  fi

  echo "WARN: Failed to remove state resource ${target}; continuing. Output: ${remove_output}" >&2
  return 0
}

prune_legacy_managed_certificate_state() {
  local prefixes=()

  if [ -n "${INFRA_EXPO_CERT_ARN_PRODUCTION:-}" ] && [ "$STACK" = "production" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ -n "${INFRA_EXPO_CERT_ARN_DEV:-}" ] && [ "$STACK" = "dev" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ -n "${INFRA_EXPO_CERT_ARN_MOBILE:-}" ] && [ "$STACK" = "mobile" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ "$STACK" = "dev" ]; then
    if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}" && [ -n "${INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN:-}" ]; then
      prefixes+=("airs-domain-redirect-${STACK}CdnSsl")
    fi

    if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}" && [ -n "${INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN:-}" ]; then
      prefixes+=("dev-domain-redirect-${STACK}CdnSsl")
    fi

    if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}" && [ -n "${INFRA_REDIRECT_ROOT_CERT_ARN:-}" ]; then
      prefixes+=("root-domain-redirect-${STACK}CdnSsl")
    fi
  fi

  if [ "${#prefixes[@]}" -eq 0 ]; then
    return 0
  fi

  local prefix
  for prefix in "${prefixes[@]}"; do
    remove_state_resource "$prefix"
  done
}

remove_cloudfront_alias() {
  local alias_domain=$1

  if [ -z "$alias_domain" ]; then
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; cannot clean CloudFront alias ${alias_domain}." >&2
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "WARN: jq not found; cannot clean CloudFront alias ${alias_domain}." >&2
    return 0
  fi

  local dist_ids
  dist_ids=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null && contains(Aliases.Items, '${alias_domain}')].Id" --output text 2>/dev/null || true)

  if [ -z "$dist_ids" ] || [ "$dist_ids" = "None" ]; then
    echo "No existing CloudFront distribution found for alias ${alias_domain}."
    return 0
  fi

  for dist_id in $dist_ids; do
    echo "Removing alias ${alias_domain} from CloudFront distribution ${dist_id}..."
    local cfg_json cfg_mod etag
    cfg_json=$(mktemp)
    cfg_mod=$(mktemp)

    if ! aws cloudfront get-distribution-config --id "$dist_id" --output json > "$cfg_json" 2>/dev/null; then
      echo "WARN: Failed to fetch CloudFront config for distribution ${dist_id}." >&2
      rm -f "$cfg_json" "$cfg_mod"
      continue
    fi

    etag=$(jq -r '.ETag // empty' "$cfg_json")
    if [ -z "$etag" ]; then
      echo "WARN: Missing ETag for distribution ${dist_id}; skipping alias cleanup." >&2
      rm -f "$cfg_json" "$cfg_mod"
      continue
    fi

    jq --arg alias "$alias_domain" '
      .DistributionConfig
      | .Aliases.Items = ((.Aliases.Items // []) | map(select(. != $alias)))
      | .Aliases.Quantity = (.Aliases.Items | length)
      | if .Aliases.Quantity == 0 then
          .ViewerCertificate = { "CloudFrontDefaultCertificate": true }
        else
          .
        end
    ' "$cfg_json" > "$cfg_mod"

    if aws cloudfront update-distribution --id "$dist_id" --if-match "$etag" --distribution-config "file://${cfg_mod}" >/dev/null 2>&1; then
      echo "Removed alias ${alias_domain} from distribution ${dist_id}."
    else
      echo "WARN: Failed to remove alias ${alias_domain} from distribution ${dist_id}." >&2
    fi

    rm -f "$cfg_json" "$cfg_mod"
  done
}

cleanup_deploy_aliases() {
  if ! is_truthy "${APPROVE:-false}"; then
    return 0
  fi

  local aliases=()
  aliases+=("${DOMAIN}")

  if [ "$STACK" = "dev" ]; then
    if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}"; then
      aliases+=("${INFRA_REDIRECT_AIRS_TO_DEV_SOURCE:-${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}}")
    fi

    if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}"; then
      aliases+=("${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-}")
    fi

    if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}"; then
      aliases+=("${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}")
    fi
  fi

  declare -A seen=()
  local alias_domain
  for alias_domain in "${aliases[@]}"; do
    if [ -z "$alias_domain" ] || [ -n "${seen[$alias_domain]:-}" ]; then
      continue
    fi
    seen[$alias_domain]=1
    remove_cloudfront_alias "$alias_domain"
  done
}

bash "$SCRIPT_DIR/validate-deploy-context.sh" "$STACK"

if [ "${RUN_PREDEPLOY_CHECKS:-true}" != "false" ]; then
  SKIP_CONTEXT_VALIDATION=true bash "$SCRIPT_DIR/predeploy-checks.sh" "$STACK"
fi

validate_identity_database_mode_transition

if is_truthy "${INFRA_ENABLE_ALIAS_CLEANUP:-false}"; then
  cleanup_deploy_aliases
else
  echo "Skipping CloudFront alias cleanup (INFRA_ENABLE_ALIAS_CLEANUP=${INFRA_ENABLE_ALIAS_CLEANUP:-false})"
fi

prune_legacy_managed_certificate_state

echo "Using SST stack/stage: ${STACK} (cwd: ${INFRA_DIR})"

if is_truthy "${INFRA_ENABLE_SST_DIFF:-false}"; then
  echo "Running SST diff (preview of infra changes)"
  (cd "$INFRA_DIR" && SST_TELEMETRY_DISABLED=1 npx sst diff --stage "$STACK") || true
else
  echo "Skipping sst diff (INFRA_ENABLE_SST_DIFF=${INFRA_ENABLE_SST_DIFF:-false})"
fi

if ! is_truthy "${APPROVE:-false}"; then
  echo "Preview completed. Re-run with APPROVE=true to apply changes."
  exit 0
fi

echo "APPROVE=true detected — running sst deploy"
echo "Attempting to clear any stale SST lock for stage ${STACK} (no-op if none)"
(cd "$INFRA_DIR" && SST_TELEMETRY_DISABLED=1 npx sst unlock --stage "$STACK") || true

run_sst_deploy() {
  local log_file=$1
  local exit_code=0

  set +e
  (
    cd "$INFRA_DIR"
    env SST_TELEMETRY_DISABLED=1 npx sst deploy --stage "$STACK" --yes
  ) 2>&1 | tee "$log_file"
  exit_code=${PIPESTATUS[0]}
  set -e

  return "$exit_code"
}

should_attempt_bucket_drift_recovery() {
  local log_file=$1

  if ! is_truthy "${INFRA_ENABLE_BUCKET_DRIFT_RECOVERY:-true}"; then
    return 1
  fi

  if [ "${INFRA_ENABLE_EXPO_SITE:-true}" != "true" ]; then
    return 1
  fi

  if grep -q "NoSuchBucket" "$log_file"; then
    return 0
  fi

  if grep -q "The specified bucket does not exist" "$log_file"; then
    return 0
  fi

  return 1
}

DEPLOY_LOG=$(mktemp)
echo "Running sst deploy"
if run_sst_deploy "$DEPLOY_LOG"; then
  rm -f "$DEPLOY_LOG"
  exit 0
fi

if should_attempt_bucket_drift_recovery "$DEPLOY_LOG"; then
  echo "Detected missing S3 bucket during deploy. Running sst refresh once before retry..."
  (
    cd "$INFRA_DIR"
    env SST_TELEMETRY_DISABLED=1 npx sst refresh --stage "$STACK"
  )

  echo "Retrying sst deploy after refresh"
  if run_sst_deploy "$DEPLOY_LOG"; then
    rm -f "$DEPLOY_LOG"
    exit 0
  fi
fi

echo "sst deploy failed. See logs above." >&2
rm -f "$DEPLOY_LOG"
exit 1
