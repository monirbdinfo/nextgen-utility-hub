import { fail, ok, type Result } from './result';

export type Frequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export const PAYMENTS_PER_YEAR: Record<Frequency, number> = {
  monthly: 12,
  quarterly: 4,
  'half-yearly': 2,
  yearly: 1,
};

/** Upper bounds that reject obviously mistaken input. */
export const EMI_LIMITS = {
  maxPrincipal: 1_000_000_000_000, // ৳1 lakh crore
  maxAnnualRatePercent: 100,
  maxTermMonths: 600, // 50 years
} as const;

export interface EmiInput {
  principal: number;
  /** Nominal annual interest rate, e.g. 9.5 for 9.5 % per year. */
  annualRatePercent: number;
  termMonths: number;
  frequency: Frequency;
}

export interface EmiResult {
  numberOfPayments: number;
  /** Interest rate applied per payment period, as a fraction. */
  periodicRate: number;
  /** Unrounded payment per period. Round only for display. */
  payment: number;
  totalRepayment: number;
  totalInterest: number;
}

export type EmiError =
  | 'principal-invalid'
  | 'principal-too-large'
  | 'rate-invalid'
  | 'rate-too-high'
  | 'term-invalid'
  | 'term-too-long'
  | 'term-not-multiple';

/**
 * Fixed-payment loan on a reducing balance (standard EMI / annuity formula):
 *   payment = P · i / (1 − (1 + i)^−n),  i = annual rate ÷ payments per year,  n = number of payments.
 * With a 0 % rate the payment is P ÷ n. Interest is assumed to compound once per payment period.
 */
export function calculateEmi(input: EmiInput): Result<EmiResult, EmiError> {
  const { principal, annualRatePercent, termMonths, frequency } = input;
  if (!Number.isFinite(principal) || principal <= 0) return fail('principal-invalid');
  if (principal > EMI_LIMITS.maxPrincipal) return fail('principal-too-large');
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) return fail('rate-invalid');
  if (annualRatePercent > EMI_LIMITS.maxAnnualRatePercent) return fail('rate-too-high');
  if (!Number.isInteger(termMonths) || termMonths < 1) return fail('term-invalid');
  if (termMonths > EMI_LIMITS.maxTermMonths) return fail('term-too-long');

  const perYear = PAYMENTS_PER_YEAR[frequency];
  const monthsPerPayment = 12 / perYear;
  if (termMonths % monthsPerPayment !== 0) return fail('term-not-multiple');

  const n = termMonths / monthsPerPayment;
  const i = annualRatePercent / 100 / perYear;
  const payment = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
  const totalRepayment = payment * n;
  return ok({
    numberOfPayments: n,
    periodicRate: i,
    payment,
    totalRepayment,
    totalInterest: totalRepayment - principal,
  });
}
