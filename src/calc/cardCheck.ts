import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

/**
 * Card-number format check: strips spaces and hyphens, applies the Luhn checksum (ISO/IEC 7812-1)
 * and guesses the card network from the leading digits. It never contacts anything and says
 * nothing about whether a card exists, is active or has funds.
 */

export type CardError = 'empty' | 'characters' | 'length';

export type CardNetwork =
  'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay';

interface NetworkRule {
  network: CardNetwork;
  test: (digits: string) => boolean;
  lengths: number[];
}

const starts = (re: RegExp) => (digits: string) => re.test(digits);
/** Mastercard's 2-series is the four-digit prefixes 2221 to 2720. */
const mastercard = (digits: string): boolean => {
  const first4 = Number(digits.slice(0, 4));
  return /^5[1-5]/.test(digits) || (first4 >= 2221 && first4 <= 2720);
};

/** Checked in order; the first match wins. Ranges follow the networks' published IIN ranges. */
const RULES: NetworkRule[] = [
  { network: 'amex', test: starts(/^3[47]/), lengths: [15] },
  { network: 'visa', test: starts(/^4/), lengths: [13, 16, 19] },
  { network: 'mastercard', test: mastercard, lengths: [16] },
  { network: 'discover', test: starts(/^(6011|64[4-9]|65)/), lengths: [16, 17, 18, 19] },
  { network: 'diners', test: starts(/^(30[0-5]|36|38|39)/), lengths: [14, 15, 16, 17, 18, 19] },
  { network: 'jcb', test: starts(/^35(2[89]|[3-8]\d)/), lengths: [16, 17, 18, 19] },
  { network: 'unionpay', test: starts(/^62/), lengths: [16, 17, 18, 19] },
];

export interface CardCheck {
  /** Digits only. */
  digits: string;
  length: number;
  luhnValid: boolean;
  network: CardNetwork | null;
  /** Lengths the guessed network issues; empty when the network is unknown. */
  expectedLengths: number[];
  lengthMatchesNetwork: boolean | null;
}

/** The Luhn mod-10 checksum over a string of digits. */
export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function checkCard(text: string): Result<CardCheck, CardError> {
  const raw = toEnglishDigits(text).trim();
  if (!raw) return fail('empty');
  if (!/^[\d\s-]+$/.test(raw)) return fail('characters');
  const digits = raw.replace(/[\s-]/g, '');
  if (digits.length < 12 || digits.length > 19) return fail('length');
  const rule = RULES.find((r) => r.test(digits)) ?? null;
  return ok({
    digits,
    length: digits.length,
    luhnValid: luhn(digits),
    network: rule?.network ?? null,
    expectedLengths: rule?.lengths ?? [],
    lengthMatchesNetwork: rule ? rule.lengths.includes(digits.length) : null,
  });
}

/** Group digits for display: 4-6-5 for 15-digit Amex, otherwise 4-4-4-4. */
export function groupCard(digits: string): string {
  if (digits.length === 15)
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  return digits.replace(/(.{4})/g, '$1 ').trim();
}
