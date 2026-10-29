import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

/**
 * Shift length from a 24-hour clock-in and clock-out time. A clock-out earlier than the clock-in
 * means the shift ended after midnight (next day). Equal times are refused: they could mean no
 * time at all or a full 24 hours, and guessing would silently be wrong either way.
 */

export type TimeCardError =
  | 'start-invalid'
  | 'end-invalid'
  | 'times-equal'
  | 'break-invalid'
  | 'break-too-long'
  | 'days-invalid'
  | 'rate-invalid';

export interface TimeCardInput {
  start: string;
  end: string;
  breakMinutes: string;
  days: string;
  /** Optional hourly rate; empty means no pay is calculated. */
  rate: string;
}

export interface TimeCardResult {
  /** Paid minutes for one shift (after the unpaid break). */
  shiftMinutes: number;
  /** Paid minutes across all days. */
  totalMinutes: number;
  days: number;
  overnight: boolean;
  /** Hours as a decimal, rounded to 2 places (for payroll sheets). */
  decimalHours: number;
  totalDecimalHours: number;
  /** Total pay rounded to 2 places, when a rate was given. */
  pay: number | null;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseClock = (text: string): number | null => {
  const m = HHMM.exec(toEnglishDigits(text).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

export function timeCard(input: TimeCardInput): Result<TimeCardResult, TimeCardError> {
  const start = parseClock(input.start);
  if (start === null) return fail('start-invalid');
  const end = parseClock(input.end);
  if (end === null) return fail('end-invalid');
  if (start === end) return fail('times-equal');

  const breakText = toEnglishDigits(input.breakMinutes).trim() || '0';
  if (!/^\d{1,4}$/.test(breakText)) return fail('break-invalid');
  const breakMinutes = Number(breakText);

  const daysText = toEnglishDigits(input.days).trim() || '1';
  if (!/^\d{1,3}$/.test(daysText) || Number(daysText) < 1 || Number(daysText) > 366)
    return fail('days-invalid');
  const days = Number(daysText);

  const overnight = end < start;
  const gross = overnight ? end + 1440 - start : end - start;
  if (breakMinutes >= gross) return fail('break-too-long');
  const shiftMinutes = gross - breakMinutes;

  let rate: number | null = null;
  const rateText = toEnglishDigits(input.rate).replace(/,/g, '').trim();
  if (rateText) {
    if (!/^\d+(\.\d{1,2})?$/.test(rateText) || Number(rateText) > 1e9) return fail('rate-invalid');
    rate = Number(rateText);
  }

  const totalMinutes = shiftMinutes * days;
  return ok({
    shiftMinutes,
    totalMinutes,
    days,
    overnight,
    decimalHours: round2(shiftMinutes / 60),
    totalDecimalHours: round2(totalMinutes / 60),
    pay: rate === null ? null : round2((totalMinutes / 60) * rate),
  });
}
