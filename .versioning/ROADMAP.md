# Project Roadmap – Untitled

<!-- roadmap:managed:start -->
> Managed by `@edcalderon/versioning` reentry-status-extension.
> Canonical roadmap file: .versioning/ROADMAP.md
> Active milestone: Alternun Wallet System (non-custodial, multi-chain) (id: wallet-system)
> 
> Everything outside this block is user-editable.
<!-- roadmap:managed:end -->

## North Star

- Describe the long-term outcome this project is aiming for.

## Now (1–2 weeks)

- [wallet-system] Alternun Wallet System (non-custodial, multi-chain EVM/Solana/Bitcoin) — spec & tasks in .agents/active-tasks/alternun-wallet-system/ (00-SPEC.md)

## Next (4–8 weeks)

- [wallet-rollout] Wallet rollout: full feature flag removal after security review + manual QA matrix (see .agents/active-tasks/alternun-wallet-system/09-testing-qa-plan.md)

## Later

- [v2-ui-migration] **V2 UI overhaul** — Desktop sidebar + mobile bottom dock, matching `docs/v2-ui/` design spec. 4 phases:

  - **P0** (foundation): design token constants (`v2tokens.ts`) + shared `components/v2/` primitives (HeroPanel, StatCard, LedgerRow, etc.)
  - **P1** (mobile): enable BottomDock, shared TopNavBar, V2 Dashboard + Profile layouts (TierJourney, Achievements, QuickActions)
  - **P2** (desktop ≥720 px): collapsible sidebar, topbar with ⌘K search, wide dashboard (projects table + Donut chart), 2-column profile
  - **P3** (cleanup): migrate wallet components to V2 tokens, remove V1 layout + feature flag
  - Full spec + task list: `.agents/pending-tasks/v2-ui-migration/00-SPEC.md`
  - Feature flag: `USE_V2_NAV` in `apps/mobile/components/navigation/featureFlags.ts`

- [geo-service] **Self-hosted IP geolocation** — Replace `ipapi.co` (1000 req/day trial) with our own MaxMind GeoLite2 MMDB-based service. Same `GET /v1/geo` contract, zero external dependency, < $0.01/month.
  - Switch trigger: daily lookups > 800/day OR ipapi.co sends a bill OR downtime event
  - Stack: S3 bucket (MMDB storage) + `mmdb-lib` in-process reader + EventBridge weekly cron to refresh DB from MaxMind
  - Feature flag: `GEO_DB_BUCKET` env var — not set → falls back to ipapi.co (zero regression)
  - 7 tasks: infra (GEO-01/02) → API update (GEO-03/04) → automation (GEO-05/06) → remove ipapi (GEO-07)
  - Full spec: `.agents/pending-tasks/geo-service/00-SPEC.md`
