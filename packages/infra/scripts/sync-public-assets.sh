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

sanitize_key_segment() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9-]+/-/g; s/-+/-/g; s/^-+//; s/-+$//'
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

compute_sha256() {
  local file_path=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{ print substr($1, 1, 12) }'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{ print substr($1, 1, 12) }'
    return 0
  fi

  echo "ERROR: Neither sha256sum nor shasum is available for asset hashing." >&2
  exit 1
}

upload_asset() {
  local file_path=$1
  local key_prefix=$2
  local extension basename hash key

  extension=".${file_path##*.}"
  basename=$(basename "$file_path" "$extension")
  basename=$(sanitize_key_segment "$basename")
  hash=$(compute_sha256 "$file_path")
  key="${key_prefix}/${basename}.${hash}${extension}"

  if aws s3api head-object --bucket "$ASSET_BUCKET" --key "$key" >/dev/null 2>&1; then
    echo "Skipping upload for $(basename "$file_path"); asset already exists at s3://${ASSET_BUCKET}/${key}"
    return 0
  fi

  echo "Uploading $(basename "$file_path") -> s3://${ASSET_BUCKET}/${key}"
  aws s3 cp "$file_path" "s3://${ASSET_BUCKET}/${key}" \
    --content-type "video/mp4" \
    --cache-control "public,max-age=31536000,immutable" \
    --only-show-errors
}

ASSET_BUCKET=$(sanitize_bucket_name "${PIPELINE_PREFIX}-${STACK}-public-assets-${ROOT_DOMAIN//./-}")
APP_DIR=$(resolve_app_dir)

echo "Syncing public assets for stage ${STACK} to bucket ${ASSET_BUCKET}"

if ! aws s3api head-bucket --bucket "${ASSET_BUCKET}" >/dev/null 2>&1; then
  echo "ERROR: Asset bucket ${ASSET_BUCKET} does not exist yet." >&2
  exit 1
fi

upload_asset "${APP_DIR}/assets/videos/AIRS-intro-videoplayback-EN.mp4" "landing/videos"
upload_asset "${APP_DIR}/assets/videos/AIRS-intro-videoplayback-ES.mp4" "landing/videos"

echo "Public asset sync completed for stage ${STACK}."
