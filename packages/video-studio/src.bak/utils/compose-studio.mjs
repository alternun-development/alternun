import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RENDER_OPTIONS = {
  // Standard HD (1440p, 30fps)
  hd: {
    width: 1440,
    height: 810,
    fps: 30,
    codec: 'h264',
    output: 'airs-demo-hd.mp4',
  },

  // YouTube optimized (1080p, 30fps)
  youtube: {
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'h264',
    output: 'airs-demo-youtube.mp4',
  },

  // 4K Master (3840x2160, 30fps)
  '4k': {
    width: 3840,
    height: 2160,
    fps: 30,
    codec: 'h264',
    output: 'airs-demo-4k.mp4',
  },

  // Social media (1080p, 60fps)
  social: {
    width: 1080,
    height: 1080,
    fps: 60,
    codec: 'h264',
    output: 'airs-demo-social.mp4',
  },
};

async function renderVideo(preset = 'hd') {
  const options = RENDER_OPTIONS[preset];

  if (!options) {
    console.error(`Unknown preset: ${preset}`);
    console.log(`Available presets: ${Object.keys(RENDER_OPTIONS).join(', ')}`);
    process.exit(1);
  }

  console.log(`🎬 Rendering AIRS demo video...`);
  console.log(`   Preset: ${preset}`);
  console.log(`   Resolution: ${options.width}x${options.height}`);
  console.log(`   FPS: ${options.fps}`);
  console.log(`   Output: ${options.output}`);

  try {
    const cmd = [
      'pnpm exec remotion render',
      'src/index.tsx',
      'AirsDemo',
      `--codec ${options.codec}`,
      `--width ${options.width}`,
      `--height ${options.height}`,
      `--fps ${options.fps}`,
      `--output ${options.output}`,
      '--quality 100',
    ].join(' ');

    console.log(`\n▶️  ${cmd}\n`);

    const { stdout, stderr } = await execAsync(cmd);

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('progress')) console.warn(stderr);

    console.log(`\n✅ Render complete: ${options.output}`);
  } catch (error) {
    console.error('❌ Render failed:', error.message);
    process.exit(1);
  }
}

async function renderAll() {
  console.log('🎥 Rendering all presets...\n');

  for (const preset of Object.keys(RENDER_OPTIONS)) {
    try {
      await renderVideo(preset);
      console.log('');
    } catch (error) {
      console.error(`Failed to render preset "${preset}":`, error);
    }
  }

  console.log('✨ All renders complete!');
}

// CLI interface
const command = process.argv[2] || 'hd';

if (command === 'all') {
  renderAll();
} else {
  renderVideo(command);
}
