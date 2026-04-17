#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STAGE=${1:-${SST_STAGE:-dev}}

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

declare -a REACHABILITY_CHECK_PIDS=()
declare -A REACHABILITY_CHECK_LOGS=()

normalize_url() {
  local value=$1
  if [[ "$value" =~ ^https?:// ]]; then
    echo "$value"
  else
    echo "https://${value}"
  fi
}

extract_host() {
  local url=$1
  echo "$url" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#'
}

is_2xx_3xx() {
  local code=$1
  [[ "$code" =~ ^[0-9]{3}$ ]] && [ "$code" -ge 200 ] && [ "$code" -lt 400 ]
}

host_matches() {
  local expected=$1
  local actual=$2

  if [ "$actual" = "$expected" ] || [ "$actual" = "www.${expected}" ]; then
    return 0
  fi

  return 1
}

resolve_stage_domain() {
  case "$STAGE" in
    production) echo "${DOMAIN_PRODUCTION:-${DOMAIN_ROOT:-}}" ;;
    dev) echo "${DOMAIN_DEV:-dev.${DOMAIN_ROOT:-}}" ;;
    mobile) echo "${DOMAIN_MOBILE:-mobile.${DOMAIN_ROOT:-}}" ;;
    *) echo "${DOMAIN_CUSTOM:-${STAGE}.${DOMAIN_ROOT:-}}" ;;
  esac
}

curl_probe() {
  local url=$1
  curl -sS -L \
    --max-redirs 10 \
    --connect-timeout "${INFRA_REACHABILITY_CONNECT_TIMEOUT_SECONDS:-5}" \
    --max-time "${INFRA_REACHABILITY_REQUEST_TIMEOUT_SECONDS:-20}" \
    -o /dev/null \
    -w "%{http_code} %{url_effective}" \
    "$url" 2>/dev/null || true
}

poll_reachable() {
  local label=$1
  local url=$2
  local attempts=${INFRA_REACHABILITY_ATTEMPTS:-18}
  local interval=${INFRA_REACHABILITY_INTERVAL_SECONDS:-10}
  local i result code effective

  for i in $(seq 1 "$attempts"); do
    result=$(curl_probe "$url")
    code=${result%% *}
    effective=${result#* }

    if is_2xx_3xx "$code"; then
      echo "Reachability OK: ${label} -> code=${code} effective=${effective}"
      return 0
    fi

    echo "Reachability pending (${i}/${attempts}): ${label} -> code=${code:-n/a}"
    sleep "$interval"
  done

  echo "ERROR: Reachability check failed for ${label} (${url}) after ${attempts} attempts." >&2
  return 1
}

poll_redirect_target() {
  local label=$1
  local source_url=$2
  local expected_host=$3
  local attempts=${INFRA_REACHABILITY_ATTEMPTS:-18}
  local interval=${INFRA_REACHABILITY_INTERVAL_SECONDS:-10}
  local i result code effective actual_host

  for i in $(seq 1 "$attempts"); do
    result=$(curl_probe "$source_url")
    code=${result%% *}
    effective=${result#* }
    actual_host=$(extract_host "$effective")

    if is_2xx_3xx "$code" && host_matches "$expected_host" "$actual_host"; then
      echo "Redirect OK: ${label} -> ${actual_host} (expected ${expected_host}) code=${code}"
      return 0
    fi

    echo "Redirect pending (${i}/${attempts}): ${label} -> actual=${actual_host:-n/a} expected=${expected_host} code=${code:-n/a}"
    sleep "$interval"
  done

  echo "ERROR: Redirect check failed for ${label}; expected host ${expected_host}." >&2
  return 1
}

launch_reachability_check() {
  local label=$1
  shift
  local log_file pid

  log_file=$(mktemp)
  echo "Queued reachability check: ${label}" >&2

  (
    "$@"
  ) >"$log_file" 2>&1 &
  pid=$!

  REACHABILITY_CHECK_PIDS+=("$pid")
  REACHABILITY_CHECK_LOGS["$pid"]="$log_file"
}

run_reachability_checks_in_parallel() {
  local stage_domain=$1
  local stage_url=$2
  local failed=0
  local pid log_file

  REACHABILITY_CHECK_PIDS=()
  REACHABILITY_CHECK_LOGS=()

  launch_reachability_check "primary:${stage_domain}" poll_reachable "primary:${stage_domain}" "$stage_url"

  if [ "$STAGE" = "dev" ]; then
    if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}"; then
      local airs_source
      airs_source=${INFRA_REDIRECT_AIRS_TO_DEV_SOURCE:-${DOMAIN_PRODUCTION:-}}
      if [ -n "$airs_source" ] && [ "$airs_source" != "$stage_domain" ]; then
        launch_reachability_check "airs->testnet" poll_redirect_target "airs->testnet" "$(normalize_url "$airs_source")" "$stage_domain"
      fi
    fi

    if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}"; then
      local dev_sources_raw dev_source dev_sources
      dev_sources_raw=${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES:-${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-}}
      if [ -z "$dev_sources_raw" ]; then
        local dev_source_primary dev_source_demo dev_source_beta
        dev_source_primary=${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-${DOMAIN_DEV:-}}
        if [ -n "$dev_source_primary" ]; then
          dev_source_demo=${dev_source_primary/#dev./demo.}
          dev_source_beta=${dev_source_primary/#dev./beta.}
          dev_sources_raw="${dev_source_primary},${dev_source_demo},${dev_source_beta}"
        fi
      fi
      if [ -n "$dev_sources_raw" ]; then
        IFS=',' read -r -a dev_sources <<< "$dev_sources_raw"
        for dev_source in "${dev_sources[@]}"; do
          dev_source=$(printf '%s' "$dev_source" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^https\?://##' -e 's#/*$##')
          if [ -n "$dev_source" ] && [ "$dev_source" != "$stage_domain" ]; then
            launch_reachability_check "dev->testnet:${dev_source}" poll_redirect_target "dev->testnet" "$(normalize_url "$dev_source")" "$stage_domain"
          fi
        done
      fi
    fi

    if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}"; then
      local root_source root_target root_target_host
      root_source=${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}
      root_target=${INFRA_REDIRECT_ROOT_TARGET:-}
      if [ -n "$root_source" ] && [ -n "$root_target" ]; then
        root_target_host=$(extract_host "$(normalize_url "$root_target")")
        launch_reachability_check "root->target" poll_redirect_target "root->target" "$(normalize_url "$root_source")" "$root_target_host"
      fi
    fi
  fi

  if [ "${#REACHABILITY_CHECK_PIDS[@]}" -eq 0 ]; then
    return 0
  fi

  for pid in "${REACHABILITY_CHECK_PIDS[@]}"; do
    log_file=${REACHABILITY_CHECK_LOGS[$pid]-}
    if ! wait "$pid"; then
      failed=1
    fi
    cat "$log_file"
    rm -f "$log_file"
  done

  return "$failed"
}

main() {
  local stage_domain stage_url
  stage_domain=$(resolve_stage_domain)
  stage_url=$(normalize_url "$stage_domain")

  echo "Post-deploy reachability check: stage=${STAGE} primary=${stage_url}"
  if ! run_reachability_checks_in_parallel "$stage_domain" "$stage_url"; then
    return 1
  fi

  echo "Post-deploy reachability checks passed for stage ${STAGE}."
}

main "$@"
