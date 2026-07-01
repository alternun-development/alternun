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
