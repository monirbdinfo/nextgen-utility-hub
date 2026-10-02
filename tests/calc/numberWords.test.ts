import { describe, expect, it } from 'vitest';
import {
  BANGLA_0_TO_99,
  integerToWords,
  numberToWords,
  parseNumberInput,
  takaToWords,
} from '../../src/calc/numberWords';

const nfc = (s: string): string => s.normalize('NFC');
const words = (raw: string, lang: 'en' | 'bn', scale?: 'south-asian' | 'international') => {
  const r = numberToWords(raw, lang, scale);
  return r.ok ? r.value : `ERR:${r.error}`;
};
const taka = (raw: string, lang: 'en' | 'bn') => {
  const r = takaToWords(raw, lang);
  return r.ok ? r.value.words : `ERR:${r.error}`;
};

describe('parseNumberInput', () => {
  it('accepts common formats', () => {
    expect(parseNumberInput('১,২৫,০০০.৫০')).toEqual({
      ok: true,
      value: { negative: false, integer: '125000', fraction: '50' },
    });
    expect(parseNumberInput(' ৳ 1 250 ').ok).toBe(true);
    expect(parseNumberInput('Tk. 500').ok).toBe(true);
    expect(parseNumberInput('-0007')).toEqual({
      ok: true,
      value: { negative: true, integer: '7', fraction: '' },
    });
    expect(parseNumberInput('.5')).toEqual({
      ok: true,
      value: { negative: false, integer: '0', fraction: '5' },
    });
    expect(parseNumberInput('−3').ok && parseNumberInput('−3')).toMatchObject({
      value: { negative: true },
    });
  });

  it('treats minus zero as zero', () => {
    expect(parseNumberInput('-0.00')).toMatchObject({ ok: true, value: { negative: false } });
  });

  it('rejects malformed input', () => {
    expect(parseNumberInput('')).toEqual({ ok: false, error: 'empty' });
    expect(parseNumberInput('   ')).toEqual({ ok: false, error: 'empty' });
    for (const bad of [
      'abc',
      '1.2.3',
      '1e5',
      '--5',
      '+-5',
      '-',
      '.',
      '5.',
      '12a',
      '1/2',
      'Infinity',
      'NaN',
    ]) {
      expect(parseNumberInput(bad), bad).toEqual({ ok: false, error: 'invalid' });
    }
    expect(parseNumberInput('1234567890123456')).toEqual({ ok: false, error: 'too-large' });
    expect(parseNumberInput('999999999999999').ok).toBe(true);
  });
});

describe('Bangla 0–99 table', () => {
  it('has 100 distinct words with spot checks', () => {
    expect(BANGLA_0_TO_99).toHaveLength(100);
    expect(new Set(BANGLA_0_TO_99).size).toBe(100);
    expect(BANGLA_0_TO_99[0]).toBe(nfc('শূন্য'));
    expect(BANGLA_0_TO_99[25]).toBe(nfc('পঁচিশ'));
    expect(BANGLA_0_TO_99[52]).toBe(nfc('বাহান্ন'));
    expect(BANGLA_0_TO_99[71]).toBe(nfc('একাত্তর'));
    expect(BANGLA_0_TO_99[99]).toBe(nfc('নিরানব্বই'));
  });
});

describe('integerToWords — English', () => {
  it('handles small numbers and hyphenation', () => {
    expect(integerToWords(0, 'en')).toBe('Zero');
    expect(integerToWords(7, 'en')).toBe('Seven');
    expect(integerToWords(19, 'en')).toBe('Nineteen');
    expect(integerToWords(21, 'en')).toBe('Twenty-One');
    expect(integerToWords(100, 'en')).toBe('One Hundred');
    expect(integerToWords(905, 'en')).toBe('Nine Hundred Five');
  });

  it('uses lakh and crore by default', () => {
    expect(integerToWords(100000, 'en')).toBe('One Lakh');
    expect(integerToWords(123456, 'en')).toBe(
      'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six',
    );
    expect(integerToWords(10000000, 'en')).toBe('One Crore');
    expect(integerToWords(1000000000000n, 'en')).toBe('One Lakh Crore');
    expect(integerToWords(999999999999999n, 'en')).toBe(
      'Nine Crore Ninety-Nine Lakh Ninety-Nine Thousand Nine Hundred Ninety-Nine Crore Ninety-Nine Lakh Ninety-Nine Thousand Nine Hundred Ninety-Nine',
    );
  });

  it('supports the international scale', () => {
    expect(integerToWords(1000000, 'en', 'international')).toBe('One Million');
    expect(integerToWords(1234567, 'en', 'international')).toBe(
      'One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven',
    );
    expect(integerToWords(2000000000005n, 'en', 'international')).toBe('Two Trillion Five');
  });
});

describe('integerToWords — Bangla', () => {
  it('uses শত, হাজার, লক্ষ and কোটি', () => {
    expect(integerToWords(0, 'bn')).toBe(nfc('শূন্য'));
    expect(integerToWords(100, 'bn')).toBe(nfc('এক শত'));
    expect(integerToWords(1971, 'bn')).toBe(nfc('এক হাজার নয় শত একাত্তর'));
    expect(integerToWords(2026, 'bn')).toBe(nfc('দুই হাজার ছাব্বিশ'));
    expect(integerToWords(125000, 'bn')).toBe(nfc('এক লক্ষ পঁচিশ হাজার'));
    expect(integerToWords(10000000, 'bn')).toBe(nfc('এক কোটি'));
    expect(integerToWords(1000000000000n, 'bn')).toBe(nfc('এক লক্ষ কোটি'));
  });
});

describe('numberToWords', () => {
  it('reads decimals digit by digit and handles negatives', () => {
    expect(words('12.34', 'en')).toBe('Twelve Point Three Four');
    expect(words('0.05', 'en')).toBe('Zero Point Zero Five');
    expect(words('-45', 'en')).toBe('Minus Forty-Five');
    expect(words('১২.৫', 'bn')).toBe(nfc('বারো দশমিক পাঁচ'));
    expect(words('-৭', 'bn')).toBe(nfc('ঋণাত্মক সাত'));
    expect(words('-0', 'en')).toBe('Zero');
  });

  it('reports errors instead of guessing', () => {
    expect(words('', 'en')).toBe('ERR:empty');
    expect(words('1,2a', 'en')).toBe('ERR:invalid');
    expect(words('1.12345678901', 'en')).toBe('ERR:too-many-decimals');
    expect(words('1234567890123456', 'en')).toBe('ERR:too-large');
  });
});

describe('takaToWords', () => {
  it('writes cheque-style English', () => {
    expect(taka('1250', 'en')).toBe('One Thousand Two Hundred Fifty Taka Only');
    expect(taka('1250.5', 'en')).toBe('One Thousand Two Hundred Fifty Taka and Fifty Poisha Only');
    expect(taka('1250.05', 'en')).toBe('One Thousand Two Hundred Fifty Taka and Five Poisha Only');
    expect(taka('0.75', 'en')).toBe('Seventy-Five Poisha Only');
    expect(taka('0', 'en')).toBe('Zero Taka Only');
    expect(taka('1,00,00,000', 'en')).toBe('One Crore Taka Only');
  });

  it('writes Bangla', () => {
    expect(taka('১২৫০.৫০', 'bn')).toBe(nfc('এক হাজার দুই শত পঞ্চাশ টাকা পঞ্চাশ পয়সা মাত্র'));
    expect(taka('0.10', 'bn')).toBe(nfc('দশ পয়সা মাত্র'));
    expect(taka('500', 'bn')).toBe(nfc('পাঁচ শত টাকা মাত্র'));
  });

  it('never rounds or accepts negative amounts', () => {
    expect(taka('10.555', 'en')).toBe('ERR:too-many-decimals');
    expect(taka('-5', 'en')).toBe('ERR:negative-amount');
    expect(taka('abc', 'en')).toBe('ERR:invalid');
  });

  it('returns the parsed parts', () => {
    expect(takaToWords('42.3', 'en')).toMatchObject({
      ok: true,
      value: { taka: '42', poisha: 30 },
    });
  });
});
