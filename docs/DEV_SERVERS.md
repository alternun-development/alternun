# Development Servers Guide

Run all Alternun development servers with flexible configuration.

## Quick Start

### Run Standard Servers (API, Admin, Mobile, Docs)

```bash
pnpm dev:all
```

**Services:**

- 🔵 API (`@alternun/api`)
- 🟢 Admin (`@alternun/admin`)
- 🟣 Mobile (`@alternun/mobile`)
- 🔵 Docs (`alternun-docs`)

**Ports (typical):**

- API: http://localhost:3001
- Admin: http://localhost:3002
- Mobile: http://localhost:3000
- Docs: http://localhost:3000 (after other services)

### Run All Servers + Video Studio

```bash
pnpm dev:all:video
# or
pnpm dev:all -- --video-studio
```

**Services (includes):**

- 🔵 API
- 🟢 Admin
- 🟣 Mobile
- 🔵 Docs
- 🟡 Video Studio (`@alternun/video-studio`)

**Additional Port:**

- Video Studio: http://localhost:3000 (Remotion Studio)

## Available Commands

| Command                          | Services                 | Use Case             |
| -------------------------------- | ------------------------ | -------------------- |
| `pnpm dev:all`                   | API, Admin, Mobile, Docs | Default development  |
| `pnpm dev:all:video`             | + Video Studio           | Creating demo videos |
| `pnpm dev:all -- --video-studio` | + Video Studio           | Alternative syntax   |

## Individual Services

If you need just one service:

```bash
pnpm admin          # Admin dashboard only
pnpm mobile         # Mobile web only
pnpm dev            # Run turbo dev (all configured services)
```

## Port Management

When running multiple servers, here's the typical port layout:

```
Local Development Environment:
├── API           http://localhost:3001
├── Admin         http://localhost:3002
├── Mobile        http://localhost:3000
├── Docs          http://localhost:3004 (if available)
└── Video Studio  http://localhost:3000 (Remotion)

Note: Some ports may conflict if multiple services are on the same port.
Adjust port configuration in each service's .env or dev script as needed.
```

## Stopping Servers

Press `Ctrl+C` to stop all running servers at once.

## Troubleshooting

### "Port already in use"

If a service won't start because its port is taken:

```bash
# Kill process on specific port (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or kill all node processes
killall node
```

### "Concurrently not found"

Install dependencies:

```bash
pnpm install
```

### Video Studio not starting

Ensure you have Node 22+ and all dependencies:

```bash
cd packages/video-studio
pnpm install
```

### Console Output Overlapping

Use color-coded terminal or separate terminal windows:

```bash
# Terminal 1
pnpm admin

# Terminal 2
pnpm mobile

# Terminal 3
cd packages/video-studio && pnpm dev
```

## Adding New Services

To add a new service to `dev:all`:

1. **Edit** `scripts/dev-all.mjs`
2. **Add entry** to `services` array:
   ```javascript
   {
     name: 'service-name',
     color: 'color-name',
     filter: '@alternun/package-name',
     script: 'dev'
   }
   ```
3. **Test**: `pnpm dev:all`

## Performance Tips

### Reduce Memory Usage

Run fewer services if your machine is constrained:

```bash
# Just API + Admin
pnpm admin
# In another terminal
pnpm --filter @alternun/api run dev
```

### Faster Startup

```bash
# Skip type checking during dev (for speed)
# Configure in each service's package.json
```

### Monitor Resource Usage

```bash
# Watch CPU/memory of dev servers
watch -n 1 'ps aux | grep node'
```

## Video Studio with Dev:All

### When to Use `--video-studio`

Use `pnpm dev:all:video` when:

- Creating or editing the AIRS demo video
- Need live preview of changes (Remotion Studio)
- Testing video composition alongside product
- Recording live product footage for video

### Video Studio Details

**Location:** http://localhost:3000 (Remotion Studio)

**Key Files:**

- Edit: `packages/video-studio/src/scenes/*.tsx`
- Preview updates live in browser
- No manual restart needed (hot reload)

**Commands (in video-studio):**

```bash
cd packages/video-studio
pnpm dev      # Start Remotion Studio
pnpm render   # Render final video
```

### Video Studio Stops Working?

```bash
# Restart just the video studio
Ctrl+C to stop dev:all:video
pnpm dev:all:video
```

Or run it independently:

```bash
# Terminal 1: Standard dev:all
pnpm dev:all

# Terminal 2: Video Studio separately
cd packages/video-studio && pnpm dev
```

## Environment Variables

Each service may have its own `.env` file. Check:

```bash
ls -la apps/*/env
ls -la packages/*/env
```

### Video Studio Env

Video Studio reads from root `.env`:

```bash
# .env (root)
VITE_API_URL=http://localhost:3001
```

## Git Workflow

### Before Committing

Stop all servers:

```bash
Ctrl+C
```

Run type checking:

```bash
pnpm type-check
```

Run tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

## CI/CD Integration

These commands are for **local development only**. CI/CD uses:

```bash
pnpm build       # Production build
pnpm test        # Test suite
pnpm lint        # Linting
```

## FAQ

**Q: Can I run dev:all on Windows?**

Yes, as long as you have Node 22+ and pnpm 9+. If concurrently has issues, use:

```bash
# Windows PowerShell alternative
pnpm admin & pnpm mobile & pnpm --filter @alternun/api run dev
```

**Q: How do I update dependencies?**

```bash
pnpm install
pnpm update
```

**Q: Can I add video-studio to the default dev:all?**

Edit `scripts/dev-all.mjs` and remove the `if (includeVideoStudio)` check, then move the video-studio entry to the base services array.

**Q: What if I only want video-studio?**

```bash
cd packages/video-studio
pnpm dev
```

**Q: How do I see logs from a specific service?**

Use `--prefix` or `--prefix-colors` in concurrently. Currently configured to show service name (api, admin, mobile, docs, video).

---

**Last Updated:** 2026-05-11  
**Maintainer:** Alternun team
