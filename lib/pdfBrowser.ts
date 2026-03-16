import playwright from 'playwright-core';
import chromium from '@sparticuz/chromium';

let browser: playwright.Browser | null = null;

export async function getBrowser(): Promise<playwright.Browser> {
  if (browser && !browser.isConnected()) {
    browser = null;
  }
  if (!browser) {
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: process.env.VERCEL
        ? await chromium.executablePath()
        : undefined,
      headless: true,
    });
  }
  return browser;
}

/** ใช้เมื่อ browser ถูกปิด/crash แล้วต้องการให้ request ถัดไป launch ใหม่ */
export function resetBrowser(): void {
  browser = null;
}
