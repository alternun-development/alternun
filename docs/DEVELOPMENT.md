# Development Guide

Quick reference for running Alternun development environment.

## 🚀 Start Development

### Option 1: Standard Stack (Recommended)

```bash
pnpm dev:all
```

Starts:

- 🔵 **API** (`@alternun/api`) — Backend REST API
- 🟢 **Admin** (`@alternun/admin`) — Admin dashboard
- 🟣 **Mobile** (`@alternun/mobile`) — Mobile web app
- 🔵 **Docs** (`alternun-docs`) — Documentation site

### Option 2: Standard Stack + Video Studio

```bash
pnpm dev:all:video
```

Same as above, plus:

- 🟡 **Video** (`@alternun/video-studio`) — Remotion video composition

## 📦 What's Running

| Service      | Port | URL                              |
| ------------ | ---- | -------------------------------- |
| API          | 3001 | http://localhost:3001            |
| Admin        | 3002 | http://localhost:3002            |
| Mobile       | 3000 | http://localhost:3000            |
| Docs         | 3004 | http://localhost:3004            |
| Video Studio | 3000 | http://localhost:3000 (Remotion) |

## 🎬 Video Studio Only

```bash
cd packages/video-studio
pnpm dev
# Opens http://localhost:3000 (Remotion Studio)
```

Preview AIRS demo video:

- Live composition editing
- Real-time hot reload
- Timeline scrubbing
- Frame-by-frame inspection

**See:** [packages/video-studio/QUICKSTART.md](packages/video-studio/QUICKSTART.md)

## 📋 Individual Services

Run just one service:

```bash
pnpm admin           # Admin dashboard
pnpm mobile          # Mobile web app
pnpm dev             # All configured services via Turbo
```

## 🛑 Stop All Servers

Press **Ctrl+C** in terminal.

## 🔧 Development Commands

| Command              | Purpose                     |
| -------------------- | --------------------------- |
| `pnpm dev:all`       | Start all services          |
| `pnpm dev:all:video` | All services + video-studio |
| `pnpm dev`           | Turbo dev (all packages)    |
| `pnpm admin`         | Admin only                  |
| `pnpm mobile`        | Mobile only                 |
| `pnpm build`         | Build all packages          |
| `pnpm lint`          | Lint all code               |
| `pnpm test`          | Run tests                   |
| `pnpm type-check`    | TypeScript validation       |
| `pnpm clean`         | Clean build artifacts       |

## 📚 Full Documentation

- **Dev Servers:** [DEV_SERVERS.md](DEV_SERVERS.md)
- **Video Studio:** [packages/video-studio/README.md](packages/video-studio/README.md)
- **Video Quick Start:** [packages/video-studio/QUICKSTART.md](packages/video-studio/QUICKSTART.md)
- **Code Guide:** [CLAUDE.md](CLAUDE.md)

## 🎯 Quick Recipes

### I want to...

#### Work on the mobile app

```bash
pnpm mobile
# or
pnpm dev:all
```

#### Create the demo video

```bash
pnpm dev:all:video
# Then navigate to http://localhost:3000 (Remotion Studio)
# Or separate terminal:
cd packages/video-studio && pnpm dev
```

#### Edit and test admin dashboard

```bash
pnpm admin
```

#### Check if everything builds

```bash
pnpm build
pnpm lint
pnpm type-check
```

#### Run tests before committing

```bash
pnpm test
```

## 🔍 Debugging

### Check what's listening on ports

```bash
# macOS/Linux
lsof -i :3000
lsof -i :3001

# Windows
netstat -ano | findstr :3000
```

### Kill a process on a port

```bash
# macOS/Linux
kill -9 $(lsof -t -i:3000)

# Windows (PowerShell)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

### View logs from a specific service

Output is color-coded by service (blue/green/magenta/cyan/yellow).

Services are prefixed with their name:

- `api` — API server
- `admin` — Admin dashboard
- `mobile` — Mobile web app
- `docs` — Documentation
- `video` — Video Studio (Remotion)

## ⚙️ Environment Setup

### Prerequisites

```bash
node --version    # v22.0.0 or higher
pnpm --version    # 9.0.0 or higher
```

### First Time Setup

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev:all
```

### Environment Variables

Each service has its own `.env` file. Check:

```bash
cat .env                    # Root env
cat apps/mobile/.env        # Mobile app env
cat packages/auth/.env      # Auth package env
```

## 🚨 Common Issues

### Port already in use

If a service won't start:

```bash
# Kill all Node processes
killall node

# Then restart
pnpm dev:all
```

### Dependencies not installed

```bash
pnpm install
pnpm install --force  # Nuclear option
```

### Hot reload not working

Restart the service:

1. Press **Ctrl+C**
2. Run `pnpm dev:all` or `pnpm dev:all:video` again

### Video Studio not starting

```bash
cd packages/video-studio
pnpm install
pnpm dev
```

### Type errors after git pull

```bash
pnpm install
pnpm type-check
```

## 📖 More Information

- **Full dev servers guide:** [DEV_SERVERS.md](DEV_SERVERS.md)
- **Video studio setup:** [packages/video-studio/QUICKSTART.md](packages/video-studio/QUICKSTART.md)
- **Code style guide:** [CLAUDE.md](CLAUDE.md) (scroll to section 2)
- **AWS account info:** [CLAUDE.md](CLAUDE.md) (scroll to section 5)

---

**Last Updated:** 2026-05-11  
**Status:** Ready for development
