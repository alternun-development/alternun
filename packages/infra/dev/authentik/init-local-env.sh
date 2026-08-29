#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
env_file="${script_dir}/.env"

if [ -e "${env_file}" ]; then
  echo "Refusing to overwrite ${env_file}. Remove it first to generate new disposable credentials." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate local Authentik secrets." >&2
  exit 1
fi

secret_key=$(openssl rand -hex 32)
postgres_password=$(openssl rand -hex 24)

(
  umask 077
  {
    printf '%s\n' '# Generated for isolated local Authentik development. Do not commit.'
    printf '%s\n' 'AUTHENTIK_IMAGE_TAG=2026.2'
    printf '%s=%s\n' 'AUTHENTIK_SECRET_KEY' "${secret_key}"
    printf '%s\n\n' 'AUTHENTIK_ERROR_REPORTING__ENABLED=false'
    printf '%s\n' 'POSTGRES_DB=authentik'
    printf '%s\n' 'POSTGRES_USER=authentik'
    printf '%s=%s\n\n' 'POSTGRES_PASSWORD' "${postgres_password}"
    printf '%s\n' 'AUTHENTIK_POSTGRESQL__HOST=postgres'
    printf '%s\n' 'AUTHENTIK_POSTGRESQL__NAME=authentik'
    printf '%s\n' 'AUTHENTIK_POSTGRESQL__USER=authentik'
    printf '%s=%s\n' 'AUTHENTIK_POSTGRESQL__PASSWORD' "${postgres_password}"
  } >"${env_file}"
)

echo "Generated ${env_file}. Start Authentik with: pnpm authentik:dev:up"
