/**
 * NextGen Tech BD logo, from the brand's own transparent PNG
 * (src/assets/brand/nextgen-tech-bd-logo.png, 250 × 250).
 *
 * - `mark`: the "NG" ring with circuit traces only (212 × 70 crop), for small sizes where
 *   the logo's built-in wordmark would be unreadable; the name is shown as text instead.
 * - `full`: the mark with the "NEXTGEN TECH BD" wordmark (218 × 92 crop).
 *
 * The crops are exact 1:1 pixel copies of the original (no scaling or redrawing). Vite
 * bundles them as same-origin assets, so no external request is made.
 */
import fullUrl from '../assets/brand/logo-full.png';
import markUrl from '../assets/brand/logo-mark.png';
import { h } from '../lib/dom';

const SIZES = {
  mark: { src: markUrl, width: 212, height: 70 },
  full: { src: fullUrl, width: 218, height: 92 },
} as const;

/**
 * The logo as an image `height` CSS pixels tall. Decorative (empty alt) unless `alt` is
 * given, because it usually sits next to the brand name in text.
 */
export function logoImage(
  variant: keyof typeof SIZES,
  height: number,
  opts: { alt?: string; className?: string } = {},
): HTMLImageElement {
  const s = SIZES[variant];
  return h('img', {
    src: s.src,
    alt: opts.alt ?? '',
    width: String(Math.round((s.width / s.height) * height)),
    height: String(height),
    class: `logo logo-${variant}${opts.className ? ` ${opts.className}` : ''}`,
    decoding: 'async',
  });
}
