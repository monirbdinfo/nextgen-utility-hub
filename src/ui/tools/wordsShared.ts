import { defineStrings } from '../../i18n';

export const wordsStrings = defineStrings({
  en: {
    empty: 'Enter a number.',
    invalid:
      'That isn’t a valid number. Use digits, an optional minus sign and at most one decimal point.',
    'too-large': 'The number is too large. Up to 15 digits before the decimal point are supported.',
    'too-many-decimals': 'Too many decimal places. Up to {max} are supported.',
    'negative-amount': 'A Taka amount can’t be negative.',
    'taka-decimals':
      'Taka amounts can have at most 2 decimal places (poisha). This tool never rounds — please round the amount yourself.',
    englishScale: 'English number system',
    southAsian: 'Lakh and crore (1,00,000)',
    international: 'Million and billion (100,000)',
    english: 'English',
    bangla: 'Bangla',
    digitsEn: 'Digits (English)',
    digitsBn: 'Digits (Bangla)',
  },
  bn: {
    empty: 'একটি সংখ্যা দিন।',
    invalid:
      'সংখ্যাটি সঠিক নয়। অঙ্ক, প্রয়োজনে একটি মাইনাস চিহ্ন এবং সর্বোচ্চ একটি দশমিক বিন্দু ব্যবহার করুন।',
    'too-large': 'সংখ্যাটি খুব বড়। দশমিকের আগে সর্বোচ্চ ১৫টি অঙ্ক সমর্থিত।',
    'too-many-decimals': 'দশমিকের পরে অঙ্ক বেশি। সর্বোচ্চ {max}টি সমর্থিত।',
    'negative-amount': 'টাকার অঙ্ক ঋণাত্মক হতে পারে না।',
    'taka-decimals':
      'টাকার অঙ্কে দশমিকের পরে সর্বোচ্চ ২টি অঙ্ক (পয়সা) থাকতে পারে। এই টুল কখনো রাউন্ড করে না — অঙ্কটি নিজে রাউন্ড করে দিন।',
    englishScale: 'ইংরেজি সংখ্যা পদ্ধতি',
    southAsian: 'লাখ ও কোটি (1,00,000)',
    international: 'মিলিয়ন ও বিলিয়ন (100,000)',
    english: 'ইংরেজি',
    bangla: 'বাংলা',
    digitsEn: 'অঙ্কে (ইংরেজি)',
    digitsBn: 'অঙ্কে (বাংলা)',
  },
});
