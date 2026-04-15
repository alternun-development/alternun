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

swagger_ui_dir=$(
  node -e "const { createRequire } = require('node:module'); const swaggerPackageJson = require.resolve('@nestjs/swagger/package.json', { paths: [process.cwd()] }); const swaggerRequire = createRequire(swaggerPackageJson); process.stdout.write(swaggerRequire('swagger-ui-dist/absolute-path.js')());"
)

mkdir -p dist-lambda/swagger-ui
cp -R "${swagger_ui_dir}/." dist-lambda/swagger-ui/

# Bundle legal markdown files so Lambda can read them at runtime
mkdir -p dist-lambda/legal
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cp "${repo_root}/apps/docs/src/pages/privacy.md" dist-lambda/legal/privacy.en.md
cp "${repo_root}/apps/docs/src/pages/terms.md"   dist-lambda/legal/terms.en.md
for locale in es th; do
  for doc in privacy terms; do
    src="${repo_root}/apps/docs/i18n/${locale}/docusaurus-plugin-content-docs/current/${doc}.md"
    [ -f "$src" ] && cp "$src" "dist-lambda/legal/${doc}.${locale}.md" || true
  done
done
