#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
INFRA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_pipeline-safety.sh"

STACK=${STACK:-${1:-${SST_STAGE:-production}}}
export STACK
export SST_STAGE="${SST_STAGE:-$STACK}"

stage_normalized=$(echo "$STACK" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
is_identity_stage=false
is_dedicated_non_expo_stage=false
if [ "$stage_normalized" = "identity-dev" ] || \
  [ "$stage_normalized" = "identity-prod" ] || \
  [ "$stage_normalized" = "identity-production" ] || \
  [ "$stage_normalized" = "auth-dev" ] || \
  [ "$stage_normalized" = "auth-prod" ] || \
  [ "$stage_normalized" = "authentik-dev" ] || \
  [ "$stage_normalized" = "authentik-prod" ]; then
  is_identity_stage=true
fi

case "$stage_normalized" in
  identity-dev|identity-prod|identity-production|auth-dev|auth-prod|authentik-dev|authentik-prod|api-dev|api-prod|api-production|backend-dev|backend-prod|backend-api-dev|backend-api-prod|admin-dev|admin-prod|admin-production|backoffice-dev|backoffice-prod|backoffice-admin-dev|backoffice-admin-prod|dashboard-dev|dashboard-prod|dashboard-production)
    is_dedicated_non_expo_stage=true
    ;;
esac

if [ "${INFRA_ENABLE_EXPO_SITE:-true}" = "false" ] && \
  [ "$is_dedicated_non_expo_stage" != "true" ]; then
  # In CI we always auto-correct to protect shared app stacks from identity-only flags.
  if [ -n "${CODEBUILD_BUILD_ID:-}" ] || [ "${CI:-}" = "true" ]; then
    echo "WARN: INFRA_ENABLE_EXPO_SITE=false received for non-dedicated stage ${STACK} in CI; forcing INFRA_ENABLE_EXPO_SITE=true."
    export INFRA_ENABLE_EXPO_SITE=true
  else
    case "${INFRA_AUTO_FORCE_EXPO_SITE:-true}" in
      0 | false | FALSE | no | NO | off | OFF)
        echo "ERROR: INFRA_ENABLE_EXPO_SITE=false is only allowed on dedicated non-Expo stack stages." >&2
        echo "ERROR: Use STACK=identity-dev, STACK=identity-prod, STACK=api-dev, STACK=api-prod, STACK=admin-dev, STACK=admin-prod, STACK=dashboard-dev, or STACK=dashboard-prod." >&2
        echo "ERROR: Set INFRA_AUTO_FORCE_EXPO_SITE=true to auto-correct this." >&2
        exit 1
        ;;
      *)
        echo "WARN: INFRA_ENABLE_EXPO_SITE=false received for non-dedicated stage ${STACK}; forcing INFRA_ENABLE_EXPO_SITE=true."
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

enforce_component_enabled_for_stack() {
  local var_name=$1
  local stack_label=$2
  local component_label=$3

  if [ "${!var_name+x}" != "x" ] || [ -z "${!var_name}" ]; then
    export "${var_name}=true"
    echo "INFO: ${stack_label} stack detected; defaulting ${var_name}=true for ${component_label}."
    return 0
  fi

  if ! is_truthy "${!var_name}"; then
    echo "ERROR: Refusing to deploy ${stack_label} with ${var_name}=${!var_name}." >&2
    echo "ERROR: ${stack_label} stacks own ${component_label} resources and would otherwise remove them." >&2
    echo "ERROR: Set ${var_name}=true for this deploy." >&2
    exit 1
  fi
}

enforce_dedicated_stack_component_flags() {
  case "$stage_normalized" in
    dashboard-dev|dashboard-prod|dashboard-production)
      enforce_component_enabled_for_stack "INFRA_ENABLE_ADMIN_SITE" "$STACK" "admin site"
      enforce_component_enabled_for_stack "INFRA_ENABLE_BACKEND_API" "$STACK" "backend API"
      ;;
    admin-dev|admin-prod|admin-production|backoffice-dev|backoffice-prod|backoffice-admin-dev|backoffice-admin-prod)
      enforce_component_enabled_for_stack "INFRA_ENABLE_ADMIN_SITE" "$STACK" "admin site"
      ;;
    api-dev|api-prod|api-production|backend-dev|backend-prod|backend-api-dev|backend-api-prod)
      enforce_component_enabled_for_stack "INFRA_ENABLE_BACKEND_API" "$STACK" "backend API"
      ;;
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

sanitize_bucket_name() {
  local raw=${1:-}
  printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]+/-/g; s/-+/-/g; s/^-+//; s/-+$//'
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

ensure_route53_hosted_zone_env() {
  if ! is_truthy "${INFRA_REQUIRE_ROUTE53:-true}"; then
    return 0
  fi

  if [ -n "${INFRA_ROUTE53_HOSTED_ZONE_ID:-}" ]; then
    export INFRA_ROUTE53_HOSTED_ZONE_ID="${INFRA_ROUTE53_HOSTED_ZONE_ID#/hostedzone/}"
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; unable to resolve INFRA_ROUTE53_HOSTED_ZONE_ID automatically." >&2
    return 0
  fi

  local root_domain resolved_zone_id
  root_domain="${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}"

  if [ -z "$root_domain" ]; then
    return 0
  fi

  resolved_zone_id=$(aws route53 list-hosted-zones-by-name \
    --dns-name "$root_domain" \
    --max-items 1 \
    --query 'HostedZones[0].Id' \
    --output text 2>/dev/null || true)

  if [ -z "$resolved_zone_id" ] || [ "$resolved_zone_id" = "None" ]; then
    return 0
  fi

  export INFRA_ROUTE53_HOSTED_ZONE_ID="${resolved_zone_id#/hostedzone/}"
  echo "Resolved INFRA_ROUTE53_HOSTED_ZONE_ID=${INFRA_ROUTE53_HOSTED_ZONE_ID} for deploy."
}

enforce_dedicated_stack_component_flags

bash "$SCRIPT_DIR/validate-deploy-context.sh" "$STACK"
ensure_route53_hosted_zone_env

if [ "${RUN_PREDEPLOY_CHECKS:-true}" != "false" ]; then
  SKIP_CONTEXT_VALIDATION=true bash "$SCRIPT_DIR/predeploy-checks.sh" "$STACK"
fi

validate_identity_database_mode_transition

selected_pipeline_csv=$(resolve_selected_pipeline_csv)
assert_pipeline_reconciliation_safe "$selected_pipeline_csv" "$STACK"

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

gzip_base64_file() {
  local path=$1
  gzip -c "$path" | base64 | tr -d '\n'
}

resolve_identity_instance_id() {
  if [ "$is_identity_stage" != "true" ]; then
    return 1
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: aws CLI is required to sync identity runtime templates." >&2
    return 1
  fi

  local instance_id instance_state attempt max_attempts
  max_attempts=60

  for attempt in $(seq 1 "$max_attempts"); do
    instance_id=$(
      aws ec2 describe-instances \
        --filters \
          "Name=tag:Application,Values=${INFRA_APP_NAME:-alternun-infra}" \
          "Name=tag:Component,Values=identity" \
          "Name=tag:Stage,Values=${STACK}" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text 2>/dev/null | awk 'NF { print $1; exit }'
    )

    if [ -n "$instance_id" ] && [ "$instance_id" != "None" ]; then
      instance_state=$(
        aws ec2 describe-instances \
          --instance-ids "$instance_id" \
          --query 'Reservations[0].Instances[0].State.Name' \
          --output text 2>/dev/null
      )

      if [ "$instance_state" = "running" ]; then
        echo "$instance_id"
        return 0
      fi

      echo "Waiting for identity instance ${instance_id} to enter running state (current=${instance_state}, attempt ${attempt}/${max_attempts})..."
    else
      echo "Waiting for identity instance tagged with Stage=${STACK} to appear (attempt ${attempt}/${max_attempts})..."
    fi

    sleep 5
  done

  if [ -n "${instance_id:-}" ] && [ "$instance_id" != "None" ]; then
    echo "ERROR: Identity instance ${instance_id} did not reach running state for stage ${STACK}." >&2
  else
    echo "ERROR: Could not resolve identity instance for stage ${STACK}." >&2
  fi
  return 1
}

sync_identity_runtime_templates() {
  if [ "$is_identity_stage" != "true" ]; then
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required to sync identity runtime templates." >&2
    return 1
  fi

  local instance_id deploy_b64 bootstrap_b64 ec2_compose_b64 rds_compose_b64 ec2_alb_compose_b64 rds_alb_compose_b64 identity_domain identity_ingress_mode identity_tls_mode identity_acme_email identity_route53_zone_id identity_acme_backup_bucket identity_acme_backup_prefix identity_root_domain identity_app_name identity_authentik_image_tag identity_database_mode params_json command_id
  instance_id=$(resolve_identity_instance_id)

  case "$stage_normalized" in
    identity-prod|identity-production|auth-prod|authentik-prod)
      identity_domain="${INFRA_IDENTITY_DOMAIN_PRODUCTION:-sso.${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-alternun.co}}}"
      identity_ingress_mode="${INFRA_IDENTITY_INGRESS_MODE_PRODUCTION:-alb}"
      identity_tls_mode="${INFRA_IDENTITY_TLS_MODE_PRODUCTION:-alb-acm}"
      ;;
    identity-mobile|auth-mobile|authentik-mobile)
      identity_domain="${INFRA_IDENTITY_DOMAIN_MOBILE:-preview.sso.${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-alternun.co}}}"
      identity_ingress_mode="${INFRA_IDENTITY_INGRESS_MODE_MOBILE:-instance}"
      identity_tls_mode="${INFRA_IDENTITY_TLS_MODE_MOBILE:-acme-route53-dns-01}"
      ;;
    *)
      identity_domain="${INFRA_IDENTITY_DOMAIN_DEV:-testnet.sso.${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-alternun.co}}}"
      identity_ingress_mode="${INFRA_IDENTITY_INGRESS_MODE_DEV:-instance}"
      identity_tls_mode="${INFRA_IDENTITY_TLS_MODE_DEV:-acme-route53-dns-01}"
      ;;
  esac

  identity_app_name="${INFRA_APP_NAME:-alternun-infra}"
  identity_root_domain="${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-alternun.co}}"
  identity_authentik_image_tag="${INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG:-2026.2}"
  identity_database_mode="${INFRA_IDENTITY_DATABASE_MODE:-rds}"
  identity_acme_email="${INFRA_IDENTITY_TLS_ACME_EMAIL:-identity-admin@${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-alternun.co}}}"
  identity_route53_zone_id="${INFRA_IDENTITY_TLS_ROUTE53_HOSTED_ZONE_ID:-${INFRA_ROUTE53_HOSTED_ZONE_ID:-}}"
  identity_acme_backup_prefix="${INFRA_IDENTITY_TLS_ACME_BACKUP_PREFIX:-state}"
  if [ "$identity_tls_mode" = "alb-acm" ] || ! is_truthy "${INFRA_IDENTITY_TLS_ACME_BACKUP_ENABLED:-true}"; then
    identity_acme_backup_bucket=""
  else
    identity_acme_backup_bucket=$(sanitize_bucket_name "${identity_app_name}-${STACK}-identity-acme-${INFRA_AWS_ACCOUNT_ID:-}")
  fi

  deploy_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/deploy-authentik.sh")
  bootstrap_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/bootstrap-authentik-integrations.py")
  ec2_compose_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/docker-compose.ec2.yml")
  rds_compose_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/docker-compose.rds.yml")
  ec2_alb_compose_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/docker-compose.ec2.alb.yml")
  rds_alb_compose_b64=$(gzip_base64_file "$INFRA_DIR/scripts/templates/docker-compose.rds.alb.yml")

  params_json=$(
    jq -nc \
      --arg c1 'set -euo pipefail' \
      --arg c2 'install -d -o ec2-user -g ec2-user /opt/alternun/identity /opt/alternun/identity/templates /opt/alternun/identity/authentik/custom-templates' \
      --arg c3 "tmp_env=\$(mktemp); grep -vE '^(ALTERNUN_APP_NAME|ALTERNUN_ROOT_DOMAIN|ALTERNUN_STAGE|ALTERNUN_IDENTITY_DOMAIN|ALTERNUN_IDENTITY_INGRESS_MODE|ALTERNUN_IDENTITY_TLS_MODE|ALTERNUN_IDENTITY_TLS_ACME_EMAIL|ALTERNUN_ROUTE53_HOSTED_ZONE_ID|ALTERNUN_IDENTITY_ACME_BACKUP_BUCKET|ALTERNUN_IDENTITY_ACME_BACKUP_PREFIX|AUTHENTIK_IMAGE_TAG|AUTHENTIK_DATABASE_MODE)=' /etc/alternun-identity.env > \"\$tmp_env\" || true; printf '%s\n' 'ALTERNUN_APP_NAME=$identity_app_name' 'ALTERNUN_ROOT_DOMAIN=$identity_root_domain' 'ALTERNUN_STAGE=$STACK' 'ALTERNUN_IDENTITY_DOMAIN=$identity_domain' 'ALTERNUN_IDENTITY_INGRESS_MODE=$identity_ingress_mode' 'ALTERNUN_IDENTITY_TLS_MODE=$identity_tls_mode' 'ALTERNUN_IDENTITY_TLS_ACME_EMAIL=$identity_acme_email' 'ALTERNUN_ROUTE53_HOSTED_ZONE_ID=$identity_route53_zone_id' 'ALTERNUN_IDENTITY_ACME_BACKUP_BUCKET=$identity_acme_backup_bucket' 'ALTERNUN_IDENTITY_ACME_BACKUP_PREFIX=$identity_acme_backup_prefix' 'AUTHENTIK_IMAGE_TAG=$identity_authentik_image_tag' 'AUTHENTIK_DATABASE_MODE=$identity_database_mode' >> \"\$tmp_env\"; install -m 600 \"\$tmp_env\" /etc/alternun-identity.env; rm -f \"\$tmp_env\"" \
      --arg c4 "printf '%s' '$deploy_b64' | base64 -d | gzip -d > /opt/alternun/identity/deploy-authentik.sh" \
      --arg c5 "printf '%s' '$bootstrap_b64' | base64 -d | gzip -d > /opt/alternun/identity/templates/bootstrap-authentik-integrations.py" \
      --arg c6 "printf '%s' '$bootstrap_b64' | base64 -d | gzip -d > /opt/alternun/identity/authentik/custom-templates/alternun-bootstrap-integrations.py" \
      --arg c7 "printf '%s' '$ec2_compose_b64' | base64 -d | gzip -d > /opt/alternun/identity/templates/docker-compose.ec2.yml" \
      --arg c8 "printf '%s' '$rds_compose_b64' | base64 -d | gzip -d > /opt/alternun/identity/templates/docker-compose.rds.yml" \
      --arg c9 "printf '%s' '$ec2_alb_compose_b64' | base64 -d | gzip -d > /opt/alternun/identity/templates/docker-compose.ec2.alb.yml" \
      --arg c10 "printf '%s' '$rds_alb_compose_b64' | base64 -d | gzip -d > /opt/alternun/identity/templates/docker-compose.rds.alb.yml" \
      --arg c11 'chmod 0755 /opt/alternun/identity/deploy-authentik.sh' \
      --arg c12 'chmod 0644 /opt/alternun/identity/templates/docker-compose.ec2.yml /opt/alternun/identity/templates/docker-compose.rds.yml /opt/alternun/identity/templates/docker-compose.ec2.alb.yml /opt/alternun/identity/templates/docker-compose.rds.alb.yml /opt/alternun/identity/templates/bootstrap-authentik-integrations.py /opt/alternun/identity/authentik/custom-templates/alternun-bootstrap-integrations.py' \
      --arg c13 'chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.ec2.yml /opt/alternun/identity/templates/docker-compose.rds.yml /opt/alternun/identity/templates/docker-compose.ec2.alb.yml /opt/alternun/identity/templates/docker-compose.rds.alb.yml /opt/alternun/identity/templates/bootstrap-authentik-integrations.py /opt/alternun/identity/authentik/custom-templates/alternun-bootstrap-integrations.py' \
      --arg c14 'timeout 900 bash /opt/alternun/identity/deploy-authentik.sh > /tmp/alternun-identity-runtime-sync.log 2>&1 || { cat /tmp/alternun-identity-runtime-sync.log; exit 1; }' \
      --arg c15 "grep -E 'Authentik integration bootstrap|Supabase auth OIDC synced|TLS certificate ready|Restored ACME state|WARN:' /tmp/alternun-identity-runtime-sync.log || true" \
      --arg c16 "set -a; . /etc/alternun-identity.env; set +a; docker compose -f /opt/alternun/identity/docker-compose.yml exec -T server sh -lc '/ak-root/.venv/bin/python /manage.py shell -c \"from django.contrib.auth import get_user_model; from authentik.core.models import Application; from authentik.providers.oauth2.models import OAuth2Provider; U=get_user_model(); admin_exists=U.objects.filter(username=\\\"akadmin\\\", is_active=True).exists(); default_app_exists=Application.objects.filter(slug=\\\"alternun-internal\\\").exists(); admin_oidc_app=Application.objects.filter(slug=\\\"alternun-admin\\\").exists(); admin_oidc_provider=OAuth2Provider.objects.filter(name=\\\"Alternun Admin OIDC\\\").exists(); print({\\\"admin_exists\\\": admin_exists, \\\"default_application_exists\\\": default_app_exists, \\\"admin_oidc_application_exists\\\": admin_oidc_app, \\\"admin_oidc_provider_exists\\\": admin_oidc_provider}); raise SystemExit(0 if admin_exists and default_app_exists and admin_oidc_app and admin_oidc_provider else 1)\"'" \
      '{commands:[$c1,$c2,$c3,$c4,$c5,$c6,$c7,$c8,$c9,$c10,$c11,$c12,$c13,$c14,$c15,$c16]}'
  )

  echo "Syncing identity runtime templates to instance ${instance_id}..."
  local send_attempt=1 max_send_attempts=30 send_output send_status
  while [ "$send_attempt" -le "$max_send_attempts" ]; do
    set +e
    send_output=$(
      aws ssm send-command \
        --region "${AWS_REGION:-us-east-1}" \
        --instance-ids "$instance_id" \
        --document-name AWS-RunShellScript \
        --comment "Sync Alternun identity runtime templates" \
        --parameters "$params_json" \
        --query 'Command.CommandId' \
        --output text 2>&1
    )
    send_status=$?
    set -e

    if [ "$send_status" -eq 0 ] && [ -n "$send_output" ] && [ "$send_output" != "None" ]; then
      command_id="$send_output"
      break
    fi

    if printf '%s' "$send_output" | grep -q 'InvalidInstanceId'; then
      echo "Waiting for SSM readiness on identity instance ${instance_id} (attempt ${send_attempt}/${max_send_attempts})..."
      sleep 10
      send_attempt=$((send_attempt + 1))
      continue
    fi

    echo "$send_output"
    echo "ERROR: Unable to dispatch identity runtime sync command." >&2
    return 1
  done

  if [ -z "${command_id:-}" ] || [ "$command_id" = "None" ]; then
    echo "ERROR: Timed out waiting to dispatch identity runtime sync command to instance ${instance_id}." >&2
    return 1
  fi

  local sync_status="" poll_attempt=1 max_poll_attempts=180 invocation_json
  while [ "$poll_attempt" -le "$max_poll_attempts" ]; do
    invocation_json=$(
      aws ssm get-command-invocation \
        --region "${AWS_REGION:-us-east-1}" \
        --command-id "$command_id" \
        --instance-id "$instance_id" \
        --query '{Status:Status,StatusDetails:StatusDetails,ResponseCode:ResponseCode,StandardOutputContent:StandardOutputContent,StandardErrorContent:StandardErrorContent}' \
        --output json
    )

    sync_status=$(printf '%s' "$invocation_json" | jq -r '.Status')
    case "$sync_status" in
      Pending | InProgress | Delayed)
        sleep 5
        poll_attempt=$((poll_attempt + 1))
        ;;
      *)
        break
        ;;
    esac
  done

  if [ "$sync_status" = "Pending" ] || [ "$sync_status" = "InProgress" ] || [ "$sync_status" = "Delayed" ]; then
    echo "$invocation_json"
    echo "ERROR: Identity runtime sync timed out waiting for command ${command_id}." >&2
    return 1
  fi

  sync_status=$(printf '%s' "$invocation_json" | jq -r '.Status')
  if [ "$sync_status" != "Success" ]; then
    echo "$invocation_json"
    echo "ERROR: Identity runtime sync failed." >&2
    return 1
  fi

  echo "$invocation_json"
  return 0
}

DEPLOY_LOG=$(mktemp)
echo "Running sst deploy"
if run_sst_deploy "$DEPLOY_LOG"; then
  sync_identity_runtime_templates
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
    sync_identity_runtime_templates
    rm -f "$DEPLOY_LOG"
    exit 0
  fi
fi

echo "sst deploy failed. See logs above." >&2
rm -f "$DEPLOY_LOG"
exit 1
