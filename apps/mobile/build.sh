#!/bin/bash
set -euo pipefail

pnpm --filter @alternun/update build
node ../../packages/update/scripts/export-assets.mjs --target-dir public
expo export -p web
