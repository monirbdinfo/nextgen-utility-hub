import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

// quadrants.png: 400 × 300, generated once in Chromium. Top-left red, top-right green,
// bottom-left blue, bottom-right fully transparent; the quadrants meet at (200, 150).
const FIX = 'e2e/fixtures/';
const TOOL = '/#/tool/image-cropper';

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

const sel = (page: Page) => page.locator('#crop-selection');
const values = (page: Page) =>
  Promise.all(['x', 'y', 'width', 'height'].map((f) => page.locator(`#crop-${f}`).inputValue()));
const numbers = async (page: Page) => (await values(page)).map(Number);

async function open(page: Page, file = 'quadrants.png'): Promise<void> {
  await page.locator('#crop-file').setInputFiles(FIX + file);
  await expect(page.locator('.image-status')).toHaveText(/^Image opened/);
  await expect(sel(page)).toBeVisible();
}

/** Type a value and leave the field (the change applies on blur or Enter). */
async function setField(page: Page, f: string, value: string): Promise<void> {
  await page.locator(`#crop-${f}`).fill(value);
  await page.locator(`#crop-${f}`).press('Tab');
}

/** Source pixels per CSS pixel of the preview, measured in the page. */
async function scale(page: Page): Promise<number> {
  const box = await page.locator('.crop-image').boundingBox();
  return 400 / box!.width;
}

/** Drag from the centre of `target` by (dx, dy) CSS pixels with the mouse. */
async function drag(page: Page, target: string, dx: number, dy: number): Promise<void> {
  const loc = page.locator(target);
  await loc.scrollIntoViewIfNeeded();
  const box = (await loc.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2);
  await page.mouse.move(x + dx, y + dy);
  await page.mouse.up();
}

/** Decode the file behind the download link and read pixels from it. */
async function output(page: Page, points: Array<[number, number]>) {
  return page.locator('#crop-download').evaluate(async (a: HTMLAnchorElement, pts) => {
    const blob = await (await fetch(a.href)).blob();
    const img = new Image();
    img.src = a.href;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    return {
      type: blob.type,
      size: [img.naturalWidth, img.naturalHeight],
      pixels: pts.map(([x, y]) => Array.from(g.getImageData(x, y, 1, 1).data)),
    };
  }, points);
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const BLUE = [0, 0, 255, 255];
const CLEAR = [0, 0, 0, 0];

test('crops exact source pixels to PNG without logging or network access', async ({
  page,
  baseURL,
}) => {
  const log = watch(page, new URL(baseURL!).origin);
  await page.goto(TOOL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image Cropper');
  await open(page);
  await expect(page.locator('.image-meta')).toContainText('400 × 300 px');
  await expect(page.locator('.image-meta')).toContainText('PNG');
  expect(await values(page)).toEqual(['40', '30', '320', '240']);

  // A 20 × 20 crop centred on the point where the four quadrants meet.
  await setField(page, 'width', '20');
  await setField(page, 'height', '20');
  await setField(page, 'x', '190');
  await setField(page, 'y', '140');
  expect(await values(page)).toEqual(['190', '140', '20', '20']);
  await page.getByRole('button', { name: 'Crop image' }).click();
  await expect(page.locator('.image-status')).toHaveText(
    'Done. The cropped image is ready to download.',
  );
  await expect(page.locator('.result-row-primary')).toContainText('20 × 20 px');
  await expect(page.locator('.result')).toContainText('X 190, Y 140');

  const out = await output(page, [
    [0, 0],
    [9, 9],
    [10, 0],
    [19, 9],
    [0, 10],
    [9, 19],
    [10, 10],
    [19, 19],
  ]);
  expect(out.type).toBe('image/png');
  expect(out.size).toEqual([20, 20]);
  expect(out.pixels).toEqual([RED, RED, GREEN, GREEN, BLUE, BLUE, CLEAR, CLEAR]);

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download cropped image (quadrants-cropped.png)' }).click();
  expect((await download).suggestedFilename()).toBe('quadrants-cropped.png');
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});

test('warns about JPEG transparency and fills it with white', async ({ page }) => {
  await page.goto(TOOL);
  await open(page);
  await setField(page, 'x', '80'); // 80 + 320 = 400: still inside
  await setField(page, 'width', '200');
  await setField(page, 'height', '150');
  await setField(page, 'x', '200');
  await setField(page, 'y', '150');
  await page.getByLabel('Save as').selectOption('jpeg');
  await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
  await page.getByRole('button', { name: 'Crop image' }).click();
  await expect(page.locator('.result-notes')).toContainText(
    'Transparent areas were filled with white',
  );
  await expect(page.locator('#crop-download')).toHaveAttribute('download', 'quadrants-cropped.jpg');
  const out = await output(page, [
    [0, 0],
    [199, 149],
  ]);
  expect(out.type).toBe('image/jpeg');
  expect(out.size).toEqual([200, 150]);
  for (const px of out.pixels) {
    for (const ch of px.slice(0, 3)) expect(ch).toBeGreaterThanOrEqual(250);
    expect(px[3]).toBe(255);
  }
});

test('moves the selection by dragging, converting screen pixels to image pixels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 }); // preview scaled down
  await page.goto(TOOL);
  await open(page);
  const s = await scale(page);
  expect(s).toBeGreaterThan(1);
  await drag(page, '#crop-selection', 15, 10);
  expect(await numbers(page)).toEqual([Math.round(40 + 15 * s), Math.round(30 + 10 * s), 320, 240]);
  // Past the image edges (150 × 1.36 > 40 px of room): it stops there, size unchanged.
  await drag(page, '#crop-selection', 150, 100);
  expect(await numbers(page)).toEqual([80, 60, 320, 240]);
  // The on-screen box stays aligned with the image pixels it represents.
  const img = (await page.locator('.crop-image').boundingBox())!;
  const box = (await sel(page).boundingBox())!;
  expect(box.x - img.x).toBeCloseTo(80 / s, 0);
  expect(box.width).toBeCloseTo(320 / s, 0);
  expect(box.x + box.width).toBeCloseTo(img.x + img.width, 0);
});

test('resizes with the handles, within the image and at a fixed ratio', async ({ page }) => {
  await page.goto(TOOL);
  await open(page);
  const s = await scale(page);
  await drag(page, '.crop-handle-se', -40, -20);
  expect(await numbers(page)).toEqual([
    40,
    30,
    Math.round(360 - 40 * s) - 40,
    Math.round(270 - 20 * s) - 30,
  ]);
  await drag(page, '.crop-handle-nw', -100, -100); // past the top-left corner
  const [x, y] = await numbers(page);
  expect([x, y]).toEqual([0, 0]);

  await page.getByLabel('Aspect ratio').selectOption('1:1');
  const [, , w0, h0] = await numbers(page);
  expect(w0).toBe(h0);
  await drag(page, '.crop-handle-e', 30, 0);
  const [, , w1, h1] = await numbers(page);
  expect(w1).toBe(h1);
  expect(w1).toBeGreaterThan(w0!);
  await page.getByLabel('Aspect ratio').selectOption('16:9');
  const [, , w2, h2] = await numbers(page);
  expect(Math.abs(w2! / h2! - 16 / 9)).toBeLessThan(0.01);
  await page.getByLabel('Aspect ratio').selectOption('passport');
  const [, , w3, h3] = await numbers(page);
  expect(Math.abs(w3! / h3! - 35 / 45)).toBeLessThan(0.01);
  await expect(page.getByText('Passport-style is only a 35:45 shape')).toBeVisible();
});

test('is fully keyboard operable without scrolling the page', async ({ page }) => {
  await page.goto(TOOL);
  await open(page);
  await page.getByRole('button', { name: 'Reset' }).focus();
  await page.keyboard.press('Tab');
  await expect(sel(page)).toBeFocused();
  await expect(sel(page)).toHaveAccessibleDescription(/arrow keys to move it/);
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await values(page)).toEqual(['41', '40', '320', '240']);
  await expect(page.locator('.crop-editor .sr-only')).toHaveText(
    'Crop area 320 × 240 pixels at X 41, Y 40.',
  );
  await page.keyboard.press('Tab');
  await expect(page.locator('.crop-handle-se')).toBeFocused();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('ArrowUp');
  expect(await values(page)).toEqual(['41', '40', '310', '239']);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Aspect ratio')).toBeFocused();
  // Typed values apply with Enter, and arrows in fields do not move the selection.
  await page.locator('#crop-x').fill('0');
  await page.locator('#crop-x').press('ArrowRight');
  await page.locator('#crop-x').press('Enter');
  await expect(page.locator('#crop-download')).toBeVisible();
  expect(await values(page)).toEqual(['0', '40', '310', '239']);
  await expect(page.locator('.result-row-primary')).toContainText('310 × 239 px');
});

test('rejects values outside the image instead of clamping them', async ({ page }) => {
  await page.goto(TOOL);
  await open(page);
  await setField(page, 'x', '200');
  const x = page.locator('#crop-x');
  await expect(x).toHaveAttribute('aria-invalid', 'true');
  await expect(x).toHaveAccessibleDescription(/X \+ width can be at most 400 pixels\.$/);
  expect(await page.locator('#crop-selection').evaluate((e: HTMLElement) => e.style.left)).toBe(
    '10%',
  );
  await page.getByRole('button', { name: 'Crop image' }).click();
  await expect(x).toBeFocused();
  await expect(page.locator('.image-output')).toBeHidden();
});

test('handles invalid files, replace and reset', async ({ page }) => {
  await page.goto(TOOL);
  const alert = page.getByRole('alert');
  await page.locator('#crop-file').setInputFiles(FIX + 'not-an-image.txt');
  await expect(alert).toHaveText('This file is not a JPEG, PNG or WebP image.');
  await page.locator('#crop-file').setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/^The image could not be opened/);
  await open(page);
  await page.locator('#crop-file').setInputFiles(FIX + 'corrupt.png');
  await expect(alert).toHaveText(/Your current image is still open\.$/);
  await expect(page.locator('.image-meta')).toContainText('400 × 300 px');

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image' }).click();
  await (await chooser).setFiles(FIX + 'photo.jpg');
  await expect(page.locator('.image-meta')).toContainText('320 × 240 px');
  expect(await values(page)).toEqual(['32', '24', '256', '192']);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#crop-dropzone')).toBeVisible();
  await expect(page.locator('.crop-editor')).toBeHidden();
  await expect(page.locator('#crop-file')).toBeFocused();
});

test('opens an image dropped onto the drop zone', async ({ page }) => {
  await page.goto(TOOL);
  const data = await page.evaluateHandle(async () => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 40;
    c.getContext('2d')!.fillRect(0, 0, 60, 40);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'dropped.png', { type: 'image/png' }));
    return dt;
  });
  const zone = page.locator('#crop-dropzone');
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveClass(/dropzone-active/);
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(page.locator('.image-status')).toHaveText('Image opened: 60 × 40 pixels.');
  expect(await values(page)).toEqual(['6', '4', '48', '32']);
});

test('only the selection captures touch drags; the rest of the page can scroll', async ({
  page,
}) => {
  await page.goto(TOOL);
  await open(page);
  const touch = (s: string) => page.locator(s).evaluate((e) => getComputedStyle(e).touchAction);
  expect(await touch('#crop-selection')).toBe('none');
  expect(await touch('.crop-handle-se')).toBe('none');
  expect(await touch('.crop-frame')).toBe('auto');
  expect(await touch('.image-controls')).toBe('auto');
});

test('keeps the selection and result in Bangla and dark mode, storing nothing', async ({
  page,
}) => {
  await page.goto(TOOL);
  await open(page);
  await sel(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Crop image' }).click();
  await expect(page.locator('.image-output')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি ক্রপার');
  await expect(page.locator('#crop-x')).toHaveValue('৪১');
  await expect(page.locator('.result-row-primary')).toContainText('৩২০ × ২৪০ পিক্সেল');
  await expect(page.locator('.image-output')).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every((k) => k.startsWith('nguh.'))).toBe(true);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

for (const w of [360, 768, 1280]) {
  test.describe(`at ${w} px`, () => {
    test.use({ viewport: { width: w, height: 900 } });

    for (const lang of ['en', 'bn'] as const) {
      test(`${lang}: aligned editor, no horizontal scrolling`, async ({ page }) => {
        await page.goto(TOOL);
        if (lang === 'bn')
          await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
        await noHorizontalScroll(page);
        await page.locator('#crop-file').setInputFiles(FIX + 'quadrants.png');
        await expect(sel(page)).toBeVisible();
        const img = (await page.locator('.crop-image').boundingBox())!;
        const stage = (await page.locator('.crop-stage').boundingBox())!;
        expect(stage.width).toBeCloseTo(img.width, 1);
        expect(stage.height).toBeCloseTo(img.height, 1);
        const box = (await sel(page).boundingBox())!;
        expect(box.x - img.x).toBeCloseTo(img.width * 0.1, 0);
        expect(box.width).toBeCloseTo(img.width * 0.8, 0);
        await noHorizontalScroll(page);
        await page.locator('#crop-submit').click();
        await expect(page.locator('.image-output')).toBeVisible();
        await noHorizontalScroll(page);
      });
    }
  });
}

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const log = watch(page, new URL(base).origin);
  await page.goto(`${base}#/tool/image-cropper`);
  await open(page);
  await page.getByLabel('Aspect ratio').selectOption('1:1');
  await page.getByRole('button', { name: 'Crop image' }).click();
  const out = await output(page, [[0, 0]]);
  expect(out.size).toEqual([277, 277]);
  expect(log.console).toEqual([]);
  expect(log.problems).toEqual([]);
});
