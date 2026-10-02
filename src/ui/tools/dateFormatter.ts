import { formatDateText, type DateTextFormat } from '../../calc/dateText';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import type { Lang } from '../../registry';
import { dateStrings, readDate, todayISO } from './dateShared';
import {
  bindMemo,
  dateInput,
  field,
  formActions,
  notes,
  resultPanel,
  wireForm,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    date: 'Date',
    iso: 'ISO (YYYY-MM-DD)',
    dmy: 'Numeric (DD/MM/YYYY)',
    'dmy-bn': 'Numeric, Bangla digits',
    'long-en': 'English',
    'long-bn': 'Bangla',
    'weekday-en': 'English with weekday',
    'weekday-bn': 'Bangla with weekday',
    'words-en': 'In words (English)',
    'words-bn': 'In words (Bangla)',
    n1: 'All formats use the Gregorian (English) calendar. Month names in Bangla are the Gregorian months (জানুয়ারি, ফেব্রুয়ারি …).',
    n2: 'This tool does not convert to the Bangla calendar (বঙ্গাব্দ, e.g. ১ বৈশাখ).',
    n3: 'In words, the day and year are written as cardinal numbers (“Two October Two Thousand Twenty-Six”), as often requested on application forms.',
  },
  bn: {
    date: 'তারিখ',
    iso: 'ISO (YYYY-MM-DD)',
    dmy: 'সংখ্যায় (DD/MM/YYYY)',
    'dmy-bn': 'সংখ্যায়, বাংলা অঙ্ক',
    'long-en': 'ইংরেজি',
    'long-bn': 'বাংলা',
    'weekday-en': 'বারসহ ইংরেজি',
    'weekday-bn': 'বারসহ বাংলা',
    'words-en': 'কথায় (ইংরেজি)',
    'words-bn': 'কথায় (বাংলা)',
    n1: 'সব ফরম্যাট গ্রেগরিয়ান (ইংরেজি) ক্যালেন্ডার অনুযায়ী। বাংলায় মাসের নামগুলো গ্রেগরিয়ান মাস (জানুয়ারি, ফেব্রুয়ারি …)।',
    n2: 'এই টুল বাংলা সন (বঙ্গাব্দ, যেমন ১ বৈশাখ) রূপান্তর করে না।',
    n3: 'কথায় লেখার সময় দিন ও বছর সংখ্যাবাচক শব্দে লেখা হয় (“দুই অক্টোবর দুই হাজার ছাব্বিশ”), যা আবেদন ফর্মে প্রায়ই চাওয়া হয়।',
  },
});

const ORDER: Array<[DateTextFormat, Lang | undefined]> = [
  ['dmy', 'en'],
  ['dmy-bn', 'bn'],
  ['iso', 'en'],
  ['long-en', 'en'],
  ['long-bn', 'bn'],
  ['weekday-en', 'en'],
  ['weekday-bn', 'bn'],
  ['words-en', 'en'],
  ['words-bn', 'bn'],
];

export const dateFormatter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const D = dateStrings(ctx.lang);
  const date = field(L('date'), dateInput({ id: 'fmt-date', required: '' }));
  bindMemo(date.control, ctx.memo, 'date', todayISO());

  const panel = resultPanel(ctx, ctx.t('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': ctx.t('calculate') },
    h('div', { class: 'field-grid' }, date.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: ctx.t('calculate'),
      panel,
      onReset() {
        date.control.value = todayISO();
        Object.assign(ctx.memo, { date: date.control.value, __done: '' });
        date.setError(null);
        panel.clear();
        date.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const r = readDate(date.control.value);
      if ('error' in r) return [[date, D(r.error)]];
      const f = formatDateText(r.date);
      panel.show(
        ORDER.map(([k, lang], i) => ({
          label: L(k),
          value: f[k],
          lang,
          copy: true,
          primary: i === 0,
        })),
      );
      return null;
    },
    [date],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3')]),
  );
};
