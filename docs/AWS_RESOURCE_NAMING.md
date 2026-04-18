# AWS Resource Naming Conventions

## Problem

Current naming conventions create long, confusing resource names that expose implementation details and make it difficult to identify resources in AWS dashboards.

### Example Issues

- **Lambda function**: `alternun-infra-dashboard-dev-nestjs-api`

  - Length: 41 characters
  - Exposes implementation detail (NestJS framework)
  - "dashboard-dev" vs "api-dev" vs "backend-api-dev" aliases cause confusion
  - Multiple stacks pointing to the same resource name create SST deployment conflicts

- **API domain**: `testnet.api.alternun.co`
  - Already created by `dashboard-dev` stack
  - `api-dev` stack tries to recreate it, causing conflicts
  - No clear indication of which component owns the resource

## Recommended Naming Convention

### Lambda Functions

**Format**: `alternun-{component}-{stage}`

**Examples**:

- `alternun-api-dev` (testnet API)
- `alternun-api-prod` (production API)
- `alternun-admin-dev` (admin dashboard)
- `alternun-identity-dev` (authentication service)

**Guidelines**:

- ✅ DO: Use component name (api, admin, identity, dashboard)
- ❌ DON'T: Include framework name (nestjs, react, etc.)
- ❌ DON'T: Include language (python, node, etc.)
- ❌ DON'T: Use "nestjs-api" when "api" suffices
- ✅ DO: Keep total length under 64 characters (AWS Lambda limit)

### API Gateway Domains

**Format**: `{stage}.{component}.alternun.co`

**Examples**:

- `testnet.api.alternun.co` (testnet API)
- `api.alternun.co` (production API)
- `testnet.admin.alternun.co` (testnet admin)

**Guidelines**:

- ✅ DO: Use descriptive component names
- ✅ DO: Use stage prefix (testnet, staging, production)
- ❌ DON'T: Expose internal stack names
- ✅ DO: Keep domain names short and memorable

### SST Stack Names

**Format**: `{component}-{stage}`

**Aliases allowed**: `{component}-dev`, `{component}-{alias}`, etc.

**Examples**:

- Primary: `api-dev`
- Aliases: `backend-api-dev`, `api-dev`, `backend-dev` (all point to same stack)

**Guidelines**:

- ✅ DO: Use clear, descriptive names
- ✅ DO: Use stage suffix (dev, prod, staging)
- ❌ DON'T: Create duplicate resources across multiple alias deployments
- ✅ DO: Document all aliases for a stack

### Database Resources

**Format**: `alternun-{resource}-{stage}`

**Examples**:

- `alternun-db-backups-dev`
- `alternun-cache-dev`
- `alternun-secrets-dev`

**Guidelines**:

- ✅ DO: Include resource type
- ✅ DO: Use stage suffix
- ❌ DON'T: Use auto-generated IDs
- ✅ DO: Use prefixes for easy filtering

### Environment Variables

**Format**: `{PREFIX}_{COMPONENT}_{SETTING}`

**Examples**:

- `INFRA_BACKEND_API_DATABASE_URL` (Infrastructure setting for backend API)
- `INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL` (Better Auth URL for API)
- `EXPO_PUBLIC_BETTER_AUTH_URL` (Public setting for Expo)

**Guidelines**:

- ✅ DO: Use clear prefixes (INFRA*, EXPO_PUBLIC*, etc.)
- ✅ DO: Group related settings with component name
- ✅ DO: Use consistent casing (UPPER_SNAKE_CASE)
- ❌ DON'T: Mix conventions in same project

## Stack Aliases Issue & Solution

### Problem

Multiple aliases point to the same SST stack, causing confusion about which one "owns" resources:

```
dashboard-dev, dashboardapi-dev, api-dev, backend-api-dev, backend-dev
↓
All resolve to: dashboard-dev (managed pipeline)
↓
Creates resources like: alternun-infra-dashboard-dev-api
```

This causes:

- Confusion about which deployment creates which resources
- SST trying to recreate existing resources (domain names, Route53 records)
- Unclear ownership of resources in AWS console

### Solution

1. **Primary Stack Name**: Define one official stack name per component

   - `api-dev` = primary name for API component in dev stage
   - All aliases documented in pipeline config comments

2. **Resource Naming**: Use primary name in resource names

   - Lambda: `alternun-api-dev` (not `alternun-infra-dashboard-dev-nestjs-api`)
   - Domain: `testnet.api.alternun.co` (independent of stack name)

3. **Deployment Protocol**:

   - Always deploy using primary stack name
   - Document all aliases in `packages/infra/config/pipelines/stages.ts`
   - Avoid deploying same stack with different alias names

4. **Example for API**:

   ```
   MANAGED_PIPELINE_ALIASES['api-dev'] = [
     'api-dev',           // Primary name
     'backend-api-dev',   // Alias
     'api',               // Alias for local dev
   ]

   # Deploy with:
   STACK=api-dev pnpm deploy

   # NOT:
   STACK=backend-api-dev pnpm deploy  # Creates duplicate resources!
   ```

## Migration Plan

### For Existing Resources

1. **Lambda Functions**:

   - `alternun-infra-dashboard-dev-nestjs-api` → `alternun-api-dev`
   - Update environment variables SSM paths accordingly

2. **SST Stack State**:

   - Clean up stale stack states for duplicate deployments
   - Consolidate to single primary stack per component

3. **Documentation**:
   - Update all deployment guides
   - Add naming convention section to CLAUDE.md
   - Document all stack aliases in pipeline config

### Implementation Order

1. Document convention (done)
2. Update pipeline config comments with aliases
3. Rename Lambda functions in SST config
4. Redeploy with new names
5. Update any hardcoded resource references
6. Document in CLAUDE.md for future developers

## Checklist for New Resources

Before creating any AWS resource:

- [ ] Resource name follows convention (component-stage format)
- [ ] Name is under 64 characters
- [ ] No implementation details exposed (framework, language)
- [ ] Consistent with other resources
- [ ] Owner/component clearly identified
- [ ] Stage clearly indicated (dev/prod/staging)
- [ ] SST stack name documented in pipeline config
- [ ] Any aliases listed in comments
- [ ] Environment variable names use consistent prefix

## Related Issues

- GitHub: Issue tracking resource naming (TBD)
- Slack: #infra channel discussion
- Confluence: Deployment guide (needs update)
