import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';

const u = (...cps: number[]): string => String.fromCodePoint(...cps);
const ZWSP = u(0x200b);
const ZWJ = u(0x200d);
const NBSP = u(0x00a0);
const LS = u(0x2028);
// কোড ক্ষ। and র + ZWJ + hasanta + য
const BN = `${u(0x0995, 0x09cb, 0x09a1)} ${u(0x0995, 0x09cd, 0x09b7, 0x0964)}`;
const RAPHALA = u(0x09b0) + ZWJ + u(0x09cd, 0x09af);
const MESSY = `  Hello${ZWSP}   world${NBSP}${LS}${LS}${LS}${BN}  ${RAPHALA}\n`;
const CLEAN = `Hello world\n\n${BN} ${RAPHALA}`;

/** Every console message (any level), uncaught error, failed or off-origin request. */
function watch(page: Page, origin: string): { console: string[]; problems: string[] } {
  const log = { console: [] as string[], problems: [] as string[] };
  page.on('console', (m) => log.console.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => log.problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol !== 'data:' && url.origin !== origin)
      log.problems.push(`off-origin request: ${r.url()}`);
  });
  page.on('response', (r) => r.status() >= 400 && log.problems.push(`${r.status()} ${r.url()}`));
  return log;
}

const input = (page: Page) => page.getByLabel('Text to clean');
const output = (page: Page) => page.getByLabel('Cleaned text');

test('cleans Bangla and English text without logging it or touching the network', async ({
  page,
  baseURL,
}) => {
  const log = watch(page, new URL(baseURL!).origin);
  await page.goto('/#/tool/unicode-cleaner');
  await input(page).fill(MESSY);
  await page.getByRole('button', { name: 'Clean text' }).click();
  await expect(output(page)).toHaveValue(CLEAN);
  const summary = page.locator('.result-notes');
  await expect(summary).toContainText(
    'Zero-width characters (U+200B, U+2060, U+FEFF, U+00AD): 1 found, 1 removed',
  );
  await expect(summary).toContainText(
    'Zero-width joiners (U+200C ZWNJ, U+200D ZWJ): 1 found, kept',
  );
  await expect(page.locator('.result-row-primary .result-value')).toHaveText(
    `${[...MESSY].length} → ${[...CLEAN].length}`,
  );
  expect(log.console).toEqual([]); // nothing logged at all, so user text is never logged
  expect(log.problems).toEqual([]);
});

test('converts typed CRLF and CR line endings and removes control characters', async ({ page }) => {
  await page.goto('/#/tool/unicode-cleaner');
  await input(page).fill(`a\r\nb\rc${u(0x07)}d`);
  // Text inserted by typing or pasting keeps CR in Chromium (only script-set values become LF).
  expect(await input(page).evaluate((el: HTMLTextAreaElement) => el.value)).toBe(
    `a\r\nb\rc${u(0x07)}d`,
  );
  await page.getByRole('button', { name: 'Clean text' }).click();
  await expect(output(page)).toHaveValue('a\nb\ncd');
  const summary = page.locator('.result-notes');
  await expect(summary).toContainText(
    'Non-LF line endings (CRLF, CR, U+0085, U+2028, U+2029): 2 found, 2 converted',
  );
  await expect(summary).toContainText('Control characters: 1 found, 1 removed');
});

test('is found through search and the toolkit page', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await page.keyboard.type('zero width');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/tool\/unicode-cleaner$/);
  await expect(page.locator('#tool-title')).toBeFocused();

  await page.goto('/#/category/bangla');
  await page.getByRole('link', { name: 'Unicode Text Cleaner' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unicode Text Cleaner');
});

test('options toggle independently and reset restores defaults', async ({ page }) => {
  await page.goto('/#/tool/unicode-cleaner');
  await input(page).fill(MESSY);
  await page.getByLabel('Remove zero-width joiners (ZWJ and ZWNJ)').check();
  await page.getByLabel('Keep line breaks (untick to join all lines into one)').uncheck();
  await page.getByRole('button', { name: 'Clean text' }).click();
  await expect(output(page)).toHaveValue(`Hello world ${BN} ${u(0x09b0, 0x09cd, 0x09af)}`);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
  await expect(page.getByLabel('Remove zero-width joiners (ZWJ and ZWNJ)')).not.toBeChecked();
  await expect(
    page.getByLabel('Keep line breaks (untick to join all lines into one)'),
  ).toBeChecked();
  await expect(page.locator('.result-list')).toHaveCount(0);
  await expect(output(page)).toBeHidden();
});

test('copies the cleaned output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#/tool/unicode-cleaner');
  await input(page).fill(MESSY);
  await page.getByRole('button', { name: 'Clean text' }).click();
  await page.getByRole('button', { name: 'Copy cleaned text' }).click();
  await expect(page.locator('.copy-status')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(CLEAN);
});

test('keeps input, options and result when switching language', async ({ page }) => {
  await page.goto('/#/tool/unicode-cleaner');
  await input(page).fill(MESSY);
  await page.getByLabel('NFC — combine characters into their standard composed form').check();
  await page.getByRole('button', { name: 'Clean text' }).click();
  await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.getByLabel('যে লেখা পরিষ্কার করবেন')).toHaveValue(MESSY);
  await expect(page.getByLabel('পরিষ্কার করা লেখা')).toHaveValue(CLEAN);
  await expect(page.locator('#clean-norm-NFC')).toBeChecked();
  await expect(page).toHaveTitle('ইউনিকোড টেক্সট ক্লিনার · নেক্সটজেন ইউটিলিটি হাব');
});

test('uses dark-theme colours for the text areas', async ({ page }) => {
  await page.goto('/#/tool/unicode-cleaner');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(input(page)).toHaveCSS('background-color', 'rgb(7, 18, 42)'); // --color-bg (dark)
  await expect(input(page)).toHaveCSS('color', 'rgb(232, 238, 252)'); // --color-text (dark)
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('long text causes no horizontal scrolling and the result comes into view', async ({
    page,
  }) => {
    await page.goto('/#/tool/unicode-cleaner');
    await input(page).fill(`${'x'.repeat(400)} ${BN.repeat(40)}\n${'y '.repeat(300)}`);
    await page.getByRole('button', { name: 'Clean text' }).click();
    await expect(page.locator('.result-row-primary')).toBeInViewport();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('works from the production build under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const log = watch(page, new URL(base).origin);
  await page.goto(`${base}#/tool/unicode-cleaner`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unicode Text Cleaner');
  await input(page).fill(MESSY);
  await page.getByRole('button', { name: 'Clean text' }).click();
  await expect(output(page)).toHaveValue(CLEAN);
  expect(log.problems).toEqual([]);
});
