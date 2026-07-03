#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const SOURCE_ICON = path.join(PROJECT_ROOT, 'assets', 'images', 'alternun-logo.png');

const OUTPUT_APP_ICON = path.join(PROJECT_ROOT, 'assets', 'images', 'icon.png');
const OUTPUT_ADAPTIVE_ICON = path.join(PROJECT_ROOT, 'assets', 'images', 'adaptive-icon.png');
const OUTPUT_FAVICON = path.join(PROJECT_ROOT, 'assets', 'images', 'favicon.png');
const OUTPUT_SPLASH_ICON = path.join(PROJECT_ROOT, 'assets', 'images', 'splash-icon.png');

const OUTPUT_PUBLIC_ICON_1024 = path.join(PUBLIC_DIR, 'icon-1024.png');
const OUTPUT_PUBLIC_ICON_512 = path.join(PUBLIC_DIR, 'icon-512.png');
const OUTPUT_PUBLIC_ICON_192 = path.join(PUBLIC_DIR, 'icon-192.png');
const OUTPUT_PUBLIC_MASKABLE_1024 = path.join(PUBLIC_DIR, 'icon-maskable-1024.png');
const OUTPUT_PUBLIC_APPLE_TOUCH = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
const OUTPUT_PUBLIC_FAVICON_48 = path.join(PUBLIC_DIR, 'favicon-48x48.png');
const OUTPUT_PUBLIC_FAVICON_ICO = path.join(PUBLIC_DIR, 'favicon.ico');
const OUTPUT_OG_IMAGE = path.join(PUBLIC_DIR, 'og-image.png');

const BRAND_BG_COLOR = '#050510';
const SHARP_BRAND_BG = { r: 5, g: 5, b: 16, alpha: 1 };
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

async function ensureSourceIconExists() {
  try {
    await fs.access(SOURCE_ICON);
  } catch {
    console.error(`Source icon not found: ${SOURCE_ICON}`);
    process.exit(1);
  }
}

async function renderSquareIcon(size, outputPath, background = SHARP_BRAND_BG) {
  await sharp(SOURCE_ICON)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background,
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function renderTransparentIcon(size, outputPath) {
  await sharp(SOURCE_ICON)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: TRANSPARENT_BG,
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

function generateFaviconIco() {
  const convertCheck = spawnSync('convert', ['-version'], { stdio: 'ignore' });
  if ((convertCheck.status ?? 1) !== 0) {
    console.warn('⚠️ ImageMagick convert is unavailable; skipping favicon.ico generation.');
    return;
  }

  const result = spawnSync(
    'convert',
    [
      OUTPUT_PUBLIC_ICON_1024,
      '-define',
      'icon:auto-resize=16,24,32,48,64,128,256',
      OUTPUT_PUBLIC_FAVICON_ICO,
    ],
    { stdio: 'inherit' }
  );

  if ((result.status ?? 1) !== 0) {
    throw new Error('Failed to generate favicon.ico with ImageMagick convert.');
  }

  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_FAVICON_ICO)}`);
}

async function generateIcons() {
  await ensureSourceIconExists();

  const source = await sharp(SOURCE_ICON).ensureAlpha().metadata();
  console.log(`✓ Loaded source icon: ${path.basename(SOURCE_ICON)} (${source.width}x${source.height})`);

  await renderSquareIcon(1024, OUTPUT_APP_ICON);
  console.log(`✓ Created ${path.basename(OUTPUT_APP_ICON)}`);

  await renderTransparentIcon(1024, OUTPUT_ADAPTIVE_ICON);
  console.log(`✓ Created ${path.basename(OUTPUT_ADAPTIVE_ICON)}`);

  await renderSquareIcon(48, OUTPUT_FAVICON);
  console.log(`✓ Created ${path.basename(OUTPUT_FAVICON)} (48x48)`);

  await renderTransparentIcon(1024, OUTPUT_SPLASH_ICON);
  console.log(`✓ Created ${path.basename(OUTPUT_SPLASH_ICON)}`);

  await renderSquareIcon(1024, OUTPUT_PUBLIC_ICON_1024);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_ICON_1024)}`);

  await renderSquareIcon(512, OUTPUT_PUBLIC_ICON_512);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_ICON_512)}`);

  await renderSquareIcon(192, OUTPUT_PUBLIC_ICON_192);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_ICON_192)}`);

  await renderSquareIcon(1024, OUTPUT_PUBLIC_MASKABLE_1024);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_MASKABLE_1024)}`);

  await renderSquareIcon(180, OUTPUT_PUBLIC_APPLE_TOUCH);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_APPLE_TOUCH)} (180x180)`);

  await renderSquareIcon(48, OUTPUT_PUBLIC_FAVICON_48);
  console.log(`✓ Created ${path.basename(OUTPUT_PUBLIC_FAVICON_48)} (48x48)`);

  generateFaviconIco();

  const ogIconSize = 400;
  const ogIconBuffer = await sharp(SOURCE_ICON)
    .resize({
      width: ogIconSize,
      height: ogIconSize,
      fit: 'contain',
      background: SHARP_BRAND_BG,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: BRAND_BG_COLOR,
    },
  })
    .composite([
      {
        input: ogIconBuffer,
        left: Math.floor((1200 - ogIconSize) / 2),
        top: Math.floor((630 - ogIconSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_OG_IMAGE);
  console.log(`✓ Created ${path.basename(OUTPUT_OG_IMAGE)} (1200x630)`);

  console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch((error) => {
  console.error(`Error generating icons: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
