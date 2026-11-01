import type { Lang } from '../../registry';

/**
 * Decorative illustration for the Photo & Signature Resizer header: an ID-style portrait card,
 * a signature card, a "Resize & Optimize" badge, a resize button and leaves. The portrait is a
 * drawn figure, not a photo of a real person. Inline SVG (no image request), hidden from
 * assistive technology.
 */

const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;
function s(tag: string, attrs: Attrs = {}, ...children: Array<SVGElement | string>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const TEXT = {
  en: { line1: 'Resize', line2: '& Optimize' },
  bn: { line1: 'রিসাইজ', line2: 'ও অপটিমাইজ' },
} as const;

/** A four-point sparkle. */
const sparkle = (x: number, y: number, r: number, fill: string): SVGElement =>
  s('path', {
    d: `M${x} ${y - r}C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y}C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r}C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y}C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`,
    fill,
  });

/** A leaf with a centre vein, pointing up from (x, y). */
const leaf = (x: number, y: number, len: number, angle: number, fill: string): SVGElement =>
  s(
    'g',
    { transform: `rotate(${angle} ${x} ${y})` },
    s('path', {
      d: `M${x} ${y}C${x - len * 0.32} ${y - len * 0.35} ${x - len * 0.2} ${y - len * 0.8} ${x} ${y - len}C${x + len * 0.2} ${y - len * 0.8} ${x + len * 0.32} ${y - len * 0.35} ${x} ${y}Z`,
      fill,
    }),
    s('path', {
      d: `M${x} ${y}L${x} ${y - len * 0.92}`,
      stroke: '#ffffff',
      'stroke-opacity': 0.45,
      'stroke-width': 1.5,
      fill: 'none',
    }),
  );

export function photoHeroArt(lang: Lang): SVGElement {
  const t = TEXT[lang];
  const svg = s('svg', {
    viewBox: '0 0 600 250',
    class: 'photo-hero-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    s(
      'defs',
      {},
      s(
        'linearGradient',
        { id: 'ph-badge', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#c026d3' }),
        s('stop', { offset: 1, 'stop-color': '#7c3aed' }),
      ),
      s(
        'linearGradient',
        { id: 'ph-bg', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#e0ecff' }),
        s('stop', { offset: 1, 'stop-color': '#c7d8f5' }),
      ),
      s(
        'linearGradient',
        { id: 'ph-suit', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#1e3a8a' }),
        s('stop', { offset: 1, 'stop-color': '#172554' }),
      ),
      s(
        'filter',
        { id: 'ph-shadow', x: '-20%', y: '-20%', width: '140%', height: '160%' },
        s('feDropShadow', {
          dx: 0,
          dy: 8,
          stdDeviation: 8,
          'flood-color': '#4c1d95',
          'flood-opacity': 0.2,
        }),
      ),
    ),
    s('ellipse', { cx: 330, cy: 150, rx: 260, ry: 100, class: 'ph-glow' }),
  );

  // Leaves behind the cards (left and right).
  svg.append(
    leaf(70, 230, 110, -38, '#4ade80'),
    leaf(92, 236, 120, -18, '#22c55e'),
    leaf(120, 238, 90, 4, '#86efac'),
    leaf(520, 236, 130, 22, '#22c55e'),
    leaf(548, 238, 110, 42, '#4ade80'),
    leaf(500, 240, 96, 2, '#86efac'),
    leaf(575, 240, 90, 62, '#16a34a'),
  );

  // Sparkles and the blue frame corner.
  svg.append(
    sparkle(48, 54, 14, '#f59e0b'),
    sparkle(560, 46, 13, '#8b5cf6'),
    sparkle(470, 228, 7, '#a78bfa'),
    s('path', {
      d: 'M262 22h18v18',
      stroke: '#2563eb',
      'stroke-width': 4,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );

  // Portrait card: a drawn figure in a suit on a light blue background.
  const card = s('g', { filter: 'url(#ph-shadow)', transform: 'rotate(-7 190 120)' });
  card.append(
    s('rect', { x: 110, y: 26, width: 160, height: 190, rx: 14, fill: '#ffffff' }),
    s('rect', { x: 122, y: 38, width: 136, height: 166, rx: 6, fill: 'url(#ph-bg)' }),
    // Suit and shoulders.
    s('path', {
      d: 'M126 204c2-30 18-46 44-52l20 14 20-14c26 6 42 22 44 52z',
      fill: 'url(#ph-suit)',
    }),
    // Shirt collar and tie.
    s('path', { d: 'M174 152l16 26 16-26-16 10z', fill: '#ffffff' }),
    s('path', { d: 'M186 164h8l3 8-7 30-7-30z', fill: '#1d4ed8' }),
    // Neck and head.
    s('rect', { x: 180, y: 128, width: 20, height: 26, rx: 8, fill: '#c98b62' }),
    s('ellipse', { cx: 190, cy: 106, rx: 27, ry: 32, fill: '#d99a6c' }),
    s('ellipse', { cx: 163, cy: 108, rx: 4, ry: 8, fill: '#c98b62' }),
    s('ellipse', { cx: 217, cy: 108, rx: 4, ry: 8, fill: '#c98b62' }),
    // Hair.
    s('path', {
      d: 'M162 102c-4-26 10-40 30-40 22 0 34 14 28 40-3-12-10-18-18-19-9 6-26 8-40 19z',
      fill: '#1f2937',
    }),
    // Eyes, brows, mouth.
    s('circle', { cx: 180, cy: 108, r: 2.6, fill: '#1f2937' }),
    s('circle', { cx: 200, cy: 108, r: 2.6, fill: '#1f2937' }),
    s('path', {
      d: 'M174 100h11 M195 100h11 M182 124q8 6 16 0',
      stroke: '#3f2a1d',
      'stroke-width': 2.4,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
  );
  svg.append(card);

  // Signature card.
  const sig = s('g', { filter: 'url(#ph-shadow)', transform: 'rotate(-3 400 160)' });
  sig.append(
    s('rect', { x: 312, y: 112, width: 176, height: 96, rx: 12, fill: '#ffffff' }),
    s('path', {
      d: 'M330 178c8-30 22-50 30-44 8 6-14 40-6 44 10 4 18-30 26-26 6 4-2 22 6 22 10 0 14-22 24-20 8 2 0 18 10 16 10-2 20-14 34-12 M336 190c40-6 90-8 130-4',
      stroke: '#0f172a',
      'stroke-width': 3,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
  svg.append(sig);

  // "Resize & Optimize" badge.
  const badge = s('g', { filter: 'url(#ph-shadow)', transform: 'rotate(-3 420 60)' });
  badge.append(
    s('rect', { x: 340, y: 18, width: 166, height: 82, rx: 16, fill: 'url(#ph-badge)' }),
    s(
      'text',
      {
        x: 423,
        y: 53,
        'text-anchor': 'middle',
        'font-size': 24,
        'font-weight': 800,
        fill: '#ffffff',
        lang,
      },
      t.line1,
    ),
    s(
      'text',
      {
        x: 423,
        y: 83,
        'text-anchor': 'middle',
        'font-size': 22,
        'font-weight': 800,
        fill: '#ffffff',
        lang,
      },
      t.line2,
    ),
  );
  svg.append(badge);

  // Round resize button between the cards.
  svg.append(
    s(
      'g',
      { filter: 'url(#ph-shadow)' },
      s('circle', { cx: 290, cy: 200, r: 30, fill: 'url(#ph-badge)' }),
      s('path', {
        d: 'M276 214l28-28 M276 214v-11 M276 214h11 M304 186h-11 M304 186v11 M276 186l10 10 M304 214l-10-10',
        stroke: '#ffffff',
        'stroke-width': 3.2,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ),
  );
  return svg;
}
