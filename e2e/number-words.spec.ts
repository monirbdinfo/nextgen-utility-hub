import { expect, test, type Page } from '@playwright/test';
import { noHorizontalScroll } from './support';

// Number to Words page: the real converter behind the redesigned page, keyboard use of the
// result tabs, copying, and the layout at phone, tablet and desktop widths.

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Elements that stick out of the card they belong to, beyond a 1 px tolerance. */
async function spills(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const cards =
      '.tool-form, .result, .nw-feature, .nw-panel-card, .nw-panel, .btn, .chip-btn, .nw-radio, .nw-related-link, .field, .nw-table';
    const out: string[] = [];
    for (const el of document.querySelectorAll('.tool-page *')) {
      if (el.closest('svg')) continue;
      // Visually hidden content (the examples table's header row on narrow screens).
      const hidden = el.closest('thead');
      if (hidden && getComputedStyle(hidden).position === 'absolute') continue;
      const card = el.parentElement?.closest(cards);
      if (!card) continue;
      const a = el.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      if (a.width && (a.right > c.right + 1 || a.left < c.left - 1))
        out.push(
          `${el.className} in ${card.className}: "${(el.textContent ?? '').trim().slice(0, 30)}"`,
        );
    }
    return out;
  });
}

test('converts, switches tabs with the keyboard, swaps digits and copies', async ({
  page,
  browserName,
}) => {
  const errors = watchErrors(page);
  await page.goto('/#/tool/number-to-words-bn');
  await expect(page.locator('.nw-result .result-empty')).toHaveText(
    'Enter a number and convert it to see the result.',
  );
  await page.getByLabel('Number', { exact: true }).fill('১,২৫,০০০');
  await page.getByLabel('Number', { exact: true }).press('Enter');
  await expect(page.locator('#nw-panel-bn .nw-words')).toHaveText('এক লক্ষ পঁচিশ হাজার');
  await expect(page.locator('#nw-panel-bn .nw-digits')).toHaveText('(১,২৫,০০০)');

  await page.getByRole('tab', { name: 'In Bangla words' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'In English words' })).toBeFocused();
  await expect(page.locator('#nw-panel-en .nw-words')).toHaveText('One Lakh Twenty-Five Thousand');

  await page.getByText('Million and billion (1,000,000)').click();
  await expect(page.locator('#nw-panel-en .nw-words')).toHaveText(
    'One Hundred Twenty-Five Thousand',
  );
  await expect(page.locator('#nw-panel-en .nw-digits')).toHaveText('(125,000)');

  await page
    .getByRole('button', { name: 'Swap the number between Bangla and English digits' })
    .click();
  await expect(page.getByLabel('Number', { exact: true })).toHaveValue('1,25,000');
  await expect(page.locator('.nw-form-status')).toHaveText('Digits switched to English digits.');

  if (browserName === 'chromium') {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy the English words' }).click();
    await expect(page.locator('.nw-result .copy-status')).toHaveText('Copied to clipboard.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'One Hundred Twenty-Five Thousand',
    );
  }

  await page.getByRole('button', { name: 'Convert 12,345' }).click();
  await expect(page.getByLabel('Number', { exact: true })).toHaveValue('12,345');
  await expect(page.locator('#nw-panel-en .nw-words')).toHaveText(
    'Twelve Thousand Three Hundred Forty-Five',
  );
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('.nw-result .result-empty')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const lang of ['en', 'bn'] as const)
  for (const width of [1440, 1024, 768, 390, 320])
    test(`number to words layout holds at ${width}px (${lang})`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/#/tool/number-to-words-bn');
      if (lang === 'bn')
        await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
      await page.locator('#words-number').fill('123456789012345.25');
      await page.locator('form.nw-form button[type="submit"]').click();
      await expect(page.locator('#nw-panel-bn .nw-words')).toBeVisible();
      await noHorizontalScroll(page);
      expect(await spills(page)).toEqual([]);
      // The longest supported number still fits its card.
      const overflow = await page
        .locator('.nw-words, .nw-digits')
        .evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
      expect(overflow).toBe(0);
      // The illustration is shown only when the header has room for it.
      const art = await page.locator('.tool-header-illustration').isVisible();
      expect(art).toBe(width >= 1440);
      expect(errors).toEqual([]);
    });
