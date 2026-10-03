import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { FIX, inspect, kb, noHorizontalScroll, openImage, watchProblems } from './support';

// Core flows of the four image tools, written to run in Chromium, Firefox and WebKit.
// Expectations that legitimately differ between engines (which formats the canvas can
// encode) are detected in the page and asserted explicitly, never skipped. Encoded byte
// counts differ between engines, so sizes are compared with the downloaded file and the
// original, not with fixed numbers.

/** Which formats this browser's canvas can encode (the same test the app uses). */
async function encoders(page: Page): Promise<Record<'jpeg' | 'png' | 'webp', boolean>> {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const can = (mime: string) => c.toDataURL(mime).startsWith(`data:${mime}`);
    return { jpeg: can('image/jpeg'), png: can('image/png'), webp: can('image/webp') };
  });
}

test.describe('Image Resizer', () => {
  test('resizes a JPEG and downloads a real JPEG of the requested size', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/image-resizer');
    await openImage(page, '#resize-file', 'photo.jpg');
    await expect(page.locator('.image-meta')).toContainText('320 × 240 px');
    await page.getByRole('button', { name: 'Set size to 50% of the original' }).click();
    await page.locator('#resize-submit').click();
    const out = await inspect(page.locator('#resize-download'));
    expect([out.magic, out.type]).toEqual(['jpeg', 'image/jpeg']);
    expect(out.size).toEqual([160, 120]);
    const download = page.waitForEvent('download');
    await page.locator('#resize-download').click();
    expect((await download).suggestedFilename()).toBe('photo-160x120.jpg');
    expect(problems).toEqual([]);
  });

  test('keeps PNG transparency and fills it with white for JPEG', async ({ page }) => {
    await page.goto('/#/tool/image-resizer');
    await openImage(page, '#resize-file', 'transparent.png');
    await page.locator('#resize-submit').click();
    let out = await inspect(page.locator('#resize-download'), [
      [10, 50],
      [190, 50],
    ]);
    expect(out.magic).toBe('png');
    expect(out.points[1]).toBe('T');
    await page.locator('#resize-format').selectOption('jpeg');
    await expect(page.locator('.image-warnings')).toContainText('JPEG cannot store transparency');
    await page.locator('#resize-submit').click();
    await expect(page.locator('#resize-download')).toHaveAttribute('download', /\.jpg$/);
    out = await inspect(page.locator('#resize-download'), [[190, 50]]);
    expect(out.magic).toBe('jpeg');
    expect(out.points[0]).toBe('W');
  });
});

test.describe('Image Cropper', () => {
  test('crops exact pixels, by typed values, keyboard and mouse', async ({ page }) => {
    await page.goto('/#/tool/image-cropper');
    await openImage(page, '#crop-file', 'quadrants.png');
    await expect(page.locator('#crop-x')).toHaveValue('40');
    // Keyboard: arrow keys move the selection by one source pixel.
    await page.locator('#crop-selection').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#crop-x')).toHaveValue('41');
    // Mouse: drag by 20 CSS px; the expected move uses the measured preview scale.
    await page.locator('#crop-selection').scrollIntoViewIfNeeded();
    const box = (await page.locator('#crop-selection').boundingBox())!;
    const img = (await page.locator('.crop-image').boundingBox())!;
    const scale = 400 / img.width;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 5);
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10);
    await page.mouse.up();
    await expect(page.locator('#crop-x')).toHaveValue(String(Math.round(41 + 20 * scale)));
    // Typed values: 20 × 20 around the point where the quadrants meet.
    for (const [f, v] of [
      ['width', '20'],
      ['height', '20'],
      ['x', '190'],
      ['y', '140'],
    ] as const) {
      await page.locator(`#crop-${f}`).fill(v);
      await page.locator(`#crop-${f}`).press('Tab');
    }
    await page.locator('#crop-submit').click();
    const out = await inspect(page.locator('#crop-download'), [
      [5, 5],
      [15, 5],
      [5, 15],
      [15, 15],
    ]);
    expect(out.magic).toBe('png');
    expect(out.size).toEqual([20, 20]);
    expect(out.points).toEqual(['R', 'G', 'B', 'T']);
    await expect(page.locator('#crop-download')).toHaveAttribute(
      'download',
      'quadrants-cropped.png',
    );
  });

  test('keeps the passport-style 35:45 shape', async ({ page }) => {
    await page.goto('/#/tool/image-cropper');
    await openImage(page, '#crop-file', 'quadrants.png');
    await page.locator('#crop-aspect').selectOption('passport');
    const w = Number(await page.locator('#crop-width').inputValue());
    const h = Number(await page.locator('#crop-height').inputValue());
    expect(Math.abs(w / h - 35 / 45)).toBeLessThan(0.01);
    await page.locator('#crop-submit').click();
    const out = await inspect(page.locator('#crop-download'));
    expect(out.size).toEqual([w, h]);
  });
});

test.describe('Image Compressor', () => {
  test('reports the real output size and an honest comparison', async ({ page }) => {
    await page.goto('/#/tool/image-compressor');
    await openImage(page, '#compress-file', 'photo.jpg');
    await page.locator('#compress-quality').fill('50');
    await page.locator('#compress-submit').click();
    const out = await inspect(page.locator('#compress-download'));
    expect(out.magic).toBe('jpeg');
    expect(out.size).toEqual([320, 240]);
    await expect(page.locator('.result-row-primary')).toContainText(kb(out.bytes));
    const diff = 10_903 - out.bytes;
    await expect(page.locator('.result')).toContainText(
      diff > 0 ? `${kb(diff)} smaller` : diff < 0 ? `${kb(-diff)} larger` : 'No change in size',
    );
    await expect(page.locator('#compress-download')).toHaveAttribute(
      'download',
      'photo-compressed-q50.jpg',
    );
  });

  test('reports an unreachable target size', async ({ page }) => {
    await page.goto('/#/tool/image-compressor');
    await openImage(page, '#compress-file', 'photo.jpg');
    await page.locator('#compress-mode-target').check();
    await page.locator('#compress-target').fill('1');
    await page.locator('#compress-submit').click();
    await expect(page.getByRole('alert')).toHaveText(/^The target of 1\.0 KB could not be reached/);
    const out = await inspect(page.locator('#compress-download'));
    expect(out.bytes).toBeGreaterThan(1024);
  });
});

test.describe('Image Converter', () => {
  test('JPEG → PNG and PNG → JPEG with white fill', async ({ page }) => {
    await page.goto('/#/tool/image-converter');
    await openImage(page, '#convert-file', 'photo.jpg');
    await expect(page.locator('#convert-format')).toHaveValue('png');
    await page.locator('#convert-submit').click();
    let out = await inspect(page.locator('#convert-download'));
    expect([out.magic, out.type, out.size]).toEqual(['png', 'image/png', [320, 240]]);
    await expect(page.locator('#convert-download')).toHaveAttribute(
      'download',
      'photo-converted.png',
    );

    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Replace image' }).click();
    await (await chooser).setFiles(FIX + 'transparent.png');
    await page.locator('#convert-format').selectOption('jpeg');
    await page.locator('#convert-submit').click();
    out = await inspect(page.locator('#convert-download'), [[190, 50]]);
    expect([out.magic, out.size]).toEqual(['jpeg', [200, 100]]);
    expect(out.points[0]).toBe('W');
  });

  test('WebP: decodes WebP input; encodes WebP only where the browser can', async ({ page }) => {
    await page.goto('/#/tool/image-converter');
    const enc = await encoders(page);
    expect(enc.jpeg && enc.png).toBe(true);
    // Decoding WebP input is expected in every tested engine.
    await openImage(page, '#convert-file', 'photo.webp');
    await expect(page.locator('.image-meta')).toContainText('160 × 120 px');
    const webp = page.locator('#convert-format option[value="webp"]');
    if (enc.webp) {
      await expect(webp).toBeEnabled();
      await page.locator('#convert-format').selectOption('webp');
      await page.locator('#convert-submit').click();
      const out = await inspect(page.locator('#convert-download'));
      expect([out.magic, out.type]).toEqual(['webp', 'image/webp']);
    } else {
      // No WebP encoder (as in Safari): the option is disabled and explained.
      await expect(webp).toBeDisabled();
      await expect(webp).toHaveText('WebP (not supported by this browser)');
      await page.locator('#convert-format').selectOption('png');
      await page.locator('#convert-submit').click();
      const out = await inspect(page.locator('#convert-download'));
      expect(out.magic).toBe('png');
    }
    test.info().annotations.push({ type: 'webp-encoding', description: String(enc.webp) });
  });

  test('rejects invalid and damaged files', async ({ page }) => {
    await page.goto('/#/tool/image-converter');
    await page.locator('#convert-file').setInputFiles(FIX + 'not-an-image.txt');
    await expect(page.getByRole('alert')).toHaveText('This file is not a JPEG, PNG or WebP image.');
    await page.locator('#convert-file').setInputFiles(FIX + 'corrupt.png');
    await expect(page.getByRole('alert')).toHaveText(/^The image could not be opened/);
  });

  test('simulated: a wrong encoder type never produces a mislabelled download', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
        return toBlob.call(this, cb, type === 'image/png' ? 'image/jpeg' : type, q);
      };
    });
    await page.goto('/#/tool/image-converter');
    await openImage(page, '#convert-file', 'photo.jpg');
    await page.locator('#convert-submit').click();
    await expect(page.getByRole('alert')).toHaveText(/^This browser cannot save PNG images/);
    await expect(page.locator('.image-output')).toBeHidden();
  });

  test('opens a dropped file and fits a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/#/tool/image-converter');
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
    await page.locator('#convert-dropzone').dispatchEvent('drop', { dataTransfer: data });
    await expect(page.locator('.image-status')).toHaveText('Image opened: 60 × 40 pixels.');
    await page.locator('#convert-submit').click();
    await expect(page.locator('.image-output')).toBeVisible();
    await noHorizontalScroll(page);
  });
});

test('all four tools work under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const problems = watchProblems(page, new URL(base).origin);
  for (const [tool, input, submit, link] of [
    ['image-resizer', '#resize-file', '#resize-submit', '#resize-download'],
    ['image-cropper', '#crop-file', '#crop-submit', '#crop-download'],
    ['image-compressor', '#compress-file', '#compress-submit', '#compress-download'],
    ['image-converter', '#convert-file', '#convert-submit', '#convert-download'],
  ] as const) {
    await page.goto(`${base}#/tool/${tool}`);
    await openImage(page, input, 'photo.jpg');
    await page.locator(submit).click();
    const out = await inspect(page.locator(link));
    expect(out.magic, tool).not.toBe('unknown');
  }
  expect(problems).toEqual([]);
});
