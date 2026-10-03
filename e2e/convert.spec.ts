import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

// Real Chromium conversions of the committed fixtures: photo.jpg 320 × 240 (10,903 bytes),
// transparent.png 200 × 100 with its right half transparent (11,866 bytes; Chromium's PNG
// encoder reproduces it byte for byte), photo.webp 160 × 120 (2,344 bytes). Encoder output
// varies between browser versions, so sizes are compared against the original and the
// downloaded file rather than fixed byte counts. Tests marked "simulated" patch the
// browser's canvas API in the page to imitate a browser that misbehaves.
const FIX = 'e2e/fixtures/';
const TOOL = '/#/tool/image-converter';

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
  await page.locator('#convert-file').setInputFiles(FIX + file);
  await expect(page.locator('.image-status')).toHaveText(/^Image opened/);
  await expect(page.locator('.image-controls')).toBeVisible();
}

const convert = (page: Page) => page.getByRole('button', { name: 'Convert image' }).click();
const result = (page: Page) => page.locator('.result');
const format = (page: Page) => page.getByLabel('Convert to');

/** Inspect the file behind the download link: type, magic bytes, size, decoded pixels. */
async function output(page: Page, points: Array<[number, number]> = []) {
  await expect(page.locator('#convert-download')).toHaveAttribute('href', /^blob:/);
  return page.locator('#convert-download').evaluate(async (a: HTMLAnchorElement, pts) => {
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

const kb = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('JPEG → PNG: real output, honest larger size, no network or logging', async ({
  page,
  baseURL,
}) => {
  const log = watch(page, new URL(baseURL!).origin);
  await page.goto(TOOL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image Converter');
  await open(page, 'photo.jpg');
  for (const text of ['photo.jpg', '320 × 240 px', '10.6 KB', 'JPEG'])
    await expect(page.locator('.image-meta')).toContainText(text);
  await expect(format(page)).toHaveValue('png'); // a different format is suggested
  await expect(page.locator('#convert-quality')).toBeHidden(); // no slider for PNG
  await expect(page.locator('#convert-png-note')).toBeVisible();
  await convert(page);
  await expect(page.locator('.image-status')).toHaveText(
    'Done. The converted image is ready to download.',
  );
  const out = await output(page);
  expect([out.type, out.magic]).toEqual(['image/png', 'png']);
  expect(out.size).toEqual([320, 240]);
  expect(out.bytes).toBeGreaterThan(10_903);
  await expect(result(page)).toContainText(`Output size${kb(out.bytes)}`);
  await expect(result(page)).toContainText(`${kb(out.bytes - 10_903)} larger`);
  await expect(result(page)).not.toContainText('smaller (');
  await expect(result(page)).toContainText('The converted file is larger than the original.');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download converted image (photo-converted.png)' }).click();
  expect((await download).suggestedFilename()).toBe('photo-converted.png');
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});

test('PNG → JPEG: warns, fills transparency with white, reports a smaller file', async ({
  page,
}) => {
  await page.goto(TOOL);
  await open(page, 'transparent.png');
  await expect(format(page)).toHaveValue('jpeg');
  await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
  await expect(page.locator('#convert-quality')).toHaveValue('92');
  await convert(page);
  const out = await output(page, [[190, 50]]);
  expect([out.type, out.magic]).toEqual(['image/jpeg', 'jpeg']);
  expect(out.size).toEqual([200, 100]);
  for (const ch of out.pixels[0]!.slice(0, 3)) expect(ch).toBeGreaterThanOrEqual(250);
  expect(out.pixels[0]![3]).toBe(255);
  expect(out.bytes).toBeLessThan(11_866);
  await expect(result(page)).toContainText(`${kb(11_866 - out.bytes)} smaller`);
  await expect(page.locator('.result-notes')).toContainText(
    'Transparent areas were filled with white',
  );
  await expect(page.locator('#convert-download')).toHaveAttribute(
    'download',
    'transparent-converted.jpg',
  );
});

test('PNG → PNG keeps transparency and reports an unchanged size', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'transparent.png');
  await format(page).selectOption('png');
  await expect(page.locator('#convert-same-note')).toBeVisible();
  await convert(page);
  const out = await output(page, [
    [10, 50],
    [190, 50],
  ]);
  expect(out.bytes).toBe(11_866);
  expect(out.pixels.map((p) => p[3])).toEqual([255, 0]);
  await expect(result(page)).toContainText('No change in size');
});

test('JPEG → WebP and PNG → WebP: correct type, quality applied, transparency kept', async ({
  page,
}) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await format(page).selectOption('webp');
  await page.locator('#convert-quality').fill('50');
  await expect(page.locator('.quality-value')).toHaveText('50%');
  await convert(page);
  let out = await output(page);
  expect([out.type, out.magic]).toEqual(['image/webp', 'webp']);
  expect(out.size).toEqual([320, 240]);
  expect(out.bytes).toBeLessThan(10_903);
  await expect(result(page)).toContainText('Quality used50%');
  await expect(page.locator('#convert-download')).toHaveAttribute(
    'download',
    'photo-converted.webp',
  );

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image' }).click();
  await (await chooser).setFiles(FIX + 'transparent.png');
  await expect(format(page)).toHaveValue('webp'); // the user's choice is kept
  await expect(page.locator('.image-warnings')).toBeEmpty();
  await convert(page);
  out = await output(page, [
    [10, 50],
    [190, 50],
  ]);
  expect(out.magic).toBe('webp');
  expect(out.pixels[1]![3]).toBe(0); // transparent half stays transparent
  expect(out.pixels[0]![3]).toBe(255);
});

test('WebP → PNG', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'photo.webp');
  await expect(format(page)).toHaveValue('png');
  await convert(page);
  const out = await output(page);
  expect([out.type, out.magic]).toEqual(['image/png', 'png']);
  expect(out.size).toEqual([160, 120]);
  await expect(page.locator('#convert-download')).toHaveAttribute(
    'download',
    'photo-converted.png',
  );
  await expect(result(page)).toContainText('Original formatWebP');
});

test('simulated: a browser that returns the wrong type never yields a mislabelled file', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
      // Ask for PNG, silently get JPEG (as an encoder fallback would).
      return toBlob.call(this, cb, type === 'image/png' ? 'image/jpeg' : type, q);
    };
  });
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await convert(page);
  await expect(page.getByRole('alert')).toHaveText(
    'This browser cannot save PNG images. Choose another format in “Convert to”.',
  );
  await expect(page.locator('.image-output')).toBeHidden();
  await expect(page.locator('#convert-download')).not.toHaveAttribute('href', /.+/);
});

test('simulated: a browser without a WebP encoder disables WebP', async ({ page }) => {
  await page.addInitScript(() => {
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, q) {
      // Like Safari: an unsupported type falls back to PNG.
      return toDataURL.call(this, type === 'image/webp' ? 'image/png' : type, q);
    };
  });
  await page.goto(TOOL);
  await expect(format(page).locator('option[value="webp"]')).toBeDisabled();
  await expect(format(page).locator('option[value="webp"]')).toHaveText(
    'WebP (not supported by this browser)',
  );
  await open(page, 'photo.webp');
  await expect(format(page)).toHaveValue('png');
});

test('simulated: a canvas failure is reported without crashing', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await convert(page);
  await expect(page.getByRole('alert')).toHaveText(
    'Your browser could not create an image this large. Try smaller dimensions.',
  );
  await expect(page.getByRole('button', { name: 'Convert image' })).toBeEnabled();
});

test('rejects invalid, corrupt and too-large images; replace and reset', async ({ page }) => {
  await page.goto(TOOL);
  const alert = page.getByRole('alert');
  await page.locator('#convert-file').setInputFiles(FIX + 'not-an-image.txt');
  await expect(alert).toHaveText('This file is not a JPEG, PNG or WebP image.');
  await page.locator('#convert-file').setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/^The image could not be opened/);

  // A real 9,000 × 2,000 image: allowed in (18 MP), but too large to re-encode safely.
  const big = await page.evaluateHandle(async () => {
    const c = document.createElement('canvas');
    c.width = 9000;
    c.height = 2000;
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'wide.png', { type: 'image/png' }));
    return dt;
  });
  await page.locator('#convert-dropzone').dispatchEvent('drop', { dataTransfer: big });
  await expect(page.locator('.image-meta')).toContainText('9,000 × 2,000 px');
  await convert(page);
  await expect(alert).toHaveText(/^This image is too large to convert safely/);

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image' }).click();
  await (await chooser).setFiles(FIX + 'photo.jpg');
  await expect(page.locator('.image-meta')).toContainText('320 × 240 px');
  await expect(alert).toBeHidden();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#convert-dropzone')).toBeVisible();
  await expect(page.locator('.image-controls')).toBeHidden();
  await expect(page.locator('#convert-file')).toBeFocused();
});

test('opens a dropped image with a Bangla file name', async ({ page }) => {
  await page.goto(TOOL);
  const data = await page.evaluateHandle(async () => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 40;
    c.getContext('2d')!.fillRect(0, 0, 60, 40);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'আমার ছবি ২০২৬.png', { type: 'image/png' }));
    return dt;
  });
  const zone = page.locator('#convert-dropzone');
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveClass(/dropzone-active/);
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(page.locator('.image-status')).toHaveText('Image opened: 60 × 40 pixels.');
  await expect(page.locator('.image-meta')).toContainText('আমার ছবি ২০২৬.png');
  await convert(page);
  await expect(page.locator('#convert-download')).toHaveAttribute(
    'download',
    'আমার ছবি ২০২৬-converted.jpg',
  );
});

test('is keyboard operable: format, slider and submit', async ({ page }) => {
  await page.goto(TOOL);
  await open(page, 'transparent.png');
  await format(page).focus();
  await page.keyboard.press('Tab');
  const slider = page.getByRole('slider', { name: 'Quality' });
  await expect(slider).toBeFocused();
  await expect(slider).toHaveAttribute('aria-valuetext', '92%');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuetext', '90%');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Convert image' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(result(page)).toContainText('Quality used90%');
});

test('works in Bangla and dark mode, keeping the choice and result in memory only', async ({
  page,
}) => {
  await page.goto(TOOL);
  await open(page, 'photo.jpg');
  await format(page).selectOption('webp');
  await page.locator('#convert-quality').fill('70');
  await convert(page);
  await expect(page.locator('.image-output')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি কনভার্টার');
  await expect(page.locator('#convert-format')).toHaveValue('webp');
  await expect(page.locator('.quality-value')).toHaveText('৭০%');
  await expect(page.locator('.image-output')).toBeVisible();
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
        await page.locator('#convert-file').setInputFiles(FIX + 'transparent.png');
        await expect(page.locator('.image-controls')).toBeVisible();
        await page.locator('#convert-submit').click();
        await expect(page.locator('.image-output')).toBeVisible();
        await noHorizontalScroll(page);
      });
    }
  });
}

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const log = watch(page, new URL(base).origin);
  await page.goto(`${base}#/tool/image-converter`);
  await open(page, 'photo.jpg');
  await convert(page);
  const out = await output(page);
  expect(out.magic).toBe('png');
  expect(out.size).toEqual([320, 240]);
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});
