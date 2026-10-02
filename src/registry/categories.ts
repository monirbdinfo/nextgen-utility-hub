import type { Category } from './types';

export const categories: readonly Category[] = [
  {
    id: 'general',
    icon: 'toolbox',
    name: { en: 'General Utilities', bn: 'সাধারণ ইউটিলিটি' },
    description: {
      en: 'Everyday converters, calculators and text helpers.',
      bn: 'দৈনন্দিন কনভার্টার, ক্যালকুলেটর ও টেক্সট টুল।',
    },
  },
  {
    id: 'jobs',
    icon: 'briefcase',
    name: { en: 'Job Application Toolkit', bn: 'চাকরির আবেদন টুলকিট' },
    description: {
      en: 'Photo, signature and document helpers for Bangladeshi job applications.',
      bn: 'বাংলাদেশের চাকরির আবেদনের জন্য ছবি, স্বাক্ষর ও ডকুমেন্ট টুল।',
    },
  },
  {
    id: 'bangla',
    icon: 'bangla',
    name: { en: 'Bangla Number & Text Toolkit', bn: 'বাংলা সংখ্যা ও টেক্সট টুলকিট' },
    description: {
      en: 'Digits, numbers in words, dates and Bangla text utilities.',
      bn: 'অঙ্ক, কথায় সংখ্যা, তারিখ ও বাংলা টেক্সট টুল।',
    },
  },
  {
    id: 'files',
    icon: 'shield',
    name: { en: 'Privacy-First File Tools', bn: 'প্রাইভেসি-প্রথম ফাইল টুল' },
    description: {
      en: 'Process images and PDFs locally in your browser; files are never uploaded.',
      bn: 'ছবি ও পিডিএফ ব্রাউজারেই প্রসেস হয়; ফাইল কখনো আপলোড হয় না।',
    },
  },
  {
    id: 'network',
    icon: 'network',
    name: { en: 'Network & IT Diagnostic Toolkit', bn: 'নেটওয়ার্ক ও আইটি ডায়াগনস্টিক টুলকিট' },
    description: {
      en: 'Safe, browser-based diagnostics. No scanning of systems you do not own.',
      bn: 'নিরাপদ, ব্রাউজারভিত্তিক ডায়াগনস্টিক। অন্যের সিস্টেম স্ক্যান নয়।',
    },
  },
];
