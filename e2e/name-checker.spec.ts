import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Name Checker: format rules only, entirely offline, so it must make no requests at all.

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

test.describe('Name Checker', () => {
  test('checks as you type, from the keyboard, with no requests', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/username-checker');
    await page.locator('#name-name').focus();
    await page.keyboard.type('rahim_bd');
    await expect(row(page, 'Fits the format on')).toHaveText('6 of 8 platforms'); // not GitHub or Facebook (no _);
    await expect(row(page, 'GitHub *')).toContainText('Does not fit');
    await expect(row(page, 'Telegram *')).toHaveText('Fits the format');
    expect(problems).toEqual([]);
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/username-checker');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ইউজারনেম চেকার');
    await page.locator('#name-name').fill('a'.repeat(31));
    await expect(row(page, 'Instagram *')).toContainText('সর্বোচ্চ ৩০ অক্ষর');
    await noHorizontalScroll(page);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/username-checker`);
    await page.locator('#name-name').fill('hello');
    await expect(row(page, 'Fits the format on')).toHaveText('8 of 8 platforms');
    expect(problems).toEqual([]);
  });
});
