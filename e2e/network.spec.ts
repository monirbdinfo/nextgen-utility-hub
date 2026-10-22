import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Offline Network calculators. Engine-neutral, so they also run in Firefox and WebKit.

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    .locator('.result-value');

test.describe('Subnet Calculator', () => {
  test('is keyboard operable and makes no network requests', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/subnet-calculator');
    await page.locator('#subnet-address').focus();
    await page.keyboard.type('192.168.10.77');
    await page.keyboard.press('Tab');
    await expect(page.locator('#subnet-prefix')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('255.255.255.224');
    await page.keyboard.press('Enter');
    await expect(row(page, 'CIDR notation')).toHaveText('192.168.10.64/27');
    await expect(row(page, 'Broadcast address')).toHaveText('192.168.10.95');
    await expect(row(page, 'First usable host')).toHaveText('192.168.10.65');
    await expect(row(page, 'Last usable host')).toHaveText('192.168.10.94');
    await expect(row(page, 'Usable hosts')).toHaveText('30');
    expect(problems).toEqual([]);
  });

  test('shows an error for an invalid mask and moves focus to it', async ({ page }) => {
    await page.goto('/#/tool/subnet-calculator');
    await page.locator('#subnet-address').fill('10.0.0.1');
    await page.locator('#subnet-prefix').fill('255.0.255.0');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#subnet-prefix')).toBeFocused();
    await expect(page.locator('#subnet-prefix')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#subnet-prefix-error')).toContainText('not a valid subnet mask');
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/subnet-calculator');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('সাবনেট ক্যালকুলেটর');
    await page.locator('#subnet-address').fill('১০.০.০.১/৮');
    await page.locator('#subnet-prefix').fill('');
    await page.getByRole('button', { name: 'হিসাব করুন' }).click();
    await expect(row(page, 'CIDR নোটেশন')).toHaveText('10.0.0.0/8');
    await expect(row(page, 'ব্যবহারযোগ্য হোস্ট')).toHaveText('১,৬৭,৭৭,২১৪');
    await noHorizontalScroll(page);
  });
});

test.describe('CIDR & IP Range Calculator', () => {
  test('converts both ways', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/tool/cidr-calculator');
    await page.locator('#cidr-block').fill('172.16.0.0/12');
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(row(page, 'First address')).toHaveText('172.16.0.0');
    await expect(row(page, 'Last address')).toHaveText('172.31.255.255');
    await expect(row(page, 'Total addresses')).toHaveText('10,48,576');

    await page.locator('#cidr-mode').selectOption('range');
    await expect(page.locator('#cidr-block')).toBeHidden();
    await page.locator('#cidr-start').fill('10.0.0.0');
    await page.locator('#cidr-end').fill('10.0.2.255');
    await page.locator('#cidr-end').press('Enter');
    await expect(row(page, 'CIDR blocks')).toHaveText('10.0.0.0/23\n10.0.2.0/24');
    await expect(row(page, 'Number of blocks')).toHaveText('2');
    await noHorizontalScroll(page);
    expect(problems).toEqual([]);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/cidr-calculator`);
    await page.locator('#cidr-block').fill('192.168.0.0/16');
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(row(page, 'Last address')).toHaveText('192.168.255.255');
    expect(problems).toEqual([]);
  });
});
