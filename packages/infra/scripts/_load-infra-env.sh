#!/usr/bin/env bash
set -euo pipefail

# Loads infra environment variables from packages/infra/.env (or INFRA_ENV_FILE).
# Optionally, set INFRA_LOAD_ROOT_ENV=true to also load repo root .env first.
is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

load_env_file() {
  local env_file=$1
  local preserve_existing=${2:-false}
  local line key value

  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    case "$line" in
      '' | \#*) continue ;;
      export\ *) line="${line#export }" ;;
    esac

    key=${line%%=*}
    value=${line#*=}

    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//')

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value=${value:1:${#value}-2}
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value=${value:1:${#value}-2}
    fi

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      if is_truthy "$preserve_existing" && [ "${!key+x}" = x ]; then
        continue
      fi
      export "$key=$value"
    fi
  done < "$env_file"
}

load_infra_env() {
  local script_dir infra_dir repo_root infra_env_file
  local force_env_credentials require_env_credentials preserve_existing_env

  script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  infra_dir=$(cd "$script_dir/.." && pwd)
  repo_root=$(cd "$infra_dir/../.." && pwd)
  infra_env_file=${INFRA_ENV_FILE:-"$infra_dir/.env"}
  preserve_existing_env=${INFRA_PRESERVE_EXISTING_ENV:-false}

  if [ -f "$infra_env_file" ]; then
    load_env_file "$infra_env_file" "$preserve_existing_env"
  fi

  if is_truthy "${INFRA_LOAD_ROOT_ENV:-false}" && [ -f "$repo_root/.env" ]; then
    load_env_file "$repo_root/.env" "$preserve_existing_env"
    if ! is_truthy "$preserve_existing_env"; then
      # Keep infra package values authoritative after loading root .env.
      load_env_file "$infra_env_file"
    fi
  fi

  # Backward-compatible aliases for legacy .env naming.
  if [ -z "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_KEY_ID:-}" ]; then
    export AWS_ACCESS_KEY_ID="${AWS_KEY_ID}"
  fi

  if [ -z "${AWS_SECRET_ACCESS_KEY:-}" ] && [ -n "${AWS_SECRET_KEY:-}" ]; then
    export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_KEY}"
  fi

  if [ -z "${AWS_SESSION_TOKEN:-}" ] && [ -n "${AWS_SESSION:-}" ]; then
    export AWS_SESSION_TOKEN="${AWS_SESSION}"
  fi

  force_env_credentials=${INFRA_FORCE_ENV_AWS_CREDENTIALS:-true}
  require_env_credentials=${INFRA_REQUIRE_ENV_AWS_CREDENTIALS:-true}

  export INFRA_FORCE_ENV_AWS_CREDENTIALS="$force_env_credentials"
  export INFRA_REQUIRE_ENV_AWS_CREDENTIALS="$require_env_credentials"

  if is_truthy "$force_env_credentials"; then
    unset AWS_PROFILE AWS_DEFAULT_PROFILE
    export AWS_SDK_LOAD_CONFIG=0
  fi

  if is_truthy "$require_env_credentials"; then
    if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
      echo "ERROR: INFRA_REQUIRE_ENV_AWS_CREDENTIALS=true but AWS credentials were not loaded from env." >&2
      echo "Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (or legacy AWS_KEY_ID/AWS_SECRET_KEY) in .env." >&2
      exit 1
    fi
  fi

  # Compatibility bridge for @lsts_tech/infra shell scripts.
  # Keep INFRA_* values authoritative so stale CodeBuild project variables do not override repo config.
  export DOMAIN_ROOT="${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}"
  export DOMAIN_PRODUCTION="${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}"
  export DOMAIN_DEV="${INFRA_EXPO_DOMAIN_DEV:-${DOMAIN_DEV:-}}"
  export DOMAIN_MOBILE="${INFRA_EXPO_DOMAIN_MOBILE:-${DOMAIN_MOBILE:-}}"
  export PROJECT_PREFIX="${INFRA_PIPELINE_PREFIX:-${PROJECT_PREFIX:-}}"
  export PREFIX="${INFRA_PIPELINE_PREFIX:-${PREFIX:-${PROJECT_PREFIX:-}}}"
}
