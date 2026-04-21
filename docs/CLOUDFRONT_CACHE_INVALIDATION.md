# CloudFront Cache Invalidation

## Overview

After each successful deployment via CodePipeline, the CloudFront CDN cache is **automatically invalidated** to ensure users get fresh content immediately, not stale cached versions.
The deploy no longer waits for the invalidation to finish unless `INFRA_STATIC_SITE_INVALIDATION_WAIT=true`, so production pipelines can complete sooner while the invalidation finishes in the background.

## What It Does

When a deployment succeeds:

1. **BuildSpec post_build phase** calls the invalidation script
2. **Script maps stage → CloudFront distribution ID**
3. **Creates invalidation for all paths (`/*`)**
4. **Cache clears in 30-60 seconds**
5. Next page load serves fresh code from origin

## How It Works

| Stage           | CloudFront ID    | Domain                    | Invalidates     |
| --------------- | ---------------- | ------------------------- | --------------- |
| `dev`           | `E2O74SRUWDYV1`  | testnet.airs.alternun.co  | Expo web app    |
| `dashboard-dev` | `E2HE57JERFFOXW` | testnet.admin.alternun.co | Admin dashboard |

**Script location:** `packages/infra/scripts/postdeploy-cloudfront-invalidate.sh`

**BuildSpec phase:** Post-build (after reachability check succeeds)

## If CloudFront Distribution IDs Change

Update the mapping in `postdeploy-cloudfront-invalidate.sh`:

```bash
declare -A CLOUDFRONT_DISTROS=(
  ["dev"]="E2O74SRUWDYV1"          # Update this
  ["dashboard-dev"]="E2HE57JERFFOXW"
)
```

To find distribution IDs:

```bash
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]].{Domain:Aliases.Items[0],Id:Id}" --output table
```

## Manual Invalidation (if needed)

```bash
source scripts/setup-aws-account.sh

# Invalidate testnet Airs
aws cloudfront create-invalidation \
  --distribution-id E2O74SRUWDYV1 \
  --paths "/*"

# Invalidate testnet Admin
aws cloudfront create-invalidation \
  --distribution-id E2HE57JERFFOXW \
  --paths "/*"
```

## Troubleshooting

**Q: Page still shows old version after deployment?**

- Wait 1-2 minutes for invalidation to complete (normally 30-60s)
- Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear entire browser cache
- Check pipeline logs to confirm deployment succeeded

**Q: CloudFront invalidation failed?**

- Check CodeBuild logs for permission errors
- Verify distribution ID still exists: `aws cloudfront list-distributions`
- Manual invalidation may be needed (see above)

## Related Files

- [buildspec.yml](../packages/infra/buildspec.yml) — Post-build phase integration
- [postdeploy-cloudfront-invalidate.sh](../packages/infra/scripts/postdeploy-cloudfront-invalidate.sh) — Invalidation script
- [AWS_ACCOUNT_ENFORCEMENT.md](./AWS_ACCOUNT_ENFORCEMENT.md) — Deployment pipeline docs
