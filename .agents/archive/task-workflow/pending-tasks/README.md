# Pending Tasks

> Deprecated workflow index. Open task specifications were moved to [`.specs/tasks/todo/`](../../../../.specs/tasks/todo/); this historical structure is retained only for migration context.

Security findings, technical debt, and deferred work organized by feature subfolder.
Mirrored the structure of the former `.agents/active-tasks/` and `.agents/done-tasks/` directories.

## Structure

```
pending-tasks/
├── README.md                        ← this file
└── alternun-wallet-system/          ← wallet feature pending items
    ├── README.md
    ├── SEC-01-...  (🔴 CRITICAL)
    ├── SEC-03-...  (🟠 HIGH)
    ├── SEC-05-...  (🟡 MEDIUM)
    ├── SEC-06-...  (🟡 MEDIUM)
    ├── SEC-07-...  (🟡 MEDIUM)
    └── SEC-08-...  (🟢 LOW)
```

## Current workflow

Do not add or move tasks in this archive. Use the lifecycle in [`.specs/`](../../../../.specs/README.md).

## Feature index

| Folder                                               | Feature              | Open items                                   |
| ---------------------------------------------------- | -------------------- | -------------------------------------------- |
| [alternun-wallet-system/](./alternun-wallet-system/) | Non-custodial wallet | 6 open (1 critical, 2 high, 2 medium, 1 low) |
