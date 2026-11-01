import { encodeQr, toSvgPath, totalModules } from '../../calc/qr';
import type { Lang } from '../../registry';

/**
 * Decorative illustration for the QR Code Generator header: a "Scan me" card and a phone, both
 * showing a real code for this site made by the page's own encoder, with floating content-type
 * badges (link, Wi-Fi, contacts, email) and leaves. Inline SVG (no image request), hidden from
 * assistive technology.
 */

const NS = 'http://www.w3.org/2000/svg';
const SITE = 'https://tools.nextgentechbd.com/';

type Attrs = Record<string, string | number>;
function s(tag: string, attrs: Attrs = {}, ...children: Array<SVGElement | string>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const TEXT = {
  en: { scan: 'Scan me', phone: 'Scan QR Code' },
  bn: { scan: 'স্ক্যান করুন', phone: 'QR কোড স্ক্যান' },
} as const;

/** The site's QR code drawn at (x, y) with the given width, dark modules in `fill`. */
function code(x: number, y: number, width: number, fill: string, bg: string): SVGElement {
  const q = encodeQr(SITE, { ecc: 'M' });
  const g = s('g', {});
  if (!q.ok) return g;
  const total = totalModules(q.value, 1);
  const k = width / total;
  g.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
  g.append(
    s('rect', { width: total, height: total, fill: bg }),
    s('path', { d: toSvgPath(q.value, 1), fill, 'shape-rendering': 'crispEdges' }),
  );
  return g;
}

/** A rounded badge with a simple line icon (paths in a 24 × 24 box). */
function badge(
  x: number,
  y: number,
  size: number,
  fill: string,
  rotate: number,
  paths: string,
): SVGElement {
  const k = (size * 0.56) / 24;
  const pad = (size - 24 * k) / 2;
  return s(
    'g',
    {
      transform: `rotate(${rotate} ${x + size / 2} ${y + size / 2})`,
      filter: 'url(#qh-shadow)',
    },
    s('rect', { x, y, width: size, height: size, rx: size * 0.26, fill }),
    s('path', {
      d: paths,
      transform: `translate(${x + pad} ${y + pad}) scale(${k})`,
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': 2.4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
}

const leaf = (x: number, y: number, len: number, angle: number, fill: string): SVGElement =>
  s('path', {
    d: `M${x} ${y}C${x - len * 0.32} ${y - len * 0.35} ${x - len * 0.2} ${y - len * 0.8} ${x} ${y - len}C${x + len * 0.2} ${y - len * 0.8} ${x + len * 0.32} ${y - len * 0.35} ${x} ${y}Z`,
    fill,
    transform: `rotate(${angle} ${x} ${y})`,
  });

export function qrHeroArt(lang: Lang): SVGElement {
  const t = TEXT[lang];
  const svg = s('svg', {
    viewBox: '0 0 600 250',
    class: 'qr-hero-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    s(
      'defs',
      {},
      s(
        'linearGradient',
        { id: 'qh-phone', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#334155' }),
        s('stop', { offset: 1, 'stop-color': '#0f172a' }),
      ),
      s(
        'filter',
        { id: 'qh-shadow', x: '-30%', y: '-30%', width: '160%', height: '170%' },
        s('feDropShadow', {
          dx: 0,
          dy: 8,
          stdDeviation: 8,
          'flood-color': '#1e3a8a',
          'flood-opacity': 0.22,
        }),
      ),
    ),
    s('ellipse', { cx: 360, cy: 140, rx: 250, ry: 110, class: 'qh-glow' }),
  );

  // Leaves and petals at the bottom and top.
  svg.append(
    leaf(300, 250, 90, -40, '#93c5fd'),
    leaf(330, 252, 100, -14, '#a5b4fc'),
    leaf(560, 250, 110, 30, '#bfdbfe'),
    leaf(590, 250, 90, 55, '#c4b5fd'),
    leaf(200, 30, 46, -30, '#fbbf24'),
    leaf(214, 34, 50, 4, '#f59e0b'),
    leaf(228, 30, 44, 34, '#fcd34d'),
  );

  // "Scan me" card with a real code.
  const card = s('g', { filter: 'url(#qh-shadow)', transform: 'rotate(-8 330 130)' });
  card.append(
    s('rect', { x: 255, y: 42, width: 150, height: 176, rx: 16, fill: '#ffffff' }),
    code(272, 58, 116, '#0f172a', '#ffffff'),
    s(
      'text',
      {
        x: 330,
        y: 203,
        'text-anchor': 'middle',
        'font-size': 15,
        'font-weight': 700,
        fill: '#1e293b',
        'font-family': "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive",
        lang,
      },
      t.scan,
    ),
  );
  svg.append(card);

  // Phone showing the same code.
  const phone = s('g', { filter: 'url(#qh-shadow)', transform: 'rotate(12 500 130)' });
  phone.append(
    s('rect', { x: 440, y: 20, width: 120, height: 220, rx: 22, fill: 'url(#qh-phone)' }),
    s('rect', { x: 450, y: 34, width: 100, height: 192, rx: 14, fill: '#0b1220' }),
    s('rect', { x: 484, y: 26, width: 32, height: 6, rx: 3, fill: '#1e293b' }),
    code(458, 78, 84, '#e2e8f0', '#0b1220'),
    s('path', {
      d: 'M456 72v-10h10 M544 72v-10h-10 M456 168v10h10 M544 168v10h-10',
      stroke: '#38bdf8',
      'stroke-width': 3,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    s(
      'text',
      {
        x: 500,
        y: 204,
        'text-anchor': 'middle',
        'font-size': 12,
        'font-weight': 700,
        fill: '#e2e8f0',
        lang,
      },
      t.phone,
    ),
  );
  svg.append(phone);

  // Floating content-type badges.
  svg.append(
    badge(
      150,
      40,
      50,
      '#2563eb',
      -6,
      'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2',
    ),
    badge(
      92,
      104,
      52,
      '#06b6d4',
      4,
      'M2.5 9a14 14 0 0 1 19 0 M5.5 12.5a9.5 9.5 0 0 1 13 0 M8.5 16a5 5 0 0 1 7 0 M12 19.5h.01',
    ),
    badge(
      186,
      122,
      54,
      '#16a34a',
      -4,
      'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4.5 20c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6',
    ),
    badge(
      120,
      180,
      44,
      '#f472b6',
      8,
      'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4.5 20c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6',
    ),
    badge(370, 180, 46, '#f59e0b', 6, 'M3.5 6h17v12h-17z M3.5 7l8.5 6 8.5-6'),
  );
  return svg;
}
