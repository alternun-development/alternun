# Quick Start — AIRS Video Studio

Get your first render running in 5 minutes.

## 1. Install Dependencies

```bash
cd packages/video-studio
pnpm install
```

## 2. Preview the Composition

```bash
pnpm dev
```

Opens Remotion Studio at **http://localhost:3000**

- Real-time preview of all 7 scenes
- Timeline scrubber to jump between scenes
- Live hot-reload on file changes
- Adjust animation timing instantly

## 3. Render Your First Video

```bash
# HD render (1440x810 @ 30fps)
pnpm render

# Output: airs-demo-hd.mp4 (~60-90 seconds render time)
```

## Available Commands

```bash
# Development
pnpm dev                    # Remotion Studio preview

# Rendering
pnpm build                  # Build HD render
pnpm render                 # Render HD (default preset)
pnpm render:4k             # Render 4K master
pnpm render:hd             # HD explicit
pnpm benchmark             # Performance test

# Composition
pnpm compose-studio hd      # CLI render HD
pnpm compose-studio youtube # Render YouTube format
pnpm compose-studio 4k      # Render 4K
pnpm compose-studio all     # All formats at once

# Automation
pnpm playwright:record     # Record live product footage

# Maintenance
pnpm clean                 # Remove build artifacts
```

## Scene Timeline

The 3-minute video breaks into 7 cinematic scenes:

| Scene | Duration  | What                             | Frame Range |
| ----- | --------- | -------------------------------- | ----------- |
| 1     | 0:00-0:15 | Logo reveal, intro fade          | 0-450       |
| 2     | 0:15-0:35 | Browser login, wallet connection | 450-1050    |
| 3     | 0:35-1:10 | Dashboard portfolio overview     | 1050-2100   |
| 4     | 1:10-1:50 | Transaction interactions         | 2100-3300   |
| 5     | 1:50-2:20 | Regenerative finance positioning | 3300-4200   |
| 6     | 2:20-2:40 | Responsive desktop/mobile        | 4200-4800   |
| 7     | 2:40-3:00 | Outro CTA & branding             | 4800-5400   |

**Total:** 5400 frames @ 30fps = 180 seconds (3 minutes)

## Edit a Scene

### Example: Change Intro Logo Color

Open [src/scenes/Intro.tsx](src/scenes/Intro.tsx#L35):

```typescript
// Change this line:
color: '#00d9ff' → color: '#ff00ff'
```

Save the file. Remotion Studio hot-reloads instantly.

### Example: Extend Scene Duration

Edit [src/compositions/AirsDemo.tsx](src/compositions/AirsDemo.tsx#L7):

```typescript
const FRAME_RATES = {
  intro: 450,      // Change this to 600 for 20 seconds instead of 15
  ...
}
```

Recalculate frame ranges below and verify total = 5400.

### Example: Change Color Palette

Search-replace across all scene files:

- `#00d9ff` (cyan) → Your color
- `#ffffff` (white) → Your color
- `#0f0f0f` (black) → Your color

## Common Customizations

### Add Voiceover

1. Generate voiceover with ElevenLabs or Whisper
2. Save as `src/assets/audio/voiceover.wav`
3. Import in scene:

```typescript
import { Audio } from 'remotion';

<Audio src='voiceover.wav' startFrom={0} />;
```

### Change Background Gradient

In any scene component, edit the `background` CSS:

```typescript
background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)';
// Change these hex values
```

### Replace Logo Text

Change "AIRS" to your brand name in [src/scenes/Intro.tsx](src/scenes/Intro.tsx#L30):

```typescript
<div>Your Brand Name</div>
```

### Adjust Animation Speed

Modify easing and frame ranges in interpolate calls:

```typescript
// Make fade faster (30 frames instead of 60)
const opacity = interpolate(frame, [0, 30], [0, 1], {...})

// Change easing from cubic to quad
easing: Easing.out(Easing.quad)
```

## File Organization

```
video-studio/
├── src/
│   ├── index.tsx              ← Remotion entry
│   ├── compositions/
│   │   └── AirsDemo.tsx        ← Main orchestration
│   ├── scenes/
│   │   ├── Intro.tsx           ← 7 scene components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Interactions.tsx
│   │   ├── Impact.tsx
│   │   ├── Responsive.tsx
│   │   └── Outro.tsx
│   ├── components/
│   │   ├── BrowserFrame.tsx    ← Reusable components
│   │   ├── CinematicText.tsx
│   │   └── GradientBackground.tsx
│   ├── automation/
│   │   └── record-footage.mjs  ← Playwright automation
│   └── utils/
│       ├── render-config.ts    ← Render presets
│       └── compose-studio.mjs  ← CLI tool
├── README.md                   ← Full documentation
├── STORYBOARD.md              ← Frame-by-frame breakdown
├── FFMPEG_GUIDE.md            ← Post-processing
├── QUICKSTART.md              ← This file
├── remotion.config.ts         ← Remotion config
├── tsconfig.json              ← TypeScript config
└── package.json               ← Dependencies
```

## Export for Different Platforms

After rendering `airs-demo-hd.mp4`:

### YouTube

```bash
# Use FFmpeg to optimize for YouTube
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 128k \
  -pix_fmt yuv420p -movflags +faststart \
  airs-demo-youtube.mp4

# Upload to YouTube Studio
```

### Social Media (Instagram, TikTok, LinkedIn)

```bash
# Use compose-studio script
pnpm compose-studio social
# Outputs: airs-demo-social.mp4 (optimized bitrate)
```

### Website Embed

Already in web-ready format. Use `<video>` tag:

```html
<video width="1440" height="810" controls>
  <source src="/videos/airs-demo-hd.mp4" type="video/mp4" />
</video>
```

## Troubleshooting

### "Cannot find module 'remotion'"

```bash
# Reinstall dependencies
pnpm install
pnpm install remotion @remotion/cli react react-dom
```

### Preview shows blank screen

```bash
# Clear cache and rebuild
pnpm clean
pnpm install
pnpm dev
```

### Render is slow

```bash
# Use faster preset (lower quality)
pnpm render --preset fast

# Or render lower resolution for testing
pnpm render --width 720 --height 405
```

### Out of memory during render

```bash
# Render in segments
pnpm render --from 0 --to 1800      # First 60s
pnpm render --from 1800 --to 3600   # Next 60s
pnpm render --from 3600 --to 5400   # Final 60s

# Then concatenate with FFmpeg
ffmpeg -f concat -safe 0 -i filelist.txt -c copy final.mp4
```

## Next Steps

1. **Preview:** Run `pnpm dev` and explore the timeline
2. **Customize:** Edit colors, text, durations in scene files
3. **Render:** Generate `airs-demo-hd.mp4` with `pnpm render`
4. **Export:** Use FFmpeg recipes in [FFMPEG_GUIDE.md](FFMPEG_GUIDE.md) for YouTube/social
5. **Upload:** Share to platforms

## Documentation Index

- **README.md** — Full project documentation & architecture
- **STORYBOARD.md** — Scene-by-scene visual breakdown with frame timing
- **FFMPEG_GUIDE.md** — Video encoding & platform optimization
- **QUICKSTART.md** — This file (get started in 5 minutes)

## Need Help?

- Check [README.md](README.md#troubleshooting) troubleshooting section
- Review [STORYBOARD.md](STORYBOARD.md) for scene details
- Inspect component files for animation details
- Run `pnpm dev` and experiment with timeline scrubbing

---

**Ready?** → `pnpm dev` and open http://localhost:3000
