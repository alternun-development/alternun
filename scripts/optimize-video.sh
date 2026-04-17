#!/bin/bash

# Video Optimization Script for Landing Video
# Converts video to optimized mobile format with better compression and instant playback
# Usage: bash scripts/optimize-video.sh input.mp4 [output.mp4]

set -e

INPUT_FILE="${1:?Error: Input video file required. Usage: $0 input.mp4 [output.mp4]}"
OUTPUT_FILE="${2:-${INPUT_FILE%.*}-optimized.mp4}"

if [ ! -f "$INPUT_FILE" ]; then
  echo "❌ Error: Input file '$INPUT_FILE' not found"
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
  echo "❌ Error: ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

echo "🎬 Optimizing video for mobile playback..."
echo "   Input: $INPUT_FILE"
echo "   Output: $OUTPUT_FILE"
echo ""

# Optimization flags explained:
# -vcodec libx264       : H.264 codec (best hardware support on iOS/Android)
# -crf 23               : Quality 0-51, 23 is good balance (18=nearly lossless, 28=very aggressive)
# -preset slow          : Slower encoding = better compression = smoother playback on device
# -tune film            : Optimize for smooth cinematic motion
# -movflags +faststart  : CRITICAL: Move metadata to start of file for instant playback (no buffering)
# -vf "fps=30,scale=1280:-2" : Reduce fps to 30, resize to 720p (2x width, height auto)
# -an                   : Remove audio track (saves 30%, not needed for background video)
# -pix_fmt yuv420p      : Required for hardware decoding on all devices
# -profile:v baseline   : Most compatible H.264 profile for mobile
# -level 3.1            : H.264 level 3.1 compatible with all phones

ffmpeg -i "$INPUT_FILE" \
  -vcodec libx264 \
  -crf 23 \
  -preset slow \
  -tune film \
  -movflags +faststart \
  -vf "fps=30,scale=1280:-2" \
  -an \
  -pix_fmt yuv420p \
  -profile:v baseline \
  -level 3.1 \
  -y \
  "$OUTPUT_FILE"

INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo "✅ Video optimized successfully!"
echo "   Input size:  $INPUT_SIZE"
echo "   Output size: $OUTPUT_SIZE"
echo "   File: $OUTPUT_FILE"
echo ""
echo "📝 Next steps:"
echo "   1. Replace the old video: mv $OUTPUT_FILE $INPUT_FILE"
echo "   2. Rebuild the app: eas build --platform ios/android"
