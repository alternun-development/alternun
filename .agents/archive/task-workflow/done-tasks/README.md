# Done Tasks — Archived

> Deprecated task workflow archive. New task specifications and lifecycle changes happen only in [`.specs/`](../../../../.specs/README.md).

Completed and verified work organized by feature subfolder, preserving the former task workflow.

## Structure

```
done-tasks/
├── README.md
└── alternun-wallet-system/    ← non-custodial wallet (web, testnet)
    ├── README.md              ← feature summary + archive index
    ├── 01-...  (from active-tasks)
    ├── 02-...
    ├── ...
    ├── SEC-02-...  (from pending-tasks, now done)
    └── TECH-01-...
```

## Current workflow

This directory is read-only historical context. Move canonical files through `.specs/tasks/draft`, `todo`, `in-progress`, and `done`; do not add new files here.

## Feature index

| Folder                                               | Feature              | Status                                                     |
| ---------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| [alternun-wallet-system/](./alternun-wallet-system/) | Non-custodial wallet | Web complete (testnet only) — 10 archived, 6 pending items |
