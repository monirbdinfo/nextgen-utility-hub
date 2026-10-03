/**
 * Helpers shared by the cross-browser and EXIF specs. They inspect the real downloaded
 * file (type, magic bytes, EXIF presence, decoded size and pixels), not the UI text.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export const FIX = 'e2e/fixtures/';

/**
 * Uncaught errors, console errors, failed responses and off-origin requests. Console
 * warnings and info are ignored here because some engines log harmless layout warnings.
 */
export function watchProblems(page: Page, origin: string): string[] {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin)
      problems.push(`off-origin request: ${r.url()}`);
  });
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  return problems;
}

/** Colour class of a pixel: R, G, B, Y (yellow), W (white), T (transparent) or ? */
export type ColourClass = 'R' | 'G' | 'B' | 'Y' | 'W' | 'T' | '?';

export interface Inspected {
  type: string;
  magic: 'jpeg' | 'png' | 'webp' | 'unknown';
  bytes: number;
  /** The file contains an Exif APP1 segment. */
  exif: boolean;
  /** Decoded (displayed) size. */
  size: [number, number];
  /** Colour classes at the centres of the four quadrants: TL, TR, BL, BR. */
  quadrants: string;
  /** Colour classes at the requested points. */
  points: ColourClass[];
}

/**
 * Fetch the blob behind a link (or an image) and inspect it in the page. Waits until the
 * target points at a blob: URL first: right after a submit click the previous output has
 * been cleared and the new one may not exist yet.
 */
export async function inspect(
  target: Locator,
  points: Array<[number, number]> = [],
): Promise<Inspected> {
  const attr = await target.evaluate((el) => (el instanceof HTMLAnchorElement ? 'href' : 'src'));
  await expect(target).toHaveAttribute(attr, /^blob:/);
  return target.evaluate(async (el: HTMLAnchorElement | HTMLImageElement, pts) => {
    const href = el instanceof HTMLAnchorElement ? el.href : el.src;
    const blob = await (await fetch(href)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let exif = false;
    for (let i = 0; i + 10 < Math.min(bytes.length, 65536); i++) {
      if (
        bytes[i] === 0xff &&
        bytes[i + 1] === 0xe1 &&
        String.fromCharCode(...bytes.subarray(i + 4, i + 8)) === 'Exif'
      ) {
        exif = true;
        break;
      }
    }
    const magic =
      bytes[0] === 0xff && bytes[1] === 0xd8
        ? 'jpeg'
        : bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
          ? 'png'
          : String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
            ? 'webp'
            : 'unknown';
    const img = new Image();
    img.src = href;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const cls = (x: number, y: number): string => {
      const [r, gr, b, a] = Array.from(g.getImageData(Math.floor(x), Math.floor(y), 1, 1).data) as [
        number,
        number,
        number,
        number,
      ];
      if (a < 30) return 'T';
      if (r > 200 && gr > 200 && b > 200) return 'W';
      if (r > 170 && gr > 170 && b < 100) return 'Y';
      if (r > 170 && gr < 100 && b < 100) return 'R';
      if (gr > 170 && r < 100 && b < 100) return 'G';
      if (b > 170 && r < 100 && gr < 100) return 'B';
      return '?';
    };
    return {
      type: blob.type,
      magic,
      bytes: bytes.length,
      exif,
      size: [w, h] as [number, number],
      quadrants: [
        cls(w * 0.25, h * 0.25),
        cls(w * 0.75, h * 0.25),
        cls(w * 0.25, h * 0.75),
        cls(w * 0.75, h * 0.75),
      ].join(''),
      points: pts.map(([x, y]) => cls(x, y)) as never,
    };
  }, points);
}

/** The UI's size text for a byte count (1 KB = 1024 bytes, one decimal). */
export const kb = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

/** Open a fixture with a tool's file input and wait until it is loaded. */
export async function openImage(page: Page, inputSelector: string, file: string): Promise<void> {
  await page.locator(inputSelector).setInputFiles(FIX + file);
  await expect(page.locator('.image-status')).toHaveText(/^Image opened/);
}

export async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
