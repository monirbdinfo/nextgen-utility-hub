import { describe, expect, it } from 'vitest';
import { formatDateText } from '../../src/calc/dateText';

const nfc = (s: string): string => s.normalize('NFC');

describe('formatDateText', () => {
  it('formats every supported style', () => {
    const f = formatDateText({ year: 2026, month: 10, day: 2 });
    expect(f.iso).toBe('2026-10-02');
    expect(f.dmy).toBe('02/10/2026');
    expect(f['dmy-bn']).toBe('০২/১০/২০২৬');
    expect(f['long-en']).toBe('2 October 2026');
    expect(f['long-bn']).toBe(nfc('২ অক্টোবর ২০২৬'));
    expect(f['weekday-en']).toBe('Friday, 2 October 2026');
    expect(f['weekday-bn']).toBe(nfc('শুক্রবার, ২ অক্টোবর ২০২৬'));
    expect(f['words-en']).toBe('Two October Two Thousand Twenty-Six');
    expect(f['words-bn']).toBe(nfc('দুই অক্টোবর দুই হাজার ছাব্বিশ'));
  });

  it('handles leap day and early years', () => {
    const f = formatDateText({ year: 2024, month: 2, day: 29 });
    expect(f['weekday-en']).toBe('Thursday, 29 February 2024');
    expect(formatDateText({ year: 5, month: 1, day: 1 }).iso).toBe('0005-01-01');
  });
});
