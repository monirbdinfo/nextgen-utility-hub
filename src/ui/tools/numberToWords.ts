import { toBanglaDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import {
  MAX_FRACTION_DIGITS,
  numberToWords,
  parseNumberInput,
  type EnglishScale,
} from '../../calc/numberWords';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { wordsStrings } from './wordsShared';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  wireForm,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    number: 'Number',
    numberHint: 'Bangla or English digits. Commas and spaces are ignored. Example: 12,34,567.89',
    n1: 'Whole numbers up to 15 digits (999,999,999,999,999) are supported, with up to 10 decimal places.',
    n2: 'Digits after the decimal point are read one by one (12.05 → “Twelve Point Zero Five”), and trailing zeros you type are kept.',
    n3: 'Negative numbers start with “Minus” / “ঋণাত্মক”. Bangla always uses শত, হাজার, লক্ষ and কোটি; above 99 crore the crore count is itself written out (e.g. “এক লক্ষ কোটি”).',
    n4: 'Bangla number words follow common standard spellings; some words have accepted regional variants (for example ঊনত্রিশ / উনত্রিশ).',
  },
  bn: {
    number: 'সংখ্যা',
    numberHint: 'বাংলা বা ইংরেজি অঙ্ক। কমা ও ফাঁকা জায়গা উপেক্ষা করা হয়। উদাহরণ: ১২,৩৪,৫৬৭.৮৯',
    n1: '১৫ অঙ্ক পর্যন্ত (৯৯৯,৯৯৯,৯৯৯,৯৯৯,৯৯৯) পূর্ণসংখ্যা এবং দশমিকের পরে সর্বোচ্চ ১০টি অঙ্ক সমর্থিত।',
    n2: 'দশমিকের পরের অঙ্কগুলো একটি একটি করে পড়া হয় (১২.০৫ → “বারো দশমিক শূন্য পাঁচ”), এবং আপনার লেখা শেষের শূন্যও রাখা হয়।',
    n3: 'ঋণাত্মক সংখ্যার শুরুতে “ঋণাত্মক” / “Minus” লেখা হয়। বাংলায় সবসময় শত, হাজার, লক্ষ ও কোটি ব্যবহার হয়; ৯৯ কোটির বেশি হলে কোটির সংখ্যাটিও কথায় লেখা হয় (যেমন “এক লক্ষ কোটি”)।',
    n4: 'বাংলা সংখ্যাবাচক শব্দে প্রচলিত প্রমিত বানান ব্যবহার করা হয়েছে; কিছু শব্দের আঞ্চলিক রূপও প্রচলিত (যেমন ঊনত্রিশ / উনত্রিশ)।',
  },
});

export const numberToWordsTool: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const W = wordsStrings(ctx.lang);
  const num = field(
    L('number'),
    textInput({ id: 'words-number', inputmode: 'decimal', required: '' }),
    { hint: L('numberHint') },
  );
  const scale = field(
    W('englishScale'),
    select(
      [
        ['south-asian', W('southAsian')],
        ['international', W('international')],
      ],
      { id: 'words-scale' },
    ),
  );
  bindMemo(num.control, ctx.memo, 'number');
  bindMemo(scale.control, ctx.memo, 'scale', 'south-asian');

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, num.el, scale.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        num.control.value = '';
        scale.control.value = 'south-asian';
        Object.assign(ctx.memo, { number: '', scale: 'south-asian', __done: '' });
        num.setError(null);
        panel.clear();
        num.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const sc = scale.control.value as EnglishScale;
      const en = numberToWords(num.control.value, 'en', sc);
      const bn = numberToWords(num.control.value, 'bn');
      if (!en.ok) return [[num, W(en.error, { max: MAX_FRACTION_DIGITS })]];
      if (!bn.ok) return [[num, W(bn.error, { max: MAX_FRACTION_DIGITS })]];
      const p = parseNumberInput(num.control.value);
      const digits = p.ok
        ? `${p.value.negative ? '-' : ''}${groupDigits(p.value.integer, sc)}${p.value.fraction ? `.${p.value.fraction}` : ''}`
        : '';
      const bnDigits = p.ok
        ? toBanglaDigits(
            `${p.value.negative ? '-' : ''}${groupDigits(p.value.integer)}${p.value.fraction ? `.${p.value.fraction}` : ''}`,
          )
        : '';
      panel.show([
        { label: W('english'), value: en.value, primary: true, lang: 'en', copy: true },
        { label: W('bangla'), value: bn.value, primary: true, lang: 'bn', copy: true },
        { label: W('digitsEn'), value: digits, lang: 'en', copy: true },
        { label: W('digitsBn'), value: bnDigits, lang: 'bn', copy: true },
      ]);
      return null;
    },
    [num, scale],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')]),
  );
};
