import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Internet Speed Test and Reverse Image Search. Cloudflare's speed test service is never
// contacted from CI: page.route() answers it with the number of bytes asked for (and the CORS
// header a cross-origin fetch needs), so these tests check what the page requests and how it
// reads the streamed answer, not Cloudflare's live behaviour. Reverse Image Search only builds
// links, so it must make no requests at all.

const SPEED = 'https://speed.cloudflare.com/__down';
const CORS = { 'access-control-allow-origin': '*' };

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

/** Answer the speed test service with the requested number of bytes; returns the requests. */
async function mockSpeed(
  page: Page,
): Promise<Array<{ bytes: number; headers: Record<string, string> }>> {
  const seen: Array<{ bytes: number; headers: Record<string, string> }> = [];
  await page.route(`${SPEED}?**`, async (route) => {
    const bytes = Number(new URL(route.request().url()).searchParams.get('bytes'));
    seen.push({ bytes, headers: route.request().headers() });
    await route.fulfill({
      body: '0'.repeat(bytes),
      headers: { ...CORS, 'content-type': 'application/octet-stream' },
    });
  });
  return seen;
}

test.describe('Internet Speed Test', () => {
  test('downloads only after the button, from Cloudflare only, and shows the speed', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const seen = await mockSpeed(page);
    await page.goto('/#/tool/internet-speed-test');
    await expect(page.locator('.net-notice')).toContainText(SPEED);
    await expect(page.locator('.net-notice')).toContainText('about 4.2 MB');
    await expect(page.locator('.tool-badges')).toContainText('Uses the internet when you ask');
    await page.waitForTimeout(300);
    expect(seen).toHaveLength(0);

    await page.getByRole('button', { name: 'Start test' }).press('Enter');
    await expect(page.locator('.net-status')).toHaveText('Done.', { timeout: 20_000 });
    expect(seen.map((s) => s.bytes)).toEqual([0, 0, 0, 0, 0, 0, 1e5, 1e5, 1e6, 1e6, 1e6, 1e6]);
    for (const s of seen) {
      expect(s.headers.cookie).toBeUndefined();
      expect(s.headers.referer).toBeUndefined();
    }
    await expect(row(page, 'Data downloaded')).toHaveText('4.2 MB');
    await expect(row(page, 'Round trip (median)')).toHaveText(/^\d+ ms$/);
    // A local mock can be too fast to time; either a speed or the explanation is shown.
    const speed = (await row(page, 'Download speed').textContent()) ?? '';
    if (speed === '—') await expect(page.locator('.result-notes')).toContainText('too quickly');
    else expect(speed).toMatch(/^\d+(\.\d+)? Mbps$/);
    await expect(page.getByRole('button', { name: 'Start test' })).toBeFocused();
    expect(problems.filter((p) => !p.startsWith(`off-origin request: ${SPEED}?`))).toEqual([]);
  });

  test('explains a blocked request', async ({ page }) => {
    await page.route(`${SPEED}?**`, (route) => route.abort('blockedbyclient'));
    await page.goto('/#/tool/internet-speed-test');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByRole('alert')).toContainText('could not reach Cloudflare');
    await expect(page.locator('.result-list')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start test' })).toBeEnabled();
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await mockSpeed(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/internet-speed-test');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ইন্টারনেট স্পিড টেস্ট');
    await expect(page.locator('.net-notice')).toContainText('৪.২ MB');
    await page.getByRole('button', { name: 'টেস্ট শুরু করুন' }).click();
    await expect(page.locator('.net-status')).toHaveText('সম্পন্ন।', { timeout: 20_000 });
    await expect(row(page, 'ডাউনলোড হওয়া ডেটা')).toHaveText('৪.২ MB');
    await noHorizontalScroll(page);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await mockSpeed(page);
    await page.goto(`${base}#/tool/internet-speed-test`);
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.locator('.net-status')).toHaveText('Done.', { timeout: 20_000 });
    expect(problems.filter((p) => !p.startsWith(`off-origin request: ${SPEED}?`))).toEqual([]);
  });
});

test.describe('Reverse Image Search', () => {
  test('builds provider links from the keyboard and makes no requests', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/reverse-image-search');
    await page.locator('#ris-url').fill('https://example.com/photo.jpg');
    await page.locator('#ris-url').press('Enter');
    const links = page.locator('.result .link-list a');
    await expect(links).toHaveCount(4);
    await expect(links.first()).toHaveAttribute(
      'href',
      `https://lens.google.com/uploadbyurl?url=${encodeURIComponent('https://example.com/photo.jpg')}`,
    );
    for (const a of await links.all()) {
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('refuses a private address and fits a phone in Bangla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/reverse-image-search');
    await page.locator('#ris-url').fill('http://192.168.1.4/a.jpg');
    await page.getByRole('button', { name: 'Make search links' }).click();
    await expect(page.locator('#ris-url-error')).toContainText('private network');
    await expect(page.locator('.result .link-list')).toHaveCount(0);
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('রিভার্স ইমেজ সার্চ');
    await noHorizontalScroll(page);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/reverse-image-search`);
    await page.locator('#ris-url').fill('https://example.com/p.png');
    await page.getByRole('button', { name: 'Make search links' }).click();
    await expect(page.locator('.result .link-list a')).toHaveCount(4);
    expect(problems).toEqual([]);
  });
});
