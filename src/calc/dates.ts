import { fail, ok, type Result } from './result';

/**
 * Calendar dates without time or time zone (proleptic Gregorian calendar).
 * All arithmetic is done on whole days, so results never depend on the
 * user's time zone or daylight-saving changes.
 */
export interface CivilDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function isValidDate(d: CivilDate): boolean {
  return (
    Number.isInteger(d.year) &&
    Number.isInteger(d.month) &&
    Number.isInteger(d.day) &&
    d.year >= 1 &&
    d.year <= 9999 &&
    d.month >= 1 &&
    d.month <= 12 &&
    d.day >= 1 &&
    d.day <= daysInMonth(d.year, d.month)
  );
}

/** Parse a strict `YYYY-MM-DD` string. Returns null for malformed or impossible dates. */
export function parseISODate(text: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidDate(d) ? d : null;
}

export function toISODate(d: CivilDate): string {
  const p = (n: number, w: number): string => String(n).padStart(w, '0');
  return `${p(d.year, 4)}-${p(d.month, 2)}-${p(d.day, 2)}`;
}

/** The local calendar date of a JS Date (what the user's clock says "today" is). */
export function fromLocalDate(date: Date): CivilDate {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Days since 1970-01-01 (H. Hinnant's days_from_civil algorithm). */
export function toDayNumber({ year, month, day }: CivilDate): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(n: number): CivilDate {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

export function compareDates(a: CivilDate, b: CivilDate): number {
  return toDayNumber(a) - toDayNumber(b);
}

export function addDays(d: CivilDate, days: number): CivilDate {
  return fromDayNumber(toDayNumber(d) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(d: CivilDate): number {
  return (((toDayNumber(d) + 4) % 7) + 7) % 7;
}

/**
 * Add whole months. If the target month is shorter, the day is clamped to its
 * last day (31 Jan + 1 month = 28/29 Feb; 29 Feb 2024 + 12 months = 28 Feb 2025).
 */
export function addMonthsClamped(d: CivilDate, months: number): CivilDate {
  const index = d.year * 12 + (d.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

export interface CalendarSpan {
  years: number;
  months: number;
  days: number;
  /** Whole months between the dates (years × 12 + months). */
  totalMonths: number;
  totalDays: number;
}

/**
 * Calendar difference from `start` to `end` (start ≤ end, end exclusive).
 * Convention: whole months are counted from `start` using `addMonthsClamped`,
 * i.e. the largest k with start + k months ≤ end; the remaining days follow.
 */
export function calendarSpan(start: CivilDate, end: CivilDate): CalendarSpan {
  if (compareDates(start, end) > 0) throw new RangeError('start must not be after end');
  let k = (end.year - start.year) * 12 + (end.month - start.month);
  while (k > 0 && compareDates(addMonthsClamped(start, k), end) > 0) k--;
  const anchor = addMonthsClamped(start, k);
  return {
    years: Math.floor(k / 12),
    months: k % 12,
    days: toDayNumber(end) - toDayNumber(anchor),
    totalMonths: k,
    totalDays: toDayNumber(end) - toDayNumber(start),
  };
}

export type AgeError = 'dob-after-reference';

export interface AgeResult {
  age: CalendarSpan;
  /** True when the reference date is a birthday (age ≥ 1). */
  isBirthday: boolean;
  /** True when the date of birth equals the reference date. */
  bornOnReference: boolean;
  nextBirthday: CivilDate;
  daysUntilNextBirthday: number;
  ageAtNextBirthday: number;
}

/** Age on `reference`. Birthdays on 29 Feb fall on 28 Feb in common years (month-end rule). */
export function calculateAge(dob: CivilDate, reference: CivilDate): Result<AgeResult, AgeError> {
  if (compareDates(dob, reference) > 0) return fail('dob-after-reference');
  const age = calendarSpan(dob, reference);
  const lastBirthday = addMonthsClamped(dob, age.years * 12);
  const isBirthday = age.years > 0 && compareDates(lastBirthday, reference) === 0;
  const nextBirthday = addMonthsClamped(dob, (age.years + 1) * 12);
  return ok({
    age,
    isBirthday,
    bornOnReference: age.totalDays === 0,
    nextBirthday,
    daysUntilNextBirthday: toDayNumber(nextBirthday) - toDayNumber(reference),
    ageAtNextBirthday: age.years + 1,
  });
}

export interface DateDifference {
  span: CalendarSpan;
  weeks: number;
  remainingDays: number;
  /** The end date was before the start date; the dates were swapped. */
  reversed: boolean;
  inclusive: boolean;
}

/**
 * Difference between two dates. By default the end date is excluded (1 Jan → 2 Jan = 1 day).
 * With `inclusive`, both dates are counted, which is the same as moving the end one day later.
 */
export function dateDifference(
  a: CivilDate,
  b: CivilDate,
  { inclusive = false }: { inclusive?: boolean } = {},
): DateDifference {
  const reversed = compareDates(a, b) > 0;
  const [start, end] = reversed ? [b, a] : [a, b];
  const span = calendarSpan(start, inclusive ? addDays(end, 1) : end);
  return {
    span,
    weeks: Math.floor(span.totalDays / 7),
    remainingDays: span.totalDays % 7,
    reversed,
    inclusive,
  };
}
