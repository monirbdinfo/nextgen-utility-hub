import { expect, test, type Page } from '@playwright/test';

const CATEGORY_NAMES = [
  'General Utilities',
  'Job Application Toolkit',
  'Bangla Number & Text Toolkit',
  'Privacy-First File Tools',
  'Network & IT Diagnostic Toolkit',
];

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('homepage renders five toolkits and only same-origin requests', async ({ page, baseURL }) => {
  const foreign: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol !== 'data:' && url.origin !== new URL(baseURL!).origin)
      foreign.push(req.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.card-title')).toHaveText(CATEGORY_NAMES);
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

test('language toggle switches text, html lang, and persists across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('প্রাইভেসি');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('.card-title').first()).toHaveText('সাধারণ ইউটিলিটি');
});

test('search is keyboard operable end to end', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const search = page.getByRole('combobox', { name: 'Search tools' });
  await expect(search).toBeFocused();
  await search.fill('merge');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/category\/files$/);
  await expect(page.locator('#tool-pdf-merge')).toBeFocused();
  await expect(page.locator('#tool-pdf-merge .pill')).toHaveText('Planned');
});

test('hash routes support direct load and back/forward', async ({ page }) => {
  await page.goto('/#/category/network');
  await expect(page.locator('#category-heading')).toHaveText('Network & IT Diagnostic Toolkit');
  await page.getByRole('link', { name: 'All', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(5);
  await page.goBack();
  await expect(page.locator('#category-heading')).toHaveText('Network & IT Diagnostic Toolkit');
  await page.goForward();
  await expect(page.locator('.card')).toHaveCount(5);
  await page.goto('/#/category/does-not-exist');
  await expect(page.locator('.card')).toHaveCount(5);
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('menu opens, closes on Escape, and returns focus', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Open menu' });
    await toggle.click();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'About' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });
});

for (const [name, width, height] of [
  ['mobile', 360, 780],
  ['tablet', 768, 1024],
  ['desktop', 1280, 900],
] as const) {
  test(`layout has no horizontal overflow at ${name} width (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await noHorizontalScroll(page);
    await page.goto('/#/category/jobs');
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await noHorizontalScroll(page);
  });
}
