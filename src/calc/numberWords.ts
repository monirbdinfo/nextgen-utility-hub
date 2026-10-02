import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

export type WordsLang = 'en' | 'bn';
/** English only: lakh/crore (South-Asian) or million/billion (international). */
export type EnglishScale = 'south-asian' | 'international';

/** Integer part may have at most this many digits (up to 999,999,999,999,999). */
export const MAX_INTEGER_DIGITS = 15;
export const MAX_FRACTION_DIGITS = 10;

export interface ParsedNumber {
  negative: boolean;
  /** ASCII digits without leading zeros ("0" for zero). */
  integer: string;
  /** ASCII digits after the decimal point, exactly as typed (may be ""). */
  fraction: string;
}

export type ParseError = 'empty' | 'invalid' | 'too-large';

/**
 * Parse a typed number. Accepts Bangla or English digits, a leading + or −/-,
 * one decimal point, and ignores spaces, commas, "৳", "Tk"/"Taka"/"BDT".
 * Rejects exponents, multiple points, letters and anything else.
 */
export function parseNumberInput(raw: string): Result<ParsedNumber, ParseError> {
  let s = toEnglishDigits(raw)
    .replace(/[\s,]/g, '')
    .replace(/^৳|^(?:tk\.?|taka|bdt)/i, '');
  s = s.replace(/^[−–]/, '-');
  if (s === '') return fail('empty');
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return fail('invalid');
  if (s.endsWith('.')) return fail('invalid');
  const integer = (m[2] ?? '').replace(/^0+(?=\d)/, '') || '0';
  if (integer.length > MAX_INTEGER_DIGITS) return fail('too-large');
  const fraction = m[3] ?? '';
  const isZero = /^0*$/.test(integer) && /^0*$/.test(fraction);
  return ok({ negative: m[1] === '-' && !isZero, integer, fraction });
}

// ---------- English ----------

const EN_ONES = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const EN_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function enBelow100(n: number): string {
  if (n < 20) return EN_ONES[n] as string;
  const t = EN_TENS[Math.floor(n / 10)] as string;
  return n % 10 ? `${t}-${EN_ONES[n % 10]}` : t;
}

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${EN_ONES[h]} Hundred`);
  if (r) parts.push(enBelow100(r));
  return parts.join(' ');
}

function enSouthAsian(n: bigint): string {
  const parts: string[] = [];
  const crore = n / 10_000_000n;
  let rest = n % 10_000_000n;
  if (crore) parts.push(`${enSouthAsian(crore)} Crore`);
  const lakh = rest / 100_000n;
  rest %= 100_000n;
  const thousand = rest / 1_000n;
  rest %= 1_000n;
  if (lakh) parts.push(`${enBelow100(Number(lakh))} Lakh`);
  if (thousand) parts.push(`${enBelow100(Number(thousand))} Thousand`);
  if (rest) parts.push(enBelow1000(Number(rest)));
  return parts.join(' ');
}

const EN_INTL_SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function enInternational(n: bigint): string {
  const parts: string[] = [];
  let scale = 0;
  while (n > 0n) {
    const group = Number(n % 1000n);
    if (group) parts.unshift(`${enBelow1000(group)}${scale ? ` ${EN_INTL_SCALES[scale]}` : ''}`);
    n /= 1000n;
    scale++;
  }
  return parts.join(' ');
}

// ---------- Bangla ----------

// 0–99 have individual words in Bangla. Common standard spellings; regional variants exist.
const BN_0_99 = (
  'শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ ' +
  'এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো উনিশ বিশ ' +
  'একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ ' +
  'একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ ' +
  'একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ ' +
  'একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট ' +
  'একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর ' +
  'একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি ' +
  'একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি আটাশি ঊননব্বই নব্বই ' +
  'একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই'
)
  .normalize('NFC')
  .split(' ');

export const BANGLA_0_TO_99: readonly string[] = BN_0_99;

function bnBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${BN_0_99[h]} শত`);
  if (r) parts.push(BN_0_99[r] as string);
  return parts.join(' ');
}

function bnWords(n: bigint): string {
  const parts: string[] = [];
  const crore = n / 10_000_000n;
  let rest = n % 10_000_000n;
  if (crore) parts.push(`${bnWords(crore)} কোটি`);
  const lakh = rest / 100_000n;
  rest %= 100_000n;
  const thousand = rest / 1_000n;
  rest %= 1_000n;
  if (lakh) parts.push(`${BN_0_99[Number(lakh)]} লক্ষ`);
  if (thousand) parts.push(`${BN_0_99[Number(thousand)]} হাজার`);
  if (rest) parts.push(bnBelow1000(Number(rest)));
  return parts.join(' ');
}

// ---------- Public API ----------

/** Words for a non-negative integer. Bangla always uses the lakh/crore scale. */
export function integerToWords(
  n: bigint | number,
  lang: WordsLang,
  scale: EnglishScale = 'south-asian',
): string {
  const v = BigInt(n);
  if (v < 0n) throw new RangeError('integerToWords expects a non-negative integer');
  if (v === 0n) return lang === 'bn' ? (BN_0_99[0] as string) : 'Zero';
  if (lang === 'bn') return bnWords(v);
  return scale === 'international' ? enInternational(v) : enSouthAsian(v);
}

function digitWords(digits: string, lang: WordsLang): string {
  return [...digits]
    .map((d) => (lang === 'bn' ? BN_0_99[Number(d)] : EN_ONES[Number(d)]))
    .join(' ');
}

export type NumberWordsError = ParseError | 'too-many-decimals';

/** "12.34" → "Twelve Point Three Four" / "বারো দশমিক তিন চার". Decimal digits are read one by one. */
export function numberToWords(
  raw: string,
  lang: WordsLang,
  scale: EnglishScale = 'south-asian',
): Result<string, NumberWordsError> {
  const parsed = parseNumberInput(raw);
  if (!parsed.ok) return parsed;
  const { negative, integer, fraction } = parsed.value;
  if (fraction.length > MAX_FRACTION_DIGITS) return fail('too-many-decimals');
  const parts: string[] = [];
  if (negative) parts.push(lang === 'bn' ? 'ঋণাত্মক' : 'Minus');
  parts.push(integerToWords(BigInt(integer), lang, scale));
  if (fraction) parts.push(lang === 'bn' ? 'দশমিক' : 'Point', digitWords(fraction, lang));
  return ok(parts.join(' '));
}

export type TakaError = ParseError | 'negative-amount' | 'too-many-decimals';

export interface TakaWords {
  words: string;
  taka: string;
  /** 0–99 */
  poisha: number;
}

/**
 * Taka amount in words, e.g. "1250.5" → "One Thousand Two Hundred Fifty Taka and Fifty Poisha Only".
 * At most two decimal places are accepted (1 Taka = 100 Poisha); more is an error, never rounded.
 * Negative amounts are rejected.
 */
export function takaToWords(
  raw: string,
  lang: WordsLang,
  scale: EnglishScale = 'south-asian',
): Result<TakaWords, TakaError> {
  const parsed = parseNumberInput(raw);
  if (!parsed.ok) return parsed;
  const { negative, integer, fraction } = parsed.value;
  if (negative) return fail('negative-amount');
  if (fraction.length > 2) return fail('too-many-decimals');
  const poisha = Number(fraction.padEnd(2, '0') || '0');
  const taka = BigInt(integer);
  const tw = integerToWords(taka, lang, scale);
  const pw = integerToWords(poisha, lang, scale);
  let words: string;
  if (lang === 'bn') {
    if (taka === 0n && poisha > 0) words = `${pw} পয়সা মাত্র`;
    else words = `${tw} টাকা${poisha ? ` ${pw} পয়সা` : ''} মাত্র`;
  } else if (taka === 0n && poisha > 0) words = `${pw} Poisha Only`;
  else words = `${tw} Taka${poisha ? ` and ${pw} Poisha` : ''} Only`;
  return ok({ words, taka: integer, poisha });
}
