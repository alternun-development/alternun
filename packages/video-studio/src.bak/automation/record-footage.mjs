import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRS_URL = 'https://testnet.airs.alternun.co';
const RECORDING_DIR = path.join(__dirname, '../../recordings');
const VIEWPORT = { width: 1440, height: 810 };

// Realistic mouse movement with easing
async function moveMouse(page, fromX, fromY, toX, toY, duration = 500) {
  const steps = Math.floor(duration / 16); // ~60fps
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress; // easeInOutQuad

    const x = fromX + (toX - fromX) * easeProgress;
    const y = fromY + (toY - fromY) * easeProgress;

    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
}

// Realistic typing with pauses
async function typeWithPauses(page, selector, text, delayBetweenChars = 50) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.press(char.toUpperCase());
    await page.waitForTimeout(delayBetweenChars);
  }
}

// Smooth scroll with easing
async function smoothScroll(page, distance, duration = 1000) {
  const steps = Math.floor(duration / 16);
  const initialScroll = await page.evaluate(() => window.scrollY);

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    const scrollPosition = initialScroll + (distance * easeProgress);
    await page.evaluate((scroll) => window.scrollTo(0, scroll), scrollPosition);
    await page.waitForTimeout(16);
  }
}

// Record scene 1: Login flow
async function recordLoginScene(page) {
  console.log('🎬 Recording Scene 2: Login...');

  // Navigate to app
  await page.goto(AIRS_URL);
  await page.waitForLoadState('networkidle');

  // Cinematic pause at landing
  await page.waitForTimeout(2000);

  // Hover over connect wallet button
  const connectBtn = await page.$('button:has-text("Connect Wallet")');
  if (connectBtn) {
    const box = await connectBtn.boundingBox();
    if (box) {
      await moveMouse(page, 720, 400, box.x + box.width / 2, box.y + box.height / 2, 800);
      await page.waitForTimeout(500);
    }
  }
}

// Record scene 2: Dashboard flow
async function recordDashboardScene(page) {
  console.log('🎬 Recording Scene 3: Dashboard...');

  // Navigate to dashboard (assuming authenticated)
  await page.goto(`${AIRS_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Pan around dashboard
  await smoothScroll(page, 300, 2000);
  await page.waitForTimeout(500);

  // Hover over stats
  const stats = await page.$$('[data-testid*="stat"]');
  for (const stat of stats.slice(0, 3)) {
    const box = await stat.boundingBox();
    if (box) {
      await moveMouse(page, 720, 400, box.x + box.width / 2, box.y + box.height / 2, 600);
      await page.waitForTimeout(300);
    }
  }
}

// Record scene 3: Interactions flow
async function recordInteractionsScene(page) {
  console.log('🎬 Recording Scene 4: Interactions...');

  await page.goto(`${AIRS_URL}/transactions`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click through tabs
  const tabs = await page.$$('[role="tab"]');
  for (const tab of tabs.slice(0, 3)) {
    const box = await tab.boundingBox();
    if (box) {
      await moveMouse(page, 720, 200, box.x + box.width / 2, box.y + box.height / 2, 500);
      await tab.click();
      await page.waitForTimeout(800);
    }
  }
}

// Main recording orchestrator
async function recordAllScenes() {
  console.log('🚀 Starting AIRS demo video recording...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await page.setViewportSize(VIEWPORT);

  try {
    // Record individual scenes
    await recordLoginScene(page);
    await page.waitForTimeout(2000);

    await recordDashboardScene(page);
    await page.waitForTimeout(2000);

    await recordInteractionsScene(page);

    console.log('✅ Recording complete!');
  } catch (error) {
    console.error('❌ Recording failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

recordAllScenes();
