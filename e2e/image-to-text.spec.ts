import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { FIX, noHorizontalScroll, watchProblems } from './support';

// Image to Text runs the real Tesseract.js engine in the browser. Its worker, engine and language
// data must come from this site only (never a CDN), and the picture is never sent anywhere.

const OCR_TIMEOUT = 90_000;

async function extract(page: Page, file: string, language?: string): Promise<void> {
  await page.locator('#ocr-file').setInputFiles(`${FIX}${file}`);
  if (language) await page.locator('#ocr-language').selectOption(language);
  await page.getByRole('button', { name: 'Extract text' }).click();
}

test.describe('Image to Text', () => {
  test.setTimeout(OCR_TIMEOUT * 2);

  test('reads English text, loading everything from this site only', async ({
    page,
    baseURL,
    browserName,
  }) => {
    const origin = new URL(baseURL!).origin;
    const problems = watchProblems(page, origin);
    const requests: string[] = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await page.goto('/#/tool/image-to-text');
    await expect(page.locator('.net-notice')).toContainText('never uploaded');
    await extract(page, 'ocr-english.png', 'eng');
    await expect(page.locator('#ocr-text')).toHaveValue(/Hello NextGen 2026/, {
      timeout: OCR_TIMEOUT,
    });
    await expect(page.locator('#ocr-text')).toHaveValue(/Privacy first tools/);
    await expect(page.locator('#ocr-meta')).toHaveText(/^Average confidence: \d+%$/);
    await expect(page.getByRole('status').filter({ hasText: 'Done.' })).toContainText(
      'characters found',
    );
    // Only English data and one engine build were fetched, from this site.
    expect(requests.filter((p) => p.endsWith('.traineddata.gz'))).toEqual([
      '/ocr/lang/eng.traineddata.gz',
    ]);
    // The engine is loaded by the worker with importScripts(); only Chromium reports that request
    // to Playwright, so the exact count is checked there.
    const core = requests.filter((p) => p.includes('/ocr/core/'));
    if (browserName === 'chromium') expect(core).toHaveLength(1);
    else expect(core.length).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);

    // The text can be edited and downloaded.
    await page.locator('#ocr-text').fill('edited text');
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download .txt' }).click();
    expect((await download).suggestedFilename()).toBe('extracted-text.txt');
  });

  test('reads Bangla text', async ({ page }) => {
    await page.goto('/#/tool/image-to-text');
    await extract(page, 'ocr-bangla.png', 'ben');
    await expect(page.locator('#ocr-text')).toHaveValue(/বাংলা/, { timeout: OCR_TIMEOUT });
  });

  test('says when no text is found, and can be stopped', async ({ page }) => {
    await page.goto('/#/tool/image-to-text');
    await extract(page, 'ocr-blank.png', 'eng');
    await expect(page.getByRole('alert')).toContainText('No text was found', {
      timeout: OCR_TIMEOUT,
    });
    // Hold the engine file back so Stop is pressed while the engine is still loading.
    await page.route('**/ocr/core/**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    await page.getByRole('button', { name: 'Extract text' }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(page.locator('.net-status')).toHaveText('Stopped.');
    await expect(page.getByRole('button', { name: 'Extract text' })).toBeEnabled();
  });

  test('refuses a file that is not a picture', async ({ page }) => {
    await page.goto('/#/tool/image-to-text');
    await page.locator('#ocr-file').setInputFiles(`${FIX}corrupt.png`);
    await expect(page.locator('.image-alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Extract text' })).toBeHidden();
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/image-to-text');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি থেকে টেক্সট');
    await page.locator('#ocr-file').setInputFiles(`${FIX}ocr-english.png`);
    await expect(page.locator('#ocr-language')).toHaveValue('ben');
    await noHorizontalScroll(page);
  });

  test('loads the engine under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    const assets: string[] = [];
    page.on('request', (r) => r.url().includes('/ocr/') && assets.push(new URL(r.url()).pathname));
    await page.goto(`${base}#/tool/image-to-text`);
    await extract(page, 'ocr-english.png', 'eng');
    await expect(page.locator('#ocr-text')).toHaveValue(/Hello/, { timeout: OCR_TIMEOUT });
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) expect(a.startsWith(`${SUBPATH}ocr/`)).toBe(true);
    expect(problems).toEqual([]);
  });
});
