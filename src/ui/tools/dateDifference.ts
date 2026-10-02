import { dateDifference } from '../../calc/dates';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { countLabel, dateStrings, formatSpan, longDate, readDate, todayISO } from './dateShared';
import {
  bindMemo,
  checkbox,
  dateInput,
  field,
  formActions,
  notes,
  resultPanel,
  wireForm,
  type Field,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    start: 'Start date',
    end: 'End date',
    inclusive: 'Include the end date (count both days)',
    difference: 'Difference',
    totalDays: 'Total days',
    weeks: 'In weeks',
    weeksValue: '{weeks} and {days}',
    totalMonths: 'Whole months',
    from: 'From',
    to: 'To',
    reversed: 'The end date was before the start date, so the dates were swapped.',
    exclusiveNote: 'End date not counted: 1 January → 2 January is 1 day.',
    inclusiveNote: 'Both dates counted: 1 January → 2 January is 2 days.',
    n1: 'By default the end date is excluded (1 Jan → 2 Jan = 1 day). Tick “Include the end date” to count both days, which adds one day.',
    n2: 'Years, months and days are counted from the start date. If a month does not have the start day (for example the 31st), its last day is used: 31 January → 28 February is 1 month.',
    n3: 'Total days are exact and account for leap years. Gregorian calendar; no time of day or time zone is involved.',
  },
  bn: {
    start: 'শুরুর তারিখ',
    end: 'শেষের তারিখ',
    inclusive: 'শেষের তারিখও গণনা করুন (দুই দিনই ধরা হবে)',
    difference: 'ব্যবধান',
    totalDays: 'মোট দিন',
    weeks: 'সপ্তাহে',
    weeksValue: '{weeks} ও {days}',
    totalMonths: 'পূর্ণ মাস',
    from: 'থেকে',
    to: 'পর্যন্ত',
    reversed: 'শেষের তারিখ শুরুর তারিখের আগে ছিল, তাই তারিখ দুটি অদলবদল করা হয়েছে।',
    exclusiveNote: 'শেষের তারিখ গণনা করা হয়নি: ১ জানুয়ারি → ২ জানুয়ারি = ১ দিন।',
    inclusiveNote: 'দুই তারিখই গণনা করা হয়েছে: ১ জানুয়ারি → ২ জানুয়ারি = ২ দিন।',
    n1: 'স্বাভাবিকভাবে শেষের তারিখ গণনা হয় না (১ জানু → ২ জানু = ১ দিন)। দুই দিনই গণনা করতে “শেষের তারিখও গণনা করুন” টিক দিন; এতে এক দিন যোগ হয়।',
    n2: 'শুরুর তারিখ থেকে বছর, মাস ও দিন গোনা হয়। কোনো মাসে শুরুর দিনটি না থাকলে (যেমন ৩১ তারিখ) সেই মাসের শেষ দিন ধরা হয়: ৩১ জানুয়ারি → ২৮ ফেব্রুয়ারি = ১ মাস।',
    n3: 'মোট দিন সঠিক এবং অধিবর্ষ বিবেচনা করে। গ্রেগরিয়ান ক্যালেন্ডার; সময় বা টাইম জোন বিবেচনা করা হয় না।',
  },
});

export const dateDifferenceTool: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const D = dateStrings(ctx.lang);
  const start = field(L('start'), dateInput({ id: 'diff-start', name: 'start', required: '' }));
  const end = field(L('end'), dateInput({ id: 'diff-end', name: 'end', required: '' }));
  const incl = checkbox(L('inclusive'), { id: 'diff-inclusive', name: 'inclusive' });
  bindMemo(start.control, ctx.memo, 'start');
  bindMemo(end.control, ctx.memo, 'end', todayISO());
  bindMemo(incl.input, ctx.memo, 'inclusive', '0');

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, start.el, end.el),
    incl.el,
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        start.control.value = '';
        end.control.value = todayISO();
        incl.input.checked = false;
        Object.assign(ctx.memo, { start: '', end: end.control.value, inclusive: '0', __done: '' });
        [start, end].forEach((f) => f.setError(null));
        panel.clear();
        start.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const errors: Array<[Field, string]> = [];
      const a = readDate(start.control.value);
      const b = readDate(end.control.value);
      if ('error' in a) errors.push([start, D(a.error)]);
      if ('error' in b) errors.push([end, D(b.error)]);
      if (!('date' in a) || !('date' in b)) return errors;
      const r = dateDifference(a.date, b.date, { inclusive: incl.input.checked });
      const [from, to] = r.reversed ? [b.date, a.date] : [a.date, b.date];
      panel.show(
        [
          { label: L('difference'), value: formatSpan(ctx.lang, r.span), primary: true },
          { label: L('totalDays'), value: countLabel(ctx.lang, r.span.totalDays, 'day') },
          {
            label: L('weeks'),
            value: L('weeksValue', {
              weeks: countLabel(ctx.lang, r.weeks, 'week'),
              days: countLabel(ctx.lang, r.remainingDays, 'day'),
            }),
          },
          { label: L('totalMonths'), value: countLabel(ctx.lang, r.span.totalMonths, 'month') },
          { label: L('from'), value: longDate(ctx.lang, from) },
          { label: L('to'), value: longDate(ctx.lang, to) },
        ],
        [
          ...(r.reversed ? [L('reversed')] : []),
          L(r.inclusive ? 'inclusiveNote' : 'exclusiveNote'),
        ],
      );
      return null;
    },
    [start, end],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3')]),
  );
};
