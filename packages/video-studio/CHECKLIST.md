# Video Studio Completion Checklist

Track your progress through the entire workflow.

## ✅ Setup Phase

- [ ] **Navigate to package**

  ```bash
  cd packages/video-studio
  ```

- [ ] **Install dependencies**

  ```bash
  pnpm install
  ```

- [ ] **Verify installation**

  ```bash
  node --version  # v22+
  pnpm --version  # 9+
  which ffmpeg    # Installed
  ```

- [ ] **Check TypeScript**
  ```bash
  pnpm type-check
  ```

## 📖 Documentation Phase

- [ ] **Read QUICKSTART.md** (5 min)
- [ ] **Review STORYBOARD.md** (10 min)
- [ ] **Skim README.md** (10 min)
- [ ] **Bookmark FFMPEG_GUIDE.md** (reference)
- [ ] **Save RECIPES.md** (code snippets)

## 🎬 Preview Phase

- [ ] **Start Remotion Studio**

  ```bash
  pnpm dev
  ```

- [ ] **Open browser**

  - Navigate to http://localhost:3000
  - Studio should load

- [ ] **Explore scenes**

  - [ ] Intro (0:00-0:15)
  - [ ] Login (0:15-0:35)
  - [ ] Dashboard (0:35-1:10)
  - [ ] Interactions (1:10-1:50)
  - [ ] Impact (1:50-2:20)
  - [ ] Responsive (2:20-2:40)
  - [ ] Outro (2:40-3:00)

- [ ] **Test timeline scrubber**

  - [ ] Drag playhead left/right
  - [ ] Jump between frames
  - [ ] Verify smooth playback

- [ ] **Check scene renders**
  - [ ] No errors in console
  - [ ] All animations play
  - [ ] Colors look correct

## 🎨 Customization Phase (Optional)

### Edit Logo/Text

- [ ] Edit `src/scenes/Intro.tsx`

  - Change logo text
  - Change taglines
  - Adjust timing

- [ ] Edit `src/scenes/Outro.tsx`
  - Update CTA text
  - Change URL
  - Modify branding copy

### Change Colors

- [ ] Search & replace colors

  - `#00d9ff` → Your primary color
  - `#0099cc` → Your secondary color
  - `#0f0f0f` → Your dark background

- [ ] Test in preview (`pnpm dev`)

### Adjust Timing

- [ ] Edit `src/compositions/AirsDemo.tsx`

  - Modify `FRAME_RATES` object
  - Recalculate `frameStart` values
  - Ensure total = 5400 frames

- [ ] Verify in preview

### Add Content

- [ ] Update dashboard metrics
- [ ] Change transaction items
- [ ] Modify impact stats
- [ ] Adjust button labels

## 🎥 Rendering Phase

### First Test Render

- [ ] Clean build artifacts

  ```bash
  pnpm clean
  ```

- [ ] Render HD (test)

  ```bash
  pnpm render --from 0 --to 300
  ```

  (Just first 10 seconds to test)

- [ ] Check output
  - [ ] File exists
  - [ ] No artifacts/corruption
  - [ ] Audio (if added) syncs

### Full Render

- [ ] Render complete video

  ```bash
  pnpm render
  ```

  ⏱️ Expect 1-2 minutes

- [ ] Verify output
  ```bash
  ls -lh airs-demo-hd.mp4
  file airs-demo-hd.mp4
  ffprobe airs-demo-hd.mp4
  ```

### Multi-Preset Render

- [ ] Render all presets

  ```bash
  pnpm compose-studio all
  ```

- [ ] Check outputs
  - [ ] `airs-demo-hd.mp4` (1440x810)
  - [ ] `airs-demo-youtube.mp4` (1920x1080)
  - [ ] `airs-demo-4k.mp4` (3840x2160)
  - [ ] `airs-demo-social.mp4` (1440x810)

## 📹 Post-Processing Phase

### YouTube Export

- [ ] Read FFmpeg YouTube recipe (FFMPEG_GUIDE.md)

- [ ] Render YouTube format

  ```bash
  ffmpeg -i airs-demo-hd.mp4 \
    -c:v libx264 -preset slow -crf 18 \
    -c:a aac -b:a 128k \
    -pix_fmt yuv420p -movflags +faststart \
    airs-demo-youtube.mp4
  ```

- [ ] Verify output
  ```bash
  ffprobe airs-demo-youtube.mp4
  # Should show: 1920x1080, 30fps, H.264
  ```

### Social Media Export

- [ ] Render optimized social version

  ```bash
  pnpm compose-studio social
  ```

- [ ] Create vertical version (optional)
  ```bash
  ffmpeg -i airs-demo-hd.mp4 \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
    airs-demo-vertical.mp4
  ```

### Web Embed Export

- [ ] Render web-optimized version
  ```bash
  ffmpeg -i airs-demo-hd.mp4 \
    -c:v libx264 -preset fast -crf 24 \
    -c:a aac -b:a 64k \
    -pix_fmt yuv420p -movflags +faststart \
    airs-demo-web.mp4
  ```

## 🎵 Audio Integration (Optional)

### Generate Voiceover

- [ ] Use ElevenLabs or Whisper to generate voiceover
- [ ] Save as `src/assets/audio/voiceover.wav`

- [ ] Add to scene

  ```typescript
  import { Audio } from 'remotion';
  <Audio src='voiceover.wav' startFrom={0} />;
  ```

- [ ] Test in preview

### Add Soundtrack

- [ ] Obtain ambient electronic soundtrack
- [ ] Save as `src/assets/audio/soundtrack.wav`

- [ ] Mix with Remotion or FFmpeg
  ```bash
  ffmpeg -i airs-demo-hd.mp4 \
    -i soundtrack.wav \
    -filter_complex "[1]volume=0.3[a];[0][a]amix=inputs=2:duration=longest[out]" \
    -map 0:v:0 -map "[out]" \
    -c:v copy -c:a aac \
    airs-demo-final.mp4
  ```

## 📤 Upload Phase

### YouTube

- [ ] Prepare title & description
- [ ] Upload `airs-demo-youtube.mp4`

  - Resolution: 1920x1080
  - Duration: 3 minutes
  - Content type: Product demo

- [ ] Add metadata

  - [ ] Title: "AIRS by Alternun | Regenerative Finance"
  - [ ] Description: (see below)
  - [ ] Tags: AIRS, regenerative finance, crypto, fintech
  - [ ] Thumbnail: Custom thumbnail

- [ ] Publish
  - [ ] Set visibility (public/private/unlisted)
  - [ ] Schedule if needed
  - [ ] Verify playback

**Description Template:**

```
AIRS by Alternun — Regenerative Finance Infrastructure

Watch a cinematic walkthrough of AIRS: the platform
tokenizing verified gold reserves into digital gold-backed
assets while funding sustainability initiatives.

🌍 Blockchain-verified gold
🌱 Environmental impact tracking
💰 Decentralized governance
🔒 Transparent ecosystem

Learn more: testnet.airs.alternun.co
```

### LinkedIn

- [ ] Upload `airs-demo-social.mp4`

  - Aspect ratio: 16:9
  - Duration: 3 minutes

- [ ] Write post

  - Hook: "Watch AIRS in action"
  - Body: 2-3 sentences about regenerative finance
  - CTA: "Learn more" link

- [ ] Engage
  - [ ] Pin to profile
  - [ ] Share in relevant groups

### Twitter/X

- [ ] Upload `airs-demo-social.mp4`

  - Aspect ratio: 16:9 or 1:1

- [ ] Write thread

  - Tweet 1: Hook + video
  - Tweet 2-3: Key features
  - Tweet 4: CTA

- [ ] Add hashtags
  - #AIRS #RegenerativeFinance #Crypto #Web3

### TikTok / Instagram Reels

- [ ] Create/upload `airs-demo-vertical.mp4`

  - Aspect ratio: 9:16
  - Duration: ≤ 60 seconds (create clips)

- [ ] Edit captions
  - Keep text minimal
  - Use trending audio (optional)
  - Add trending hashtags

### Website Embed

- [ ] Copy `airs-demo-web.mp4` to server
- [ ] Add to website

  ```html
  <video controls width="100%" height="auto">
    <source src="/videos/airs-demo-web.mp4" type="video/mp4" />
    Your browser doesn't support HTML5 video.
  </video>
  ```

- [ ] Test playback
  - [ ] Desktop
  - [ ] Mobile
  - [ ] Different browsers

## 📊 Analytics Phase

### Track Performance

- [ ] **YouTube Analytics**

  - Views
  - Watch time
  - Click-through rate
  - Audience retention

- [ ] **Social Metrics**

  - Engagement rate
  - Share count
  - Comment sentiment
  - Follower growth

- [ ] **Website Analytics**
  - Video plays
  - Drop-off rate
  - Conversion rate
  - Device breakdown

### Adjust if Needed

- [ ] A/B test different descriptions
- [ ] Update CTA based on performance
- [ ] Create variations (15s, 30s clips)
- [ ] Repurpose for different platforms

## 🔄 Iteration Phase

### Feedback Gathering

- [ ] Collect team feedback
- [ ] Gather user feedback
- [ ] Monitor comments
- [ ] Track performance metrics

### Updates

- [ ] Make improvements based on feedback
- [ ] Create variations (different lengths)
- [ ] Update text/copy
- [ ] Re-render and re-upload

### Documentation

- [ ] Document changes in git
- [ ] Update storyboard if major changes
- [ ] Record new rendering times
- [ ] Update metrics

## ✨ Final Checklist

- [ ] Video renders without errors
- [ ] All 7 scenes complete and polished
- [ ] Colors match brand guidelines
- [ ] Animations are smooth (no jank)
- [ ] Audio (if added) syncs perfectly
- [ ] Uploaded to all platforms
- [ ] Links working correctly
- [ ] Analytics tracking installed
- [ ] Team has been notified
- [ ] Celebrating success! 🎉

---

## 🆘 Troubleshooting Checklist

### Render Issues

- [ ] Check disk space: `df -h`
- [ ] Clear cache: `pnpm clean`
- [ ] Update dependencies: `pnpm install`
- [ ] Rebuild: `pnpm build`
- [ ] Check logs for errors

### Performance Issues

- [ ] Lower resolution for preview
- [ ] Reduce animation complexity
- [ ] Disable GPU effects temporarily
- [ ] Render frame-by-frame if needed

### Upload Issues

- [ ] Check file format (H.264 MP4)
- [ ] Verify aspect ratio (16:9)
- [ ] Check file size (< 5GB for most platforms)
- [ ] Verify metadata included
- [ ] Test with different browser/device

### Quality Issues

- [ ] Re-render with CRF 18 instead of 22
- [ ] Check for banding/compression artifacts
- [ ] Verify color space (yuv420p)
- [ ] Use slower FFmpeg preset

---

## 📝 Notes

Use this section to track your own notes:

```
Date Started: ___________
Total Render Time: ___________
Final File Size: ___________
Notes:
______________________________________________________________________
______________________________________________________________________
______________________________________________________________________
```

---

**Status:** Ready to begin!  
**Next Action:** Run `pnpm install` and `pnpm dev`

Good luck! 🚀
