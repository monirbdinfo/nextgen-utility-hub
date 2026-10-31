import { expect, test, type Page } from '@playwright/test';
import { noHorizontalScroll } from './support';

// Layout regression checks for the Age Calculator. With the sidebar open, a 1,024–1,280 px
// window used to squeeze the form and result side by side: the date fields shrank to ~140 px,
// "Age on this date" wrapped while "Date of birth" did not (so the two inputs no longer lined
// up), the next-birthday date wrapped over four lines and related-tool names spilled out of
// their cards. Each section now adapts to the width it actually has (container queries).

/** Elements that stick out of the card they belong to, beyond a 1 px tolerance. */
async function spills(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const cards =
      '.tool-form, .result, .age-feature, .age-panel, .age-tile, .age-bday, .tool-header, .btn, .chip-btn, .age-example, .age-related-link, .field';
    const out: string[] = [];
    for (const el of document.querySelectorAll('.tool-page *')) {
      if (el.closest('svg')) continue;
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

/** Number of text lines an element's text occupies. */
const textLines = (page: Page, selector: string): Promise<number[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const tops = new Set<number>();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        for (const rect of r.getClientRects())
          if (rect.width > 1) tops.add(Math.round(rect.top / 4));
      }
      return tops.size;
    }),
  );

for (const lang of ['en', 'bn'] as const)
  for (const width of [1440, 1280, 1024, 768, 390, 320])
    test(`age calculator layout holds at ${width}px (${lang})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/#/tool/age-calculator');
      if (lang === 'bn')
        await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
      await page.locator('#age-dob').fill('2024-09-16');
      await page.locator('#age-ref').fill('2026-10-31');
      await page.locator('form.age-form button[type="submit"]').click();
      await expect(page.locator('.age-tiles-main')).toBeVisible();

      await noHorizontalScroll(page);
      expect(await spills(page)).toEqual([]);

      // The two date inputs: same width and same top when side by side, full width when stacked.
      // Both are measured in one frame: the page may still be smooth-scrolling to the result.
      const [dob, ref] = await page.evaluate(() =>
        ['#age-dob', '#age-ref'].map((s) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      expect(Math.abs(dob!.width - ref!.width)).toBeLessThanOrEqual(1);
      if (Math.abs(dob!.x - ref!.x) > 1) expect(Math.abs(dob!.y - ref!.y)).toBeLessThanOrEqual(1);
      expect(dob!.height).toBeGreaterThanOrEqual(44);

      // Buttons and chips never wrap their text; tile values never overflow.
      expect(Math.max(...(await textLines(page, '.age-form .btn, .chip-btn')))).toBe(1);
      const overflowing = await page
        .locator('.age-tile-value')
        .evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
      expect(overflowing).toBe(0);

      // The next-birthday date stays on one line (it used to wrap over four).
      expect(await textLines(page, '.age-bday-date')).toEqual([1, 1]);
    });
