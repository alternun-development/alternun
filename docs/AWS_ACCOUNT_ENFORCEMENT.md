# AWS Account Enforcement Guide

## ⚠️ CRITICAL: Alternun uses ONE AWS account ONLY

| Property             | Value                             |
| -------------------- | --------------------------------- |
| **Correct Account**  | `12....16` (Alternun)             |
| **❌ Wrong Account** | `05....35` (DEFAULT - DO NOT USE) |
| **Region**           | `us-east-1`                       |

## Existing Pipelines (Alternun Account 12....16)

All pipelines are **SST-managed** in AWS CodePipeline and automatically trigger on repository events:

### Dev Pipelines (watch `develop` branch)

- **`alternun-dev-pipeline`** - Main Airs app + Expo web deployment

  - Source: `alternun-development/alternun` develop branch
  - Status: ✅ Active (last run succeeded)
  - Deploys to: testnet.airs.alternun.co

- **`alternun-dash-dev-pipeline`** - Dashboard infrastructure

  - Status: ✅ Active
  - Deploys to: testnet.admin.alternun.co

- **`alternun-auth-dev-pipeline`** - Authentication services
  - Status: ✅ Active
  - Deploys to: testnet.sso.alternun.co

### Prod Pipelines (watch `master`/`main` branch)

- **`alternun-prod-pipeline`** - Production Airs deployment

  - Source: `alternun-development/alternun` master branch
  - Status: ❌ Failed (requires fix)
  - Deploys to: airs.alternun.co

- **`alternun-dash-prod-pipeline`** - Production dashboard

  - Status: ❌ Failed
  - Deploys to: admin.alternun.co

- **`alternun-auth-prod-pipeline`** - Production auth
  - Status: ❌ Failed
  - Deploys to: sso.alternun.co

## Deployment Flow

```
git push develop (alternun-development/alternun)
    ↓
AWS CodePipeline (alternun-dev-pipeline / alternun-dash-dev-pipeline / alternun-auth-dev-pipeline)
    ↓
CodeBuild
    ↓
stage-aware deploy execution
    ↓
SST Deploy (STACK=dev / STACK=dashboard-dev / STACK=identity-dev)
    ↓
testnet surfaces updated by their owning stacks
```

## AWS Account Enforcement

### ✅ Before Running ANY AWS Command

**ALWAYS verify you're using the Alternun account:**

```bash
# Run this to enforce Alternun account
bash scripts/setup-aws-account.sh

# Verify (should show Alternun account 12....16)
aws sts get-caller-identity
```

### ✅ Automatic Guards

The following scripts enforce the Alternun account:

- `scripts/setup-aws-account.sh` - Loads Alternun credentials
- `scripts/aws-account-guard.sh` - Blocks operations on wrong account
- `scripts/validate-aws-account.sh` - Validates account before deployment

### ❌ DO NOT

- ❌ Use `aws` commands without running `bash scripts/setup-aws-account.sh` first
- ❌ Use default AWS credentials (~/.aws/credentials)
- ❌ Deploy with retired backend aliases such as `STACK=api-dev` or `STACK=backend-dev`
- ❌ Manually update `lstech-*` pipelines (they're in the wrong account)

## How to Trigger Deployments

### Dev (Testnet)

```bash
# Push to develop branch
git push origin develop

# Pipelines alternun-dev-pipeline, alternun-dash-dev-pipeline,
# and alternun-auth-dev-pipeline own the live testnet surfaces
# Monitor at: AWS CodePipeline console
```

### Prod

```bash
# Push to master/main branch (or merge PR)
git push origin master

# Pipeline alternun-prod-pipeline will automatically trigger
# Monitor at: AWS CodePipeline console
```

## Troubleshooting

### "Using WRONG AWS account" error

```bash
# Solution: Load Alternun credentials
bash scripts/setup-aws-account.sh

# Then verify
aws sts get-caller-identity
```

### Pipeline shows FAILED

1. Check CodeBuild logs in AWS console
2. Verify buildspec.yml environment variables
3. Check that INFRA_ENABLE_BACKEND_API=true in buildspec.yml
4. Run manual deployment:
   ```bash
   bash scripts/setup-aws-account.sh
   cd packages/infra
   APPROVE=true STACK=dashboard-dev npx sst deploy
   ```

### Testnet not updating

1. Verify `alternun-dev-pipeline` status in CodePipeline
2. Check CodeBuild execution logs
3. Verify git push was to the correct branch (`develop`)
4. Check that CloudFront cache isn't stale (hard refresh browser)

## References

- [AWS CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)
- [buildspec.yml](../buildspec.yml)
- [SST Configuration](../packages/infra/config/pipelines/)
- [GitHub Repository](https://github.com/alternun-development/alternun)
