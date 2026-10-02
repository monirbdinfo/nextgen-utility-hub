import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped,
  calculateAge,
  calendarSpan,
  dateDifference,
  daysInMonth,
  fromDayNumber,
  isLeapYear,
  parseISODate,
  toDayNumber,
  toISODate,
  weekday,
  type CivilDate,
} from '../../src/calc/dates';

const d = (s: string): CivilDate => {
  const v = parseISODate(s);
  if (!v) throw new Error(`bad test date ${s}`);
  return v;
};

describe('calendar basics', () => {
  it('knows leap years', () => {
    expect([2000, 2024, 1600].map(isLeapYear)).toEqual([true, true, true]);
    expect([1900, 2023, 2100].map(isLeapYear)).toEqual([false, false, false]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2023, 4)).toBe(30);
  });

  it('parses only real YYYY-MM-DD dates', () => {
    expect(parseISODate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    for (const bad of [
      '2023-02-29',
      '2024-13-01',
      '2024-04-31',
      '2024-00-10',
      '2024-1-5',
      '24-01-05',
      '',
      'abc',
      '0000-01-01',
    ]) {
      expect(parseISODate(bad), bad).toBeNull();
    }
  });

  it('round-trips day numbers', () => {
    expect(toDayNumber(d('1970-01-01'))).toBe(0);
    expect(toDayNumber(d('2000-03-01'))).toBe(11017);
    for (const n of [-719162, -1, 0, 59, 60, 11016, 20000, 2932896]) {
      expect(toDayNumber(fromDayNumber(n))).toBe(n);
    }
    expect(toISODate(fromDayNumber(19782))).toBe('2024-02-29');
  });

  it('computes weekdays', () => {
    expect(weekday(d('1970-01-01'))).toBe(4); // Thursday
    expect(weekday(d('2026-10-02'))).toBe(5); // Friday
    expect(weekday(d('1971-12-16'))).toBe(4); // Thursday (Victory Day 1971)
  });

  it('clamps month addition at month end', () => {
    expect(toISODate(addMonthsClamped(d('2023-01-31'), 1))).toBe('2023-02-28');
    expect(toISODate(addMonthsClamped(d('2024-01-31'), 1))).toBe('2024-02-29');
    expect(toISODate(addMonthsClamped(d('2024-02-29'), 12))).toBe('2025-02-28');
    expect(toISODate(addMonthsClamped(d('2024-02-29'), 48))).toBe('2028-02-29');
    expect(toISODate(addMonthsClamped(d('2023-12-15'), 1))).toBe('2024-01-15');
  });
});

describe('calendarSpan', () => {
  const span = (a: string, b: string): [number, number, number, number] => {
    const s = calendarSpan(d(a), d(b));
    return [s.years, s.months, s.days, s.totalDays];
  };

  it('handles same day and simple spans', () => {
    expect(span('2024-05-10', '2024-05-10')).toEqual([0, 0, 0, 0]);
    expect(span('2024-01-01', '2025-01-01')).toEqual([1, 0, 0, 366]);
    expect(span('2023-03-15', '2024-05-20')).toEqual([1, 2, 5, 432]);
  });

  it('follows the month-end rule', () => {
    expect(span('2023-01-31', '2023-02-28')).toEqual([0, 1, 0, 28]);
    expect(span('2023-01-31', '2023-02-27')).toEqual([0, 0, 27, 27]);
    expect(span('2023-01-31', '2023-03-01')).toEqual([0, 1, 1, 29]);
    expect(span('2024-01-31', '2024-03-01')).toEqual([0, 1, 1, 30]);
    expect(span('2023-03-31', '2023-04-30')).toEqual([0, 1, 0, 30]);
  });

  it('crosses leap days', () => {
    expect(span('2024-02-28', '2024-03-01')).toEqual([0, 0, 2, 2]);
    expect(span('2023-02-28', '2023-03-01')).toEqual([0, 0, 1, 1]);
    expect(span('2020-02-29', '2024-02-29')).toEqual([4, 0, 0, 1461]);
  });

  it('rejects reversed input', () => {
    expect(() => calendarSpan(d('2024-01-02'), d('2024-01-01'))).toThrow(RangeError);
  });
});

describe('calculateAge', () => {
  const age = (dob: string, ref: string) => {
    const r = calculateAge(d(dob), d(ref));
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };

  it('computes completed years, months and days', () => {
    const a = age('1990-06-15', '2026-10-02');
    expect([a.age.years, a.age.months, a.age.days]).toEqual([36, 3, 17]);
    expect(toISODate(a.nextBirthday)).toBe('2027-06-15');
    expect(a.daysUntilNextBirthday).toBe(256);
    expect(a.ageAtNextBirthday).toBe(37);
    expect(a.isBirthday).toBe(false);
  });

  it('detects a birthday and points to the next one', () => {
    const a = age('2000-10-02', '2026-10-02');
    expect([a.age.years, a.age.months, a.age.days]).toEqual([26, 0, 0]);
    expect(a.isBirthday).toBe(true);
    expect(toISODate(a.nextBirthday)).toBe('2027-10-02');
    expect(a.daysUntilNextBirthday).toBe(365);
  });

  it('turns one day before the anniversary is not yet a year', () => {
    const a = age('2000-10-03', '2026-10-02');
    expect([a.age.years, a.age.months, a.age.days]).toEqual([25, 11, 29]);
    expect(a.daysUntilNextBirthday).toBe(1);
  });

  it('handles 29 February birthdays with the month-end rule', () => {
    const common = age('2000-02-29', '2025-02-28');
    expect([common.age.years, common.age.months, common.age.days]).toEqual([25, 0, 0]);
    expect(common.isBirthday).toBe(true);
    const before = age('2000-02-29', '2025-02-27');
    expect(before.age.years).toBe(24);
    expect(toISODate(before.nextBirthday)).toBe('2025-02-28');
    const leap = age('2000-02-29', '2024-02-29');
    expect(leap.isBirthday).toBe(true);
    expect(toISODate(leap.nextBirthday)).toBe('2025-02-28');
  });

  it('handles birth on the reference date', () => {
    const a = age('2026-10-02', '2026-10-02');
    expect(a.bornOnReference).toBe(true);
    expect(a.isBirthday).toBe(false);
    expect(a.age.totalDays).toBe(0);
  });

  it('rejects a date of birth after the reference date', () => {
    expect(calculateAge(d('2026-10-03'), d('2026-10-02'))).toEqual({
      ok: false,
      error: 'dob-after-reference',
    });
  });
});

describe('dateDifference', () => {
  it('excludes the end date by default', () => {
    const r = dateDifference(d('2026-01-01'), d('2026-01-02'));
    expect(r.span.totalDays).toBe(1);
    expect(r.inclusive).toBe(false);
  });

  it('includes both dates when asked', () => {
    const r = dateDifference(d('2026-01-01'), d('2026-01-31'), { inclusive: true });
    expect(r.span.totalDays).toBe(31);
    expect([r.span.years, r.span.months, r.span.days]).toEqual([0, 1, 0]);
  });

  it('handles same-day input', () => {
    expect(dateDifference(d('2026-05-05'), d('2026-05-05')).span.totalDays).toBe(0);
    expect(
      dateDifference(d('2026-05-05'), d('2026-05-05'), { inclusive: true }).span.totalDays,
    ).toBe(1);
  });

  it('swaps reversed dates and flags it', () => {
    const r = dateDifference(d('2026-03-10'), d('2025-01-01'));
    expect(r.reversed).toBe(true);
    expect([r.span.years, r.span.months, r.span.days]).toEqual([1, 2, 9]);
    expect(r.span.totalDays).toBe(433);
  });

  it('splits total days into weeks and days', () => {
    const r = dateDifference(d('2024-02-01'), d('2024-03-01'));
    expect(r.span.totalDays).toBe(29);
    expect([r.weeks, r.remainingDays]).toEqual([4, 1]);
  });

  it('spans leap years', () => {
    expect(dateDifference(d('2023-01-01'), d('2025-01-01')).span.totalDays).toBe(731);
    expect(dateDifference(d('1900-01-01'), d('2000-01-01')).span.totalDays).toBe(36524);
  });
});
