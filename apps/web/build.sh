#!/bin/bash
set -euo pipefail

wait_for_update_dist() {
  local dist_entry="../../packages/update/dist/index.js"
  local attempts=0
  local max_attempts=120

  while [ ! -f "${dist_entry}" ] && [ "${attempts}" -lt "${max_attempts}" ]; do
    sleep 1
    attempts=$((attempts + 1))
  done

  [ -f "${dist_entry}" ]
}

# Turbo already builds @alternun/update as part of the release graph. When the
# web build runs under turbo, wait for that dist output instead of kicking off a
# second concurrent tsc run against the same package.
if [ -n "${TURBO_HASH:-}" ]; then
  if ! wait_for_update_dist; then
    pnpm --filter @alternun/update build
  fi
else
  pnpm --filter @alternun/update build
fi

node ../../packages/update/scripts/export-assets.mjs --target-dir public
rm -rf .next
next build
