#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TARGET=$(bash "$SCRIPT_DIR/_resolve-infra-script.sh" "postdeploy-update-dns.sh")
exec "$TARGET" "$@"
