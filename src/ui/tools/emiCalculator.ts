import { calculateEmi, EMI_LIMITS, type EmiError, type Frequency } from '../../calc/emi';
import { formatAmount, formatInteger, roundMoney } from '../../calc/format';
import { parseNumberInput } from '../../calc/numberWords';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  wireForm,
  type Field,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    principal: 'Loan amount (principal)',
    rate: 'Interest rate (per year)',
    rateHint: 'Nominal annual rate, e.g. 9.5. Use 0 for an interest-free loan.',
    term: 'Loan term',
    termUnit: 'Term unit',
    months: 'Months',
    years: 'Years',
    frequency: 'Payment frequency',
    monthly: 'Monthly',
    quarterly: 'Quarterly (every 3 months)',
    'half-yearly': 'Half-yearly (every 6 months)',
    yearly: 'Yearly',
    method: 'Repayment method',
    methodValue: 'Equal installments on a reducing balance (standard EMI)',
    numberHint: 'Bangla or English digits; commas are ignored.',
    required: 'Enter a value.',
    notNumber: 'Enter a number, for example 250000.',
    'principal-invalid': 'The loan amount must be more than 0.',
    'principal-too-large': 'The loan amount is too large (maximum ৳{max}).',
    'rate-invalid': 'The interest rate can’t be negative.',
    'rate-too-high': 'The interest rate looks too high (maximum {max}% per year).',
    'term-invalid': 'The term must be a whole number of at least 1.',
    'term-too-long': 'The term can be at most 50 years (600 months).',
    'term-not-multiple': 'The term must divide evenly into {freq} payments.',
    paymentLabel_monthly: 'Monthly installment (EMI)',
    paymentLabel_quarterly: 'Quarterly installment',
    'paymentLabel_half-yearly': 'Half-yearly installment',
    paymentLabel_yearly: 'Yearly installment',
    count: 'Number of installments',
    totalRepayment: 'Total repayment',
    totalInterest: 'Total interest',
    principalOut: 'Principal',
    estimate:
      'Estimate only — not a quotation from any bank or lender. Actual installments depend on the lender’s terms, fees and rounding.',
    n1: 'Formula: installment = P × i ÷ (1 − (1 + i)^−n), where P is the loan amount, i is the yearly rate ÷ number of payments per year, and n is the number of payments. At 0 % interest the installment is P ÷ n.',
    n2: 'Interest is assumed to compound once per payment period on the remaining balance. Flat-rate loans, fees, insurance, VAT and grace periods are not included.',
    n3: 'Rounding: all values are calculated without rounding and each displayed figure is rounded to the nearest poisha (0.01). Lenders usually adjust the final installment, so real totals can differ by a few poisha.',
    n4: 'Limits: loan amount up to ৳1,00,00,00,00,000; rate 0–100 % per year; term up to 50 years.',
  },
  bn: {
    principal: 'ঋণের পরিমাণ (আসল)',
    rate: 'সুদের হার (বার্ষিক)',
    rateHint: 'বার্ষিক নামিক হার, যেমন ৯.৫। সুদমুক্ত ঋণের জন্য ০ লিখুন।',
    term: 'ঋণের মেয়াদ',
    termUnit: 'মেয়াদের একক',
    months: 'মাস',
    years: 'বছর',
    frequency: 'কিস্তির ধরন',
    monthly: 'মাসিক',
    quarterly: 'ত্রৈমাসিক (প্রতি ৩ মাসে)',
    'half-yearly': 'ষাণ্মাসিক (প্রতি ৬ মাসে)',
    yearly: 'বার্ষিক',
    method: 'পরিশোধ পদ্ধতি',
    methodValue: 'ক্রমহ্রাসমান স্থিতির উপর সমান কিস্তি (প্রচলিত ইএমআই)',
    numberHint: 'বাংলা বা ইংরেজি অঙ্ক; কমা উপেক্ষা করা হয়।',
    required: 'একটি মান দিন।',
    notNumber: 'একটি সংখ্যা দিন, যেমন ২৫০০০০।',
    'principal-invalid': 'ঋণের পরিমাণ ০-এর বেশি হতে হবে।',
    'principal-too-large': 'ঋণের পরিমাণ খুব বেশি (সর্বোচ্চ ৳{max})।',
    'rate-invalid': 'সুদের হার ঋণাত্মক হতে পারে না।',
    'rate-too-high': 'সুদের হার অস্বাভাবিক বেশি (সর্বোচ্চ বার্ষিক {max}%)।',
    'term-invalid': 'মেয়াদ কমপক্ষে ১ এবং পূর্ণসংখ্যা হতে হবে।',
    'term-too-long': 'মেয়াদ সর্বোচ্চ ৫০ বছর (৬০০ মাস)।',
    'term-not-multiple': 'মেয়াদটি {freq} কিস্তিতে সমানভাবে ভাগ হতে হবে।',
    paymentLabel_monthly: 'মাসিক কিস্তি (ইএমআই)',
    paymentLabel_quarterly: 'ত্রৈমাসিক কিস্তি',
    'paymentLabel_half-yearly': 'ষাণ্মাসিক কিস্তি',
    paymentLabel_yearly: 'বার্ষিক কিস্তি',
    count: 'কিস্তির সংখ্যা',
    totalRepayment: 'মোট পরিশোধ',
    totalInterest: 'মোট সুদ',
    principalOut: 'আসল',
    estimate:
      'এটি শুধু আনুমানিক হিসাব — কোনো ব্যাংক বা ঋণদাতার অফিসিয়াল কোটেশন নয়। প্রকৃত কিস্তি ঋণদাতার শর্ত, ফি ও রাউন্ডিংয়ের উপর নির্ভর করে।',
    n1: 'সূত্র: কিস্তি = P × i ÷ (1 − (1 + i)^−n); P = ঋণের পরিমাণ, i = বার্ষিক হার ÷ বছরে কিস্তির সংখ্যা, n = মোট কিস্তি। ০% সুদে কিস্তি = P ÷ n।',
    n2: 'ধরা হয়েছে প্রতি কিস্তির মেয়াদে বাকি স্থিতির উপর একবার সুদ চক্রবৃদ্ধি হয়। ফ্ল্যাট রেট ঋণ, ফি, বিমা, ভ্যাট ও গ্রেস পিরিয়ড এতে নেই।',
    n3: 'রাউন্ডিং: সব মান রাউন্ড না করে হিসাব করা হয় এবং প্রদর্শিত প্রতিটি অঙ্ক নিকটতম পয়সায় (০.০১) রাউন্ড করা হয়। ঋণদাতারা সাধারণত শেষ কিস্তি সমন্বয় করে, তাই প্রকৃত মোট কয়েক পয়সা ভিন্ন হতে পারে।',
    n4: 'সীমা: ঋণ সর্বোচ্চ ৳১,০০,০০,০০,০০,০০০; সুদ বার্ষিক ০–১০০%; মেয়াদ সর্বোচ্চ ৫০ বছর।',
  },
});

/** Parse a non-negative-looking decimal typed with Bangla/English digits and commas. */
export function readNumber(value: string): { value: number } | { error: 'required' | 'notNumber' } {
  const p = parseNumberInput(value);
  if (!p.ok) return { error: p.error === 'empty' ? 'required' : 'notNumber' };
  const n = Number(`${p.value.negative ? '-' : ''}${p.value.integer}.${p.value.fraction || '0'}`);
  return Number.isFinite(n) ? { value: n } : { error: 'notNumber' };
}

const FREQS: Frequency[] = ['monthly', 'quarterly', 'half-yearly', 'yearly'];

export const emiCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const money = (x: number): string => `৳ ${formatAmount(roundMoney(x), ctx.lang)}`;

  const principal = field(
    L('principal'),
    textInput({ id: 'emi-principal', inputmode: 'decimal', required: '' }),
    {
      hint: L('numberHint'),
      suffix: '৳',
    },
  );
  const rate = field(L('rate'), textInput({ id: 'emi-rate', inputmode: 'decimal', required: '' }), {
    hint: L('rateHint'),
    suffix: '%',
  });
  const term = field(L('term'), textInput({ id: 'emi-term', inputmode: 'numeric', required: '' }));
  const unit = field(
    L('termUnit'),
    select(
      [
        ['years', L('years')],
        ['months', L('months')],
      ],
      { id: 'emi-unit' },
    ),
  );
  const freq = field(
    L('frequency'),
    select(
      FREQS.map((f) => [f, L(f)]),
      { id: 'emi-frequency' },
    ),
  );
  bindMemo(principal.control, ctx.memo, 'principal');
  bindMemo(rate.control, ctx.memo, 'rate');
  bindMemo(term.control, ctx.memo, 'term');
  bindMemo(unit.control, ctx.memo, 'unit', 'years');
  bindMemo(freq.control, ctx.memo, 'freq', 'monthly');

  const method = h(
    'div',
    { class: 'field field-static' },
    h('p', { class: 'field-label', id: 'emi-method-label' }, L('method')),
    h('p', { class: 'static-value', 'aria-labelledby': 'emi-method-label' }, L('methodValue')),
  );

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const all = [principal, rate, term, unit, freq];
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, principal.el, rate.el, term.el, unit.el, freq.el, method),
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        principal.control.value = rate.control.value = term.control.value = '';
        unit.control.value = 'years';
        freq.control.value = 'monthly';
        Object.assign(ctx.memo, {
          principal: '',
          rate: '',
          term: '',
          unit: 'years',
          freq: 'monthly',
          __done: '',
        });
        all.forEach((f) => f.setError(null));
        panel.clear();
        principal.control.focus();
      },
    }),
  );

  const fieldFor: Record<EmiError, Field> = {
    'principal-invalid': principal,
    'principal-too-large': principal,
    'rate-invalid': rate,
    'rate-too-high': rate,
    'term-invalid': term,
    'term-too-long': term,
    'term-not-multiple': term,
  };

  wireForm(
    form,
    ctx.memo,
    () => {
      const errors: Array<[Field, string]> = [];
      const p = readNumber(principal.control.value);
      const r = readNumber(rate.control.value);
      const n = readNumber(term.control.value);
      // Check every field in one pass so the user sees all problems at once.
      if ('error' in p) errors.push([principal, L(p.error)]);
      else if (p.value <= 0) errors.push([principal, L('principal-invalid')]);
      if ('error' in r) errors.push([rate, L(r.error)]);
      else if (r.value < 0) errors.push([rate, L('rate-invalid')]);
      if ('error' in n) errors.push([term, L(n.error)]);
      else if (!Number.isInteger(n.value) || n.value < 1) errors.push([term, L('term-invalid')]);
      if (!('value' in p) || !('value' in r) || !('value' in n)) return errors;

      const frequency = freq.control.value as Frequency;
      const termMonths = unit.control.value === 'years' ? n.value * 12 : n.value;
      const res = calculateEmi({
        principal: p.value,
        annualRatePercent: r.value,
        termMonths,
        frequency,
      });
      if (!res.ok) {
        const msg = L(res.error, {
          max:
            res.error === 'principal-too-large'
              ? formatAmount(EMI_LIMITS.maxPrincipal, ctx.lang, 0)
              : EMI_LIMITS.maxAnnualRatePercent,
          freq: L(frequency).toLowerCase(),
        });
        return [[fieldFor[res.error], msg]];
      }
      const v = res.value;
      panel.show(
        [
          { label: L(`paymentLabel_${frequency}`), value: money(v.payment), primary: true },
          { label: L('count'), value: formatInteger(v.numberOfPayments, ctx.lang) },
          { label: L('principalOut'), value: money(p.value) },
          { label: L('totalInterest'), value: money(v.totalInterest) },
          { label: L('totalRepayment'), value: money(v.totalRepayment) },
        ],
        [L('estimate')],
      );
      return null;
    },
    all,
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')]),
  );
};
