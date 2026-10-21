import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { FIX, inspect, kb, noHorizontalScroll, openImage, watchProblems } from './support';

// Fixtures: exif-orientation-1.jpg is 80 × 60 with quadrants red (top left), green (top
// right), blue (bottom left) and yellow (bottom right); photo.jpg is 320 × 240;
// transparent.png is 200 × 100 with the right half transparent. PNG output is used where
// exact colours are checked, because JPEG blurs colour edges.
const TOOL = '/#/tool/job-photo-resizer';
const download = (page: Page) => page.locator('#photo-download');
const result = (page: Page) => page.locator('.result');

async function settings(
  page: Page,
  s: { w: string; h: string; fit?: 'crop' | 'pad'; format?: string; limit?: string },
): Promise<void> {
  await page.locator('#photo-width').fill(s.w);
  await page.locator('#photo-height').fill(s.h);
  if (s.fit) await page.locator(`#photo-fit-${s.fit}`).check();
  if (s.format) await page.locator('#photo-format').selectOption(s.format);
  if (s.limit !== undefined) await page.locator('#photo-limit').fill(s.limit);
}

const prepare = (page: Page) => page.getByRole('button', { name: 'Prepare image' }).click();

test('crops to an exact size, centred, without stretching or network use', async ({
  page,
  baseURL,
}) => {
  const problems = watchProblems(page, new URL(baseURL!).origin);
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'exif-orientation-1.jpg');
  await settings(page, { w: '60', h: '60', format: 'png' });
  await expect(page.locator('#photo-plan')).toHaveText(
    'Output: 60 × 60 px PNG. About 25.0% of the image will be cut off at the left and right.',
  );
  await prepare(page);
  // 10 px are cut from each side; the quadrants keep their proportions.
  const out = await inspect(download(page), [
    [2, 10],
    [57, 10],
    [2, 50],
    [57, 50],
  ]);
  expect([out.magic, out.type, out.size]).toEqual(['png', 'image/png', [60, 60]]);
  expect(out.points).toEqual(['R', 'G', 'B', 'Y']);
  expect(out.exif).toBe(false);
  await expect(download(page)).toHaveAttribute('download', 'exif-orientation-1-60x60.png');
  await expect(result(page)).toContainText('60 × 60 px');
  await expect(result(page)).toContainText(kb(out.bytes));
  await expect(result(page)).toContainText('Cropped: about 25.0% cut off at the left and right');
  // The preview shows the same file.
  const preview = await inspect(page.locator('.image-output img'));
  expect(preview.size).toEqual([60, 60]);
  expect(problems).toEqual([]);
});

test('fits the whole image with white space instead of cropping', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'exif-orientation-1.jpg');
  await settings(page, { w: '80', h: '80', fit: 'pad', format: 'png' });
  await expect(page.locator('#photo-plan')).toContainText('added at the top and bottom');
  await prepare(page);
  // The 80 × 60 image sits between 10 px white bands.
  const out = await inspect(download(page), [
    [40, 3],
    [40, 76],
    [20, 20],
    [60, 20],
    [20, 60],
    [60, 60],
  ]);
  expect(out.size).toEqual([80, 80]);
  expect(out.points).toEqual(['W', 'W', 'R', 'G', 'B', 'Y']);
  await expect(result(page)).toContainText('Padded: white space added at the top and bottom');
});

test('keeps a JPEG within a file-size limit and reports the real size', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'photo.jpg');
  await settings(page, { w: '300', h: '300', limit: '8' });
  await prepare(page);
  const out = await inspect(download(page));
  expect([out.magic, out.size]).toEqual(['jpeg', [300, 300]]);
  expect(out.bytes).toBeLessThanOrEqual(8 * 1024);
  await expect(result(page)).toContainText('Within the limit (8.0 KB)');
  await expect(result(page)).toContainText(kb(out.bytes));
  await expect(page.locator('.image-alert')).toBeHidden();
  await expect(download(page)).toHaveAttribute('download', 'photo-300x300.jpg');
});

test('says so when a limit cannot be met, and still never stretches', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'photo.jpg');
  await settings(page, { w: '1000', h: '1000', limit: '1' });
  await expect(page.locator('.image-warnings')).toContainText('will be enlarged');
  await prepare(page);
  await expect(page.locator('.image-alert')).toContainText(
    'could not be met even at the lowest quality (10%)',
  );
  const out = await inspect(download(page));
  expect(out.size).toEqual([1000, 1000]);
  expect(out.bytes).toBeGreaterThan(1024);
  await expect(result(page)).toContainText('Over the limit (1.0 KB)');
  await expect(page.locator('.image-alert')).toContainText(kb(out.bytes));
});

test('fills transparency with white for JPEG and in padding', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'transparent.png');
  await settings(page, { w: '200', h: '100', format: 'jpeg' });
  await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
  await prepare(page);
  let out = await inspect(download(page), [[160, 50]]);
  expect(out.points).toEqual(['W']);
  await expect(result(page)).toContainText('Transparent areas were filled with white');

  await settings(page, { w: '200', h: '200', fit: 'pad', format: 'png' });
  await prepare(page);
  out = await inspect(download(page), [
    [100, 10],
    [160, 100],
  ]);
  expect(out.points).toEqual(['W', 'W']);
  await expect(result(page)).toContainText('Empty space and any transparent areas');
});

test('validates input and rejects files that are not images', async ({ page }) => {
  await page.goto(TOOL);
  await page.locator('#photo-file').setInputFiles(FIX + 'not-an-image.txt');
  await expect(page.locator('.image-alert')).toHaveText(
    'This file is not a JPEG, PNG or WebP image.',
  );
  await openImage(page, '#photo-file', 'photo.jpg');
  await prepare(page);
  await expect(page.locator('#photo-width-error')).toHaveText('Enter a whole number of pixels.');
  await expect(page.locator('#photo-width')).toBeFocused();
  await settings(page, { w: '300', h: '0' });
  await prepare(page);
  await expect(page.locator('#photo-height-error')).toHaveText('Must be at least 1 pixel.');
  await settings(page, { w: '300', h: '300', limit: 'abc' });
  await prepare(page);
  await expect(page.locator('#photo-limit-error')).toContainText('Enter a size in KB');
  await expect(page.locator('.image-output')).toBeHidden();
});

test('is keyboard operable', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'exif-orientation-1.jpg');
  await page.locator('#photo-width').focus();
  await page.keyboard.type('40');
  await page.keyboard.press('Tab');
  await page.keyboard.type('40');
  await page.keyboard.press('Tab');
  await expect(page.locator('#photo-fit-crop')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#photo-fit-pad')).toBeChecked();
  await page.locator('#photo-limit').focus();
  await page.keyboard.press('Enter');
  await expect(download(page)).toHaveAttribute('download', 'exif-orientation-1-40x40.jpg');
  await expect(result(page)).toContainText('Padded');
});

test('works in Bangla and dark mode, keeping state in memory only', async ({ page }) => {
  await page.goto(TOOL);
  await openImage(page, '#photo-file', 'photo.jpg');
  await settings(page, { w: '300', h: '80', limit: '60' });
  await prepare(page);
  await expect(page.locator('.image-output')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ছবি ও স্বাক্ষর রিসাইজার');
  await expect(page.locator('.image-output')).toBeVisible();
  await expect(result(page)).toContainText('৩০০ × ৮০ পিক্সেল');
  await expect(result(page)).toContainText('সীমার মধ্যে');
  await expect(page.locator('#photo-width')).toHaveValue('300');
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
        await page.locator('#photo-file').setInputFiles(FIX + 'photo.jpg');
        await expect(page.locator('.photo-controls')).toBeVisible();
        await settings(page, { w: '300', h: '300', fit: 'pad', limit: '100' });
        await page.locator('#photo-submit').click();
        await expect(page.locator('.image-output')).toBeVisible();
        await noHorizontalScroll(page);
      });
    }
  });
}

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const problems = watchProblems(page, new URL(base).origin);
  await page.goto(`${base}#/tool/job-photo-resizer`);
  await openImage(page, '#photo-file', 'photo.jpg');
  await settings(page, { w: '300', h: '300' });
  await prepare(page);
  const out = await inspect(download(page));
  expect([out.magic, out.size]).toEqual(['jpeg', [300, 300]]);
  expect(problems).toEqual([]);
});
