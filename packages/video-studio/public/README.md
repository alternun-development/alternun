# AIRS Studio - Public Assets Structure

Organized folder structure for managing Remotion compositions, recordings, and assets.

## 📁 Directory Layout

```
public/
├── index.html              # Main dashboard entry point
├── studio.html             # Studio dashboard (alternative)
├── README.md              # This file
│
├── assets/                # Media assets for compositions
│   ├── phone.mp4          # Sample mobile device video
│   └── tablet.mp4         # Sample tablet device video
│
├── compositions/          # Composition management & selection
│   └── index.html        # Browse available compositions
│
├── recorder/             # Scene recording interface
│   └── index.html       # Scene recorder dashboard
│
├── projects/            # User project files & metadata
│   └── .gitkeep
│
└── (video files)        # Rendered output files
    ├── airs-demo-hd.mp4
    ├── airs-demo-4k.mp4
    └── ...
```

## 🎬 Available Compositions

### Main Compositions

- **AirsDemo** - Main 3-minute product showcase (7 cinematic scenes)
  - Location: `src/Root.tsx`
  - Duration: 3 minutes (5400 frames @ 30fps)
  - Resolution: 1440×810

### Coming Soon

- **SceneRecorder** - Individual scene recording tool
- **VideoEditor** - Professional composition editor
- **Templates** - Pre-built templates library

## 🎥 Using the Recorder

### Start Recording

1. Navigate to `http://localhost:3000/recorder/`
2. Click "🎥 Start Recording"
3. Interact with the composition
4. Click "⏹ Stop Recording"
5. View stats (duration, frame count)

### Saved Data

Recordings are saved to browser localStorage:

- `video_projects` - Project list
- `video_recordings_{projectId}` - Per-project recordings

## 📦 Assets Management

Place media files in `assets/`:

- **Videos** (`*.mp4`, `*.mov`) - For composition overlays
- **Images** (`*.png`, `*.jpg`) - For backgrounds & overlays
- **Audio** (`*.mp3`, `*.wav`) - For soundtracks

### Using Assets in Compositions

```typescript
import { staticFile } from 'remotion';

// In your composition:
const videoSrc = staticFile('assets/phone.mp4');
```

## 🎨 Folder Organization

### For Multiple Projects

```
public/projects/
├── airs-demo-v1/
│   ├── metadata.json
│   ├── recordings.json
│   └── assets/
├── airs-demo-v2/
│   ├── metadata.json
│   ├── recordings.json
│   └── assets/
└── client-showcase/
    ├── metadata.json
    ├── recordings.json
    └── assets/
```

### Project Metadata Format

```json
{
  "id": "proj-1234567890",
  "name": "AIRS Demo v1",
  "createdAt": 1778554000000,
  "composition": "AirsDemo",
  "description": "Product showcase video",
  "tags": ["product", "marketing", "demo"],
  "status": "recording" | "editing" | "rendered" | "complete"
}
```

## 🔗 Navigation Flow

```
index.html (Dashboard)
├── /compositions/     → Browse all available compositions
│   ├── AirsDemo      → Open in Remotion Studio
│   ├── SceneRecorder → (Coming Soon)
│   └── VideoEditor   → (Coming Soon)
│
├── /recorder/        → Scene recording interface
│   └── Start Recording
│
└── Remotion Studio   → Full composition editor
```

## 📊 File Size Guidelines

- **Video Assets**: Keep under 100MB each
- **Projects**: Metadata files < 1MB
- **Media**: Compress before storing (H.264 codec recommended)

## 🔐 Best Practices

1. **Organize by Project** - Use separate folders for each client/project
2. **Version Assets** - Tag assets with version numbers (`asset-v1.mp4`)
3. **Document Metadata** - Keep project metadata in JSON files
4. **Clean Old Files** - Archive rendered videos separately
5. **Backup Recordings** - Export important sessions regularly

## 📝 Export Data from localStorage

```javascript
// In browser console:
const projects = JSON.parse(localStorage.getItem('video_projects'));
const recordings = JSON.parse(localStorage.getItem('video_recordings_PROJECT_ID'));

// Download as JSON file
const data = { projects, recordings };
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'airs-studio-backup.json';
a.click();
```

## 🔄 Workflow Example

```
1. Create Project
   → Click "+ New Project" in dashboard
   → Enter "AIRS Demo v1"

2. Record Session
   → Click "⏺ Start Recording"
   → Perform actions
   → Click "⏹ Stop Recording"
   → View in recordings list

3. Access Compositions
   → Click "📚 Compositions"
   → Browse available compositions
   → Click to open in Remotion Studio

4. Use Scene Recorder
   → Go to "🎞️ Scene Recorder"
   → Record individual scenes
   → Export combined video

5. Render Final Video
   → Remotion Studio → Render
   → Output: public/airs-demo-hd.mp4
```

## 📚 Related Docs

- [../SETUP.md](../SETUP.md) - Installation & configuration
- [../README.md](../README.md) - Complete reference
- [src/Root.tsx](../src/Root.tsx) - Composition registration

---

**Version**: 1.0.252  
**Last Updated**: 2026-05-11  
**Status**: Production Ready ✅
