import { toBanglaDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import { takaToWords, type EnglishScale } from '../../calc/numberWords';
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
    amount: 'Amount in Taka',
    amountHint:
      'Up to 2 decimal places for poisha. Bangla or English digits; “৳”, “Tk” and commas are ignored. Example: 1,25,000.50',
    amountOut: 'Amount',
    n1: '1 Taka = 100 Poisha. “.5” means 50 poisha and “.05” means 5 poisha.',
    n2: 'Amounts with more than 2 decimal places are rejected rather than rounded, so the words always match the amount you entered.',
    n3: 'Negative amounts are rejected. Zero is written as “Zero Taka Only” / “শূন্য টাকা মাত্র”.',
    n4: 'Format: “… Taka and … Poisha Only” in English and “… টাকা … পয়সা মাত্র” in Bangla. Always check the words before writing a cheque.',
  },
  bn: {
    amount: 'টাকার অঙ্ক',
    amountHint:
      'পয়সার জন্য দশমিকের পরে সর্বোচ্চ ২ অঙ্ক। বাংলা বা ইংরেজি অঙ্ক; “৳”, “Tk” ও কমা উপেক্ষা করা হয়। উদাহরণ: ১,২৫,০০০.৫০',
    amountOut: 'অঙ্ক',
    n1: '১ টাকা = ১০০ পয়সা। “.৫” মানে ৫০ পয়সা এবং “.০৫” মানে ৫ পয়সা।',
    n2: 'দশমিকের পরে ২টির বেশি অঙ্ক থাকলে রাউন্ড না করে বাতিল করা হয়, যাতে কথায় লেখা অঙ্ক সবসময় আপনার দেওয়া অঙ্কের সঙ্গে মেলে।',
    n3: 'ঋণাত্মক অঙ্ক গ্রহণ করা হয় না। শূন্য লেখা হয় “শূন্য টাকা মাত্র” / “Zero Taka Only”।',
    n4: 'ফরম্যাট: বাংলায় “… টাকা … পয়সা মাত্র” এবং ইংরেজিতে “… Taka and … Poisha Only”। চেক লেখার আগে অবশ্যই কথাগুলো মিলিয়ে নিন।',
  },
});

export const takaInWords: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const W = wordsStrings(ctx.lang);
  const amount = field(
    L('amount'),
    textInput({ id: 'taka-amount', inputmode: 'decimal', required: '' }),
    {
      hint: L('amountHint'),
      suffix: '৳',
    },
  );
  const scale = field(
    W('englishScale'),
    select(
      [
        ['south-asian', W('southAsian')],
        ['international', W('international')],
      ],
      { id: 'taka-scale' },
    ),
  );
  bindMemo(amount.control, ctx.memo, 'amount');
  bindMemo(scale.control, ctx.memo, 'scale', 'south-asian');

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, amount.el, scale.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        amount.control.value = '';
        scale.control.value = 'south-asian';
        Object.assign(ctx.memo, { amount: '', scale: 'south-asian', __done: '' });
        amount.setError(null);
        panel.clear();
        amount.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const sc = scale.control.value as EnglishScale;
      const en = takaToWords(amount.control.value, 'en', sc);
      const bn = takaToWords(amount.control.value, 'bn');
      if (!en.ok)
        return [[amount, W(en.error === 'too-many-decimals' ? 'taka-decimals' : en.error)]];
      if (!bn.ok)
        return [[amount, W(bn.error === 'too-many-decimals' ? 'taka-decimals' : bn.error)]];
      const fixed = `${groupDigits(en.value.taka)}.${String(en.value.poisha).padStart(2, '0')}`;
      panel.show([
        { label: W('english'), value: en.value.words, primary: true, lang: 'en', copy: true },
        { label: W('bangla'), value: bn.value.words, primary: true, lang: 'bn', copy: true },
        {
          label: L('amountOut'),
          value: `৳ ${ctx.lang === 'bn' ? toBanglaDigits(fixed) : fixed}`,
          copy: true,
        },
      ]);
      return null;
    },
    [amount, scale],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')]),
  );
};
