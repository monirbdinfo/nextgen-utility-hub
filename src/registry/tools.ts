import type { Tool } from './types';

/**
 * Central tool registry. Every entry is currently `planned`: no tool is
 * implemented yet. Flip `status` (and add `route`) only when a tool ships.
 */
export const tools: readonly Tool[] = [
  {
    id: 'unit-converter',
    category: 'general',
    name: { en: 'Unit Converter', bn: 'ইউনিট কনভার্টার' },
    description: {
      en: 'Convert length, weight, area and more.',
      bn: 'দৈর্ঘ্য, ওজন, ক্ষেত্রফল ইত্যাদি রূপান্তর।',
    },
    keywords: ['convert', 'length', 'weight', 'কনভার্ট'],
    status: 'planned',
  },
  {
    id: 'text-counter',
    category: 'general',
    name: { en: 'Word & Character Counter', bn: 'শব্দ ও অক্ষর গণনা' },
    description: { en: 'Count words, characters and lines.', bn: 'শব্দ, অক্ষর ও লাইন গণনা করুন।' },
    keywords: ['count', 'words', 'characters', 'গণনা'],
    status: 'planned',
  },
  {
    id: 'job-photo-resizer',
    category: 'jobs',
    name: { en: 'Job Photo & Signature Resizer', bn: 'চাকরির ছবি ও স্বাক্ষর রিসাইজার' },
    description: {
      en: 'Resize photos and signatures to application size limits.',
      bn: 'আবেদনের সাইজ সীমা অনুযায়ী ছবি ও স্বাক্ষর রিসাইজ।',
    },
    keywords: ['photo', 'signature', 'resize', 'bpsc', 'ছবি', 'স্বাক্ষর'],
    status: 'planned',
  },
  {
    id: 'cv-checklist',
    category: 'jobs',
    name: { en: 'Application Checklist', bn: 'আবেদন চেকলিস্ট' },
    description: {
      en: 'Track documents needed for an application.',
      bn: 'আবেদনের প্রয়োজনীয় কাগজপত্রের তালিকা।',
    },
    keywords: ['checklist', 'documents', 'cv', 'সিভি'],
    status: 'planned',
  },
  {
    id: 'number-to-words-bn',
    category: 'bangla',
    name: { en: 'Number to Bangla Words', bn: 'সংখ্যা থেকে বাংলা কথায়' },
    description: {
      en: 'Write numbers and amounts in Bangla words.',
      bn: 'সংখ্যা ও টাকার অঙ্ক বাংলায় কথায় লিখুন।',
    },
    keywords: ['number', 'words', 'taka', 'টাকা', 'কথায়'],
    status: 'planned',
  },
  {
    id: 'digit-converter',
    category: 'bangla',
    name: { en: 'Bangla ⇄ English Digits', bn: 'বাংলা ⇄ ইংরেজি অঙ্ক' },
    description: {
      en: 'Convert between Bangla and Latin digits.',
      bn: 'বাংলা ও ইংরেজি অঙ্কের মধ্যে রূপান্তর।',
    },
    keywords: ['digits', 'numerals', 'অঙ্ক'],
    status: 'planned',
  },
  {
    id: 'image-compressor',
    category: 'files',
    name: { en: 'Image Compressor', bn: 'ছবি কম্প্রেসার' },
    description: {
      en: 'Compress images locally in your browser.',
      bn: 'ব্রাউজারে ছবি কম্প্রেস করুন।',
    },
    keywords: ['image', 'compress', 'jpg', 'png', 'ছবি'],
    status: 'planned',
  },
  {
    id: 'pdf-merge',
    category: 'files',
    name: { en: 'PDF Merge & Split', bn: 'পিডিএফ মার্জ ও স্প্লিট' },
    description: {
      en: 'Merge or split PDFs without uploading them.',
      bn: 'আপলোড ছাড়াই পিডিএফ মার্জ বা স্প্লিট।',
    },
    keywords: ['pdf', 'merge', 'split', 'পিডিএফ'],
    status: 'planned',
  },
  {
    id: 'my-ip-info',
    category: 'network',
    name: { en: 'Browser & Connection Info', bn: 'ব্রাউজার ও সংযোগ তথ্য' },
    description: {
      en: 'Show what your browser exposes about your device and connection.',
      bn: 'আপনার ব্রাউজার ডিভাইস ও সংযোগ সম্পর্কে কী জানায় তা দেখুন।',
    },
    keywords: ['browser', 'connection', 'user agent', 'network'],
    status: 'planned',
  },
  {
    id: 'dns-lookup',
    category: 'network',
    name: { en: 'DNS Lookup', bn: 'ডিএনএস লুকআপ' },
    description: {
      en: 'Look up public DNS records for a domain.',
      bn: 'ডোমেইনের পাবলিক ডিএনএস রেকর্ড দেখুন।',
    },
    keywords: ['dns', 'domain', 'records'],
    status: 'planned',
  },
];
