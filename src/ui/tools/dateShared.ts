import {
  fromLocalDate,
  parseISODate,
  toISODate,
  type CalendarSpan,
  type CivilDate,
} from '../../calc/dates';
import { formatDateText } from '../../calc/dateText';
import { toEnglishDigits } from '../../calc/digits';
import { formatInteger } from '../../calc/format';
import { defineStrings } from '../../i18n';
import type { Lang } from '../../registry';
import { plural } from './kit';

export const dateStrings = defineStrings({
  en: {
    required: 'Enter a date.',
    invalid: 'Enter a real calendar date (YYYY-MM-DD).',
    span: '{y} {yl}, {m} {ml}, {d} {dl}',
    year: 'year',
    years: 'years',
    month: 'month',
    months: 'months',
    day: 'day',
    days: 'days',
    week: 'week',
    weeks: 'weeks',
  },
  bn: {
    required: 'একটি তারিখ দিন।',
    invalid: 'সঠিক ক্যালেন্ডার তারিখ দিন (YYYY-MM-DD)।',
    span: '{y} {yl}, {m} {ml}, {d} {dl}',
    year: 'বছর',
    years: 'বছর',
    month: 'মাস',
    months: 'মাস',
    day: 'দিন',
    days: 'দিন',
    week: 'সপ্তাহ',
    weeks: 'সপ্তাহ',
  },
});

export const todayISO = (): string => toISODate(fromLocalDate(new Date()));

/** Read a date control. Bangla digits typed into a text fallback are accepted. */
export function readDate(value: string): { date: CivilDate } | { error: 'required' | 'invalid' } {
  const v = toEnglishDigits(value.trim());
  if (!v) return { error: 'required' };
  const d = parseISODate(v);
  return d ? { date: d } : { error: 'invalid' };
}

export function formatSpan(lang: Lang, s: Pick<CalendarSpan, 'years' | 'months' | 'days'>): string {
  const L = dateStrings(lang);
  return L('span', {
    y: s.years,
    yl: plural(lang, s.years, L('year'), L('years')),
    m: s.months,
    ml: plural(lang, s.months, L('month'), L('months')),
    d: s.days,
    dl: plural(lang, s.days, L('day'), L('days')),
  });
}

export function countLabel(lang: Lang, n: number, unit: 'day' | 'week' | 'month'): string {
  const L = dateStrings(lang);
  return `${formatInteger(n, lang)} ${plural(lang, n, L(unit), L(`${unit}s`))}`;
}

/** "Thursday, 15 June 2027" in the UI language. */
export function longDate(lang: Lang, d: CivilDate): string {
  const f = formatDateText(d);
  return lang === 'bn' ? f['weekday-bn'] : f['weekday-en'];
}
