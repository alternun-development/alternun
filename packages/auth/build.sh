#!/bin/bash
# Build script that ignores turbo filter arguments.
tsc && node scripts/fix-dist-imports.mjs
