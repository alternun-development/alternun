# AIRS Video Studio

Remotion-based cinematic product demo video production for AIRS by Alternun.

## Overview

This package generates a professional 3-minute product demo video showcasing AIRS—a regenerative finance platform that tokenizes verified gold reserves into digital gold-backed assets.

**Target outputs:**

- 1440p HD (30fps) for demos & social
- 1080p YouTube format (30fps)
- 4K master (3840x2160) for archive
- Social media optimized (1:1 aspect ratio, 60fps)

## Tech Stack

- **Remotion** — Video composition & rendering
- **React 19** — Component-based scenes
- **Playwright** — Live product automation
- **FFmpeg** — Post-processing & encoding
- **TypeScript** — Type-safe composition

## Project Structure

```
src/
├── index.tsx                  # Remotion entry point
├── compositions/
│   └── AirsDemo.tsx          # Main 7-scene orchestration
├── scenes/
│   ├── Intro.tsx             # Logo reveal (0:00-0:15)
│   ├── Login.tsx             # Auth flow (0:15-0:35)
│   ├── Dashboard.tsx         # Portfolio overview (0:35-1:10)
│   ├── Interactions.tsx       # Transactions & staking (1:10-1:50)
│   ├── Impact.tsx            # Regenerative focus (1:50-2:20)
│   ├── Responsive.tsx        # Mobile view (2:20-2:40)
│   └── Outro.tsx             # CTA & branding (2:40-3:00)
├── components/
│   ├── BrowserFrame.tsx      # Macbook-style window frame
│   ├── CinematicText.tsx     # Animated typography
│   └── GradientBackground.tsx # Dynamic backgrounds
├── automation/
│   └── record-footage.mjs    # Playwright automation
└── utils/
    ├── render-config.ts      # Rendering presets
    └── compose-studio.mjs    # CLI composition tool
```

## Quick Start

### Prerequisites

```bash
# Node 22+, pnpm 9+
node --version  # v22.0.0+
pnpm --version  # 9.0.0+
```

### Installation

```bash
cd packages/video-studio
pnpm install
```

### Development

```bash
# Start Remotion preview (live composition editing)
pnpm dev

# Open browser at: http://localhost:3000
# Hot reload on file changes
```

### Rendering

```bash
# Render HD (1440p, 30fps)
pnpm render

# Render YouTube (1080p, 30fps)
pnpm compose-studio youtube

# Render 4K master (3840x2160)
pnpm compose-studio 4k

# Render all presets
pnpm compose-studio all
```

## Scene Breakdown

### Scene 1: Intro (0:00 - 0:15)

- Fade in from black
- AIRS logo reveal with glow effect
- Tagline: "AIRS by Alternun"
- Subtitle: "Regenerative Finance Infrastructure"
- Cinematic fade transition

**Style:** Dark elegant gradient, cyan accent lighting

### Scene 2: Login (0:15 - 0:35)

- Browser window opens to landing page
- Realistic cursor movement
- "Connect Wallet" & "Sign Up" buttons
- Smooth zoom transition

**Automation:** Playwright simulates user interaction with natural easing

### Scene 3: Dashboard (0:35 - 1:10)

- Portfolio overview with 4 stat cards
- Total Assets: $2,450,000
- Gold Reserve: 45,200 oz
- Staking Rewards: $48,500
- Ecosystem Impact: 2,400 trees
- Animated line chart showing 30-day growth

**Animation:** Staggered card reveals, floating SVG chart

### Scene 4: Interactions (1:10 - 1:50)

- Transactions tab view
- Transaction history list with status badges
- Deposit, Stake, Claim workflows
- Tab navigation: Transactions → Staking → Governance → Yield

**Interaction:** Hover states, smooth list reveals

### Scene 5: Impact (1:50 - 2:20)

- Full-screen regenerative finance focus
- Floating particle background
- Key metrics:
  - Gold Verified: 125,000 oz
  - Trees Planted: 34,500
  - CO₂ Offset: 12,450 tons
- Feature bullets with checkmarks

**Style:** Green-tinted gradient, cinematic floating elements

### Scene 6: Responsive (2:20 - 2:40)

- Desktop device frame (1440x810 viewport)
- Mobile device frame (iPhone-style)
- Side-by-side comparison
- Responsive design showcase

**Animation:** Sequential zoom transitions, scale effects

### Scene 7: Outro (2:40 - 3:00)

- AIRS logo return
- "Built by Alternun"
- "The Future of Regenerative Finance"
- CTA button: "Join the Revolution"
- URL: testnet.airs.alternun.co
- Fade to black

## Automation with Playwright

### Recording Live Footage

```bash
# Launch Playwright recording script
pnpm playwright:record
```

This script:

- Navigates to `https://testnet.airs.alternun.co`
- Records realistic user interactions
- Uses natural mouse movement with easing functions
- Simulates typing delays
- Captures smooth scrolling
- Outputs raw video frames

**Recorded scenes:**

1. Login flow with wallet connection
2. Dashboard navigation
3. Transaction history exploration

### Easing Functions

Smooth cursor movement uses `easeInOutQuad` interpolation:

```javascript
// Realistic bezier easing (not linear)
const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

const x = fromX + (toX - fromX) * easeProgress;
const y = fromY + (toY - fromY) * easeProgress;
```

### Typing Simulation

```javascript
await typeWithPauses(page, selector, 'text', 50);
// Types each character with 50ms delay between keystrokes
```

## Rendering Pipeline

### Development Preview

```bash
pnpm dev
# Runs Remotion studio at http://localhost:3000
# Live preview with timeline scrubbing
# Real-time parameter adjustment
```

### Production Render

```bash
# HD (recommended for demos)
pnpm render

# Generates: airs-demo-hd.mp4 (1440x810 @ 30fps)
# Codec: H.264 (high compatibility)
# Quality: 100 (lossless intermediate, re-encoded final)
```

### FFmpeg Post-Processing

```bash
# Optimize for YouTube
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -c:a aac \
  -b:a 128k \
  airs-demo-youtube.mp4

# Optimize for web/streaming
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset fast \
  -crf 24 \
  -movflags +faststart \
  airs-demo-web.mp4
```

## Configuration

### remotion.config.ts

```typescript
Config.setDimensions(1440, 810); // 16:9 HD
Config.setFps(30); // 30 frames/second
Config.setCodec('h264'); // H.264 codec
Config.setVideoImageFormat('png'); // Lossless intermediates
Config.setFrameRange([0, 5400]); // 180 seconds
```

### Rendering Presets (src/utils/render-config.ts)

```typescript
resolution: {
  hd: { width: 1440, height: 810 },
  '4k': { width: 3840, height: 2160 },
  youtube: { width: 1920, height: 1080 },
}

fps: {
  cinema: 24,    // Cinematic look
  standard: 30,  // Default smooth
  smooth: 60,    // Ultra-smooth
}
```

## Visual Style Guide

### Color Palette

- **Primary Accent:** `#00d9ff` (Cyan)
- **Secondary Accent:** `#0099cc` (Deep cyan)
- **Background Dark:** `#0f0f0f` (Almost black)
- **Background Medium:** `#1a1a2e` (Dark slate)
- **Text Primary:** `#ffffff` (White)
- **Text Secondary:** `#a0a0a0` (Gray)
- **Status Success:** `#00d9ff` (Cyan)
- **Status Pending:** `#ffa500` (Amber)

### Typography

- **Display/Headers:** 700 weight, letter-spacing 2px
- **Body:** 400 weight, system font stack
- **Mono:** `Monaco`, `Courier New` for metrics

### Effects

- **Glow:** `text-shadow: 0 0 30px rgba(0, 217, 255, 0.5)`
- **Gradient:** `linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)`
- **Soft edges:** `border-radius: 8px`
- **Depth:** `box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4)`

## Performance Tips

### Optimize Renders

```bash
# Skip frames during development
pnpm dev --concurrency 2

# Use lower resolution for preview
pnpm render --width 720 --height 405

# Render specific frame range for testing
pnpm render --from 450 --to 900
```

### Resource Management

- Each scene ≤ 4MB of assets
- SVG graphs instead of PNG/JPG
- CSS gradients (GPU-accelerated)
- Minimize DOM nodes per frame
- Use `position: absolute` for overlays

## Delivery Formats

### YouTube

```bash
pnpm compose-studio youtube
# 1920x1080 @ 30fps
# H.264 codec, 8000 kbps bitrate
# Aspect ratio: 16:9
# File: airs-demo-youtube.mp4
```

### Social Media (Instagram, TikTok)

```bash
pnpm compose-studio social
# 1080x1080 @ 60fps (1:1 aspect)
# H.264 codec, 5000 kbps bitrate
# Aspect ratio: 1:1
# File: airs-demo-social.mp4
```

### 4K Archive

```bash
pnpm compose-studio 4k
# 3840x2160 @ 30fps
# H.264 codec, lossless
# Master quality for future re-editing
# File: airs-demo-4k.mp4
```

### Web Embed

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset fast \
  -crf 24 \
  -movflags +faststart \
  airs-demo-web.mp4
```

## Audio Integration

### Adding Soundtrack

1. Place audio file: `src/assets/audio/airs-ambient.wav`
2. Import in scene composition:

```typescript
import { Audio } from 'remotion';

<Audio src='airs-ambient.wav' startFrom={0} />;
```

### Voiceover Integration

Use ElevenLabs or Whisper for AI narration:

```bash
# Generate voiceover with ElevenLabs
curl https://api.elevenlabs.io/v1/text-to-speech \
  -H "xi-api-key: YOUR_KEY" \
  -d '{"text":"Welcome to AIRS...","voice_id":"..."}' \
  > voiceover.mp3
```

## Troubleshooting

### Preview not loading

```bash
# Clear cache & rebuild
pnpm clean
pnpm install
pnpm dev
```

### Render timeout

```bash
# Render in smaller chunks
pnpm render --from 0 --to 1800      # First minute
pnpm render --from 1800 --to 3600   # Second minute
pnpm render --from 3600 --to 5400   # Third minute
```

### Performance issues

- Reduce animation complexity
- Use lower frame rate (24fps instead of 30)
- Disable GPU-intensive effects during dev
- Profile with DevTools: `pnpm dev --profiler`

## Next Steps

1. **Publish to platforms:**

   - YouTube channel
   - LinkedIn
   - Twitter/X
   - TikTok (social preset)

2. **Add audio:**

   - Ambient electronic soundtrack
   - Optional AI voiceover
   - Subtle UI interaction sounds

3. **Create variants:**

   - Short-form social clips (15s, 30s)
   - Vertical format (9:16 for Stories)
   - Different language versions

4. **Integration:**
   - Landing page embed
   - Email campaigns
   - Investor deck

## Commands Reference

```bash
# Development
pnpm dev                  # Preview in Remotion Studio
pnpm type-check          # TypeScript validation

# Rendering
pnpm build               # Build HD preset
pnpm render              # Render HD (1440p)
pnpm compose-studio hd   # HD preset
pnpm compose-studio youtube
pnpm compose-studio 4k
pnpm compose-studio all  # All presets

# Automation
pnpm playwright:record   # Record live footage

# Utilities
pnpm clean              # Remove build artifacts
pnpm benchmark          # Performance analysis
```

## License

Part of Alternun. See root LICENSE file.
