import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { getBrowser } from '../browserManager.service.js';

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || path.join(process.cwd(), 'public', 'screenshots');
const TIMEOUT_MS = 15000;
const limit = pLimit(Number(process.env.SCREENSHOT_CONCURRENCY) || 1);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureViewport(url, filename, viewport) {
  return limit(async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    try {
      await page.goto(url, { timeout: TIMEOUT_MS, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800); // let fonts/images settle before capturing
      const filePath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: filePath });
      return `/screenshots/${filename}`;
    } catch {
      return null;
    } finally {
      await context.close();
    }
  });
}

export async function captureScreenshots(url, businessId) {
  const [desktopPath, mobilePath] = await Promise.all([
    captureViewport(url, `${businessId}-desktop.png`, { width: 1440, height: 900 }),
    captureViewport(url, `${businessId}-mobile.png`, { width: 390, height: 844 }),
  ]);

  return { desktopPath, mobilePath };
}