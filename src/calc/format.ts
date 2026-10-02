import { toBanglaDigits } from './digits';

export type Grouping = 'south-asian' | 'international';

/**
 * Insert thousands separators into a string of ASCII digits.
 * South-Asian: 1,23,45,678 (last three, then pairs). International: 12,345,678.
 */
export function groupDigits(digits: string, grouping: Grouping = 'south-asian'): string {
  if (digits.length <= 3) return digits;
  if (grouping === 'international') return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
}

/** Round half away from zero to 2 decimal places (to the nearest poisha). */
export function roundMoney(x: number): number {
  const r = Math.round(Math.abs(x) * 100 + 1e-7) / 100;
  return Math.sign(x) * r || 0;
}

/** Format a number with fixed decimals, South-Asian grouping and optional Bangla digits. */
export function formatAmount(x: number, lang: 'en' | 'bn', decimals = 2): string {
  const fixed = Math.abs(x).toFixed(decimals);
  const [int = '0', frac] = fixed.split('.');
  const s = `${x < 0 ? '-' : ''}${groupDigits(int)}${frac ? `.${frac}` : ''}`;
  return lang === 'bn' ? toBanglaDigits(s) : s;
}

export function formatInteger(n: number, lang: 'en' | 'bn'): string {
  return formatAmount(n, lang, 0);
}
