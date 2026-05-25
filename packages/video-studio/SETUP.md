# AIRS Studio Three.js Setup

Professional video production studio powered by Remotion + Three.js

## 🚀 Quick Start

```bash
cd packages/video-studio
pnpm dev
```

Access **http://localhost:3000** for the studio dashboard.

## 📍 Services

- **Studio Dashboard**: http://localhost:3000

  - Project management interface
  - Recording studio with frame tracking
  - localStorage persistence for all projects

- **Remotion Composition Studio**: Auto-detected (usually 3004-3010)
  - Three.js-based video composition editor
  - Full Remotion Studio features
  - Real-time preview and editing

## 🏗️ Architecture

### Base Template

- **Remotion Three.js Template** (https://github.com/remotion-dev/template-three)
- React Three Fiber for 3D graphics
- Professional composition editor

### Custom Modules

- **Studio Server** (`src/server/studio-server.mjs`)

  - Express.js backend
  - Serves dashboard + Remotion composition
  - Auto-detects available ports

- **Recorder Component** (`src/studio/Recorder.tsx`)

  - Start/stop recording sessions
  - Frame count tracking (30fps)
  - Duration calculation

- **Studio Dashboard** (`public/studio.html`)
  - Vanilla HTML/JavaScript (no build required)
  - Project CRUD operations
  - Recording history per project
  - localStorage-based persistence

## 📦 Dependencies

**Core Remotion**

- remotion@4.0.459
- @remotion/cli@4.0.459
- @remotion/three@4.0.459
- @react-three/fiber@9.2.0
- three@0.178.0

**Backend**

- express@^5.2.1
- cors@^2.8.6

**Development**

- typescript@5.9.3
- eslint@9.19.0

## 🎯 Features

✅ Professional dashboard UI with cyan accent colors
✅ Project-based organization system
✅ Real-time recording with frame counting
✅ Integrated Remotion Three.js composition editor
✅ localStorage persistence (zero database needed)
✅ Responsive grid layout
✅ Auto port detection for Remotion Studio
✅ Zero port conflicts with other services

## 📁 Project Structure

```
video-studio/
├── src/
│   ├── index.ts                 # Remotion entry point
│   ├── Root.tsx                 # Composition registry
│   ├── Scene.tsx                # Three.js scene component
│   ├── helpers/
│   ├── server/
│   │   └── studio-server.mjs    # Express backend
│   └── studio/
│       ├── Recorder.tsx         # Recording component
│       └── StudioDashboard.tsx  # UI component
├── public/
│   ├── studio.html              # Dashboard interface
│   ├── index.html               # Remotion entry HTML
│   └── phone.mp4                # Sample video
├── package.json
├── remotion.config.ts
└── tsconfig.json
```

## 🔄 Workflow

### Recording Workflow

1. Open http://localhost:3000
2. Create a new project
3. Select the project
4. Click **⏺ Start Recording**
5. Interact with video composition
6. Click **⏹ Stop Recording**
7. View recording stats (duration, frames)

### Composition Editing Workflow

1. From studio dashboard, click **🎨 Open Remotion Studio**
2. Use Remotion UI to edit Scene composition
3. Adjust Three.js 3D models and animations
4. Preview changes in real-time
5. Export/render final video

## 🎨 Customization

### Change Colors

Edit `public/studio.html`:

```javascript
// Primary accent
color: '#00d9ff'; // Cyan
background: '#0f0f1e'; // Dark background
```

### Add Custom Compositions

Edit `src/Root.tsx`:

```typescript
<Composition
  id='MyScene'
  component={MyScene}
  fps={30}
  durationInFrames={300}
  width={1280}
  height={720}
/>
```

### Modify Scene

Edit `src/Scene.tsx` using React Three Fiber syntax.

## 📊 Data Storage

All data stored in browser localStorage:

- `video_projects` — Project metadata
- `video_recordings_${projectId}` — Per-project recordings

Export data from browser console:

```javascript
console.log(JSON.parse(localStorage.getItem('video_projects')));
```

## 🔗 Integration with pnpm dev:all:video

The video-studio is fully integrated with the monorepo:

```bash
pnpm dev:all:video
```

This starts:

- API server (port 8082)
- Admin dashboard (port 5173)
- Mobile web app (port 8081)
- Docs site (port 8083)
- **Video Studio (port 3000)** ← You are here
- Remotion Composition (auto-detected port)

## 🐛 Troubleshooting

**Q: Blank white page at localhost:3000**

- A: Force refresh (Ctrl+Shift+R)
- Check browser console for errors
- Verify `studio.html` exists in `public/`

**Q: Can't find Remotion Studio button**

- A: Check console for port detection errors
- Manually navigate to http://localhost:3004

**Q: Port already in use**

- A: The server auto-detects available ports
- Check terminal logs for actual port

**Q: Recordings not saving**

- A: Verify localStorage is enabled in browser
- Check developer tools → Application → Storage

## 📚 References

- [Remotion Docs](https://remotion.dev/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Documentation](https://threejs.org/docs)
- [Template Source](https://github.com/remotion-dev/template-three)

---

**Version**: 1.0.252  
**Status**: Production Ready ✅  
**Last Updated**: 2026-05-11
