import playwright from 'playwright-core';
import chromium from '@sparticuz/chromium';

let browser: playwright.Browser | null = null;
// Mutex: single in-flight launch promise so concurrent requests don't each spawn a browser
let launching: Promise<playwright.Browser> | null = null;

async function launchBrowser(): Promise<playwright.Browser> {
  const b = await playwright.chromium.launch({
    args: chromium.args,
    executablePath: process.env.VERCEL
      ? await chromium.executablePath()
      : undefined,
    headless: true,
  });
  // Auto-clear singleton when Chromium crashes or is killed by Vercel
  b.on('disconnected', () => {
    if (browser === b) browser = null;
  });
  return b;
}

export async function getBrowser(): Promise<playwright.Browser> {
  // Fast path: reuse healthy browser
  if (browser?.isConnected()) return browser;

  // Stale ref (disconnected but not yet cleared by event) — drop it
  browser = null;

  // If a launch is already in progress, wait for it instead of spawning another
  if (!launching) {
    launching = launchBrowser()
      .then((b) => {
        browser = b;
        launching = null;
        return b;
      })
      .catch((err) => {
        browser = null;
        launching = null;
        throw err;
      });
  }

  return launching;
}

/** Call when any page operation fails — actually closes Chromium before clearing refs */
export function resetBrowser(): void {
  browser?.close().catch(() => {});
  browser = null;
  launching = null;
}
