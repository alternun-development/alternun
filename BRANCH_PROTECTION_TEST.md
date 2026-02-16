# Branch Protection Test

This file tests the new branch protection workflow.

## Test Scenarios:

1. ✅ Feature branch created from develop
2. ✅ Changes made and committed
3. 🔄 Create PR to develop
4. 🔄 Merge to develop
5. 🔄 Create PR from develop to master

## Expected Results:

- Direct pushes to master should be blocked
- PRs to master must come from develop
- All automated checks must pass
