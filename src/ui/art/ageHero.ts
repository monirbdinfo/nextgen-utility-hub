import { BN_MONTHS, EN_MONTHS } from '../../calc/dateText';
import { toBanglaDigits } from '../../calc/digits';
import type { CivilDate } from '../../calc/dates';
import type { Lang } from '../../registry';

/**
 * Decorative illustration for the Age Calculator header: a desk calendar showing today's date,
 * a birthday cake, an alarm clock, a sticky note of the units the tool reports, and confetti.
 * Drawn as inline SVG (no image request); hidden from assistive technology.
 */

const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;
function s(tag: string, attrs: Attrs = {}, ...children: Array<SVGElement | string>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const HAND = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive";

const TEXT = {
  en: {
    line1: 'Discover',
    line2: 'Your Age',
    line3: '& Next Birthday',
    units: ['Years', 'Months', 'Days', 'Weeks', 'Hours'],
  },
  bn: {
    line1: 'জেনে নিন',
    line2: 'আপনার বয়স',
    line3: 'ও পরের জন্মদিন',
    units: ['বছর', 'মাস', 'দিন', 'সপ্তাহ', 'ঘণ্টা'],
  },
} as const;

/** Confetti: [x, y, rotation, colour, shape]. */
const CONFETTI: Array<[number, number, number, string, 'r' | 'c']> = [
  [300, 28, 30, '#f43f5e', 'r'],
  [334, 60, -20, '#22c55e', 'r'],
  [356, 22, 60, '#3b82f6', 'c'],
  [412, 34, -35, '#f59e0b', 'r'],
  [452, 18, 15, '#a855f7', 'c'],
  [520, 44, 45, '#ec4899', 'r'],
  [548, 92, -15, '#3b82f6', 'r'],
  [272, 150, 25, '#a855f7', 'r'],
  [258, 214, -40, '#f59e0b', 'c'],
  [596, 236, 20, '#22c55e', 'r'],
  [618, 168, -30, '#f43f5e', 'c'],
  [488, 250, 50, '#ec4899', 'r'],
];

export function ageHeroArt(lang: Lang, today: CivilDate): SVGElement {
  const t = TEXT[lang];
  const month =
    lang === 'bn'
      ? BN_MONTHS[today.month - 1]!
      : EN_MONTHS[today.month - 1]!.slice(0, 3).toUpperCase();
  const day = lang === 'bn' ? toBanglaDigits(String(today.day)) : String(today.day);

  const svg = s('svg', {
    viewBox: '0 0 640 270',
    class: 'age-hero-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });

  const defs = s(
    'defs',
    {},
    s(
      'linearGradient',
      { id: 'ah-cal', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: 0, 'stop-color': '#ff6b6b' }),
      s('stop', { offset: 1, 'stop-color': '#e11d48' }),
    ),
    s(
      'linearGradient',
      { id: 'ah-clock', x1: 0, y1: 0, x2: 1, y2: 1 },
      s('stop', { offset: 0, 'stop-color': '#60a5fa' }),
      s('stop', { offset: 1, 'stop-color': '#1d4ed8' }),
    ),
    s(
      'linearGradient',
      { id: 'ah-cake', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: 0, 'stop-color': '#fbcfe8' }),
      s('stop', { offset: 1, 'stop-color': '#f472b6' }),
    ),
    s(
      'filter',
      { id: 'ah-shadow', x: '-20%', y: '-20%', width: '140%', height: '150%' },
      s('feDropShadow', {
        dx: 0,
        dy: 8,
        stdDeviation: 8,
        'flood-color': '#1e3a8a',
        'flood-opacity': 0.18,
      }),
    ),
  );
  svg.append(defs);

  // Soft glow behind the scene.
  svg.append(s('ellipse', { cx: 430, cy: 150, rx: 210, ry: 120, class: 'ah-glow' }));

  // Hand-written headline with an underline swoosh.
  svg.append(
    s(
      'g',
      { class: 'ah-hand', transform: 'rotate(-9 110 110)', 'font-family': HAND },
      s('text', { x: 18, y: 70, 'font-size': 30 }, t.line1),
      s('text', { x: 38, y: 108, 'font-size': 30 }, t.line2),
      s('text', { x: 18, y: 148, 'font-size': 28 }, t.line3),
      s('path', { d: 'M30 172 C 90 150, 170 150, 236 146', class: 'ah-swoosh' }),
    ),
  );

  // Confetti.
  for (const [x, y, r, c, shape] of CONFETTI)
    svg.append(
      shape === 'c'
        ? s('circle', { cx: x, cy: y, r: 5, fill: c })
        : s('rect', {
            x: x - 3,
            y: y - 8,
            width: 6,
            height: 16,
            rx: 3,
            fill: c,
            transform: `rotate(${r} ${x} ${y})`,
          }),
    );

  // Desk calendar.
  const cal = s('g', { filter: 'url(#ah-shadow)', transform: 'rotate(-6 420 130)' });
  cal.append(
    s('rect', { x: 330, y: 40, width: 180, height: 180, rx: 26, fill: '#ffffff' }),
    s('path', {
      d: 'M330 66a26 26 0 0 1 26-26h128a26 26 0 0 1 26 26v26H330z',
      fill: 'url(#ah-cal)',
    }),
    s('rect', {
      x: 372,
      y: 24,
      width: 16,
      height: 40,
      rx: 8,
      fill: '#cbd5e1',
      stroke: '#94a3b8',
      'stroke-width': 2,
    }),
    s('rect', {
      x: 452,
      y: 24,
      width: 16,
      height: 40,
      rx: 8,
      fill: '#cbd5e1',
      stroke: '#94a3b8',
      'stroke-width': 2,
    }),
    s(
      'text',
      {
        x: 420,
        y: 130,
        'text-anchor': 'middle',
        'font-size': 30,
        'font-weight': 800,
        fill: '#e11d48',
      },
      month,
    ),
    s(
      'text',
      {
        x: 420,
        y: 196,
        'text-anchor': 'middle',
        'font-size': 64,
        'font-weight': 800,
        fill: '#0f172a',
      },
      day,
    ),
  );
  svg.append(cal);

  // Birthday cake with candles.
  const cake = s('g', { filter: 'url(#ah-shadow)' });
  cake.append(
    s('ellipse', { cx: 300, cy: 246, rx: 82, ry: 14, fill: '#e2e8f0' }),
    s('rect', { x: 236, y: 196, width: 128, height: 48, rx: 12, fill: 'url(#ah-cake)' }),
    s('rect', { x: 248, y: 160, width: 104, height: 42, rx: 12, fill: '#fde68a' }),
    s('path', {
      d: 'M248 172q0-12 12-12h80q12 0 12 12v4q-8 10-16 0-8 10-16 0-8 10-16 0-8 10-16 0-8 10-16 0-8 10-16 0-8 10-16 0z',
      fill: '#fb7185',
    }),
    s('path', {
      d: 'M236 208q0-12 12-12h104q12 0 12 12v2q-10 12-20 0-10 12-20 0-10 12-20 0-10 12-20 0-10 12-20 0-10 12-20 0z',
      fill: '#fdf2f8',
    }),
  );
  for (const [x, c] of [
    [272, '#60a5fa'],
    [300, '#a78bfa'],
    [328, '#f472b6'],
  ] as const) {
    cake.append(
      s('rect', { x: x - 4, y: 128, width: 8, height: 34, rx: 3, fill: c }),
      s('path', { d: `M${x} 108c7 9 7 16 0 20-7-4-7-11 0-20z`, fill: '#f59e0b' }),
      s('path', { d: `M${x} 116c3 5 3 8 0 10-3-2-3-5 0-10z`, fill: '#fde68a' }),
    );
  }
  svg.append(cake);

  // Alarm clock.
  const clock = s('g', { filter: 'url(#ah-shadow)' });
  clock.append(
    s('circle', { cx: 512, cy: 202, r: 50, fill: 'url(#ah-clock)' }),
    s('circle', { cx: 512, cy: 202, r: 38, fill: '#ffffff' }),
    s('circle', { cx: 478, cy: 156, r: 12, fill: '#3b82f6' }),
    s('circle', { cx: 546, cy: 156, r: 12, fill: '#3b82f6' }),
    s('path', {
      d: 'M512 202V178 M512 202l16 10',
      stroke: '#1e3a8a',
      'stroke-width': 5,
      'stroke-linecap': 'round',
    }),
    s('circle', { cx: 512, cy: 202, r: 4, fill: '#1e3a8a' }),
  );
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    clock.append(
      s('circle', {
        cx: (512 + Math.sin(a) * 30).toFixed(1),
        cy: (202 - Math.cos(a) * 30).toFixed(1),
        r: i % 3 ? 1.6 : 2.6,
        fill: '#475569',
      }),
    );
  }
  svg.append(clock);

  // Sticky note with the units the calculator reports.
  const note = s('g', { filter: 'url(#ah-shadow)', transform: 'rotate(5 590 100)' });
  note.append(
    s('rect', { x: 548, y: 14, width: 86, height: 156, rx: 8, fill: '#fde68a' }),
    s('path', { d: 'M560 30l5 -8 5 8 5 -8 5 8v6h-20z', fill: '#f59e0b' }),
    ...t.units.map((u, i) =>
      s(
        'text',
        { x: 562, y: 58 + i * 20, 'font-size': 12.5, 'font-weight': 600, fill: '#78350f' },
        u,
      ),
    ),
  );
  svg.append(note);

  return svg;
}
