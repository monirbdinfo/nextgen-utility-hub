import { toBanglaDigits } from '../calc/digits';
import type { Lang } from '../registry/types';
import { messages } from './messages';

export { messages };
export type MessageKey = keyof (typeof messages)['en'];
export type Vars = Record<string, string | number>;

/** Render Latin digits with Bangla numerals when the UI language is Bangla. */
export function formatNumber(lang: Lang, n: number | string): string {
  const s = String(n);
  return lang === 'bn' ? toBanglaDigits(s) : s;
}

/** Replace `{name}` placeholders; numbers are rendered in the UI language's digits. */
export function interpolate(lang: Lang, text: string, vars: Vars = {}): string {
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, typeof v === 'number' ? formatNumber(lang, v) : v);
  }
  return text;
}

export function t(lang: Lang, key: MessageKey, vars: Vars = {}): string {
  return interpolate(lang, messages[lang][key], vars);
}

/**
 * Declare a module's own strings. TypeScript enforces that Bangla has exactly
 * the same keys as English.
 */
export function defineStrings<K extends string>(strings: {
  en: Record<K, string>;
  bn: Record<K, string>;
}): (lang: Lang) => (key: K, vars?: Vars) => string {
  return (lang) => (key, vars) => interpolate(lang, strings[lang][key], vars);
}

export function detectLang(stored: string | null, navLang: string): Lang {
  if (stored === 'en' || stored === 'bn') return stored;
  return navLang.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}
