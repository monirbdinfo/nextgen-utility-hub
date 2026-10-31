import {
  calculateAge,
  fromLocalDate,
  toISODate,
  weekday,
  type AgeResult,
  type CivilDate,
} from '../../calc/dates';
import { BN_MONTHS, BN_WEEKDAYS, EN_MONTHS, EN_WEEKDAYS } from '../../calc/dateText';
import { toBanglaDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import { defineStrings } from '../../i18n';
import type { Lang } from '../../registry';
import { h } from '../../lib/dom';
import { toolsByCategory } from '../../registry';
import { toHash } from '../../router/router';
import { icon, type UiIcon } from '../icons';
import { TOOL_ICONS } from '../toolkits';
import { dateStrings, formatSpan, longDate, readDate, todayISO } from './dateShared';
import {
  bindMemo,
  dateInput,
  field,
  formActions,
  wireForm,
  type Field,
  type ResultPanel,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    formTitle: 'Enter your dates',
    formIntro: 'Choose a date of birth and the date to work out the age on (today by default).',
    dob: 'Date of birth',
    dobHint: 'Enter your date of birth.',
    reference: 'Age on this date',
    referenceHint: 'Defaults to today. Change it to find the age on any other date.',
    calculate: 'Calculate age',
    future: 'The date of birth can’t be after the “age on” date.',
    quick: 'Quick dates',
    quickHint: 'Sets “Age on this date”.',
    q_today: 'Today',
    q_yesterday: 'Yesterday',
    q_tomorrow: 'Tomorrow',
    q_lastYear: 'A year ago',
    q_nextYear: 'In a year',
    q_birthday: 'My next birthday',
    needDob: 'Enter a date of birth first.',
    resultTitle: 'Your age',
    asOf: 'As of {date}',
    empty: 'Enter a date of birth and press “Calculate age” to see the result here.',
    years: 'Years',
    months: 'Months',
    days: 'Days',
    totalMonths: 'Total months',
    weeks: 'Weeks',
    totalDays: 'Days',
    hours: 'Hours',
    totalsGroup: 'Age in total',
    totalsNote: 'Totals count whole days from midnight to midnight.',
    nextBirthday: 'Next birthday',
    inDays: '{days} from now',
    inOneDay: 'tomorrow',
    willBe: 'You will be',
    willBeValue: '{age} years old',
    onNext: 'on your next birthday',
    birthdayToday: 'Happy birthday! You are {age} years old today. 🎉',
    bornToday: 'Born on this date.',
    leapNote: 'Born on 29 February: in non-leap years the birthday is counted on 28 February.',
    copyAge: 'Age',
    copyTotals: 'In total',
    copyNext: 'Next birthday',
    copyNextValue: '{date} — in {days} (turns {age})',
    dayUnit: 'day',
    daysUnit: 'days',
    f1Title: 'Exact breakdown',
    f1: 'Your age in years, months and days, and in total weeks, days and hours.',
    f2Title: 'Next birthday',
    f2: 'See when your next birthday is, its weekday and how many days are left.',
    f3Title: 'Age on any date',
    f3: 'Check an age on a past or future date, for example for a school or job deadline.',
    f4Title: 'Accurate and instant',
    f4: 'Leap years and month lengths are handled exactly, right here in your browser.',
    howTitle: 'How is this calculated?',
    how1: 'Whole years and months are counted from the date of birth up to the chosen date, then the remaining days. If the birth day does not exist in a month (for example the 31st), the last day of that month is used.',
    how2: 'Birthdays on 29 February are counted on 28 February in non-leap years.',
    how3: 'Dates use the Gregorian calendar and your device’s date for “today”. No time of day or time zone is involved.',
    usesTitle: 'Common uses',
    use1: 'Exact age for application forms and documents',
    use2: 'Days left until your next birthday',
    use3: 'Age on a past or future date',
    use4: 'Age limits for school admission and job applications',
    examplesTitle: 'Try an example',
    examplesIntro: 'Each example fills in a date of birth and calculates straight away.',
    ex_child: 'Child',
    ex_student: 'Student',
    ex_adult: 'Adult',
    ex_senior: 'Senior',
    exampleLabel: '{who}: born {date}',
    relatedTitle: 'Related tools',
    relatedIntro: 'More tools in General Utilities.',
  },
  bn: {
    formTitle: 'তারিখ দিন',
    formIntro: 'জন্ম তারিখ এবং যে তারিখে বয়স জানতে চান তা বাছাই করুন (স্বাভাবিকভাবে আজ)।',
    dob: 'জন্ম তারিখ',
    dobHint: 'আপনার জন্ম তারিখ দিন।',
    reference: 'যে তারিখে বয়স জানতে চান',
    referenceHint: 'স্বাভাবিকভাবে আজকের তারিখ। অন্য কোনো তারিখে বয়স জানতে পরিবর্তন করুন।',
    calculate: 'বয়স হিসাব করুন',
    future: 'জন্ম তারিখ বয়স হিসাবের তারিখের পরে হতে পারে না।',
    quick: 'দ্রুত তারিখ',
    quickHint: '“যে তারিখে বয়স জানতে চান” ঘরটি পূরণ করে।',
    q_today: 'আজ',
    q_yesterday: 'গতকাল',
    q_tomorrow: 'আগামীকাল',
    q_lastYear: 'এক বছর আগে',
    q_nextYear: 'এক বছর পরে',
    q_birthday: 'আমার পরের জন্মদিন',
    needDob: 'আগে জন্ম তারিখ দিন।',
    resultTitle: 'আপনার বয়স',
    asOf: '{date} অনুযায়ী',
    empty: 'জন্ম তারিখ দিয়ে “বয়স হিসাব করুন” চাপুন, ফলাফল এখানে দেখা যাবে।',
    years: 'বছর',
    months: 'মাস',
    days: 'দিন',
    totalMonths: 'মোট মাস',
    weeks: 'সপ্তাহ',
    totalDays: 'দিন',
    hours: 'ঘণ্টা',
    totalsGroup: 'মোট বয়স',
    totalsNote: 'মোট হিসাবে মধ্যরাত থেকে মধ্যরাত পর্যন্ত পূর্ণ দিন গোনা হয়।',
    nextBirthday: 'পরের জন্মদিন',
    inDays: 'আর {days} বাকি',
    inOneDay: 'আগামীকাল',
    willBe: 'আপনার বয়স হবে',
    willBeValue: '{age} বছর',
    onNext: 'পরের জন্মদিনে',
    birthdayToday: 'শুভ জন্মদিন! আজ আপনার বয়স {age} বছর। 🎉',
    bornToday: 'এই তারিখেই জন্ম।',
    leapNote: '২৯ ফেব্রুয়ারি জন্ম: অধিবর্ষ ছাড়া অন্য বছরে জন্মদিন ২৮ ফেব্রুয়ারি ধরা হয়।',
    copyAge: 'বয়স',
    copyTotals: 'মোট',
    copyNext: 'পরের জন্মদিন',
    copyNextValue: '{date} — আর {days} বাকি (বয়স হবে {age})',
    dayUnit: 'দিন',
    daysUnit: 'দিন',
    f1Title: 'সঠিক বিভাজন',
    f1: 'বছর, মাস ও দিনে বয়স, সঙ্গে সপ্তাহ, দিন ও ঘণ্টায় মোট হিসাব।',
    f2Title: 'পরের জন্মদিন',
    f2: 'পরের জন্মদিন কবে, কোন বার এবং আর কত দিন বাকি দেখুন।',
    f3Title: 'যেকোনো তারিখে বয়স',
    f3: 'অতীত বা ভবিষ্যতের কোনো তারিখে বয়স দেখুন, যেমন ভর্তি বা চাকরির শেষ তারিখে।',
    f4Title: 'নির্ভুল ও তাৎক্ষণিক',
    f4: 'অধিবর্ষ ও মাসের দৈর্ঘ্য ঠিকভাবে ধরা হয়, আপনার ব্রাউজারেই।',
    howTitle: 'কীভাবে হিসাব করা হয়?',
    how1: 'জন্ম তারিখ থেকে বাছাই করা তারিখ পর্যন্ত পূর্ণ বছর ও মাস গোনা হয়, তারপর বাকি দিন। কোনো মাসে জন্মের দিনটি না থাকলে (যেমন ৩১ তারিখ) সেই মাসের শেষ দিন ধরা হয়।',
    how2: '২৯ ফেব্রুয়ারির জন্মদিন অধিবর্ষ ছাড়া অন্য বছরে ২৮ ফেব্রুয়ারি ধরা হয়।',
    how3: 'গ্রেগরিয়ান ক্যালেন্ডার ব্যবহার করা হয় এবং “আজ” বলতে আপনার ডিভাইসের তারিখ। সময় বা টাইম জোন বিবেচনা করা হয় না।',
    usesTitle: 'সাধারণ ব্যবহার',
    use1: 'আবেদন ফর্ম ও নথির জন্য সঠিক বয়স',
    use2: 'পরের জন্মদিন পর্যন্ত বাকি দিন',
    use3: 'অতীত বা ভবিষ্যতের তারিখে বয়স',
    use4: 'স্কুলে ভর্তি ও চাকরির আবেদনের বয়সসীমা',
    examplesTitle: 'উদাহরণ দেখুন',
    examplesIntro: 'প্রতিটি উদাহরণ একটি জন্ম তারিখ বসিয়ে সঙ্গে সঙ্গে হিসাব করে।',
    ex_child: 'শিশু',
    ex_student: 'শিক্ষার্থী',
    ex_adult: 'প্রাপ্তবয়স্ক',
    ex_senior: 'প্রবীণ',
    exampleLabel: '{who}: জন্ম {date}',
    relatedTitle: 'সম্পর্কিত টুল',
    relatedIntro: 'সাধারণ ইউটিলিটির আরও টুল।',
  },
});

type L = ReturnType<typeof S>;

const EXAMPLES: Array<
  [key: 'ex_child' | 'ex_student' | 'ex_adult' | 'ex_senior', emoji: string, iso: string]
> = [
  ['ex_child', '👶', '2015-01-01'],
  ['ex_student', '🧑‍🎓', '2000-06-15'],
  ['ex_adult', '🧑‍💼', '1990-10-17'],
  ['ex_senior', '👵', '1960-05-05'],
];

/** English uses international grouping (1,234,567); Bangla uses lakh/crore grouping and digits. */
function count(lang: Lang, n: number): string {
  const s = groupDigits(String(n), lang === 'bn' ? 'south-asian' : 'international');
  return lang === 'bn' ? toBanglaDigits(s) : s;
}

/** "17 Oct 1990" / "১৭ অক্টোবর ১৯৯০". */
function shortDate(lang: Lang, d: CivilDate): string {
  if (lang === 'bn') return toBanglaDigits(`${d.day} ${BN_MONTHS[d.month - 1]} ${d.year}`);
  return `${d.day} ${EN_MONTHS[d.month - 1]!.slice(0, 3)} ${d.year}`;
}

/** "16 September 2027" / "১৬ সেপ্টেম্বর ২০২৭": the weekday is shown on its own line. */
function mediumDate(lang: Lang, d: CivilDate): string {
  if (lang === 'bn') return toBanglaDigits(`${d.day} ${BN_MONTHS[d.month - 1]} ${d.year}`);
  return `${d.day} ${EN_MONTHS[d.month - 1]} ${d.year}`;
}

const weekdayName = (lang: Lang, d: CivilDate): string =>
  (lang === 'bn' ? BN_WEEKDAYS : EN_WEEKDAYS)[weekday(d)]!;

function shiftISO(iso: string, days: number, years = 0): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(y + years, m - 1, d + days);
  // 29 Feb + 1 year rolls over to 1 Mar in JavaScript; keep the month-end instead.
  if (years && date.getMonth() !== m - 1) date.setDate(0);
  return toISODate(fromLocalDate(date));
}

interface Tile {
  label: string;
  value: string;
  tone: string;
  icon?: UiIcon;
}

function tile({ label, value, tone, icon: name }: Tile): HTMLElement {
  // Label first in the markup (dt, dd); CSS shows the value above it.
  return h(
    'div',
    { class: `age-tile age-tone-${tone}` },
    h('dt', { class: 'age-tile-label' }, label),
    h(
      'dd',
      { class: 'age-tile-value' },
      name ? h('span', { class: 'age-tile-icon' }, icon(name, 22)) : null,
      h('span', {}, value),
    ),
  );
}

/** The result card. Implements ResultPanel so the shared Reset / Copy buttons work with it. */
function ageResult(
  lang: Lang,
  L: L,
  copyStatus: HTMLElement,
): ResultPanel & {
  render(r: AgeResult, dob: CivilDate, ref: CivilDate): void;
} {
  const asOf = h('p', { class: 'age-asof' });
  const body = h('div', { class: 'age-result-body', 'aria-live': 'polite' });
  let text = '';
  const el = h(
    'section',
    { class: 'result age-result', 'aria-labelledby': 'age-result-title' },
    h(
      'div',
      { class: 'age-result-head' },
      h('span', { class: 'age-head-icon' }, icon('users', 22)),
      h('h2', { id: 'age-result-title', class: 'age-card-title' }, L('resultTitle')),
      asOf,
    ),
    body,
    copyStatus,
  );

  const clear = (): void => {
    text = '';
    asOf.textContent = '';
    copyStatus.textContent = '';
    body.replaceChildren(h('p', { class: 'result-empty' }, L('empty')));
  };

  const render = (r: AgeResult, dob: CivilDate, ref: CivilDate): void => {
    const D = dateStrings(lang);
    const a = r.age;
    const total = a.totalDays;
    asOf.textContent = '';
    asOf.append(icon('calendar', 16), L('asOf', { date: shortDate(lang, ref) }));
    const daysLeft =
      r.daysUntilNextBirthday === 1
        ? L('inOneDay')
        : L('inDays', {
            days: `${count(lang, r.daysUntilNextBirthday)} ${L(r.daysUntilNextBirthday === 1 ? 'dayUnit' : 'daysUnit')}`,
          });
    const extra: string[] = [];
    if (r.isBirthday) extra.push(L('birthdayToday', { age: count(lang, a.years) }));
    if (r.bornOnReference) extra.push(L('bornToday'));
    if (dob.month === 2 && dob.day === 29) extra.push(L('leapNote'));

    body.replaceChildren(
      h('p', { class: 'sr-only' }, `${L('copyAge')}: ${formatSpan(lang, a)}`),
      h(
        'dl',
        { class: 'age-tiles age-tiles-main', 'aria-label': L('copyAge') },
        tile({ label: L('years'), value: count(lang, a.years), tone: 'blue', icon: 'calendar' }),
        tile({
          label: L('months'),
          value: count(lang, a.months),
          tone: 'green',
          icon: 'calendar-range',
        }),
        tile({ label: L('days'), value: count(lang, a.days), tone: 'amber', icon: 'calendar' }),
        tile({
          label: L('totalMonths'),
          value: count(lang, a.totalMonths),
          tone: 'violet',
          icon: 'clock',
        }),
      ),
      h(
        'dl',
        { class: 'age-tiles age-tiles-totals', 'aria-label': L('totalsGroup') },
        tile({ label: L('weeks'), value: count(lang, Math.floor(total / 7)), tone: 'green' }),
        tile({ label: L('totalDays'), value: count(lang, total), tone: 'rose' }),
        tile({ label: L('hours'), value: count(lang, total * 24), tone: 'blue' }),
      ),
      h('p', { class: 'age-note' }, L('totalsNote')),
      h(
        'div',
        { class: 'age-birthday' },
        h(
          'div',
          { class: 'age-bday age-bday-next' },
          h('span', { class: 'age-emoji', 'aria-hidden': 'true' }, '🎂'),
          h(
            'p',
            {},
            h('strong', {}, L('nextBirthday')),
            h('span', { class: 'age-bday-date' }, mediumDate(lang, r.nextBirthday)),
            h(
              'span',
              { class: 'age-bday-sub' },
              `${weekdayName(lang, r.nextBirthday)} · ${daysLeft}`,
            ),
          ),
        ),
        h(
          'div',
          { class: 'age-bday age-bday-will' },
          h('span', { class: 'age-emoji', 'aria-hidden': 'true' }, '🎁'),
          h(
            'p',
            {},
            h('strong', {}, L('willBe')),
            h(
              'span',
              { class: 'age-bday-date' },
              L('willBeValue', { age: count(lang, r.ageAtNextBirthday) }),
            ),
            h('span', { class: 'age-bday-sub' }, L('onNext')),
          ),
        ),
      ),
      ...(extra.length
        ? [h('ul', { class: 'result-notes', role: 'list' }, ...extra.map((n) => h('li', {}, n)))]
        : []),
    );

    const nextLine = L('copyNextValue', {
      date: longDate(lang, r.nextBirthday),
      days: `${count(lang, r.daysUntilNextBirthday)} ${L(r.daysUntilNextBirthday === 1 ? 'dayUnit' : 'daysUnit')}`,
      age: count(lang, r.ageAtNextBirthday),
    });
    text = [
      `${L('copyAge')}: ${formatSpan(lang, a)}`,
      `${L('copyTotals')}: ${[
        `${count(lang, a.totalMonths)} ${D('months')}`,
        `${count(lang, Math.floor(total / 7))} ${D('weeks')}`,
        `${count(lang, total)} ${D('days')}`,
      ].join(' · ')}`,
      `${L('copyNext')}: ${nextLine}`,
      ...extra,
    ].join('\n');
  };

  clear();
  return { el, show: () => undefined, clear, text: () => text, render };
}

export const ageCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const D = dateStrings(ctx.lang);
  const dob = field(L('dob'), dateInput({ id: 'age-dob', name: 'dob', required: '' }), {
    hint: L('dobHint'),
  });
  const ref = field(L('reference'), dateInput({ id: 'age-ref', name: 'reference', required: '' }), {
    hint: L('referenceHint'),
  });
  bindMemo(dob.control, ctx.memo, 'dob');
  bindMemo(ref.control, ctx.memo, 'ref', todayISO());

  const copyStatus = h('p', { class: 'copy-status', role: 'status' });
  const panel = ageResult(ctx.lang, L, copyStatus);
  const quickStatus = h('p', { class: 'age-quick-status', role: 'status' });

  const form = h(
    'form',
    { class: 'tool-form age-form', 'aria-labelledby': 'age-form-title' },
    h(
      'div',
      { class: 'age-card-head' },
      h('span', { class: 'age-head-icon age-head-icon-blue' }, icon('calendar', 22)),
      h(
        'div',
        {},
        h('h2', { id: 'age-form-title', class: 'age-card-title' }, L('formTitle')),
        h('p', { class: 'age-card-intro' }, L('formIntro')),
      ),
    ),
    h('div', { class: 'field-grid' }, dob.el, ref.el),
  );

  const setRef = (iso: string): void => {
    ref.control.value = iso;
    ctx.memo.ref = iso;
    ref.setError(null);
  };
  const recalc = (): void => {
    quickStatus.textContent = '';
    if (dob.control.value) form.requestSubmit();
  };

  const quick: Array<[label: string, run: () => void]> = [
    [L('q_today'), () => setRef(todayISO())],
    [L('q_yesterday'), () => setRef(shiftISO(todayISO(), -1))],
    [L('q_tomorrow'), () => setRef(shiftISO(todayISO(), 1))],
    [L('q_lastYear'), () => setRef(shiftISO(todayISO(), 0, -1))],
    [L('q_nextYear'), () => setRef(shiftISO(todayISO(), 0, 1))],
    [
      L('q_birthday'),
      () => {
        const a = readDate(dob.control.value);
        const r = 'date' in a ? calculateAge(a.date, fromLocalDate(new Date())) : null;
        if (!r?.ok) {
          quickStatus.textContent = L('needDob');
          dob.control.focus();
          throw new Error('no-dob');
        }
        setRef(toISODate(r.value.nextBirthday));
      },
    ],
  ];
  const quickRow = h(
    'div',
    { class: 'age-quick', role: 'group', 'aria-labelledby': 'age-quick-label' },
    h('span', { id: 'age-quick-label', class: 'age-quick-label' }, `${L('quick')}:`),
    ...quick.map(([label, run]) => {
      const b = h('button', { type: 'button', class: 'chip-btn', title: L('quickHint') }, label);
      b.addEventListener('click', () => {
        try {
          run();
        } catch {
          return;
        }
        recalc();
      });
      return b;
    }),
  );

  form.append(
    formActions(ctx, {
      submitLabel: L('calculate'),
      panel,
      onReset() {
        dob.control.value = '';
        ref.control.value = todayISO();
        ctx.memo.dob = '';
        ctx.memo.ref = ref.control.value;
        ctx.memo.__done = '';
        quickStatus.textContent = '';
        [dob, ref].forEach((f) => f.setError(null));
        panel.clear();
        dob.control.focus();
      },
    }),
    quickRow,
    quickStatus,
  );
  const submit = form.querySelector('button[type="submit"]');
  submit?.append(icon('arrow-right', 18));

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
      panel.render(r.value, a.date, b.date);
      return null;
    },
    [dob, ref],
  );

  // ---------- Information below the calculator ----------

  const features: Array<[UiIcon, string, string, string]> = [
    ['star', 'amber', L('f1Title'), L('f1')],
    ['calendar', 'green', L('f2Title'), L('f2')],
    ['calendar-range', 'violet', L('f3Title'), L('f3')],
    ['clock', 'blue', L('f4Title'), L('f4')],
  ];

  const examples = h(
    'ul',
    { class: 'age-examples', role: 'list' },
    ...EXAMPLES.map(([key, emoji, iso]) => {
      const date = readDate(iso) as { date: CivilDate };
      const shown = shortDate(ctx.lang, date.date);
      const b = h(
        'button',
        {
          type: 'button',
          class: 'age-example',
          'aria-label': L('exampleLabel', { who: L(key), date: shown }),
        },
        h('span', { class: 'age-example-emoji', 'aria-hidden': 'true' }, emoji),
        h('span', { class: 'age-example-text' }, h('strong', {}, L(key)), h('span', {}, shown)),
        icon('arrow-right', 16),
      );
      b.addEventListener('click', () => {
        dob.control.value = iso;
        ctx.memo.dob = iso;
        form.requestSubmit();
      });
      return h('li', {}, b);
    }),
  );

  const related = toolsByCategory('general').filter(
    (t) => t.id !== 'age-calculator' && t.status === 'available',
  );

  const root = h(
    'div',
    { class: 'age-page', 'data-own-related': 'true' },
    h('div', { class: 'tool-layout age-main' }, form, panel.el),
    h(
      'ul',
      { class: 'age-features', role: 'list' },
      ...features.map(([name, tone, title, text]) =>
        h(
          'li',
          { class: 'age-feature' },
          h('span', { class: `age-feature-icon age-tone-${tone}` }, icon(name, 24)),
          h('div', {}, h('h3', {}, title), h('p', {}, text)),
        ),
      ),
    ),
    h(
      'div',
      { class: 'age-info' },
      h(
        'section',
        { class: 'age-panel age-how', 'aria-labelledby': 'age-how-title' },
        h('span', { class: 'age-panel-icon age-tone-blue' }, icon('info', 24)),
        h(
          'div',
          {},
          h('h2', { id: 'age-how-title' }, L('howTitle')),
          h('p', {}, L('how1')),
          h('p', {}, L('how2')),
          h('p', {}, L('how3')),
        ),
      ),
      h(
        'section',
        { class: 'age-panel age-uses', 'aria-labelledby': 'age-uses-title' },
        h('span', { class: 'age-panel-icon age-tone-green' }, icon('check', 24)),
        h(
          'div',
          {},
          h('h2', { id: 'age-uses-title' }, L('usesTitle')),
          h(
            'ul',
            { class: 'age-checks', role: 'list' },
            ...[L('use1'), L('use2'), L('use3'), L('use4')].map((u) =>
              h('li', {}, icon('check', 16), u),
            ),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'age-bottom' },
      h(
        'section',
        { class: 'age-panel age-try', 'aria-labelledby': 'age-try-title' },
        h(
          'div',
          { class: 'age-panel-head' },
          h('span', { class: 'age-emoji age-emoji-sm', 'aria-hidden': 'true' }, '💡'),
          h(
            'div',
            {},
            h('h2', { id: 'age-try-title' }, L('examplesTitle')),
            h('p', {}, L('examplesIntro')),
          ),
        ),
        examples,
      ),
      related.length
        ? h(
            'nav',
            { class: 'age-panel age-related', 'aria-labelledby': 'age-related-title' },
            h(
              'div',
              { class: 'age-panel-head' },
              h('span', { class: 'age-panel-icon age-tone-blue' }, icon('grid', 22)),
              h(
                'div',
                {},
                h('h2', { id: 'age-related-title' }, L('relatedTitle')),
                h('p', {}, L('relatedIntro')),
              ),
            ),
            h(
              'ul',
              { class: 'age-related-list', role: 'list' },
              ...related.map((t) =>
                h(
                  'li',
                  {},
                  h(
                    'a',
                    { href: toHash({ name: 'tool', id: t.id }), class: 'age-related-link' },
                    h(
                      'span',
                      { class: 'age-related-icon card-icon card-general' },
                      icon(TOOL_ICONS[t.id] ?? 'toolbox', 18),
                    ),
                    h('span', { class: 'age-related-name' }, t.name[ctx.lang]),
                    icon('arrow-right', 16),
                  ),
                ),
              ),
            ),
          )
        : null,
    ),
  );

  return root;
};
