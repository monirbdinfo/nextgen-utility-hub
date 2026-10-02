import { describe, expect, it } from 'vitest';
import { calculateEmi, type EmiInput } from '../../src/calc/emi';
import { roundMoney } from '../../src/calc/format';

const base: EmiInput = {
  principal: 100000,
  annualRatePercent: 12,
  termMonths: 12,
  frequency: 'monthly',
};

function value(input: Partial<EmiInput>) {
  const r = calculateEmi({ ...base, ...input });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe('calculateEmi', () => {
  it('matches the standard EMI formula (1 lakh, 12 %, 12 months)', () => {
    const r = value({});
    expect(r.numberOfPayments).toBe(12);
    expect(r.periodicRate).toBeCloseTo(0.01, 12);
    expect(roundMoney(r.payment)).toBe(8884.88);
    expect(roundMoney(r.totalRepayment)).toBe(106618.55);
    expect(roundMoney(r.totalInterest)).toBe(6618.55);
  });

  it('matches a long home-loan style example (50 lakh, 9 %, 20 years)', () => {
    const r = value({ principal: 5_000_000, annualRatePercent: 9, termMonths: 240 });
    expect(roundMoney(r.payment)).toBe(44986.3);
  });

  it('divides evenly at 0 % interest', () => {
    const r = value({ annualRatePercent: 0, principal: 120000, termMonths: 24 });
    expect(r.payment).toBe(5000);
    expect(r.totalInterest).toBe(0);
  });

  it('supports quarterly payments', () => {
    const r = value({ frequency: 'quarterly', termMonths: 12 });
    expect(r.numberOfPayments).toBe(4);
    expect(r.periodicRate).toBeCloseTo(0.03, 12);
    expect(roundMoney(r.payment)).toBe(26902.7);
  });

  it('validates inputs', () => {
    const err = (i: Partial<EmiInput>) => {
      const r = calculateEmi({ ...base, ...i });
      return r.ok ? 'ok' : r.error;
    };
    expect(err({ principal: 0 })).toBe('principal-invalid');
    expect(err({ principal: -5 })).toBe('principal-invalid');
    expect(err({ principal: Number.NaN })).toBe('principal-invalid');
    expect(err({ principal: 2e12 })).toBe('principal-too-large');
    expect(err({ annualRatePercent: -1 })).toBe('rate-invalid');
    expect(err({ annualRatePercent: 150 })).toBe('rate-too-high');
    expect(err({ termMonths: 0 })).toBe('term-invalid');
    expect(err({ termMonths: 6.5 })).toBe('term-invalid');
    expect(err({ termMonths: 601 })).toBe('term-too-long');
    expect(err({ termMonths: 10, frequency: 'quarterly' })).toBe('term-not-multiple');
    expect(err({ termMonths: 18, frequency: 'yearly' })).toBe('term-not-multiple');
  });
});

describe('roundMoney', () => {
  it('rounds half away from zero to poisha', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(0.004)).toBe(0);
    expect(roundMoney(1234.5)).toBe(1234.5);
  });
});
