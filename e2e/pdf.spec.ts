import { expect, test, type Download, type Page } from '@playwright/test';
import { PDFDocument, degrees } from 'pdf-lib';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { watchProblems } from './support';

// PDF tools. pdf-lib is loaded on demand (its own pdfLib-*.js chunk), so these tests check that
// the chunk is not fetched until a PDF action runs, and that every PDF action still produces the
// same documents. Outputs are read back with pdf-lib in the test runner.

// The e2e project has no Node.js type definitions; reach Buffer and fs through narrow casts.
type NodeBuffer = { from(bytes: Uint8Array): never };
const toBuffer = (bytes: Uint8Array): never =>
  (globalThis as unknown as { Buffer: NodeBuffer }).Buffer.from(bytes);
async function readDownload(download: Download): Promise<Uint8Array> {
  const fs = (await import('node:fs' as string)) as {
    readFileSync(path: string): Uint8Array;
  };
  return new Uint8Array(fs.readFileSync((await download.path())!));
}

/** A PDF with `n` pages whose widths are 100, 101, … so page order can be checked. */
async function makePdf(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([100 + i, 200]);
  return doc.save();
}
const widths = (doc: PDFDocument): number[] => doc.getPages().map((p) => p.getWidth());

const chunkRequests = (page: Page): string[] => {
  const seen: string[] = [];
  page.on('request', (r) => /\/assets\/pdfLib-[^/]+\.js$/.test(r.url()) && seen.push(r.url()));
  return seen;
};

async function run(page: Page, button: string): Promise<PDFDocument> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await download;
  await expect(page.locator('.pdf-tool [role="status"]')).toHaveText(
    'Your PDF is ready to download.',
  );
  return PDFDocument.load(await readDownload(file));
}

test.describe('PDF tools (pdf-lib loaded on demand)', () => {
  test('the PDF library is fetched only when a PDF action runs', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const chunks = chunkRequests(page);
    await page.goto('/');
    await page.goto('/#/tool/pdf-create');
    await expect(page.getByRole('button', { name: 'Create PDF' })).toBeVisible();
    await page.waitForTimeout(300);
    expect(chunks).toEqual([]);

    await page.locator('.pdf-tool textarea').fill('Hello PDF\nSecond line');
    const doc = await run(page, 'Create PDF');
    expect(doc.getPageCount()).toBe(1);
    expect(chunks).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test('merges, and extracts a page range', async ({ page }) => {
    await page.goto('/#/tool/pdf-merge');
    const input = page.locator('.pdf-tool input[type="file"]');
    await input.setInputFiles([
      { name: 'a.pdf', mimeType: 'application/pdf', buffer: toBuffer(await makePdf(2)) },
      { name: 'b.pdf', mimeType: 'application/pdf', buffer: toBuffer(await makePdf(3)) },
    ]);
    expect(widths(await run(page, 'Merge selected PDFs'))).toEqual([100, 101, 100, 101, 102]);

    await input.setInputFiles({
      name: 'c.pdf',
      mimeType: 'application/pdf',
      buffer: toBuffer(await makePdf(4)),
    });
    await page.locator('.pdf-tool select').selectOption('split');
    await page.getByPlaceholder('Page range (e.g. 1-3,5)').fill('2-3');
    expect(widths(await run(page, 'Merge selected PDFs'))).toEqual([101, 102]);
  });

  test('reorders, rotates and removes pages', async ({ page }) => {
    await page.goto('/#/tool/pdf-tools');
    const input = page.locator('.pdf-tool input[type="file"]');
    await input.setInputFiles({
      name: 'p.pdf',
      mimeType: 'application/pdf',
      buffer: toBuffer(await makePdf(3)),
    });
    await page.getByPlaceholder('New page order (e.g. 3,1,2)').fill('3,1,2');
    expect(widths(await run(page, 'Process PDF'))).toEqual([102, 100, 101]);

    await page.getByPlaceholder('New page order (e.g. 3,1,2)').fill('');
    await page.locator('.pdf-tool select').selectOption('180');
    await page.getByPlaceholder('Remove page range (e.g. 2,4-5)').fill('2');
    const edited = await run(page, 'Process PDF');
    expect(widths(edited)).toEqual([100, 102]);
    expect(edited.getPages().map((p) => p.getRotation())).toEqual([degrees(180), degrees(180)]);
  });

  test('rewrites a PDF and reports the size change; a broken file gives an error', async ({
    page,
  }) => {
    await page.goto('/#/tool/pdf-compress');
    const input = page.locator('.pdf-tool input[type="file"]');
    await input.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: toBuffer(await makePdf(2)),
    });
    expect((await run(page, 'Optimize and download PDF')).getPageCount()).toBe(2);
    await expect(page.locator('.pdf-tool .result-panel')).toContainText('Output size');

    await input.setInputFiles({
      name: 'broken.pdf',
      mimeType: 'application/pdf',
      buffer: toBuffer(new TextEncoder().encode('not a pdf')),
    });
    await page.getByRole('button', { name: 'Optimize and download PDF' }).click();
    await expect(page.locator('.pdf-tool [role="status"]')).toContainText('Could not process');
  });

  test('loads the PDF library under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    const chunks = chunkRequests(page);
    await page.goto(`${base}#/tool/pdf-create`);
    await page.locator('.pdf-tool textarea').fill('Sub-path');
    expect((await run(page, 'Create PDF')).getPageCount()).toBe(1);
    expect(chunks).toHaveLength(1);
    expect(new URL(chunks[0]!).pathname.startsWith(`${SUBPATH}assets/`)).toBe(true);
    expect(problems).toEqual([]);
  });
});
