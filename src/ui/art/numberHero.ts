import { toBanglaDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import { numberToWords } from '../../calc/numberWords';
import type { Lang } from '../../registry';

/**
 * Decorative illustration for the Number to Words header: a purple calculator, a Bangla and an
 * English example card, and language chips. The example words come from the real converter, so
 * the picture never shows a wrong spelling. Inline SVG (no image request), hidden from
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

const words = (n: string, lang: 'en' | 'bn'): string => {
  const r = numberToWords(n, lang);
  return r.ok ? r.value : '';
};

/** A tilted example card: digits on top, words below. */
function card(
  x: number,
  y: number,
  rotate: number,
  fill: string,
  digits: string,
  text: string,
  lang: 'en' | 'bn',
): SVGElement {
  return s(
    'g',
    { transform: `rotate(${rotate} ${x + 120} ${y + 40})`, filter: 'url(#nh-shadow)' },
    s('rect', { x, y, width: 240, height: 84, rx: 16, fill }),
    s(
      'text',
      {
        x: x + 120,
        y: y + 38,
        'text-anchor': 'middle',
        'font-size': 26,
        'font-weight': 800,
        fill: '#1e1b4b',
      },
      digits,
    ),
    s(
      'text',
      {
        x: x + 120,
        y: y + 64,
        'text-anchor': 'middle',
        'font-size': lang === 'bn' ? 14 : 12.5,
        'font-weight': 600,
        fill: '#3b3561',
        lang,
      },
      text,
    ),
  );
}

export function numberHeroArt(lang: Lang): SVGElement {
  const svg = s('svg', {
    viewBox: '0 0 600 250',
    class: 'number-hero-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    s(
      'defs',
      {},
      s(
        'linearGradient',
        { id: 'nh-calc', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#818cf8' }),
        s('stop', { offset: 1, 'stop-color': '#4f46e5' }),
      ),
      s(
        'filter',
        { id: 'nh-shadow', x: '-20%', y: '-20%', width: '140%', height: '160%' },
        s('feDropShadow', {
          dx: 0,
          dy: 8,
          stdDeviation: 8,
          'flood-color': '#312e81',
          'flood-opacity': 0.2,
        }),
      ),
    ),
    s('ellipse', { cx: 360, cy: 130, rx: 240, ry: 110, class: 'nh-glow' }),
  );

  // Decorative stars and dots.
  const star = (x: number, y: number, r: number, fill: string): SVGElement =>
    s('path', {
      d: `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z`,
      fill,
    });
  svg.append(
    star(28, 150, 16, '#38bdf8'),
    star(560, 40, 12, '#fbbf24'),
    star(70, 225, 10, '#fbbf24'),
    star(440, 18, 8, '#a78bfa'),
    s('circle', { cx: 300, cy: 236, r: 6, fill: '#f472b6' }),
    s('circle', { cx: 585, cy: 140, r: 5, fill: '#38bdf8' }),
  );

  // Calculator.
  const calc = s('g', { filter: 'url(#nh-shadow)', transform: 'rotate(10 380 120)' });
  calc.append(
    s('rect', { x: 320, y: 30, width: 130, height: 180, rx: 22, fill: 'url(#nh-calc)' }),
    s('rect', { x: 336, y: 46, width: 98, height: 36, rx: 8, fill: '#c7d2fe' }),
  );
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      calc.append(
        s('rect', {
          x: 336 + col * 34,
          y: 94 + row * 36,
          width: 28,
          height: 28,
          rx: 7,
          fill: row === 2 && col === 2 ? '#fbbf24' : '#e0e7ff',
        }),
      );
  svg.append(calc);

  // Example cards, spelled by the converter itself.
  const big = '1260000';
  const mid = '125000';
  svg.append(
    card(36, 18, -8, '#fde68a', toBanglaDigits(groupDigits(big)), words(big, 'bn'), 'bn'),
    card(70, 120, -6, '#fbcfe8', groupDigits(mid), words(mid, 'en'), 'en'),
  );

  // Language chips.
  const chip = (
    x: number,
    y: number,
    rotate: number,
    fill: string,
    top: string,
    sub: string,
    l: string,
  ): SVGElement =>
    s(
      'g',
      { transform: `rotate(${rotate} ${x + 40} ${y + 40})`, filter: 'url(#nh-shadow)' },
      s('rect', { x, y, width: 80, height: 82, rx: 14, fill }),
      s(
        'text',
        {
          x: x + 40,
          y: y + 34,
          'text-anchor': 'middle',
          'font-size': 20,
          'font-weight': 800,
          fill: '#1e1b4b',
          lang: l,
        },
        top,
      ),
      s(
        'text',
        {
          x: x + 40,
          y: y + 54,
          'text-anchor': 'middle',
          'font-size': 11,
          'font-weight': 600,
          fill: '#3b3561',
        },
        sub,
      ),
      s('path', {
        d: `M${x + 26} ${y + 66}h28 M${x + 48} ${y + 61}l6 5-6 5 M${x + 32} ${y + 61}l-6 5 6 5`,
        stroke: '#1e1b4b',
        'stroke-width': 2.2,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    );
  svg.append(
    chip(452, 92, -8, '#fde68a', 'বাংলা', lang === 'bn' ? '(বাংলা)' : '(Bangla)', 'bn'),
    chip(520, 70, -6, '#a5f3fc', 'English', lang === 'bn' ? '(ইংরেজি)' : '(English)', 'en'),
  );
  return svg;
}
