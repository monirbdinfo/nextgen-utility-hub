import type { Lang } from '../registry/types';
import { messages } from './messages';

export { messages };
export type MessageKey = keyof (typeof messages)['en'];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Render Latin digits with Bangla numerals when the UI language is Bangla. */
export function formatNumber(lang: Lang, n: number): string {
  const s = String(n);
  return lang === 'bn' ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d) : s;
}

export function t(lang: Lang, key: MessageKey, vars: Record<string, string | number> = {}): string {
  let text: string = messages[lang][key];
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, typeof v === 'number' ? formatNumber(lang, v) : v);
  }
  return text;
}

export function detectLang(stored: string | null, navLang: string): Lang {
  if (stored === 'en' || stored === 'bn') return stored;
  return navLang.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}
