#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STACK=${1:-${STACK:-${SST_STAGE:-dev}}}
INFRA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
APP_PATH=${INFRA_EXPO_APP_PATH:-../../apps/mobile}
PIPELINE_PREFIX=${INFRA_PIPELINE_PREFIX:-alternun}
ROOT_DOMAIN=${INFRA_ROOT_DOMAIN:-alternun.co}

sanitize_bucket_name() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9-]+/-/g; s/-+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-63 \
    | sed -E 's/-+$//'
}

resolve_app_dir() {
  local candidate

  for candidate in \
    "$APP_PATH" \
    "$INFRA_DIR/$APP_PATH" \
    "$INFRA_DIR/../$APP_PATH" \
    "$INFRA_DIR/../../$APP_PATH" \
    "$(pwd)/$APP_PATH" \
    "$(pwd)/../$APP_PATH"
  do
    if [ -d "$candidate" ]; then
      cd "$candidate" && pwd
      return 0
    fi
  done

  echo "ERROR: Unable to resolve Expo app path from INFRA_EXPO_APP_PATH=${APP_PATH}" >&2
  exit 1
}

discover_existing_bucket() {
  local bucket_name

  if aws s3api head-bucket --bucket "${INFRA_EXPO_SITE_BUCKET_NAME:-}" >/dev/null 2>&1; then
    printf '%s\n' "${INFRA_EXPO_SITE_BUCKET_NAME}"
    return 0
  fi

  while IFS= read -r bucket_name; do
    case "$bucket_name" in
      *"expo-web-site-${STACK}"* | *"expoweb${STACK}assetsbucket"* )
        if aws s3api head-bucket --bucket "$bucket_name" >/dev/null 2>&1; then
          printf '%s\n' "$bucket_name"
          return 0
        fi
        ;;
    esac
  done < <(aws s3api list-buckets --query 'Buckets[].Name' --output text | tr '\t' '\n')

  return 1
}

APP_DIR=$(resolve_app_dir)
DIST_DIR="${APP_DIR}/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: ${DIST_DIR} is missing after the Expo web build." >&2
  exit 1
fi

SITE_BUCKET=$(discover_existing_bucket) || {
  NEW_BUCKET=$(sanitize_bucket_name "${PIPELINE_PREFIX}-${STACK}-expo-web-site-${ROOT_DOMAIN//./-}")
  LEGACY_BUCKET=$(sanitize_bucket_name "${PIPELINE_PREFIX}-${STACK}-expoweb${STACK}assetsbucket")
  echo "ERROR: No Expo site bucket found. Tried ${INFRA_EXPO_SITE_BUCKET_NAME:-unset}, ${NEW_BUCKET}, and ${LEGACY_BUCKET}." >&2
  exit 1
}

echo "Syncing Expo site build from ${DIST_DIR} to s3://${SITE_BUCKET}"
aws s3 sync "$DIST_DIR" "s3://${SITE_BUCKET}" --delete --only-show-errors
echo "Expo site sync completed for stage ${STACK}."
