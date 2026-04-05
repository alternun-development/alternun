#!/bin/bash
set -euo pipefail

# Resolve TypeScript through pnpm so the workspace root toolchain is used.
pnpm exec tsc -p tsconfig.json
