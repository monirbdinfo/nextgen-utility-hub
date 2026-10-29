import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Offline Productivity tools. They must make no requests at all, so every test also fails on
// any off-origin request or console error. Engine-neutral: also run in Firefox and WebKit.

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

test.describe('text tools', () => {
  test('ROT13 updates while typing, by keyboard only, with no network use', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/rot13-decoder');
    await page.locator('#rot-text').focus();
    await page.keyboard.type('Hello, World!');
    await expect(row(page, 'Result')).toHaveText('Uryyb, Jbeyq!');
    await page.keyboard.press('Tab');
    await expect(page.locator('#rot-digits')).toBeFocused();
    await page.keyboard.press('Space');
    await page.locator('#rot-text').fill('abc 012');
    await expect(row(page, 'Result')).toHaveText('nop 567');
    expect(problems).toEqual([]);
  });

  test('Morse encodes, decodes and reports unsupported characters', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/morse-translator');
    await page.locator('#morse-text').fill('SOS ক');
    await expect(row(page, 'Result')).toHaveText('... --- ...');
    await expect(page.locator('.result-notes')).toContainText('ক');
    await page.locator('#morse-mode').selectOption('decode');
    await page.locator('#morse-text').fill('.... ..');
    await expect(row(page, 'Result')).toHaveText('HI');
    expect(problems).toEqual([]);
  });

  test('Lorem Ipsum respects its limits and stays inside a phone-width screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/lorem-ipsum');
    await page.locator('#lorem-count').fill('10');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(row(page, 'Placeholder text')).toContainText('Lorem ipsum dolor sit amet,');
    await noHorizontalScroll(page);
    await page.locator('#lorem-count').fill('51');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.locator('#lorem-count')).toBeFocused();
    await expect(page.locator('#lorem-count-error')).toContainText('too many');
  });

  test('Invisible Character creates and finds hidden characters', async ({ page }) => {
    await page.goto('/#/tool/invisible-character');
    await page.locator('#inv-gen-count').fill('4');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(row(page, 'What it contains')).toHaveText('4 × U+200B Zero Width Space');
    await page.locator('#inv-chk-text').fill('a​b c');
    await page.getByRole('button', { name: 'Check text' }).click();
    await expect(row(page, 'U+200B Zero Width Space')).toHaveText('1 found, first at position 2');
    await expect(row(page, 'Text without them')).toHaveText('abc');
  });
});

test.describe('calculators', () => {
  test('Time Card handles an overnight shift, with Bangla and dark mode', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/time-card-calculator');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.locator('#tc-start').fill('22:00');
    await page.locator('#tc-end').fill('06:00');
    await page.getByRole('button', { name: 'Calculate hours' }).click();
    await expect(row(page, 'Paid time per day')).toHaveText('8 h 0 min');
    await expect(page.locator('.result-notes')).toContainText('next day');
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(row(page, 'প্রতিদিনের বেতনযোগ্য সময়')).toHaveText('৮ ঘণ্টা ০ মিনিট');
    await noHorizontalScroll(page);
    expect(problems).toEqual([]);
  });

  test('Time Card refuses equal times and moves focus to the field', async ({ page }) => {
    await page.goto('/#/tool/time-card-calculator');
    await page.locator('#tc-end').fill('09:00');
    await page.getByRole('button', { name: 'Calculate hours' }).click();
    await expect(page.locator('#tc-start')).toBeFocused();
    await expect(page.locator('#tc-start')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Credit Card Number Checker checks the Luhn sum and sends nothing', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/credit-card-checker');
    await page.locator('#cc-number').fill('5555 5555 5555 4444');
    await page.locator('#cc-number').press('Enter');
    await expect(row(page, 'Checksum (Luhn)')).toHaveText('Valid');
    await expect(row(page, 'Likely network')).toHaveText('Mastercard');
    await page.locator('#cc-number').fill('5555 5555 5555 4445');
    await page.locator('#cc-number').press('Enter');
    await expect(row(page, 'Checksum (Luhn)')).toHaveText('Not valid');
    expect(problems).toEqual([]);
  });
});

test.describe('Notepad Online', () => {
  test('downloads the note as note.txt, keeps it in memory only and clears it', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/notepad-online');
    await page.locator('#note-text').fill('Meeting notes\nBangla: আমার সোনার বাংলা');
    await expect(page.locator('#note-counts')).toHaveText(/^\d+ words, \d+ characters$/);
    // Keep a reference to the Blob the page hands to the download, so its text can be checked.
    await page.evaluate(() => {
      const w = window as unknown as { __blob?: Blob };
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (obj: Blob | MediaSource) => {
        w.__blob = obj as Blob;
        return create(obj);
      };
    });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .txt' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('note.txt');
    expect(await page.evaluate(() => (window as unknown as { __blob: Blob }).__blob.text())).toBe(
      'Meeting notes\nBangla: আমার সোনার বাংলা',
    );
    // Nothing is persisted: no storage entry holds the note.
    const stored = await page.evaluate(
      () => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
    );
    expect(stored).not.toContain('Meeting notes');
    await page.getByRole('button', { name: 'Clear note' }).click();
    await expect(page.locator('#note-text')).toHaveValue('');
    await expect(page.locator('#note-text')).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('copy works where the engine allows clipboard permissions', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions can only be granted in Chromium.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/#/tool/notepad-online');
    await page.locator('#note-text').fill('copy me');
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.locator('.copy-status')).toHaveText('Copied to clipboard.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('copy me');
  });
});

test('works under the GitHub Pages sub-path', async ({ page }) => {
  const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
  const problems = watchProblems(page, new URL(base).origin);
  await page.goto(`${base}#/tool/rot13-decoder`);
  await page.locator('#rot-text').fill('Hello');
  await expect(row(page, 'Result')).toHaveText('Uryyb');
  expect(problems).toEqual([]);
});
