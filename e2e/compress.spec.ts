import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

// Fixtures (generated once in Chromium): photo.jpg 320 × 240, 10,903 bytes;
// transparent.png 200 × 100 with the right half transparent, 11,866 bytes (Chromium's
// PNG encoder reproduces it byte for byte, which gives a real "same size" case);
// photo.webp 160 × 120. Encoder output sizes vary between browser versions, so the tests
// compare sizes against the original and against the downloaded file, not fixed bytes.
const FIX = 'e2e/fixtures/';
const TOOL = '/#/tool/image-compressor';

/** Every console message, uncaught error, failed or off-origin request. */
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

async function open(page: Page, file: string): Promise<void> {
  await page.locator('#compress-file').setInputFiles(FIX + file);
  await expect(page.locator('.image-status')).toHaveText(/^Image opened/);
  await expect(page.locator('.compress-controls')).toBeVisible();
}

const compress = (page: Page) => page.getByRole('button', { name: 'Compress image' }).click();
const result = (page: Page) => page.locator('.result');

/** Inspect the file behind the download link: type, magic bytes, size, decoded pixels. */
async function output(page: Page, points: Array<[number, number]> = []) {
  await expect(page.locator('#compress-download')).toHaveAttribute('href', /^blob:/);
  return page.locator('#compress-download').evaluate(async (a: HTMLAnchorElement, pts) => {
    const blob = await (await fetch(a.href)).blob();
    const head = Array.from(new Uint8Array(await blob.slice(0, 12).arrayBuffer()));
    const img = new Image();
    img.src = a.href;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const magic =
      head[0] === 0xff && head[1] === 0xd8
        ? 'jpeg'
        : head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
          ? 'png'
          : String.fromCharCode(...head.slice(8, 12)) === 'WEBP'
            ? 'webp'
            : 'unknown';
    return {
      type: blob.type,
      magic,
      bytes: blob.size,
      size: [img.naturalWidth, img.naturalHeight],
      pixels: pts.map(([x, y]) => Array.from(g.getImageData(x, y, 1, 1).data)),
    };
  }, points);
}

/** The UI's size text for a byte count (1 KB = 1024 bytes, one decimal). */
const kb = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('compresses a JPEG locally and reports the real output, with no network or logging', async ({
  page,
  baseURL,
}) => {
  const log = watch(page, new URL(baseURL!).origin);
  await page.goto(TOOL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image Compressor');
  await open(page, 'photo.jpg');
  const meta = page.locator('.image-meta');
  for (const text of ['photo.jpg', '320 × 240 px', '10.6 KB', 'JPEG'])
    await expect(meta).toContainText(text);

  await page.locator('#compress-quality').fill('60');
  await expect(page.locator('.quality-value')).toHaveText('60%');
  await compress(page);
  await expect(page.locator('.image-status')).toHaveText(
    'Done. The compressed image is ready to download.',
  );
  const out = await output(page);
  expect([out.type, out.magic]).toEqual(['image/jpeg', 'jpeg']);
  expect(out.size).toEqual([320, 240]);
  expect(out.bytes).toBeLessThan(10_903);
  // The reported size is the size of the file that is downloaded.
  await expect(page.locator('.result-row-primary')).toContainText(kb(out.bytes));
  const saved = 10_903 - out.bytes;
  await expect(result(page)).toContainText(
    `${kb(saved)} smaller (${((saved / 10_903) * 100).toFixed(1)}%)`,
  );
  await expect(result(page)).toContainText(`${(10_903 / out.bytes).toFixed(2)} : 1`);
  await expect(result(page)).toContainText('Quality used60%');

  const download = page.waitForEvent('download');
  await page
    .getByRole('link', { name: 'Download compressed image (photo-compressed-q60.jpg)' })
    .click();
  expect((await download).suggestedFilename()).toBe('photo-compressed-q60.jpg');
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});

test('never claims a saving when the output is larger', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.locator('#compress-quality').fill('100');
  await compress(page);
  const out = await output(page);
  expect(out.bytes).toBeGreaterThan(10_903);
  await expect(result(page)).toContainText(`${kb(out.bytes - 10_903)} larger`);
  await expect(result(page)).toContainText('no saving');
  await expect(result(page)).not.toContainText('smaller (');
  await expect(page.locator('.image-status')).toHaveText(/not smaller than the original/);
});

test('reports an unchanged size and explains PNG; transparency is kept', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'transparent.png');
  await expect(page.locator('#compress-png-note')).toBeVisible();
  await expect(page.locator('#compress-quality')).toBeHidden();
  await compress(page);
  const out = await output(page, [
    [10, 50],
    [190, 50],
  ]);
  expect([out.type, out.magic]).toEqual(['image/png', 'png']);
  expect(out.size).toEqual([200, 100]);
  expect(out.bytes).toBe(11_866); // Chromium reproduces this fixture exactly
  await expect(result(page)).toContainText('No change in size');
  await expect(result(page)).toContainText('1.00 : 1');
  await expect(result(page)).toContainText('Not used (PNG is lossless)');
  expect(out.pixels[0]?.[3]).toBe(255);
  expect(out.pixels[1]?.[3]).toBe(0); // the transparent half stays transparent
  await expect(page.locator('#compress-download')).toHaveAttribute(
    'download',
    'transparent-compressed.png',
  );
});

test('warns about JPEG transparency and fills it with white', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'transparent.png');
  await page.getByLabel('Save as').selectOption('jpeg');
  await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
  await compress(page);
  const out = await output(page, [[190, 50]]);
  expect([out.type, out.magic]).toEqual(['image/jpeg', 'jpeg']);
  for (const ch of out.pixels[0]!.slice(0, 3)) expect(ch).toBeGreaterThanOrEqual(250);
  expect(out.pixels[0]![3]).toBe(255);
  await expect(page.locator('.result-notes')).toContainText(
    'Transparent areas were filled with white',
  );
  await expect(page.locator('#compress-download')).toHaveAttribute(
    'download',
    'transparent-compressed-q80.jpg',
  );
});

test('saves WebP with a matching type and extension', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.getByLabel('Save as').selectOption('webp');
  await page.locator('#compress-quality').fill('50');
  await compress(page);
  const out = await output(page);
  expect([out.type, out.magic]).toEqual(['image/webp', 'webp']);
  expect(out.size).toEqual([320, 240]);
  await expect(page.locator('#compress-download')).toHaveAttribute(
    'download',
    'photo-compressed-q50.webp',
  );
});

test('meets a reachable target size with the highest quality found', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.getByLabel('Target file size').check();
  await page.getByLabel('Target size (KB)').fill('6');
  await compress(page);
  const out = await output(page);
  expect(out.bytes).toBeLessThanOrEqual(6 * 1024);
  await expect(page.locator('.result-notes')).toContainText(
    /Target of 6\.0 KB reached at quality \d+%\./,
  );
  await expect(page.locator('.image-alert')).toBeHidden();
});

test('reports an unreachable target instead of promising it', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.getByLabel('Target file size').check();
  await page.getByLabel('Target size (KB)').fill('1');
  await compress(page);
  const out = await output(page);
  expect(out.bytes).toBeGreaterThan(1024);
  await expect(page.getByRole('alert')).toHaveText(
    /^The target of 1\.0 KB could not be reached\. The smallest result, at the lowest quality \(10%\)/,
  );
  await expect(result(page)).toContainText('Quality used10%');
  // Invalid target values are explained on the field.
  await page.getByLabel('Target size (KB)').fill('abc');
  await compress(page);
  await expect(page.getByLabel('Target size (KB)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Target size (KB)')).toBeFocused();
});

test('is keyboard operable: slider, mode, format and submit', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.getByLabel('Save as').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'Quality' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Quality' })).toBeChecked();
  await page.keyboard.press('Tab');
  const slider = page.getByRole('slider', { name: 'Quality' });
  await expect(slider).toBeFocused();
  await expect(slider).toHaveAttribute('aria-valuetext', '80%');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('aria-valuetext', '75%');
  await page.keyboard.press('Home');
  await expect(page.locator('.quality-value')).toHaveText('10%');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Compress image' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(result(page)).toContainText('Quality used10%');
});

test('handles invalid files, replace and reset', async ({ page }) => {
  await page.goto(TOOL);
  const alert = page.getByRole('alert');
  await page.locator('#compress-file').setInputFiles(FIX + 'not-an-image.txt');
  await expect(alert).toHaveText('This file is not a JPEG, PNG or WebP image.');
  await page.locator('#compress-file').setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/^The image could not be opened/);
  await open(page, 'photo.jpg');
  await compress(page);
  await expect(page.locator('.image-output')).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image' }).click();
  await (await chooser).setFiles(FIX + 'photo.webp');
  await expect(page.locator('.image-meta')).toContainText('photo.webp');
  await expect(page.locator('.image-meta')).toContainText('160 × 120 px');
  await expect(page.locator('.image-output')).toBeHidden();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#compress-dropzone')).toBeVisible();
  await expect(page.locator('.compress-controls')).toBeHidden();
  await expect(page.locator('#compress-file')).toBeFocused();
});

test('opens a dropped image and wraps a very long file name', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(TOOL);
  const longName = `${'very-long-file-name-without-spaces-'.repeat(6)}.png`;
  const data = await page.evaluateHandle(async (name) => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 40;
    c.getContext('2d')!.fillRect(0, 0, 60, 40);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], name, { type: 'image/png' }));
    return dt;
  }, longName);
  const zone = page.locator('#compress-dropzone');
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveClass(/dropzone-active/);
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(page.locator('.image-status')).toHaveText('Image opened: 60 × 40 pixels.');
  await expect(page.locator('.image-meta')).toContainText(longName);
  await noHorizontalScroll(page);
});

test('works in Bangla and dark mode, keeping state in memory only', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await page.locator('#compress-quality').fill('70');
  await compress(page);
  await expect(page.locator('.image-output')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি কম্প্রেসার');
  await expect(page.locator('.quality-value')).toHaveText('৭০%');
  await expect(page.locator('.image-output')).toBeVisible();
  await expect(result(page)).toContainText('ছোট (');
  await expect(result(page)).toContainText('ব্যবহৃত মান৭০%');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every((k) => k.startsWith('nguh.'))).toBe(true);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

for (const w of [360, 768, 1280]) {
  test.describe(`at ${w} px`, () => {
    test.use({ viewport: { width: w, height: 900 } });

    for (const lang of ['en', 'bn'] as const) {
      test(`${lang}: no horizontal scrolling with settings and result`, async ({ page }) => {
        await page.goto(TOOL);
        if (lang === 'bn')
          await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
        await noHorizontalScroll(page);
        await page.locator('#compress-file').setInputFiles(FIX + 'transparent.png');
        await expect(page.locator('.compress-controls')).toBeVisible();
        await page.locator('#compress-format').selectOption('jpeg');
        await page.locator('#compress-mode-target').check();
        await page.locator('#compress-target').fill('2');
        await page.locator('#compress-submit').click();
        await expect(page.locator('.image-output')).toBeVisible();
        await noHorizontalScroll(page);
      });
    }
  });
}

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const log = watch(page, new URL(base).origin);
  await page.goto(`${base}#/tool/image-compressor`);
  await open(page, 'photo.jpg');
  await compress(page);
  const out = await output(page);
  expect(out.magic).toBe('jpeg');
  expect(out.size).toEqual([320, 240]);
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});
