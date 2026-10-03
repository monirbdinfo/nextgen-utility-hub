import { expect, test } from '@playwright/test';
import { inspect, openImage, watchProblems } from './support';

// EXIF orientation fixtures (generated locally, see docs/TOOLS.md): the stored pixels are
// 80 × 60 with top-left red, top-right green, bottom-left blue and bottom-right yellow; only
// the EXIF Orientation tag differs. Browsers apply the tag when decoding, so these are the
// expected *displayed* layouts (quadrants TL TR BL BR) and sizes:
const ORIENTED = {
  1: { size: [80, 60], quadrants: 'RGBY' }, // as stored
  3: { size: [80, 60], quadrants: 'YBGR' }, // rotated 180°
  6: { size: [60, 80], quadrants: 'BRYG' }, // rotated 90° clockwise: portrait
  8: { size: [60, 80], quadrants: 'GYRB' }, // rotated 90° counter-clockwise: portrait
} as const;
type Orientation = keyof typeof ORIENTED;
const fixture = (o: Orientation) => `exif-orientation-${o}.jpg`;
const dims = (o: Orientation) => `${ORIENTED[o].size[0]} × ${ORIENTED[o].size[1]} px`;

test.describe('EXIF orientation', () => {
  for (const o of [1, 3, 6, 8] as const) {
    test(`Converter: orientation ${o} is applied once and the output is upright`, async ({
      page,
      baseURL,
    }) => {
      const problems = watchProblems(page, new URL(baseURL!).origin);
      await page.goto('/#/tool/image-converter');
      await openImage(page, '#convert-file', fixture(o));
      await expect(page.locator('.image-meta')).toContainText(dims(o));
      // The original preview is shown the right way up.
      const preview = await inspect(page.locator('.image-card img'));
      expect(preview.size).toEqual(ORIENTED[o].size);
      expect(preview.quadrants).toBe(ORIENTED[o].quadrants);

      await page.locator('#convert-format').selectOption('png'); // lossless: exact colours
      await page.locator('#convert-submit').click();
      const out = await inspect(page.locator('#convert-download'));
      expect(out.magic).toBe('png');
      expect(out.size).toEqual(ORIENTED[o].size);
      expect(out.quadrants).toBe(ORIENTED[o].quadrants);
      // The output preview shows the same pixels as the downloaded file.
      const outPreview = await inspect(page.locator('.image-output img'));
      expect([outPreview.size, outPreview.quadrants]).toEqual([out.size, out.quadrants]);
      expect(problems).toEqual([]);
    });
  }

  test('Resizer: a portrait (orientation 6) resizes upright, without EXIF in the output', async ({
    page,
  }) => {
    await page.goto('/#/tool/image-resizer');
    await openImage(page, '#resize-file', fixture(6));
    await expect(page.locator('#resize-width')).toHaveValue('60');
    await expect(page.locator('#resize-height')).toHaveValue('80');
    await page.getByRole('button', { name: 'Set size to 50% of the original' }).click();
    await page.locator('#resize-submit').click();
    const out = await inspect(page.locator('#resize-download'));
    expect(out.magic).toBe('jpeg');
    expect(out.size).toEqual([30, 40]);
    expect(out.quadrants).toBe(ORIENTED[6].quadrants);
    // Pixels are stored upright and the tag is not copied, so no viewer can rotate it twice.
    expect(out.exif).toBe(false);
    await expect(page.locator('#resize-download')).toHaveAttribute(
      'download',
      'exif-orientation-6-30x40.jpg',
    );
  });

  test('Cropper: coordinates refer to the upright image (orientation 6)', async ({ page }) => {
    await page.goto('/#/tool/image-cropper');
    await openImage(page, '#crop-file', fixture(6));
    // 80 % of the displayed 60 × 80 image, centred: the crop space is the upright image.
    await expect(page.locator('#crop-x')).toHaveValue('6');
    await expect(page.locator('#crop-y')).toHaveValue('8');
    await expect(page.locator('#crop-width')).toHaveValue('48');
    await expect(page.locator('#crop-height')).toHaveValue('64');
    const stage = (await page.locator('.crop-image').boundingBox())!;
    expect(stage.height).toBeGreaterThan(stage.width); // the editor shows a portrait

    // Crop the displayed top-left quadrant (30 × 40): it must be entirely blue.
    for (const [f, v] of [
      ['width', '30'],
      ['height', '40'],
      ['x', '0'],
      ['y', '0'],
    ] as const) {
      await page.locator(`#crop-${f}`).fill(v);
      await page.locator(`#crop-${f}`).press('Tab');
    }
    await expect(page.locator('#crop-x')).toHaveValue('0');
    await page.locator('#crop-format').selectOption('png');
    await page.locator('#crop-submit').click();
    const out = await inspect(page.locator('#crop-download'), [
      [2, 2],
      [27, 2],
      [2, 37],
      [27, 37],
    ]);
    expect(out.size).toEqual([30, 40]);
    expect(out.points).toEqual(['B', 'B', 'B', 'B']);
  });

  test('Compressor: orientation 8 is kept upright at the same dimensions', async ({ page }) => {
    await page.goto('/#/tool/image-compressor');
    await openImage(page, '#compress-file', fixture(8));
    await expect(page.locator('.image-meta')).toContainText(dims(8));
    await page.locator('#compress-quality').fill('90');
    await page.locator('#compress-submit').click();
    const out = await inspect(page.locator('#compress-download'));
    expect(out.magic).toBe('jpeg');
    expect(out.size).toEqual([60, 80]);
    expect(out.quadrants).toBe(ORIENTED[8].quadrants);
    expect(out.exif).toBe(false);
    await expect(page.locator('.result')).toContainText('60 × 80 px');
  });
});
