/**
 * NextGen Tech BD logo mark: an "NG" ring with circuit traces on both sides, redrawn as
 * an inline SVG from the brand artwork so it stays sharp at any size and needs no image
 * request. The wordmark ("NEXTGEN TECH BD") is real text next to the mark, not part of it.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

let uid = 0;

// Traces on the left half (viewBox 0 0 200 100); the right half mirrors them.
const TRACES = [
  'M70 36 H54 L46 28 H22',
  'M70 44 H40',
  'M70 50 H12',
  'M70 56 H40',
  'M70 64 H54 L46 72 H22',
];
const DOTS: Array<[number, number]> = [
  [22, 28],
  [40, 44],
  [12, 50],
  [40, 56],
  [22, 72],
];

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** The logo mark. Decorative by default; pass `label` when it is the only content of a link. */
export function logoMark(width: number, opts: { label?: string; className?: string } = {}) {
  const id = `ng-grad-${++uid}`;
  const svg = el('svg', {
    viewBox: '0 0 200 100',
    width: String(width),
    height: String(width / 2),
    class: `logo-mark${opts.className ? ` ${opts.className}` : ''}`,
    focusable: 'false',
  });
  if (opts.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  const defs = el('defs', {});
  const grad = el('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' });
  grad.append(
    el('stop', { offset: '0', style: 'stop-color: var(--logo-from, #22d3ee)' }),
    el('stop', { offset: '1', style: 'stop-color: var(--logo-to, #2563eb)' }),
  );
  defs.append(grad);
  svg.append(defs);

  const paint = `url(#${id})`;
  const traces = el('g', {
    fill: 'none',
    stroke: paint,
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  for (const d of TRACES) traces.append(el('path', { d }));
  const dots = el('g', { fill: paint });
  for (const [cx, cy] of DOTS)
    dots.append(el('circle', { cx: String(cx), cy: String(cy), r: '3.2' }));
  const left = el('g', {});
  left.append(traces, dots);
  const right = el('g', { transform: 'translate(200 0) scale(-1 1)' });
  right.append(traces.cloneNode(true), dots.cloneNode(true));

  const ring = el('circle', {
    cx: '100',
    cy: '50',
    r: '28',
    style: 'fill: var(--logo-fill, transparent)',
    stroke: paint,
    'stroke-width': '6',
  });
  const text = el('text', {
    x: '100',
    y: '51',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    'font-size': '26',
    'font-weight': '800',
    fill: paint,
  });
  text.textContent = 'NG';
  svg.append(left, right, ring, text);
  return svg;
}
