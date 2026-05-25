# AIRS Studio - Project Structure

Clean, organized Remotion project structure for professional video production.

## 📂 Complete Directory Tree

```
video-studio/
│
├── 📄 Configuration Files
│   ├── package.json          # Project dependencies & scripts
│   ├── tsconfig.json        # TypeScript configuration
│   ├── remotion.config.ts   # Remotion settings
│   └── eslint.config.mjs    # ESLint rules
│
├── 📁 src/                   # Source code
│   ├── index.ts             # Remotion entry point
│   ├── Root.tsx             # Composition registry
│   ├── Scene.tsx            # Three.js scene component
│   │
│   ├── scenes/              # Individual scene components
│   │   ├── Intro.tsx        # 0:00-0:15 (intro scene)
│   │   ├── Login.tsx        # 0:15-0:35 (login flow)
│   │   ├── Dashboard.tsx    # 0:35-1:10 (dashboard demo)
│   │   ├── Interactions.tsx # 1:10-1:50 (user interactions)
│   │   ├── Impact.tsx       # 1:50-2:20 (impact metrics)
│   │   ├── Responsive.tsx   # 2:20-2:40 (mobile responsive)
│   │   └── Outro.tsx        # 2:40-3:00 (call to action)
│   │
│   ├── components/          # Reusable components
│   │   ├── BrowserFrame.tsx
│   │   ├── CinematicText.tsx
│   │   ├── GradientBackground.tsx
│   │   └── ...
│   │
│   ├── server/              # Backend servers
│   │   ├── studio-server.mjs    # Express.js dashboard server
│   │   ├── render-server.ts     # Render API server (optional)
│   │   └── recorder-server.mjs  # Recording session server
│   │
│   ├── studio/              # Dashboard UI components
│   │   ├── Recorder.tsx         # Recording controls
│   │   ├── StudioDashboard.tsx  # Main interface
│   │   └── ...
│   │
│   ├── helpers/             # Utility functions
│   │   └── get-media-metadata.ts
│   │
│   ├── utils/               # Configuration utilities
│   │   ├── render-config.ts     # Render presets
│   │   └── compose-studio.mjs   # Batch rendering CLI
│   │
│   └── automation/          # Recording automation
│       └── record-footage.mjs   # Playwright automation
│
├── 📁 public/               # Static assets & HTML
│   ├── index.html           # Main dashboard (compiled)
│   ├── studio.html          # Alternative studio view
│   ├── README.md            # Asset documentation
│   │
│   ├── assets/              # Media files
│   │   ├── phone.mp4        # Sample videos
│   │   └── tablet.mp4
│   │
│   ├── compositions/        # Composition browser
│   │   └── index.html       # Browse & select compositions
│   │
│   ├── recorder/            # Scene recording interface
│   │   └── index.html       # Recorder dashboard
│   │
│   ├── projects/            # Project metadata storage
│   │   └── .gitkeep
│   │
│   └── (video outputs)      # Rendered videos
│       ├── airs-demo-hd.mp4
│       ├── airs-demo-4k.mp4
│       └── ...
│
├── 📁 docs/ (Optional)      # Documentation
│   ├── SETUP.md            # Setup instructions
│   ├── QUICKSTART.md       # 5-min quickstart
│   ├── STORYBOARD.md       # Visual storyboard
│   ├── FFMPEG_GUIDE.md     # FFmpeg recipes
│   ├── RECIPES.md          # Code patterns
│   └── CHECKLIST.md        # Production checklist
│
├── 📄 Documentation Files
│   ├── README.md           # Complete reference
│   ├── SETUP.md            # Installation & setup
│   ├── STRUCTURE.md        # This file
│   ├── STUDIO_GUIDE.md     # Recording studio guide
│   └── MANIFEST.md         # File inventory
│
└── 📁 .git/                # Git repository (tracked files only)
```

## 🎬 Source Code Organization (src/)

### Main Entry Points

- **index.ts** - Remotion's entry point, registers compositions
- **Root.tsx** - Composition registry with Scene definition
- **Scene.tsx** - Three.js scene with React Three Fiber

### Scenes (src/scenes/)

Each scene is a separate React component with its own animations:

```
scenes/
├── Intro.tsx        (450 frames)   0:00-0:15
├── Login.tsx        (600 frames)   0:15-0:35
├── Dashboard.tsx    (1050 frames)  0:35-1:10
├── Interactions.tsx (1200 frames)  1:10-1:50
├── Impact.tsx       (900 frames)   1:50-2:20
├── Responsive.tsx   (600 frames)   2:20-2:40
└── Outro.tsx        (600 frames)   2:40-3:00
                     ─────────────
                     Total: 5400 frames = 180 seconds @ 30fps
```

### Components (src/components/)

Reusable, composable UI elements:

```
components/
├── BrowserFrame.tsx      # macOS browser window
├── CinematicText.tsx     # Animated typography
├── GradientBackground.tsx # Dynamic gradient
└── (add more as needed)
```

### Backend Services (src/server/)

Node.js servers for supporting functionality:

```
server/
├── studio-server.mjs   # Express server for dashboard
├── render-server.ts    # (Optional) Rendering API
└── recorder-server.mjs # (Optional) Recording sessions
```

## 📁 Public Folder Organization (public/)

### Main Interface

- **index.html** - Main dashboard (generated from studio.html)
- **studio.html** - Studio dashboard source

### Asset Management

```
assets/              # Media files
├── phone.mp4       # Sample videos for compositions
└── tablet.mp4
```

### Modular Pages

```
compositions/       # Composition selection interface
├── index.html     # Browse available compositions
└── (route: /compositions/)

recorder/          # Scene recording interface
├── index.html     # Recorder dashboard
└── (route: /recorder/)
```

### Project Storage

```
projects/          # Project metadata (localStorage)
└── .gitkeep      # Placeholder for git
```

## 🔄 Data Flow

### Recording Session

```
User Input
    ↓
studio.html (Dashboard)
    ↓
localStorage (projects & recordings)
    ↓
Browser DevTools (Export/Debug)
```

### Composition Editing

```
Remotion Studio ← Remote Composition (localhost:3004)
                    ↓
                src/Root.tsx (Composition registry)
                    ↓
                Scenes & Components (src/scenes/, src/components/)
                    ↓
                Media Assets (public/assets/)
```

### Rendering Pipeline

```
src/index.ts
    ↓
Remotion render command
    ↓
Output video file
    ↓
public/airs-demo-hd.mp4 (or similar)
    ↓
FFmpeg post-processing (optional)
    ↓
Platform-specific exports
```

## 📦 npm Scripts

```json
{
  "scripts": {
    "dev": "node src/server/studio-server.mjs", // Start studio + remotion
    "dev:studio": "remotion studio", // Just Remotion editor
    "build": "remotion bundle", // Create bundle
    "render": "remotion render", // Render video
    "clean": "rm -rf dist .remotion" // Clean build files
  }
}
```

## 🎯 Key Design Principles

### 1. **Separation of Concerns**

- Compositions in `src/` (video logic)
- Dashboard in `public/` (UI interface)
- Server in `src/server/` (backend services)

### 2. **Modular Scenes**

- Each scene is independent
- Can be edited/tested separately
- Uses frame-based timing system

### 3. **Reusable Components**

- Common UI patterns in `components/`
- Props-based customization
- No hardcoded values

### 4. **Asset Management**

- All media in `public/assets/`
- Metadata in project files
- Version control with git

### 5. **Clean Public Folder**

- Generated files in `public/`
- Source files in `src/`
- Clear separation of concerns

## 🚀 Scaling the Project

### Adding a New Scene

```typescript
// src/scenes/MyScene.tsx
import { AbsoluteFill } from 'remotion';

export const MyScene: React.FC = () => {
  return <AbsoluteFill>{/* Scene content */}</AbsoluteFill>;
};
```

### Registering in Root.tsx

```typescript
<Composition
  id='MyScene'
  component={MyScene}
  fps={30}
  durationInFrames={450}
  width={1440}
  height={810}
/>
```

### Adding New Compositions

```
compositions/
├── AirsDemo/
│   ├── scenes/
│   ├── components/
│   └── index.tsx
└── MyNewProject/
    ├── scenes/
    ├── components/
    └── index.tsx
```

## 📝 File Naming Conventions

| Type       | Pattern          | Example              |
| ---------- | ---------------- | -------------------- |
| Components | PascalCase       | `BrowserFrame.tsx`   |
| Utilities  | camelCase        | `render-config.ts`   |
| Scenes     | PascalCase       | `Intro.tsx`          |
| Scripts    | kebab-case       | `record-footage.mjs` |
| Constants  | UPPER_SNAKE_CASE | `FRAME_RATES`        |

## 🔍 Finding Files

| Task                | Location                             |
| ------------------- | ------------------------------------ |
| Add a scene         | `src/scenes/NewScene.tsx`            |
| Add a component     | `src/components/NewComponent.tsx`    |
| Configure rendering | `src/utils/render-config.ts`         |
| Edit dashboard      | `public/index.html` or `studio.html` |
| Add media           | `public/assets/`                     |
| Run automation      | `src/automation/`                    |

## ✅ Structure Checklist

- [ ] Each scene is < 500 lines
- [ ] Components are reusable
- [ ] Assets are in `public/assets/`
- [ ] TypeScript strict mode enabled
- [ ] No console logs in production
- [ ] Documentation up to date
- [ ] Git ignores video outputs
- [ ] README.md at project root

---

**Version**: 1.0.252  
**Last Updated**: 2026-05-11  
**Maintainer**: Video Studio Team  
**Status**: Production Ready ✅
