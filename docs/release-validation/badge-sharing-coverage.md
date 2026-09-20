# Badge sharing coverage follow-up

PR #231 reported uncovered desktop sharing, badge-detail navigation and tier display
paths in v1.1.86. The follow-up adds regression tests without changing application
behavior or coverage thresholds.

Covered cases:

- Expired sessions do not publish anonymous milestone cards and offer retry.
- Personalized image previews retain the verified display name and public share URL.
- Desktop X, Facebook and LinkedIn actions open composers with the public preview;
  Instagram and generic file sharing download an attachment when native file sharing
  is unavailable. Explicit download remains disabled until an image is prepared.
- User cancellation does not show a sharing failure or prevent another attempt.
- Unknown artwork, failed downloads, unavailable native sharing and incomplete API
  responses reject instead of silently substituting a generic image.
- Earned and locked badges open their matching detail modal; closing and navigating
  to the previous page clear selection.
- Bronze, silver, gold and platinum styling remains consistent across dashboard,
  profile and settings in both light and dark themes.

Validation: `pnpm --filter @alternun/mobile test:coverage` passed 57 suites and
303 tests. Local line coverage is 100% for `AchievementDetailsModal.tsx`,
`AchievementCollection.tsx` and `milestoneSharing.ts`. Overall mobile line coverage
is 77.45%, statements 76.84%, branches 68.52% and functions 71.87%.

These are component and unit regressions. Browser APIs and native sharing are
mocked; no real social posts are sent. Codecov calculates patch coverage separately
in CI; these local figures do not replace its report.
