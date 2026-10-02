import { calculateAge } from '../../calc/dates';
import { formatInteger } from '../../calc/format';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { countLabel, dateStrings, formatSpan, longDate, readDate, todayISO } from './dateShared';
import {
  bindMemo,
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
    dob: 'Date of birth',
    reference: 'Age on this date',
    referenceHint: 'Defaults to today. Change it to find the age on any other date.',
    future: 'The date of birth can’t be after the “age on” date.',
    age: 'Age',
    totals: 'In total',
    totalsValue: '{months} · {days}',
    nextBirthday: 'Next birthday',
    nextValue: '{date} — in {days} (turns {age})',
    birthdayToday: 'Today is the birthday: {age} years old. 🎉',
    bornToday: 'Born on this date.',
    leapNote: 'Born on 29 February: in non-leap years the birthday is counted on 28 February.',
    n1: 'Age is counted in completed years, months and days. Whole months are counted from the date of birth; if that day does not exist in a month (for example the 31st), the last day of that month is used.',
    n2: 'Birthdays on 29 February are counted on 28 February in non-leap years.',
    n3: 'Dates use the Gregorian calendar and your device’s date for “today”. No time of day or time zone is involved.',
  },
  bn: {
    dob: 'জন্ম তারিখ',
    reference: 'যে তারিখে বয়স জানতে চান',
    referenceHint: 'স্বাভাবিকভাবে আজকের তারিখ। অন্য কোনো তারিখে বয়স জানতে পরিবর্তন করুন।',
    future: 'জন্ম তারিখ বয়স হিসাবের তারিখের পরে হতে পারে না।',
    age: 'বয়স',
    totals: 'মোট',
    totalsValue: '{months} · {days}',
    nextBirthday: 'পরের জন্মদিন',
    nextValue: '{date} — আর {days} বাকি (বয়স হবে {age})',
    birthdayToday: 'আজ জন্মদিন: বয়স {age} বছর। 🎉',
    bornToday: 'এই তারিখেই জন্ম।',
    leapNote: '২৯ ফেব্রুয়ারি জন্ম: অধিবর্ষ ছাড়া অন্য বছরে জন্মদিন ২৮ ফেব্রুয়ারি ধরা হয়।',
    n1: 'বয়স পূর্ণ বছর, মাস ও দিনে গণনা করা হয়। জন্ম তারিখ থেকে পূর্ণ মাস গোনা হয়; কোনো মাসে সেই দিন না থাকলে (যেমন ৩১ তারিখ) সেই মাসের শেষ দিন ধরা হয়।',
    n2: '২৯ ফেব্রুয়ারির জন্মদিন অধিবর্ষ ছাড়া অন্য বছরে ২৮ ফেব্রুয়ারি ধরা হয়।',
    n3: 'গ্রেগরিয়ান ক্যালেন্ডার ব্যবহার করা হয় এবং “আজ” বলতে আপনার ডিভাইসের তারিখ। সময় বা টাইম জোন বিবেচনা করা হয় না।',
  },
});

export const ageCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const D = dateStrings(ctx.lang);
  const dob = field(L('dob'), dateInput({ id: 'age-dob', name: 'dob', required: '' }));
  const ref = field(L('reference'), dateInput({ id: 'age-ref', name: 'reference', required: '' }), {
    hint: L('referenceHint'),
  });
  bindMemo(dob.control, ctx.memo, 'dob');
  bindMemo(ref.control, ctx.memo, 'ref', todayISO());

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, dob.el, ref.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        dob.control.value = '';
        ref.control.value = todayISO();
        ctx.memo.dob = '';
        ctx.memo.ref = ref.control.value;
        ctx.memo.__done = '';
        [dob, ref].forEach((f) => f.setError(null));
        panel.clear();
        dob.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const errors: Array<[Field, string]> = [];
      const a = readDate(dob.control.value);
      const b = readDate(ref.control.value);
      if ('error' in a) errors.push([dob, D(a.error)]);
      if ('error' in b) errors.push([ref, D(b.error)]);
      if (!('date' in a) || !('date' in b)) return errors;
      const r = calculateAge(a.date, b.date);
      if (!r.ok) return [[dob, L('future')]];
      const v = r.value;
      const rows = [
        { label: L('age'), value: formatSpan(ctx.lang, v.age), primary: true },
        {
          label: L('totals'),
          value: L('totalsValue', {
            months: countLabel(ctx.lang, v.age.totalMonths, 'month'),
            days: countLabel(ctx.lang, v.age.totalDays, 'day'),
          }),
        },
        {
          label: L('nextBirthday'),
          value: L('nextValue', {
            date: longDate(ctx.lang, v.nextBirthday),
            days: countLabel(ctx.lang, v.daysUntilNextBirthday, 'day'),
            age: formatInteger(v.ageAtNextBirthday, ctx.lang),
          }),
        },
      ];
      const extra: string[] = [];
      if (v.isBirthday) extra.push(L('birthdayToday', { age: v.age.years }));
      if (v.bornOnReference) extra.push(L('bornToday'));
      if (a.date.month === 2 && a.date.day === 29) extra.push(L('leapNote'));
      panel.show(rows, extra);
      return null;
    },
    [dob, ref],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3')]),
  );
};
