import { describe, expect, it } from 'vitest';
import { countDigits, toBanglaDigits, toEnglishDigits } from '../../src/calc/digits';
import { formatAmount, groupDigits } from '../../src/calc/format';

describe('digit conversion', () => {
  it('converts every digit both ways', () => {
    expect(toEnglishDigits('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
    expect(toBanglaDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
  });

  it('preserves punctuation, whitespace, letters and other scripts', () => {
    const mixed = 'মোবাইল: ০১৭১২-৩৪৫৬৭৮, Room 12B\n\t৳ ১,২৫০.৫০ (approx.) — ✓';
    expect(toEnglishDigits(mixed)).toBe(
      'মোবাইল: 01712-345678, Room 12B\n\t৳ 1,250.50 (approx.) — ✓',
    );
    expect(toBanglaDigits(toEnglishDigits(mixed))).toBe(toBanglaDigits(mixed));
    expect(toBanglaDigits('Bangla ১ and English 1')).toBe('Bangla ১ and English ১');
  });

  it('leaves text without digits unchanged', () => {
    expect(toEnglishDigits('আমার সোনার বাংলা')).toBe('আমার সোনার বাংলা');
    expect(toBanglaDigits('')).toBe('');
  });

  it('counts digits', () => {
    expect(countDigits('১২ and 345')).toEqual({ bangla: 2, english: 3 });
  });
});

describe('number formatting', () => {
  it('groups digits', () => {
    expect(groupDigits('123')).toBe('123');
    expect(groupDigits('1234')).toBe('1,234');
    expect(groupDigits('12345678')).toBe('1,23,45,678');
    expect(groupDigits('12345678', 'international')).toBe('12,345,678');
  });

  it('formats amounts in both languages', () => {
    expect(formatAmount(1234567.891, 'en')).toBe('12,34,567.89');
    expect(formatAmount(1234567.891, 'bn')).toBe('১২,৩৪,৫৬৭.৮৯');
    expect(formatAmount(-50, 'en')).toBe('-50.00');
  });
});
