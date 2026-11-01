import { toBanglaDigits } from '../../calc/digits';
import type { Lang } from '../../registry';

/**
 * Decorative illustration for the Image Compressor header: a large landscape picture, an arrow
 * and a smaller copy of it, with example sizes (5.2 MB → 680 KB, about 87% smaller), leaves and
 * sparkles. The sizes are an example, not a promise. Inline SVG, hidden from assistive technology.
 */

const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;
function s(tag: string, attrs: Attrs = {}, ...children: Array<SVGElement | string>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const leaf = (x: number, y: number, len: number, angle: number, fill: string): SVGElement =>
  s('path', {
    d: `M${x} ${y}C${x - len * 0.32} ${y - len * 0.35} ${x - len * 0.2} ${y - len * 0.8} ${x} ${y - len}C${x + len * 0.2} ${y - len * 0.8} ${x + len * 0.32} ${y - len * 0.35} ${x} ${y}Z`,
    fill,
    transform: `rotate(${angle} ${x} ${y})`,
  });

const sparkle = (x: number, y: number, r: number, fill: string): SVGElement =>
  s('path', {
    d: `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`,
    fill,
  });

/** A framed landscape (sky, sun, mountains) with a size label under it. */
function picture(
  x: number,
  y: number,
  w: number,
  rotate: number,
  label: string,
  lang: Lang,
): SVGElement {
  const hgt = w * 0.82;
  const g = s('g', {
    transform: `rotate(${rotate} ${x + w / 2} ${y + hgt / 2})`,
    filter: 'url(#ch-shadow)',
  });
  const inner = { x: x + 8, y: y + 8, w: w - 16, h: hgt - 16 };
  g.append(
    s('rect', { x, y, width: w, height: hgt, rx: 16, fill: '#ffffff' }),
    s('rect', {
      x: inner.x,
      y: inner.y,
      width: inner.w,
      height: inner.h,
      rx: 10,
      fill: 'url(#ch-sky)',
    }),
    s('circle', {
      cx: inner.x + inner.w * 0.72,
      cy: inner.y + inner.h * 0.28,
      r: w * 0.07,
      fill: '#fbbf24',
    }),
    s('path', {
      d: `M${inner.x} ${inner.y + inner.h}L${inner.x + inner.w * 0.32} ${inner.y + inner.h * 0.45}L${inner.x + inner.w * 0.55} ${inner.y + inner.h * 0.8}L${inner.x + inner.w * 0.72} ${inner.y + inner.h * 0.58}L${inner.x + inner.w} ${inner.y + inner.h}Z`,
      fill: '#1d4ed8',
    }),
    s('path', {
      d: `M${inner.x + inner.w * 0.32} ${inner.y + inner.h * 0.45}L${inner.x + inner.w * 0.4} ${inner.y + inner.h * 0.58}L${inner.x + inner.w * 0.24} ${inner.y + inner.h * 0.58}Z`,
      fill: '#ffffff',
      opacity: 0.85,
    }),
  );
  // Size label.
  const lw = w * 0.62;
  g.append(
    s('rect', {
      x: x + (w - lw) / 2,
      y: y + hgt - 14,
      width: lw,
      height: 34,
      rx: 17,
      fill: '#fef3c7',
      stroke: '#ffffff',
      'stroke-width': 3,
    }),
    s(
      'text',
      {
        x: x + w / 2,
        y: y + hgt + 9,
        'text-anchor': 'middle',
        'font-size': 18,
        'font-weight': 800,
        fill: '#1e293b',
        lang,
      },
      label,
    ),
  );
  return g;
}

export function compressHeroArt(lang: Lang): SVGElement {
  const d = (t: string): string => (lang === 'bn' ? toBanglaDigits(t) : t);
  const svg = s('svg', {
    viewBox: '0 0 600 250',
    class: 'compress-hero-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    s(
      'defs',
      {},
      s(
        'linearGradient',
        { id: 'ch-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#60a5fa' }),
        s('stop', { offset: 1, 'stop-color': '#bfdbfe' }),
      ),
      s(
        'filter',
        { id: 'ch-shadow', x: '-30%', y: '-30%', width: '160%', height: '170%' },
        s('feDropShadow', {
          dx: 0,
          dy: 8,
          stdDeviation: 8,
          'flood-color': '#4c1d95',
          'flood-opacity': 0.22,
        }),
      ),
    ),
    s('ellipse', { cx: 330, cy: 140, rx: 270, ry: 110, class: 'ch-glow' }),
  );
  svg.append(
    leaf(70, 236, 110, -40, '#2563eb'),
    leaf(96, 240, 120, -18, '#3b82f6'),
    leaf(124, 242, 90, 6, '#93c5fd'),
    leaf(560, 240, 120, 26, '#2563eb'),
    leaf(586, 240, 100, 50, '#60a5fa'),
    leaf(536, 244, 90, 4, '#93c5fd'),
    sparkle(52, 40, 14, '#f59e0b'),
    sparkle(560, 36, 12, '#fbbf24'),
    sparkle(588, 92, 8, '#ffffff'),
    sparkle(70, 120, 7, '#a78bfa'),
  );
  svg.append(
    picture(92, 26, 176, -8, lang === 'bn' ? `${d('5.2')} MB` : '5.2 MB', lang),
    picture(392, 70, 140, 6, lang === 'bn' ? `${d('680')} KB` : '680 KB', lang),
  );
  // Arrow between the pictures.
  svg.append(
    s('path', {
      d: 'M296 140c28-4 50-12 72-30',
      stroke: '#2563eb',
      'stroke-width': 10,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    s('path', { d: 'M352 96l28 6-12 26z', fill: '#2563eb' }),
  );
  // "↓ 87%" badge.
  svg.append(
    s(
      'g',
      { filter: 'url(#ch-shadow)' },
      s('rect', { x: 300, y: 20, width: 120, height: 52, rx: 14, fill: '#16a34a' }),
      s('path', {
        d: 'M326 32v26 M316 48l10 10 10-10',
        stroke: '#ffffff',
        'stroke-width': 4,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      s(
        'text',
        {
          x: 380,
          y: 56,
          'text-anchor': 'middle',
          'font-size': 26,
          'font-weight': 800,
          fill: '#ffffff',
        },
        `${d('87')}%`,
      ),
    ),
  );
  return svg;
}
