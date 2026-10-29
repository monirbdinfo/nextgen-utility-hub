import { describe, expect, it } from 'vitest';
import { parseClock, timeCard, type TimeCardInput } from '../../src/calc/timeCard';

const base: TimeCardInput = {
  start: '09:00',
  end: '17:30',
  breakMinutes: '30',
  days: '1',
  rate: '',
};
const run = (over: Partial<TimeCardInput> = {}) => timeCard({ ...base, ...over });
const value = (over: Partial<TimeCardInput> = {}) => {
  const r = run(over);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('parseClock', () => {
  it('reads 24-hour times, with Bangla digits', () => {
    expect(parseClock('00:00')).toBe(0);
    expect(parseClock('23:59')).toBe(1439);
    expect(parseClock(' ০৯:৩০ ')).toBe(570);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('9:00')).toBeNull();
    expect(parseClock('12:60')).toBeNull();
    expect(parseClock('')).toBeNull();
  });
});

describe('timeCard', () => {
  it('subtracts the unpaid break', () => {
    expect(value()).toMatchObject({
      shiftMinutes: 480,
      decimalHours: 8,
      overnight: false,
      days: 1,
      pay: null,
    });
    expect(value({ breakMinutes: '' }).shiftMinutes).toBe(510);
  });

  it('treats an earlier clock-out as the next day', () => {
    expect(value({ start: '22:00', end: '06:00', breakMinutes: '0' })).toMatchObject({
      shiftMinutes: 480,
      overnight: true,
    });
    expect(value({ start: '23:30', end: '00:15', breakMinutes: '0' }).shiftMinutes).toBe(45);
  });

  it('multiplies by the number of days and rounds decimal hours to 2 places', () => {
    const r = value({ start: '09:00', end: '12:20', breakMinutes: '0', days: '3' });
    expect(r.shiftMinutes).toBe(200);
    expect(r.decimalHours).toBe(3.33);
    expect(r.totalMinutes).toBe(600);
    expect(r.totalDecimalHours).toBe(10);
  });

  it('calculates pay from the total time when a rate is given', () => {
    expect(value({ rate: '250' }).pay).toBe(2000);
    expect(value({ rate: '12.50', days: '5' }).pay).toBe(500);
    expect(value({ rate: '1,000.25', start: '09:00', end: '10:00', breakMinutes: '0' }).pay).toBe(
      1000.25,
    );
  });

  it('refuses equal times rather than guessing 0 or 24 hours', () => {
    expect(run({ start: '08:00', end: '08:00' })).toEqual({ ok: false, error: 'times-equal' });
  });

  it('validates every field', () => {
    expect(run({ start: '25:00' })).toEqual({ ok: false, error: 'start-invalid' });
    expect(run({ end: 'abc' })).toEqual({ ok: false, error: 'end-invalid' });
    expect(run({ breakMinutes: '-5' })).toEqual({ ok: false, error: 'break-invalid' });
    expect(run({ breakMinutes: '510' })).toEqual({ ok: false, error: 'break-too-long' });
    expect(run({ days: '0' })).toEqual({ ok: false, error: 'days-invalid' });
    expect(run({ days: '367' })).toEqual({ ok: false, error: 'days-invalid' });
    expect(run({ rate: '-1' })).toEqual({ ok: false, error: 'rate-invalid' });
    expect(run({ rate: '1.234' })).toEqual({ ok: false, error: 'rate-invalid' });
  });
});
