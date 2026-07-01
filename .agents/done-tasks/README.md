# Done Tasks — Archived

Completed and verified work organized by feature subfolder, mirroring `.agents/active-tasks/`.

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

## Workflow: archiving a completed task

When a task is fully done (verified, no blocking gaps):

```bash
# From active-tasks to done-tasks
mv .agents/active-tasks/<feature>/<task>.md .agents/done-tasks/<feature>/

# From pending-tasks to done-tasks
mv .agents/pending-tasks/<feature>/<task>.md .agents/done-tasks/<feature>/
```

Then update both the source folder's README and the done-tasks feature README.

**Do not create a new file** — the original is the authoritative record. Moving preserves history.

## Feature index

| Folder                                               | Feature              | Status                                                     |
| ---------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| [alternun-wallet-system/](./alternun-wallet-system/) | Non-custodial wallet | Web complete (testnet only) — 10 archived, 6 pending items |
