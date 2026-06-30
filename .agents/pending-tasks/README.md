# Pending Tasks

Security findings, technical debt, and deferred work organized by feature subfolder.
Mirrors the structure of `.agents/active-tasks/` and `.agents/done-tasks/`.

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

## When a task is done

Move it: `mv pending-tasks/<feature>/<file>.md done-tasks/<feature>/`  
Don't copy — the original file is the authoritative record.

## Feature index

| Folder                                               | Feature              | Open items                                   |
| ---------------------------------------------------- | -------------------- | -------------------------------------------- |
| [alternun-wallet-system/](./alternun-wallet-system/) | Non-custodial wallet | 6 open (1 critical, 2 high, 2 medium, 1 low) |
