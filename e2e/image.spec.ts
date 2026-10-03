import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

// Deterministic fixtures, generated once in Chromium and committed:
// photo.jpg 320×240 (10,903 B), transparent.png 200×100 with the right half transparent
// (11,866 B), photo.webp 160×120, corrupt.png (PNG signature followed by garbage).
const FIX = 'e2e/fixtures/';
const URL_TOOL = '/#/tool/image-resizer';

/** Every console message (any level), uncaught error, failed or off-origin request. */
function watch(page: Page, origin: string): { console: string[]; problems: string[] } {
  const log = { console: [] as string[], problems: [] as string[] };
  page.on('console', (m) => log.console.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => log.problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin)
      log.problems.push(`off-origin request: ${r.url()}`);
  });
  page.on('response', (r) => r.status() >= 400 && log.problems.push(`${r.status()} ${r.url()}`));
  return log;
}

const fileInput = (page: Page) => page.locator('#resize-file');
const width = (page: Page) => page.getByLabel('Width (pixels)');
const height = (page: Page) => page.getByLabel('Height (pixels)');
const resize = (page: Page) => page.getByRole('button', { name: 'Resize image' });
const meta = (page: Page) => page.locator('.image-meta');
const result = (page: Page) => page.locator('.result-list:not(.image-meta)');

async function open(page: Page, file: string): Promise<void> {
  await fileInput(page).setInputFiles(FIX + file);
  await expect(page.locator('.image-status')).toHaveText(/^Image opened/);
}

/** Natural size of the output preview, once it has loaded. */
async function outputSize(page: Page): Promise<[number, number]> {
  const img = page.locator('.image-output img'); // alt text is localized
  await expect(img).toBeVisible();
  return img.evaluate(async (el: HTMLImageElement) => {
    await el.decode();
    return [el.naturalWidth, el.naturalHeight] as [number, number];
  });
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('resizes a JPEG locally, downloads it, and never logs or contacts the network', async ({
  page,
  baseURL,
}) => {
  const log = watch(page, new URL(baseURL!).origin);
  await page.goto(URL_TOOL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image Resizer');
  await open(page, 'photo.jpg');
  await expect(meta(page)).toContainText('320 × 240 px');
  await expect(meta(page)).toContainText('10.6 KB');
  await expect(meta(page)).toContainText('JPEG');
  await expect(width(page)).toHaveValue('320');
  await expect(height(page)).toHaveValue('240');

  // Aspect lock: changing the width updates the height.
  await width(page).fill('160');
  await expect(height(page)).toHaveValue('120');
  await resize(page).click();
  await expect(page.locator('.image-status')).toHaveText(
    'Done. The resized image is ready to download.',
  );
  expect(await outputSize(page)).toEqual([160, 120]);
  await expect(result(page)).toContainText('160 × 120 px');

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download resized image (photo-160x120.jpg)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('photo-160x120.jpg');
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});

test('warns before turning transparency white in JPEG and keeps it in PNG', async ({ page }) => {
  await page.goto(URL_TOOL);
  await open(page, 'transparent.png');
  await page.getByRole('button', { name: 'Set size to 50% of the original' }).click();
  await expect(width(page)).toHaveValue('100');
  await expect(height(page)).toHaveValue('50');

  await page.getByLabel('Save as').selectOption('jpeg');
  await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
  await resize(page).click();
  expect(await outputSize(page)).toEqual([100, 50]);
  await expect(page.locator('.result-notes')).toContainText(
    'Transparent areas were filled with white',
  );
  await expect(page.locator('#resize-download')).toHaveAttribute(
    'download',
    'transparent-100x50.jpg',
  );
  const pixel = (x: number) =>
    page
      .getByRole('img', { name: 'Preview of the resized image' })
      .evaluate((el: HTMLImageElement, px) => {
        const c = document.createElement('canvas');
        c.width = el.naturalWidth;
        c.height = el.naturalHeight;
        const g = c.getContext('2d')!;
        g.drawImage(el, 0, 0);
        return Array.from(g.getImageData(px, 25, 1, 1).data);
      }, x);
  const right = await pixel(90); // transparent in the source
  expect(right[3]).toBe(255);
  for (const ch of right.slice(0, 3)) expect(ch).toBeGreaterThanOrEqual(250);

  // PNG keeps the transparent half transparent.
  await page.getByLabel('Save as').selectOption('png');
  await expect(page.locator('.image-warnings')).not.toContainText('JPEG cannot store');
  await resize(page).click();
  await expect(page.locator('#resize-download')).toHaveAttribute(
    'download',
    'transparent-100x50.png',
  );
  await expect.poll(async () => (await pixel(90))[3]).toBe(0);
  expect((await pixel(10))[3]).toBe(255);
});

test('aspect lock can be turned off, and stretching is warned about', async ({ page }) => {
  await page.goto(URL_TOOL);
  await open(page, 'photo.webp');
  await expect(meta(page)).toContainText('160 × 120 px');
  await expect(meta(page)).toContainText('WebP');
  await page.getByLabel('Keep aspect ratio').uncheck();
  await width(page).fill('100');
  await expect(height(page)).toHaveValue('120');
  await expect(page.locator('.image-warnings')).toContainText('will be stretched or squashed');
  await resize(page).click();
  expect(await outputSize(page)).toEqual([100, 120]);
  await expect(page.locator('#resize-download')).toHaveAttribute('download', 'photo-100x120.webp');
});

test('rejects invalid dimensions without resizing', async ({ page }) => {
  await page.goto(URL_TOOL);
  await open(page, 'photo.jpg');
  for (const [value, message] of [
    ['0', 'Must be at least 1 pixel.'],
    ['-5', 'Enter a whole number of pixels.'],
    ['12.5', 'Enter a whole number of pixels.'],
    ['9000', 'Each side can be at most 8,192 pixels.'],
  ] as const) {
    await width(page).fill(value);
    await resize(page).click();
    await expect(width(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(width(page)).toHaveAccessibleDescription(
      new RegExp(`${message.replace(/\./g, '\\.')}$`),
    );
    await expect(width(page)).toBeFocused();
    await expect(page.locator('.image-output')).toBeHidden();
  }
});

test('rejects files that are not images or are damaged, and keeps the current image', async ({
  page,
}) => {
  await page.goto(URL_TOOL);
  const alert = page.getByRole('alert');
  await fileInput(page).setInputFiles(FIX + 'not-an-image.txt');
  await expect(alert).toHaveText('This file is not a JPEG, PNG or WebP image.');
  await fileInput(page).setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/^The image could not be opened/);
  await expect(page.locator('.image-card')).toBeHidden();

  await open(page, 'photo.jpg');
  await expect(alert).toBeHidden();
  await fileInput(page).setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/Your current image is still open\.$/);
  await expect(meta(page)).toContainText('320 × 240 px');
});

test('replace and reset', async ({ page }) => {
  await page.goto(URL_TOOL);
  await open(page, 'photo.jpg');
  await width(page).fill('100');
  await resize(page).click();
  await expect(page.locator('.image-output')).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image' }).click();
  await (await chooser).setFiles(FIX + 'photo.webp');
  await expect(meta(page)).toContainText('160 × 120 px');
  await expect(width(page)).toHaveValue('160');
  await expect(page.locator('.image-output')).toBeHidden();

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('.image-card')).toBeHidden();
  await expect(page.locator('#resize-dropzone')).toBeVisible();
  await expect(page.locator('.image-controls')).toBeHidden();
});

test('opens an image dropped onto the drop zone', async ({ page }) => {
  await page.goto(URL_TOOL);
  const data = await page.evaluateHandle(async () => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0a7';
    g.fillRect(0, 0, 64, 48);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'dropped.png', { type: 'image/png' }));
    return dt;
  });
  const zone = page.locator('#resize-dropzone');
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveClass(/dropzone-active/);
  await expect(zone).toContainText('Drop the image to open it');
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(page.locator('.image-status')).toHaveText('Image opened: 64 × 48 pixels.');
  await expect(meta(page)).toContainText('PNG');
});

test('keeps the image and result when switching to Bangla, in dark mode', async ({ page }) => {
  await page.goto(URL_TOOL);
  await open(page, 'photo.jpg');
  await width(page).fill('160');
  await resize(page).click();
  await expect(page.locator('.image-output')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি রিসাইজার');
  await expect(meta(page)).toContainText('৩২০ × ২৪০ পিক্সেল');
  await expect(page.getByLabel('প্রস্থ (পিক্সেল)')).toHaveValue('160'); // kept as typed
  await expect(result(page)).toContainText('১৬০ × ১২০ পিক্সেল');
  expect(await outputSize(page)).toEqual([160, 120]);
  // Only preferences are stored; never the image.
  const stored = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(stored.every((k) => k.startsWith('nguh.'))).toBe(true);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

for (const w of [360, 768, 1280]) {
  test.describe(`at ${w} px`, () => {
    test.use({ viewport: { width: w, height: 900 } });

    for (const lang of ['en', 'bn'] as const) {
      test(`${lang}: no horizontal scrolling with an image and result`, async ({ page }) => {
        await page.goto(URL_TOOL);
        if (lang === 'bn')
          await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
        await noHorizontalScroll(page);
        await fileInput(page).setInputFiles(FIX + 'transparent.png');
        await expect(page.locator('.image-card')).toBeVisible();
        await page.locator('#resize-format').selectOption('jpeg');
        await page.locator('#resize-submit').click();
        await expect(page.locator('.image-output')).toBeVisible();
        await noHorizontalScroll(page);
      });
    }
  });
}

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const log = watch(page, new URL(base).origin);
  await page.goto(`${base}#/tool/image-resizer`);
  await open(page, 'photo.jpg');
  await page.getByRole('button', { name: 'Set size to 25% of the original' }).click();
  await resize(page).click();
  expect(await outputSize(page)).toEqual([80, 60]);
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});
