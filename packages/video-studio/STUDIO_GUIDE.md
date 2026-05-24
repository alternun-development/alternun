# AIRS Studio - Recording & Project Management Guide

Professional video production management interface for AIRS demo video.

## 🎬 What is AIRS Studio?

AIRS Studio is a unified interface that combines:

- **Recording Studio** — Project and recording management
- **Remotion Studio** — Video composition and preview
- **Documentation** — Quick access to guides and resources

Access it at: **http://localhost:3000** (when running `pnpm dev`)

## 🚀 Getting Started

### Start the Studio

```bash
cd packages/video-studio
pnpm dev
# Opens http://localhost:3000
```

### From Dev:All

```bash
pnpm dev:all:video
# Then navigate to http://localhost:3000
```

## 📋 Features

### Recording Studio

Track all video recordings and projects in a centralized dashboard.

**Create a Project:**

1. Click **+ New Project**
2. Enter project name (e.g., "AIRS Demo v1")
3. Click **Create**

**Start Recording:**

1. Select a project
2. Click **⏺ Start Recording**
3. Records timestamp, duration, frame count
4. Click **⏹ Stop Recording** to finish

**Project Tracking:**

- Total recordings per project
- Duration accumulated
- Frame count
- Recording timestamps
- Status indicators (idle, recording, rendering, completed)

**Data Persistence:**

- Projects saved to localStorage
- Recordings automatically tracked
- Export history available

### Remotion Studio

Full video composition and preview environment.

**Access:**

1. In AIRS Studio home, click **🎨 Remotion Studio**
2. Or refresh the page to go directly to Remotion

**Features:**

- Live preview of video composition
- Timeline scrubbing (frame-by-frame control)
- Real-time hot reload
- Multiple composition support
- Render controls

**Scenes Available:**

1. Intro (0:00-0:15)
2. Login (0:15-0:35)
3. Dashboard (0:35-1:10)
4. Interactions (1:10-1:50)
5. Impact (1:50-2:20)
6. Responsive (2:20-2:40)
7. Outro (2:40-3:00)

## 🎥 Workflow

### Typical Production Workflow

```
1. Create Project
   └─ Name: "AIRS Demo v1"

2. Preview Composition
   └─ Use Remotion Studio for timing
   └─ Adjust scenes as needed

3. Record Session
   └─ Start recording in Recording Studio
   └─ Test camera movement, cursor positions
   └─ Stop when done

4. Review Recording
   └─ Check duration and frame count
   └─ Verify all scenes recorded correctly

5. Render Final Video
   └─ Use: pnpm render
   └─ Output: airs-demo-hd.mp4

6. Post-Process
   └─ Use FFmpeg recipes from FFMPEG_GUIDE.md
   └─ Create platform-specific versions
```

## 💾 Data Storage

### Local Storage

Projects and recordings are saved in browser localStorage:

- **Key:** `video_projects` — All projects
- **Key:** `video_recordings` — All recordings

**Export Data:**

```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('video_projects')));
console.log(JSON.parse(localStorage.getItem('video_recordings')));
```

**Clear Data:**

```javascript
// In browser console (CAREFUL: deletes all projects)
localStorage.removeItem('video_projects');
localStorage.removeItem('video_recordings');
```

## 🎯 Recording Statistics

### What's Tracked

Per Recording:

- ✅ Recording ID
- ✅ Project ID
- ✅ Recording name
- ✅ Start time
- ✅ End time
- ✅ Status (recording/paused/completed)
- ✅ Duration (in seconds)

Per Project:

- ✅ Project ID
- ✅ Project name
- ✅ Creation date
- ✅ Status (idle/recording/rendering/completed)
- ✅ Total duration accumulated
- ✅ Total frame count

## 🔧 Customization

### Rename a Project

Projects are stored in localStorage. To rename:

```javascript
// In browser console
const projects = JSON.parse(localStorage.getItem('video_projects'));
projects[0].name = 'New Name';
localStorage.setItem('video_projects', JSON.stringify(projects));
location.reload();
```

### Add Custom Fields

Edit `src/studio/RecordingStudio.tsx` to add:

- [ ] Notes/comments per recording
- [ ] Tags or categories
- [ ] Custom metadata
- [ ] Export to CSV/JSON

## 📊 Analyzing Data

### Duration by Project

```javascript
const projects = JSON.parse(localStorage.getItem('video_projects'));
projects.forEach((p) => {
  console.log(`${p.name}: ${p.duration}s (${p.frameCount} frames)`);
});
```

### Total Recording Time

```javascript
const projects = JSON.parse(localStorage.getItem('video_projects'));
const total = projects.reduce((sum, p) => sum + p.duration, 0);
console.log(`Total: ${(total / 60).toFixed(1)} minutes`);
```

### Recording Sessions per Day

```javascript
const recordings = JSON.parse(localStorage.getItem('video_recordings'));
const byDay = {};
recordings.forEach((r) => {
  const day = new Date(r.startTime).toDateString();
  byDay[day] = (byDay[day] || 0) + 1;
});
console.log(byDay);
```

## 🎨 UI Customization

### Colors

Edit `src/studio/StudioEntry.tsx` or `src/studio/RecordingStudio.tsx`:

```typescript
// Primary accent
color: '#00d9ff'; // Change to your color

// Background
background: '#0f0f1e'; // Change to your background

// Borders
border: '1px solid rgba(0, 217, 255, 0.1)'; // Change opacity/color
```

### Layout

**Sidebar width:** Line 23 in `RecordingStudio.tsx`

```typescript
width: '280px'; // Change sidebar width
```

**Grid columns:** Line in `StudioEntry.tsx`

```typescript
gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))';
```

## 🆘 Troubleshooting

### Studio shows black screen

1. Check browser console for errors
2. Verify Remotion server started:
   ```bash
   curl http://localhost:3000
   ```
3. Try refreshing the page
4. Restart dev server: `pnpm dev`

### Recordings not saving

1. Check browser localStorage is enabled
2. Check available disk space
3. Clear cache and try again:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Performance issues

- Close unused tabs
- Clear browser cache
- Reduce number of projects
- Use Firefox or Chrome (not Safari)

## 📚 Next Steps

1. **Create your first project**
2. **Preview compositions in Remotion**
3. **Start recording sessions**
4. **Render final video** (`pnpm render`)
5. **Post-process** with FFmpeg recipes
6. **Upload** to platforms

## 📖 Related Docs

- [README.md](./README.md) — Complete reference
- [QUICKSTART.md](./QUICKSTART.md) — 5-minute setup
- [STORYBOARD.md](./STORYBOARD.md) — Frame-by-frame specs
- [FFMPEG_GUIDE.md](./FFMPEG_GUIDE.md) — Video encoding
- [RECIPES.md](./RECIPES.md) — Code patterns

---

**Version:** 1.0.252  
**Last Updated:** 2026-05-11  
**Status:** Production Ready ✅
