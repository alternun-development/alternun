#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STAGE=${1:-${SST_STAGE:-dev}}
REGION=${2:-us-east-1}

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

normalize_domain() {
  local value=${1:-}
  value=${value#https://}
  value=${value#http://}
  value=${value%/}
  value=${value%/}
  echo "$value"
}

find_hosted_zone() {
  local domain=$1
  local clean=${domain%.}
  local labels
  local i candidate hz

  IFS='.' read -r -a labels <<< "$clean"

  if [ "${#labels[@]}" -lt 2 ]; then
    return 1
  fi

  for ((i = 0; i <= ${#labels[@]} - 2; i++)); do
    candidate=$(IFS='.'; echo "${labels[*]:i}")
    hz=$(aws route53 list-hosted-zones-by-name \
      --dns-name "$candidate" \
      --query "HostedZones[?Name=='${candidate}.']|[0].Id" \
      --output text 2>/dev/null || true)
    if [ -n "$hz" ] && [ "$hz" != "None" ]; then
      hz=${hz##*/}
      echo "${hz}|${candidate}"
      return 0
    fi
  done

  return 1
}

discover_distribution_for_alias() {
  local alias=$1
  local attempts=${POLL_TIMEOUT:-600}
  local interval=${POLL_INTERVAL:-15}
  local deadline=$((SECONDS + attempts))
  local dist_row dist_id dist_domain dist_status
  local normalized_alias

  normalized_alias=$(normalize_domain "$alias" | tr '[:upper:]' '[:lower:]')

  while [ $SECONDS -le $deadline ]; do
    dist_row=$(
      aws cloudfront list-distributions --output json 2>/dev/null | jq -r --arg alias "$normalized_alias" '
        .DistributionList.Items[]?
        | select((.Aliases.Items // []) | index($alias))
        | [.Id, .DomainName, .Status] | @tsv
      ' | head -n1
    )

    if [ -n "$dist_row" ]; then
      IFS=$'\t' read -r dist_id dist_domain dist_status <<<"$dist_row"
      if [ -n "$dist_id" ] && [ "$dist_status" = "Deployed" ]; then
        echo "${dist_id}|${dist_domain}"
        return 0
      fi
    fi

    sleep "$interval"
  done

  return 1
}

upsert_route53_alias() {
  local alias_host=$1
  local distribution_domain=$2
  local zone_info zone_id zone_name change_batch

  alias_host=$(normalize_domain "$alias_host")
  zone_info=$(find_hosted_zone "$alias_host" || true)
  if [ -z "$zone_info" ]; then
    echo "WARN: Skipping DNS sync for ${alias_host}; no hosted zone found." >&2
    return 0
  fi

  zone_id=${zone_info%%|*}
  zone_name=${zone_info##*|}
  if [ "$zone_name" != "$alias_host" ]; then
    echo "Using hosted zone ${zone_name} for ${alias_host}" >&2
  fi

  change_batch=$(mktemp)
  cat >"$change_batch" <<EOF
{
  "Comment": "UPSERT ${alias_host} -> ${distribution_domain}",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${alias_host}.",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "${distribution_domain}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${alias_host}.",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "${distribution_domain}",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

  echo "Submitting Route53 alias sync for ${alias_host} -> ${distribution_domain}" >&2
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$zone_id" \
    --change-batch "file://${change_batch}" \
    >/dev/null
  rm -f "$change_batch"
}

sync_alias_group() {
  local label=$1
  local discovery_alias=$2
  shift 2
  local -a alias_hosts=("$@")
  local dist_info dist_domain

  if [ "${#alias_hosts[@]}" -eq 0 ]; then
    return 0
  fi

  if ! dist_info=$(discover_distribution_for_alias "$discovery_alias"); then
    echo "WARN: No deployed CloudFront distribution found for ${label} (${discovery_alias}); skipping DNS sync for ${alias_hosts[*]}." >&2
    return 0
  fi

  dist_domain=${dist_info#*|}
  echo "DNS sync: ${label} -> ${dist_domain} for ${alias_hosts[*]}" >&2

  local alias_host
  for alias_host in "${alias_hosts[@]}"; do
    upsert_route53_alias "$alias_host" "$dist_domain"
  done
}

sync_redirect_groups() {
  local dev_sources_raw dev_source_primary dev_source_demo dev_source_beta
  local -a dev_sources=()

  if [ "$STAGE" != "dev" ]; then
    return 0
  fi

  if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}"; then
    local airs_source
    airs_source=$(normalize_domain "${INFRA_REDIRECT_AIRS_TO_DEV_SOURCE:-${DOMAIN_PRODUCTION:-}}")
    if [ -n "$airs_source" ] && [ "$airs_source" != "${DOMAIN_DEV:-}" ]; then
      sync_alias_group "airs->dev" "$airs_source" "$airs_source"
    fi
  fi

  if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}"; then
    dev_sources_raw=${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES:-${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-}}
    if [ -z "$dev_sources_raw" ]; then
      dev_source_primary=${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-${DOMAIN_DEV:-}}
      if [ -n "$dev_source_primary" ]; then
        dev_source_demo=${dev_source_primary/#dev./demo.}
        dev_source_beta=${dev_source_primary/#dev./beta.}
        dev_sources_raw="${dev_source_primary},${dev_source_demo},${dev_source_beta}"
      fi
    fi

    if [ -n "$dev_sources_raw" ]; then
      IFS=',' read -r -a dev_sources <<<"$dev_sources_raw"
      local i
      for i in "${!dev_sources[@]}"; do
        dev_sources[$i]=$(normalize_domain "${dev_sources[$i]}")
      done

      dev_source_primary=$(normalize_domain "${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-${DOMAIN_DEV:-}}")
      if [ -n "$dev_source_primary" ]; then
        sync_alias_group "dev->testnet" "$dev_source_primary" "${dev_sources[@]}"
      fi
    fi
  fi

  if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}"; then
    local root_source root_target
    root_source=$(normalize_domain "${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}")
    root_target=$(normalize_domain "${INFRA_REDIRECT_ROOT_TARGET:-}")
    if [ -n "$root_source" ] && [ -n "$root_target" ] && [ "$root_source" != "$root_target" ]; then
      sync_alias_group "root->target" "$root_source" "$root_source"
    fi
  fi
}

main() {
  local target_script stage_sync_status

  echo "Post-deploy DNS sync: stage=${STAGE} region=${REGION}"
  target_script=$(bash "$SCRIPT_DIR/_resolve-infra-script.sh" "postdeploy-update-dns.sh")

  if bash "$target_script" "$STAGE" "$REGION"; then
    stage_sync_status=0
  else
    stage_sync_status=$?
  fi

  if [ "$stage_sync_status" -ne 0 ]; then
    return "$stage_sync_status"
  fi

  sync_redirect_groups

  echo "Post-deploy DNS sync completed for stage ${STAGE}."
}

main "$@"
