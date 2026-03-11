#!/bin/bash
set -euo pipefail

rm -rf dist dist-lambda
tsc -p tsconfig.build.json
cp package.json dist/package.json
lambda_entry="dist/lambda.js"
if [ ! -f "${lambda_entry}" ] && [ -f "dist/src/lambda.js" ]; then
  lambda_entry="dist/src/lambda.js"
fi

esbuild "${lambda_entry}" \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile=dist-lambda/lambda.js \
  --alias:class-transformer/storage=./node_modules/class-transformer/cjs/storage.js \
  --alias:@fastify/view=./shims/empty-module.js \
  --alias:@nestjs/microservices=./shims/empty-module.js \
  --alias:@nestjs/microservices/microservices-module=./shims/empty-module.js \
  --alias:@nestjs/platform-express=./shims/empty-module.js \
  --alias:@nestjs/websockets/socket-module=./shims/empty-module.js \
  --external:aws-sdk
