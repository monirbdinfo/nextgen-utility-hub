import { type CivilDate, weekday } from './dates';
import { toBanglaDigits } from './digits';
import { integerToWords } from './numberWords';

export const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Gregorian month names as written in Bangla (not the Bangla calendar).
export const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
].map((m) => m.normalize('NFC'));
export const EN_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const BN_WEEKDAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
].map((d) => d.normalize('NFC'));

export type DateTextFormat =
  | 'iso'
  | 'dmy'
  | 'dmy-bn'
  | 'long-en'
  | 'long-bn'
  | 'weekday-en'
  | 'weekday-bn'
  | 'words-en'
  | 'words-bn';

const pad = (n: number): string => String(n).padStart(2, '0');

/** All supported representations of a Gregorian date. */
export function formatDateText(d: CivilDate): Record<DateTextFormat, string> {
  const dmy = `${pad(d.day)}/${pad(d.month)}/${String(d.year).padStart(4, '0')}`;
  const longEn = `${d.day} ${EN_MONTHS[d.month - 1]} ${d.year}`;
  const longBn = toBanglaDigits(`${d.day} ${BN_MONTHS[d.month - 1]} ${d.year}`);
  const wd = weekday(d);
  return {
    iso: `${String(d.year).padStart(4, '0')}-${pad(d.month)}-${pad(d.day)}`,
    dmy,
    'dmy-bn': toBanglaDigits(dmy),
    'long-en': longEn,
    'long-bn': longBn,
    'weekday-en': `${EN_WEEKDAYS[wd]}, ${longEn}`,
    'weekday-bn': `${BN_WEEKDAYS[wd]}, ${longBn}`,
    'words-en': `${integerToWords(d.day, 'en')} ${EN_MONTHS[d.month - 1]} ${integerToWords(d.year, 'en', 'international')}`,
    'words-bn': `${integerToWords(d.day, 'bn')} ${BN_MONTHS[d.month - 1]} ${integerToWords(d.year, 'bn')}`,
  };
}
