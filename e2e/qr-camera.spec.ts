import { expect, test } from '@playwright/test';

// Chromium only (not in CROSS_BROWSER_SPECS): the fake-camera switches below are Chromium flags.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

test('the camera starts only on request, shows a preview, and stops again', async ({ page }) => {
  await page.goto('/#/tool/qr-scanner');
  await expect(page.locator('.qr-video')).toBeHidden();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.locator('.qr-video')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop camera' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Looking for a QR code' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop camera' }).click();
  await expect(page.locator('.qr-video')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();
  expect(
    await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).srcObject),
  ).toBeNull();
});

test('leaving the tool releases the camera', async ({ page }) => {
  await page.goto('/#/tool/qr-scanner');
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.locator('.qr-video')).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as { __tracks: MediaStreamTrack[] };
    w.__tracks = (
      (document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream
    ).getTracks();
  });
  await page.goto('/#/tool/rot13-decoder');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ROT13 Decoder / Encoder');
  expect(
    await page.evaluate(() =>
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.map((t) => t.readyState),
    ),
  ).toEqual(['ended']);
});

test('switching language releases the camera too', async ({ page }) => {
  await page.goto('/#/tool/qr-scanner');
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.locator('.qr-video')).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as { __tracks: MediaStreamTrack[] };
    w.__tracks = (
      (document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream
    ).getTracks();
  });
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR স্ক্যানার');
  await expect(page.locator('.qr-video')).toBeHidden();
  expect(
    await page.evaluate(() =>
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.map((t) => t.readyState),
    ),
  ).toEqual(['ended']);
});
