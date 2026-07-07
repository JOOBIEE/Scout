import { chromium } from 'playwright';

let browserPromise = null;

export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function warmupBrowser() {
  console.log('Warming up Playwright browser...');
  const start = Date.now();
  await getBrowser();
  console.log(`Browser ready (${Date.now() - start}ms)`);
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}