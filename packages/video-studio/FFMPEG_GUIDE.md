# FFmpeg Post-Processing Guide

Professional video encoding and delivery optimization for AIRS demo video.

## Prerequisites

```bash
# Install FFmpeg with full codec support
brew install ffmpeg --with-libx265 --with-libvpx
# or
apt-get install ffmpeg libx265-dev libvpx-dev
```

## Quick Export Presets

### YouTube Optimized

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -maxrate 8000k \
  -bufsize 16000k \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  airs-demo-youtube.mp4
```

**Output:** 1920x1080 @ 30fps, ~200-250 MB  
**Bitrate:** 6-8 Mbps  
**Quality:** High (near-lossless)

### Social Media (Instagram, LinkedIn, Twitter)

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 22 \
  -maxrate 5000k \
  -c:a aac \
  -b:a 96k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  airs-demo-social.mp4
```

**Output:** 1440x810 @ 30fps, ~80-120 MB  
**Bitrate:** 3-5 Mbps  
**Quality:** Good balance

### Web Streaming

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -preset fast \
  -crf 24 \
  -maxrate 3000k \
  -c:a aac \
  -b:a 64k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  airs-demo-web.mp4
```

**Output:** 1440x810 @ 30fps, ~40-60 MB  
**Bitrate:** 2-3 Mbps  
**Quality:** Good for web (optimized for streaming)

### Vertical Format (TikTok, Instagram Reels, Shorts)

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 \
  -preset medium \
  -crf 22 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  airs-demo-vertical.mp4
```

**Output:** 1080x1920 @ 30fps  
**Aspect:** 9:16 (portrait)  
**Quality:** High

### Master Archive (Lossless)

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx265 \
  -preset slow \
  -crf 12 \
  -c:a flac \
  -pix_fmt yuv420p10le \
  airs-demo-master.mkv
```

**Output:** Matroska container, 10-bit color  
**Bitrate:** 15-25 Mbps  
**Quality:** Master quality (future-proof)

---

## Detailed Encoding Parameters

### Video Codec Selection

| Codec            | Use Case        | Compatibility        | Quality   | File Size |
| ---------------- | --------------- | -------------------- | --------- | --------- |
| H.264 (libx264)  | **Universal**   | Excellent            | Good      | Larger    |
| H.265 (libx265)  | Master, archive | Good (newer devices) | Excellent | Smallest  |
| VP9 (libvpx-vp9) | YouTube, Google | Good (Chrome, FF)    | Excellent | Medium    |
| AV1 (libaom-av1) | Future-proof    | Limited              | Excellent | Smallest  |

### CRF (Quality) Scale

Lower = better quality, larger file

```
CRF 18 → Near-lossless (YouTube)
CRF 22 → High quality (social)
CRF 24 → Good quality (web)
CRF 28 → Acceptable quality (mobile)
CRF 32 → Low quality (streaming)
```

### Preset Speeds

Slower = better compression, longer encode time

```
ultrafast    → 5 min encode (worst compression)
superfast    → 10 min
veryfast     → 20 min
faster       → 40 min
fast         → 1 hour
medium       → 2-3 hours
slow         → 5-8 hours
slower       → 10-15 hours
veryslow     → 20-30 hours (best compression, rarely needed)
```

### Audio Codecs

| Codec | Bitrate | Usage             | Quality |
| ----- | ------- | ----------------- | ------- |
| AAC   | 128k    | YouTube, social   | High    |
| AAC   | 96k     | Web streaming     | Good    |
| FLAC  | 256k    | Master lossless   | Perfect |
| Opus  | 96k     | Streaming (newer) | Good    |

---

## Advanced Encoding Recipes

### Two-Pass Encoding (Better Quality)

Pass 1 — Analyze file:

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -b:v 6000k \
  -preset slow \
  -pass 1 \
  -f null \
  /dev/null
```

Pass 2 — Encode with statistics:

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v libx264 \
  -b:v 6000k \
  -preset slow \
  -pass 2 \
  -c:a aac \
  -b:a 128k \
  airs-demo-youtube.mp4
```

**Result:** Optimized bitrate allocation, 10-15% better quality

### Add Subtitles/Captions

Create SRT file (`airs-demo.srt`):

```
1
00:00:00,000 --> 00:00:15,000
AIRS by Alternun

2
00:00:15,000 --> 00:00:35,000
Regenerative Finance Infrastructure

3
00:00:35,000 --> 00:01:10,000
Connect your wallet to access your portfolio
```

Burn subtitles into video:

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -vf "subtitles=airs-demo.srt:force_style='FontName=Arial,FontSize=16,PrimaryColour=&Hffffff&'" \
  -c:v libx264 \
  -crf 22 \
  -c:a aac \
  airs-demo-with-subtitles.mp4
```

### Add Watermark

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -i logo.png \
  -vf "overlay=x=10:y=10:w=150:h=150" \
  -c:v libx264 \
  -crf 22 \
  -c:a aac \
  airs-demo-watermarked.mp4
```

### Create Clips (Extract Segments)

Intro clip (0:00-0:15):

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -ss 00:00:00 \
  -to 00:00:15 \
  -c:v copy \
  -c:a copy \
  airs-demo-clip-intro.mp4
```

Dashboard clip (0:35-1:10):

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -ss 00:00:35 \
  -to 00:01:10 \
  -c:v copy \
  -c:a copy \
  airs-demo-clip-dashboard.mp4
```

### Batch Export All Formats

```bash
#!/bin/bash

INPUT="airs-demo-hd.mp4"
BASENAME="${INPUT%.*}"

# YouTube
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 128k \
  -pix_fmt yuv420p -movflags +faststart \
  "${BASENAME}-youtube.mp4" &

# Social
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset medium -crf 22 \
  -c:a aac -b:a 96k \
  -pix_fmt yuv420p -movflags +faststart \
  "${BASENAME}-social.mp4" &

# Web
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset fast -crf 24 \
  -c:a aac -b:a 64k \
  -pix_fmt yuv420p -movflags +faststart \
  "${BASENAME}-web.mp4" &

# Vertical
ffmpeg -i "$INPUT" \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -crf 22 \
  -c:a aac -b:a 128k \
  -pix_fmt yuv420p \
  "${BASENAME}-vertical.mp4" &

wait
echo "✅ All exports complete!"
```

---

## Audio Processing

### Extract Audio Track

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -q:a 0 \
  -map a \
  airs-demo-audio.mp3
```

### Mix Multiple Audio Tracks

Remotion video + ambient soundtrack + voiceover:

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -i ambient-soundtrack.wav \
  -i voiceover.wav \
  -filter_complex "[1]volume=0.5[b];[2]volume=0.3[c];[0][b][c]amix=inputs=3:duration=longest[out]" \
  -map 0:v:0 \
  -map "[out]" \
  -c:v copy \
  -c:a aac \
  -b:a 128k \
  airs-demo-mixed.mp4
```

### Normalize Audio Levels

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -af "loudnorm=I=-16:TP=-1.5:LU=-11" \
  -c:v copy \
  -c:a aac \
  airs-demo-normalized.mp4
```

---

## Quality Verification

### Check Video Properties

```bash
ffprobe -show_format -show_streams airs-demo-hd.mp4
```

Output should show:

- Resolution: 1440x810
- FPS: 30
- Codec: h264
- Bitrate: 5000k-8000k

### Quick Visual Check

```bash
# Play with detailed info
ffplay -stats airs-demo-hd.mp4

# Watch specific segment
ffplay -ss 00:00:35 -to 00:01:10 airs-demo-hd.mp4
```

### Detect Interlacing Issues

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -vf idet \
  -f null \
  -
# Should output mostly "progressive"
```

---

## Automation Script

Save as `export-airs.sh`:

```bash
#!/bin/bash
set -e

INPUT="${1:-airs-demo-hd.mp4}"
BASENAME="${INPUT%.*}"

echo "📹 Exporting AIRS demo in all formats..."
echo "Input: $INPUT"
echo ""

# Helper function
export_variant() {
  local name=$1
  local preset=$2
  local crf=$3
  local maxrate=$4
  local filter=$5

  echo "⏳ Exporting $name..."

  ffmpeg -i "$INPUT" \
    -vf "$filter" \
    -c:v libx264 \
    -preset "$preset" \
    -crf "$crf" \
    -maxrate "$maxrate" \
    -bufsize "$((maxrate * 2))" \
    -c:a aac \
    -b:a 128k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "${BASENAME}-${name}.mp4" \
    -hide_banner -loglevel info

  SIZE=$(du -h "${BASENAME}-${name}.mp4" | cut -f1)
  echo "✅ $name complete ($SIZE)"
  echo ""
}

# Export variants
export_variant "youtube" "slow" "18" "8000k" "scale=-1:1080:force_original_aspect_ratio=decrease"
export_variant "social" "medium" "22" "5000k" "scale=-1:810:force_original_aspect_ratio=decrease"
export_variant "web" "fast" "24" "3000k" "scale=-1:810:force_original_aspect_ratio=decrease"
export_variant "vertical" "medium" "22" "5000k" "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"

echo "🎉 All exports complete!"
ls -lh "${BASENAME}-"*.mp4
```

Run:

```bash
chmod +x export-airs.sh
./export-airs.sh airs-demo-hd.mp4
```

---

## Troubleshooting

### Error: "Unknown encoder 'libx265'"

```bash
# Install with HEVC support
brew install ffmpeg --with-libx265
# or
apt-get install ffmpeg libx265-dev
```

### Slow encoding?

- Use faster preset: `fast` or `medium` instead of `slow`
- Reduce CRF value (22 instead of 18)
- Enable hardware acceleration:

```bash
ffmpeg -hwaccel videotoolbox -i input.mp4 ...  # macOS
ffmpeg -hwaccel cuda -i input.mp4 ...           # NVIDIA
ffmpeg -hwaccel vaapi -i input.mp4 ...          # Linux Intel/AMD
```

### Audio out of sync?

Use `-c:a copy` to preserve original timing, then remux:

```bash
ffmpeg -i airs-demo-hd.mp4 \
  -c:v copy \
  -c:a copy \
  -movflags +faststart \
  airs-demo-fixed.mp4
```

### Color banding/quality issues?

Increase bit depth and use better interpolation:

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -profile:v high \
  -level 4.2 \
  -crf 18 \
  -pix_fmt yuv420p \
  output.mp4
```

---

## Platform Specifications

### YouTube

- **Resolution:** 1920x1080 (or higher)
- **Aspect:** 16:9
- **Codec:** H.264, VP9, or H.265
- **Bitrate:** 5-12 Mbps (1080p)
- **Frame rate:** 24, 30, or 60fps
- **Audio:** AAC, 128-256 kbps

**Command:**

```bash
./export-airs.sh && ffmpeg -i aris-demo-youtube.mp4 ...
# Upload to YouTube
```

### TikTok / Instagram Reels

- **Resolution:** 1080x1920 (9:16 vertical)
- **Codec:** H.264
- **Bitrate:** 3-5 Mbps
- **Max duration:** 10 minutes
- **Audio:** MP3 or AAC

### LinkedIn

- **Resolution:** 1200x627 (or 1:1)
- **Codec:** H.264, H.265
- **Bitrate:** 3-5 Mbps
- **Max file:** 5GB

### Website Embed

- **Resolution:** 1440x810
- **Codec:** H.264 (mp4)
- **Bitrate:** 2-3 Mbps
- **Add `+faststart` for progressive download**

---

## Performance Benchmarks

| Format            | Encode Time | File Size | Bitrate |
| ----------------- | ----------- | --------- | ------- |
| YouTube (CRF 18)  | 40-60 min   | 250 MB    | 8 Mbps  |
| Social (CRF 22)   | 20-30 min   | 100 MB    | 5 Mbps  |
| Web (CRF 24)      | 10-15 min   | 50 MB     | 3 Mbps  |
| Vertical (CRF 22) | 20-30 min   | 120 MB    | 5 Mbps  |

(Encoding times on 16-core M1 Pro)

---

## Upload Checklist

- [ ] YouTube: `airs-demo-youtube.mp4` (1920x1080)
- [ ] LinkedIn: `airs-demo-social.mp4` (1440x810)
- [ ] Twitter: `airs-demo-social.mp4` (1440x810)
- [ ] TikTok: `airs-demo-vertical.mp4` (1080x1920)
- [ ] Website: `airs-demo-web.mp4` (1440x810)
- [ ] Archive: `airs-demo-master.mkv` (10-bit, lossless)

---

## References

- [FFmpeg H.264 Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [H.265/HEVC Encoding](https://trac.ffmpeg.org/wiki/Encode/H.265)
- [Audio Mixing](https://trac.ffmpeg.org/wiki/Null)
- [Batch Processing](https://trac.ffmpeg.org/wiki/Create%20a%20thumbnail%20image%20every%20X%20seconds%20of%20the%20video)
