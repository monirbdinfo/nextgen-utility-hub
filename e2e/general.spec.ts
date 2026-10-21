import { expect, test } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Engine-neutral tests for the General Utilities; they also run in Firefox and WebKit.

test.describe('Word & Character Counter', () => {
  const TOOL = '/#/tool/text-counter';
  const value = (page: import('@playwright/test').Page, key: string) =>
    page.locator(`#count-${key}`);

  test('counts typed and pasted text live, with no network use', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto(TOOL);
    await expect(value(page, 'words')).toHaveText('0');
    // Typed text keeps the browser's own line breaks.
    await page.locator('#count-input').fill('Hello world. How are you?');
    await page.locator('#count-input').press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fine, thanks!');
    await expect(value(page, 'characters')).toHaveText('40');
    await expect(value(page, 'charactersNoSpaces')).toHaveText('33');
    await expect(value(page, 'words')).toHaveText('7');
    await expect(value(page, 'sentences')).toHaveText('3');
    await expect(value(page, 'lines')).toHaveText('3');
    await expect(value(page, 'paragraphs')).toHaveText('2');
    await expect(value(page, 'bytes')).toHaveText('40 bytes');
    expect(problems).toEqual([]);
  });

  test('counts Bangla conjuncts and emoji as single characters in this engine', async ({
    page,
    browserName,
  }) => {
    await page.goto(TOOL);
    await page.locator('#count-input').fill('ক্ষমা 👍🏽');
    const segmenter = await page.evaluate(() => 'Segmenter' in Intl);
    console.log(`[${browserName}] Intl.Segmenter: ${segmenter}`);
    // ক্ষ + মা + space + 👍🏽 with Intl.Segmenter; code points without it (and a note).
    if (segmenter) {
      await expect(value(page, 'characters')).toHaveText('4');
      await expect(page.locator('#count-message')).toHaveText('');
    } else {
      await expect(value(page, 'characters')).toHaveText('8');
      await expect(page.locator('#count-message')).toContainText('code points');
    }
    await expect(value(page, 'words')).toHaveText('1');
    await expect(value(page, 'bytes')).toHaveText('24 bytes');
  });

  test('is keyboard operable: copy and reset', async ({ page, context, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Clipboard permissions can only be granted in Chromium; copy is covered there and in unit tests.',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(TOOL);
    await page.locator('#count-input').fill('One two three.');
    await page.locator('#count-input').press('Tab');
    await expect(page.locator('#count-copy')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.copy-status')).toHaveText('Copied to clipboard.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Words: 3');
    await page.keyboard.press('Tab');
    await expect(page.locator('#count-reset')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#count-input')).toHaveValue('');
    await expect(page.locator('#count-input')).toBeFocused();
  });

  test('works in Bangla and dark mode without storing the text', async ({ page }) => {
    await page.goto(TOOL);
    await page.locator('#count-input').fill('আমি বাংলায় গান গাই।');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('শব্দ ও অক্ষর গণনা');
    await expect(page.locator('#count-input')).toHaveValue('আমি বাংলায় গান গাই।');
    await expect(value(page, 'words')).toHaveText('৪');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.every((k) => k.startsWith('nguh.'))).toBe(true);
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain('বাংলায়');
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  });

  for (const w of [360, 1280]) {
    test(`fits ${w} px without horizontal scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(TOOL);
      await page.locator('#count-input').fill('x'.repeat(500));
      await noHorizontalScroll(page);
    });
  }

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/text-counter`);
    await page.locator('#count-input').fill('a b c');
    await expect(value(page, 'words')).toHaveText('3');
    expect(problems).toEqual([]);
  });
});
