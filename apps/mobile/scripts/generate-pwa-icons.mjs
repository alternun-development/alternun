#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const SOURCE_ICON = path.join(PUBLIC_DIR, 'icon-maskable-1024.png');

const OUTPUT_ICON_1024 = path.join(PUBLIC_DIR, 'icon-1024.png');
const OUTPUT_ICON_512 = path.join(PUBLIC_DIR, 'icon-512.png');
const OUTPUT_ICON_192 = path.join(PUBLIC_DIR, 'icon-192.png');
const OUTPUT_APPLE_TOUCH = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
const OUTPUT_OG_IMAGE = path.join(PUBLIC_DIR, 'og-image.png');

const BRAND_BG_COLOR = '#050510';

async function ensureSourceIconExists() {
  try {
    await fs.access(SOURCE_ICON);
  } catch {
    console.error(`Source icon not found: ${SOURCE_ICON}`);
    process.exit(1);
  }
}

async function resizeSquareIcon(size, outputPath) {
  await sharp(SOURCE_ICON)
    .ensureAlpha()
    .resize({
      width: size,
      height: size,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function generateIcons() {
  await ensureSourceIconExists();

  const source = await sharp(SOURCE_ICON).ensureAlpha().metadata();
  console.log(`✓ Loaded source icon: ${path.basename(SOURCE_ICON)} (${source.width}x${source.height})`);

  await fs.copyFile(SOURCE_ICON, OUTPUT_ICON_1024);
  console.log(`✓ Created ${path.basename(OUTPUT_ICON_1024)}`);

  await resizeSquareIcon(512, OUTPUT_ICON_512);
  console.log(`✓ Created ${path.basename(OUTPUT_ICON_512)}`);

  await resizeSquareIcon(192, OUTPUT_ICON_192);
  console.log(`✓ Created ${path.basename(OUTPUT_ICON_192)}`);

  await resizeSquareIcon(180, OUTPUT_APPLE_TOUCH);
  console.log(`✓ Created ${path.basename(OUTPUT_APPLE_TOUCH)} (180x180)`);

  const ogIconSize = 400;
  const ogIconBuffer = await sharp(SOURCE_ICON)
    .ensureAlpha()
    .resize({
      width: ogIconSize,
      height: ogIconSize,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
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
