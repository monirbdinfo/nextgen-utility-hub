import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { FIX, noHorizontalScroll, watchProblems } from './support';

// QR tools. The generator draws the code in the page; the scanner reads pictures (or the camera)
// with a decoder that is loaded only when needed. The strongest test is the round trip through a
// real PNG file: generate, download, then scan that file. Engine-neutral, so it also runs in
// Firefox and WebKit.

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

/** Create a code on the generator page and return the path of its downloaded PNG. */
async function downloadPng(page: Page, base: string): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('qr-code.png');
  void base;
  return (await file.path())!;
}

test.describe('generator → real PNG → scanner', () => {
  test('a text code survives the round trip, with no off-site requests', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/qr-code-generator');
    await page.locator('#qr-text').fill('https://example.com/বাংলা?x=1&y=2');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    await expect(page.locator('.qr-svg')).toBeVisible();
    const png = await downloadPng(page, '');

    await page.goto('/#/tool/qr-scanner');
    await page.locator('#qrscan-image').setInputFiles(png);
    await expect(row(page, 'Content')).toHaveText('https://example.com/বাংলা?x=1&y=2');
    await expect(row(page, 'Type')).toHaveText('Web link');
    await expect(page.getByRole('link', { name: 'Open link in a new tab' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await expect(page.locator('.result-notes')).toContainText('Check the address carefully');
    expect(problems).toEqual([]);
  });

  test('a Wi-Fi code is read back, with the password hidden until asked', async ({ page }) => {
    await page.goto('/#/tool/qr-code-generator');
    await page.locator('#qr-type').selectOption('wifi');
    await page.locator('#qr-ssid').fill('Café; WiFi');
    await page.locator('#qr-password').fill('p@ss:word,123');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    const png = await downloadPng(page, '');

    await page.goto('/#/tool/wifi-qr-scanner');
    await page.locator('#wifiscan-image').setInputFiles(png);
    await expect(row(page, 'Network name (SSID)')).toHaveText('Café; WiFi');
    await expect(row(page, 'Security')).toHaveText('WPA / WPA2 / WPA3');
    await expect(row(page, 'Password')).toHaveText('•'.repeat(13));
    await expect(page.locator('.result-list')).not.toContainText('p@ss:word,123');
    await page.getByLabel('Show the password').check();
    await expect(row(page, 'Password')).toHaveText('p@ss:word,123');
  });

  test('a contact card is recognised by the scanner', async ({ page }) => {
    await page.goto('/#/tool/qr-code-generator');
    await page.locator('#qr-type').selectOption('contact');
    await page.locator('#qr-cname').fill('Md. Maniruzzaman');
    await page.locator('#qr-cemail').fill('hello@example.com');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    const png = await downloadPng(page, '');
    await page.goto('/#/tool/qr-scanner');
    await page.locator('#qrscan-image').setInputFiles(png);
    await expect(row(page, 'Type')).toHaveText('Contact card');
    await expect(row(page, 'Content')).toContainText('FN:Md. Maniruzzaman');
  });

  test('the SVG download has the right name', async ({ page }) => {
    await page.goto('/#/tool/qr-code-generator');
    await page.locator('#qr-text').fill('svg please');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download SVG' }).click();
    expect((await download).suggestedFilename()).toBe('qr-code.svg');
  });
});

test.describe('scanner messages', () => {
  test('a picture with no QR code says so, and a non-picture is refused', async ({ page }) => {
    await page.goto('/#/tool/qr-scanner');
    await page.locator('#qrscan-image').setInputFiles(`${FIX}quadrants.png`);
    await expect(page.getByRole('alert')).toContainText('No QR code was found');
    await page.locator('#qrscan-image').setInputFiles(`${FIX}corrupt.png`);
    await expect(page.getByRole('alert')).toContainText('could not be read as a picture');
  });

  test('says what the camera does before it is used', async ({ page }) => {
    await page.goto('/#/tool/qr-scanner');
    await expect(page.locator('.net-notice')).toContainText('never recorded, stored or uploaded');
    await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();
  });
});

test.describe('layout and themes', () => {
  test('the code stays black on white in dark mode and fits a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/qr-code-generator');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.locator('#qr-text').fill('dark mode check');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    await expect(page.locator('.qr-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR কোড জেনারেটর');
    await expect(page.locator('.qr-svg')).toBeVisible();
  });

  test('works under the GitHub Pages sub-path, including the lazily loaded decoder', async ({
    page,
  }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/qr-code-generator`);
    await page.locator('#qr-text').fill('sub-path round trip');
    await page.getByRole('button', { name: 'Create QR code' }).click();
    const png = await downloadPng(page, base);
    await page.goto(`${base}#/tool/qr-scanner`);
    await page.locator('#qrscan-image').setInputFiles(png);
    await expect(row(page, 'Content')).toHaveText('sub-path round trip');
    expect(problems).toEqual([]);
  });
});
