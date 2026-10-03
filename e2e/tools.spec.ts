import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

const TOOLS = [
  ['age-calculator', 'Age Calculator'],
  ['date-difference', 'Date Difference'],
  ['emi-calculator', 'Loan EMI Calculator'],
  ['digit-converter', 'Bangla ⇄ English Digits'],
  ['number-to-words-bn', 'Number to Words'],
  ['taka-in-words', 'Taka in Words'],
  ['date-formatter', 'Date Text Formatter'],
  ['unicode-cleaner', 'Unicode Text Cleaner'],
  ['image-resizer', 'Image Resizer'],
  ['image-cropper', 'Image Cropper'],
  ['image-compressor', 'Image Compressor'],
  ['image-converter', 'Image Converter'],
] as const;

/** Collect console errors, uncaught exceptions and failed requests for the whole test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  return errors;
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const [width, label] of [
  [1280, 'desktop'],
  [360, 'mobile'],
] as const) {
  test.describe(`tool pages at ${label} width`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [id, name] of TOOLS) {
      test(`${id} loads directly without errors or overflow`, async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(`/#/tool/${id}`);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
        await expect(page).toHaveTitle(`${name} · NextGen Utility Hub`);
        await expect(page.locator('.tool-badges .pill-available')).toHaveText('Available');
        await noHorizontalScroll(page);
        expect(errors).toEqual([]);
      });
    }
  });
}

test('age calculator works end to end with the keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/tool/age-calculator');
  await page.getByLabel('Date of birth').fill('1990-06-15');
  await page.getByLabel('Age on this date').fill('2026-10-02');
  await page.getByRole('button', { name: 'Calculate' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.result-row-primary .result-value')).toHaveText(
    '36 years, 3 months, 17 days',
  );
  // Error path: future date of birth moves focus to the field and describes the error.
  await page.getByLabel('Date of birth').fill('2030-01-01');
  await page.getByRole('button', { name: 'Calculate' }).click();
  const dob = page.getByLabel('Date of birth');
  await expect(dob).toBeFocused();
  await expect(dob).toHaveAttribute('aria-invalid', 'true');
  await expect(dob).toHaveAccessibleDescription(/can’t be after/);
  expect(errors).toEqual([]);
});

test('EMI calculator submits with Enter and validates', async ({ page }) => {
  await page.goto('/#/tool/emi-calculator');
  await page.getByLabel('Loan amount (principal)').fill('5000000');
  await page.getByLabel('Interest rate (per year)').fill('9');
  await page.getByLabel('Loan term', { exact: true }).fill('20');
  await page.getByLabel('Loan term', { exact: true }).press('Enter');
  await expect(page.locator('.result-row-primary .result-value')).toHaveText('৳ 44,986.30');
  await page.getByLabel('Interest rate (per year)').fill('150');
  await page.getByLabel('Interest rate (per year)').press('Enter');
  await expect(page.getByLabel('Interest rate (per year)')).toBeFocused();
  await expect(page.locator('#emi-rate-error')).toContainText('too high');
});

test('copy buttons write to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#/tool/taka-in-words');
  await page.getByLabel('Amount in Taka').fill('1250.50');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await page.getByRole('button', { name: 'Copy: English' }).click();
  await expect(page.locator('.copy-status')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'One Thousand Two Hundred Fifty Taka and Fifty Poisha Only',
  );
});

test('language switch keeps the tool state', async ({ page }) => {
  await page.goto('/#/tool/digit-converter');
  await page.getByLabel('Text or numbers').fill('ফোন ০১৭১২');
  await expect(page.getByLabel('Converted text')).toHaveValue('ফোন 01712');
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.getByLabel('লেখা বা সংখ্যা')).toHaveValue('ফোন ০১৭১২');
  await expect(page.getByLabel('রূপান্তরিত লেখা')).toHaveValue('ফোন 01712');
  await expect(page).toHaveTitle('বাংলা ⇄ ইংরেজি অঙ্ক · নেক্সটজেন ইউটিলিটি হাব');
});

test('navigation between toolkit and tools supports back and forward', async ({ page }) => {
  await page.goto('/#/category/bangla');
  await page.getByRole('link', { name: 'Taka in Words' }).click();
  await expect(page).toHaveURL(/#\/tool\/taka-in-words$/);
  await expect(page.locator('#tool-title')).toBeFocused();
  await page.getByRole('link', { name: 'Date Text Formatter' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Date Text Formatter');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Taka in Words');
  await page.goBack();
  await expect(page.locator('#category-heading')).toHaveText('Bangla Number & Text Toolkit');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Taka in Words');
  // Planned tools have no page.
  await page.goto('/#/tool/pdf-merge');
  await expect(page.locator('.card')).toHaveCount(5);
});

test('works under the GitHub Pages sub-path', async ({ page }) => {
  const errors = watchErrors(page);
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  await page.goto(`${base}#/tool/number-to-words-bn`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Number to Words');
  await page.getByLabel('Number', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('.result-row-primary .result-value').first()).toHaveText(
    'Two Thousand Twenty-Six',
  );
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(`${base}#/`);
  await expect(page.locator('.card')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test.describe('mobile result visibility', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('brings the result into view after calculating', async ({ page }) => {
    await page.goto('/#/tool/emi-calculator');
    await page.getByLabel('Loan amount (principal)').fill('500000');
    await page.getByLabel('Interest rate (per year)').fill('9.5');
    await page.getByLabel('Loan term', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('.result-row-primary')).toBeInViewport();
    await expect(page.locator('.result-row-primary .result-value')).toHaveText('৳ 10,500.93');
  });
});
