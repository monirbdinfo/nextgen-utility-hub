import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// BIMI Checker & Generator. Cloudflare DNS is never contacted from CI: page.route() answers
// the DoH JSON API (with the CORS header a cross-origin fetch needs). The generator is offline.

const DOH = 'https://cloudflare-dns.com/dns-query';
const CORS = { 'access-control-allow-origin': '*' };
const LOGO = 'https://example.com/logo.svg';
const VMC = 'https://example.com/vmc.pem';

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

async function mockDns(page: Page, records: Record<string, string[]>): Promise<string[]> {
  const asked: string[] = [];
  await page.route(`${DOH}?**`, async (route) => {
    const url = new URL(route.request().url());
    const name = url.searchParams.get('name')!;
    asked.push(`${name} ${url.searchParams.get('type')}`);
    const txts = records[name];
    await route.fulfill({
      json: txts
        ? {
            Status: 0,
            Answer: txts.map((t) => ({ name: `${name}.`, type: 16, TTL: 300, data: `"${t}"` })),
          }
        : { Status: 3 },
      headers: CORS,
    });
  });
  return asked;
}

test.describe('BIMI Checker', () => {
  test('asks only after the button, only Cloudflare, and shows a valid setup', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const asked = await mockDns(page, {
      'default._bimi.example.com': [`v=BIMI1; l=${LOGO}; a=${VMC};`],
      '_dmarc.example.com': ['v=DMARC1; p=quarantine'],
    });
    await page.goto('/#/tool/bimi-checker');
    await expect(page.locator('.net-notice')).toContainText(DOH);
    await page.locator('#bimi-domain').fill('example.com');
    await page.waitForTimeout(200);
    expect(asked).toEqual([]);
    await page.locator('#bimi-domain').press('Enter');
    await expect(row(page, 'BIMI record')).toHaveText('Found and valid');
    await expect(row(page, 'DMARC strong enough for BIMI')).toHaveText('Yes');
    expect(asked.sort()).toEqual(['_dmarc.example.com TXT', 'default._bimi.example.com TXT']);
    expect(problems.filter((p) => !p.startsWith(`off-origin request: ${DOH}?`))).toEqual([]);
  });

  test('explains a missing record and a blocked request', async ({ page }) => {
    await mockDns(page, {});
    await page.goto('/#/tool/bimi-checker');
    await page.locator('#bimi-domain').fill('example.org');
    await page.getByRole('button', { name: 'Check BIMI' }).click();
    await expect(row(page, 'BIMI record')).toHaveText('Not found');
    await expect(page.locator('.result-notes').first()).toContainText('No DMARC record');
    await page.unroute(`${DOH}?**`);
    await page.route(`${DOH}?**`, (route) => route.abort('blockedbyclient'));
    await page.getByRole('button', { name: 'Check BIMI' }).click();
    await expect(page.getByRole('alert')).toContainText('could not be completed');
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await mockDns(page, { '_dmarc.example.com': ['v=DMARC1; p=reject'] });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/bimi-checker');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('BIMI চেকার ও জেনারেটর');
    await page.locator('#bimi-domain').fill('example.com');
    await page.getByRole('button', { name: 'BIMI পরীক্ষা করুন' }).click();
    await expect(row(page, 'BIMI রেকর্ড')).toHaveText('পাওয়া যায়নি');
    await noHorizontalScroll(page);
  });
});

test.describe('BIMI record generator', () => {
  test('creates a record offline, from the keyboard', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/bimi-checker');
    await page.locator('#bimigen-domain').fill('example.com');
    await page.locator('#bimigen-logo').fill(LOGO);
    await page.locator('#bimigen-logo').press('Enter');
    await expect(row(page, 'Value')).toHaveText(`v=BIMI1; l=${LOGO}; a=;`);
    await expect(row(page, 'Name (host)')).toHaveText('default._bimi.example.com');
    expect(problems).toEqual([]);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/bimi-checker`);
    await page.locator('#bimigen-domain').fill('example.com');
    await page.locator('#bimigen-logo').fill(LOGO);
    await page.getByRole('button', { name: 'Create record' }).click();
    await expect(row(page, 'Value')).toHaveText(`v=BIMI1; l=${LOGO}; a=;`);
    expect(problems).toEqual([]);
  });
});
