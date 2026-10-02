import { describe, expect, it } from 'vitest';
import css from '../src/styles/tokens.css?raw';

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]!] = m[2]!;
  return vars;
}

const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='dark']") };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio]
const pairs: Array<[string, string, number]> = [
  ['--color-text', '--color-bg', 4.5],
  ['--color-text', '--color-surface', 4.5],
  ['--color-text', '--color-surface-2', 4.5],
  ['--color-muted', '--color-bg', 4.5],
  ['--color-muted', '--color-surface', 4.5],
  ['--color-muted', '--color-surface-2', 4.5],
  ['--color-link', '--color-surface', 4.5],
  ['--color-link', '--color-bg', 4.5],
  ['--color-on-primary', '--color-primary', 4.5],
  ['--color-pill-text', '--color-pill-bg', 4.5],
  ['--hero-text', '--hero-bg', 4.5],
  ['--hero-muted', '--hero-bg', 4.5],
  ['--hero-accent', '--hero-bg', 4.5],
  ['--color-focus', '--color-surface', 3],
  ['--color-focus', '--color-bg', 3],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast (WCAG AA)', (_name, tokens) => {
  it.each(pairs)('%s on %s', (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
