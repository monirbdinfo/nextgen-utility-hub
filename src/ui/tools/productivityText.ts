import { toEnglishDigits } from '../../calc/digits';
import {
  codePointLabel,
  findInvisible,
  fromMorse,
  INVISIBLE_CHARS,
  loremIpsum,
  MAX_INVISIBLE,
  repeatInvisible,
  rot13,
  RUNIC_TABLE,
  smallText,
  toMorse,
  toRunes,
  type LoremUnit,
  type SmallStyle,
} from '../../calc/textTools';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { toolForm, type Outcome } from './toolForm';
import type { ToolView } from './kit';

const S = defineStrings({
  en: {
    // shared
    empty: 'Enter some text.',
    local: 'Everything here runs in your browser. Nothing is sent or stored.',
    result: 'Result',
    btnConvert: 'Convert',
    btnGenerate: 'Generate',
    text: 'Text',
    // Lorem Ipsum
    loremUnit: 'Generate',
    loremCount: 'How many',
    loremCountHint: 'Up to 50 paragraphs, 200 sentences or 5,000 words.',
    loremStart: 'Start with “Lorem ipsum dolor sit amet…”',
    unit_paragraphs: 'Paragraphs',
    unit_sentences: 'Sentences',
    unit_words: 'Words',
    loremText: 'Placeholder text',
    loremStats: 'Length',
    loremStatsValue: '{w} words, {c} characters',
    'e_count-invalid': 'Enter a whole number, 1 or more.',
    'e_count-range':
      'That is too many for this unit. The limits are 50 paragraphs, 200 sentences and 5,000 words.',
    loremN1: 'The same settings always give the same text, so a layout can be reproduced.',
    loremN2:
      'Lorem ipsum is placeholder text. It has no meaning and is only used to show how a layout looks.',
    // ROT13
    rotText: 'Text to convert',
    rotDigits: 'Also rotate digits (ROT5)',
    rotN1:
      'ROT13 moves each English letter 13 places along the alphabet. Applying it twice gives back the original, so the same tool encodes and decodes.',
    rotN2:
      'ROT13 is not encryption. Anyone can read it; use it only to hide spoilers or casual text.',
    rotN3:
      'Only the English letters A–Z and a–z change. Bangla letters, punctuation and other characters stay as they are; digits change only if you tick the option.',
    // Morse
    morseMode: 'Direction',
    morseEncode: 'Text → Morse',
    morseDecode: 'Morse → text',
    morseInput: 'Input',
    morseHint: 'In Morse, letters are separated by a space and words by /.',
    morseResult: 'Result',
    morseSkippedEncode: 'No Morse code exists for these characters, so they were skipped: {list}',
    morseSkippedDecode: 'These codes were not recognised and were left out: {list}',
    morseN1:
      'Uses the international Morse table (ITU-R M.1677): English letters, digits and common punctuation.',
    morseN2: 'Bangla letters are not supported. This tool does not guess a code for them.',
    // Small text
    smallStyle: 'Style',
    style_superscript: 'Superscript (small raised)',
    style_subscript: 'Subscript (small lowered)',
    'style_small-caps': 'Small capitals',
    smallUnsupported: 'This style has no character for: {list}. They are kept as typed.',
    smallN1:
      'These are special Unicode characters, not formatting. They copy and paste into most apps, but a few fonts show empty boxes for some of them.',
    smallN2:
      'Screen readers and search can handle them poorly. Use them for decoration, not for important text.',
    smallN3:
      'Upper and lower case look the same in these styles. Superscript and subscript have no form for some letters.',
    // Runic
    runicText: 'Text to transliterate',
    runicDots: 'Use runic word separators (᛫) instead of spaces',
    runicTable: 'Letters used: {table}',
    runicN1:
      'This is a decorative, letter-by-letter transliteration into Elder Futhark runes. It is not a translation, and the runes did not match modern English letters one to one.',
    runicN2:
      '“th” and “ng” use their own runes. Characters with no mapping, such as Bangla letters, digits and punctuation, stay as typed.',
    // Invisible characters
    invCreateTitle: 'Create invisible characters',
    invCheckTitle: 'Find hidden characters in text',
    invCreateResult: 'Created characters',
    invCheckResult: 'Check result',
    invChar: 'Character',
    invCount: 'How many',
    invCountHint: 'Up to {max}.',
    btnCreate: 'Create',
    invText: 'Invisible text',
    invContains: 'What it contains',
    invContainsValue: '{count} × {code} {name}',
    invCheckText: 'Text to check',
    btnCheck: 'Check text',
    invFound: 'Found',
    invFoundValue: '{count} found, first at position {pos}',
    invNone: 'None of the known invisible characters were found.',
    invClean: 'Text without them',
    invWarn:
      'These characters can confuse readers, screen readers and search. Do not use them to impersonate someone, hide content or get around moderation.',
    invN1: 'The pasted result looks empty: that is expected. Use “Copy” to take it.',
    invN2:
      'Checking lists the common invisible and special-space characters. The Unicode Text Cleaner can remove more.',
  },
  bn: {
    empty: 'কিছু লেখা দিন।',
    local: 'সব কাজ আপনার ব্রাউজারেই হয়। কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
    result: 'ফলাফল',
    btnConvert: 'রূপান্তর করুন',
    btnGenerate: 'তৈরি করুন',
    text: 'লেখা',
    loremUnit: 'তৈরি করুন',
    loremCount: 'কতটি',
    loremCountHint: 'সর্বোচ্চ ৫০ অনুচ্ছেদ, ২০০ বাক্য বা ৫,০০০ শব্দ।',
    loremStart: '“Lorem ipsum dolor sit amet…” দিয়ে শুরু করুন',
    unit_paragraphs: 'অনুচ্ছেদ',
    unit_sentences: 'বাক্য',
    unit_words: 'শব্দ',
    loremText: 'প্লেসহোল্ডার লেখা',
    loremStats: 'দৈর্ঘ্য',
    loremStatsValue: '{w}টি শব্দ, {c}টি অক্ষর',
    'e_count-invalid': '১ বা তার বেশি একটি পূর্ণসংখ্যা লিখুন।',
    'e_count-range': 'এই এককের জন্য সংখ্যাটি বেশি। সীমা ৫০ অনুচ্ছেদ, ২০০ বাক্য ও ৫,০০০ শব্দ।',
    loremN1: 'একই সেটিংসে সবসময় একই লেখা আসে, তাই লেআউট আবার তৈরি করা যায়।',
    loremN2:
      'Lorem ipsum হলো প্লেসহোল্ডার লেখা। এর কোনো অর্থ নেই; লেআউট কেমন দেখাবে তা বোঝাতেই এটি ব্যবহার হয়।',
    rotText: 'রূপান্তরের লেখা',
    rotDigits: 'অঙ্কও ঘোরান (ROT5)',
    rotN1:
      'ROT13 প্রতিটি ইংরেজি অক্ষরকে বর্ণমালায় ১৩ ঘর এগিয়ে দেয়। দুবার চালালে মূল লেখা ফিরে আসে, তাই একই টুল এনকোড ও ডিকোড করে।',
    rotN2:
      'ROT13 এনক্রিপশন নয়। যে কেউ এটি পড়তে পারে; শুধু স্পয়লার বা সাধারণ লেখা আড়াল করতে ব্যবহার করুন।',
    rotN3:
      'শুধু ইংরেজি A–Z ও a–z অক্ষর বদলায়। বাংলা অক্ষর, বিরামচিহ্ন ও অন্য চিহ্ন যেমন আছে তেমনই থাকে; অঙ্ক বদলায় শুধু অপশনটি টিক দিলে।',
    morseMode: 'দিক',
    morseEncode: 'লেখা → মোর্স',
    morseDecode: 'মোর্স → লেখা',
    morseInput: 'ইনপুট',
    morseHint: 'মোর্সে অক্ষর স্পেস দিয়ে এবং শব্দ / দিয়ে আলাদা করা হয়।',
    morseResult: 'ফলাফল',
    morseSkippedEncode: 'এই অক্ষরগুলোর মোর্স কোড নেই, তাই বাদ দেওয়া হয়েছে: {list}',
    morseSkippedDecode: 'এই কোডগুলো চেনা যায়নি, তাই বাদ গেছে: {list}',
    morseN1:
      'আন্তর্জাতিক মোর্স তালিকা (ITU-R M.1677) ব্যবহার হয়: ইংরেজি অক্ষর, অঙ্ক ও সাধারণ বিরামচিহ্ন।',
    morseN2: 'বাংলা অক্ষর সমর্থিত নয়। এই টুল সেগুলোর জন্য আন্দাজে কোড বানায় না।',
    smallStyle: 'ধরন',
    style_superscript: 'সুপারস্ক্রিপ্ট (ছোট, ওপরে)',
    style_subscript: 'সাবস্ক্রিপ্ট (ছোট, নিচে)',
    'style_small-caps': 'ছোট ক্যাপিটাল',
    smallUnsupported: 'এই ধরনে এগুলোর কোনো অক্ষর নেই: {list}। যেমন লেখা ছিল তেমনই রাখা হয়েছে।',
    smallN1:
      'এগুলো বিশেষ ইউনিকোড অক্ষর, ফরম্যাটিং নয়। বেশিরভাগ অ্যাপে কপি-পেস্ট চলে, তবে কিছু ফন্টে কয়েকটি অক্ষর খালি বাক্স হিসেবে দেখা যায়।',
    smallN2:
      'স্ক্রিন রিডার ও সার্চ এগুলো ভালোভাবে সামলাতে পারে না। সাজানোর জন্য ব্যবহার করুন, গুরুত্বপূর্ণ লেখায় নয়।',
    smallN3:
      'এই ধরনগুলোতে বড় ও ছোট হাতের অক্ষর একই দেখায়। সুপারস্ক্রিপ্ট ও সাবস্ক্রিপ্টে কিছু অক্ষরের রূপ নেই।',
    runicText: 'রুনে রূপান্তরের লেখা',
    runicDots: 'স্পেসের বদলে রুনিক শব্দ-বিভাজক (᛫) ব্যবহার করুন',
    runicTable: 'ব্যবহৃত অক্ষর: {table}',
    runicN1:
      'এটি সাজসজ্জার জন্য অক্ষরে অক্ষরে এল্ডার ফুথার্ক রুনে রূপান্তর। এটি অনুবাদ নয়, এবং রুন আধুনিক ইংরেজি অক্ষরের সঙ্গে এক-এক করে মেলে না।',
    runicN2:
      '“th” ও “ng”-এর নিজস্ব রুন আছে। যেসব চিহ্নের মিল নেই, যেমন বাংলা অক্ষর, অঙ্ক ও বিরামচিহ্ন, সেগুলো যেমন লেখা তেমনই থাকে।',
    invCreateTitle: 'অদৃশ্য অক্ষর তৈরি করুন',
    invCheckTitle: 'লেখায় লুকানো অক্ষর খুঁজুন',
    invCreateResult: 'তৈরি অক্ষর',
    invCheckResult: 'পরীক্ষার ফল',
    invChar: 'অক্ষর',
    invCount: 'কতটি',
    invCountHint: 'সর্বোচ্চ {max}টি।',
    btnCreate: 'তৈরি করুন',
    invText: 'অদৃশ্য লেখা',
    invContains: 'এতে যা আছে',
    invContainsValue: '{count} × {code} {name}',
    invCheckText: 'পরীক্ষার লেখা',
    btnCheck: 'লেখা পরীক্ষা করুন',
    invFound: 'পাওয়া গেছে',
    invFoundValue: '{count}টি পাওয়া গেছে, প্রথমটি {pos} নম্বর অবস্থানে',
    invNone: 'পরিচিত কোনো অদৃশ্য অক্ষর পাওয়া যায়নি।',
    invClean: 'সেগুলো ছাড়া লেখা',
    invWarn:
      'এই অক্ষরগুলো পাঠক, স্ক্রিন রিডার ও সার্চকে বিভ্রান্ত করতে পারে। কাউকে নকল করতে, কিছু লুকাতে বা মডারেশন এড়াতে ব্যবহার করবেন না।',
    invN1: 'পেস্ট করা ফল খালি দেখায়: এটাই স্বাভাবিক। নিতে “কপি” ব্যবহার করুন।',
    invN2:
      'পরীক্ষায় পরিচিত অদৃশ্য ও বিশেষ-স্পেস অক্ষরের তালিকা দেখা হয়। আরও অক্ষর সরাতে ইউনিকোড টেক্সট ক্লিনার ব্যবহার করুন।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const err =
  (L: L) =>
  (code: string): string =>
    L(code === 'empty' ? 'empty' : (`e_${code}` as Key));
const list = (chars: string[]): string => chars.join(' ');

// ---------- Lorem Ipsum ----------

export const loremGenerator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return toolForm(ctx, {
    prefix: 'lorem',
    submit: L('btnGenerate'),
    errorText: err(L),
    notesText: [L('loremN1'), L('loremN2'), L('local')],
    fields: [
      {
        key: 'unit',
        kind: 'select',
        label: L('loremUnit'),
        options: (['paragraphs', 'sentences', 'words'] as const).map((u) => [u, L(`unit_${u}`)]),
      },
      {
        key: 'count',
        kind: 'text',
        label: L('loremCount'),
        hint: L('loremCountHint'),
        inputmode: 'numeric',
        default: '3',
      },
      { key: 'start', kind: 'checkbox', label: L('loremStart'), default: '1' },
    ],
    compute({ unit = 'paragraphs', count = '', start = '1' }): Outcome {
      const digits = toEnglishDigits(count).trim();
      const n = /^\d+$/.test(digits) ? Number(digits) : NaN;
      const r = loremIpsum(unit as LoremUnit, n, start === '1');
      if (!r.ok) return { field: 'count', error: r.error };
      const words = r.value.split(/\s+/).length;
      return {
        rows: [
          { label: L('loremText'), value: r.value, primary: true, copy: true, lang: 'en' },
          { label: L('loremStats'), value: L('loremStatsValue', { w: words, c: r.value.length }) },
        ],
      };
    },
  });
};

// ---------- ROT13 ----------

export const rot13Tool: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return toolForm(ctx, {
    prefix: 'rot',
    submit: L('btnConvert'),
    live: true,
    errorText: err(L),
    notesText: [L('rotN1'), L('rotN2'), L('rotN3'), L('local')],
    fields: [
      { key: 'text', kind: 'textarea', label: L('rotText') },
      { key: 'digits', kind: 'checkbox', label: L('rotDigits') },
    ],
    compute({ text = '', digits = '0' }): Outcome {
      if (!text) return { field: 'text', error: 'empty' };
      return {
        rows: [
          { label: L('result'), value: rot13(text, digits === '1'), primary: true, copy: true },
        ],
      };
    },
  });
};

// ---------- Morse ----------

export const morseTranslator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return toolForm(ctx, {
    prefix: 'morse',
    submit: L('btnConvert'),
    live: true,
    errorText: err(L),
    notesText: [L('morseN1'), L('morseN2'), L('local')],
    fields: [
      {
        key: 'mode',
        kind: 'select',
        label: L('morseMode'),
        options: [
          ['encode', L('morseEncode')],
          ['decode', L('morseDecode')],
        ],
      },
      { key: 'text', kind: 'textarea', label: L('morseInput'), hint: L('morseHint') },
    ],
    compute({ mode = 'encode', text = '' }): Outcome {
      if (!text.trim()) return { field: 'text', error: 'empty' };
      const encode = mode === 'encode';
      const r = encode ? toMorse(text) : fromMorse(text);
      return {
        rows: [
          {
            label: L('morseResult'),
            value: r.output || '—',
            primary: true,
            copy: !!r.output,
            lang: 'en',
          },
        ],
        notes: r.unsupported.length
          ? [L(encode ? 'morseSkippedEncode' : 'morseSkippedDecode', { list: list(r.unsupported) })]
          : [],
      };
    },
  });
};

// ---------- Small text ----------

export const smallTextGenerator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return toolForm(ctx, {
    prefix: 'small',
    submit: L('btnConvert'),
    live: true,
    errorText: err(L),
    notesText: [L('smallN1'), L('smallN2'), L('smallN3'), L('local')],
    fields: [
      {
        key: 'style',
        kind: 'select',
        label: L('smallStyle'),
        options: (['superscript', 'subscript', 'small-caps'] as const).map((s) => [
          s,
          L(`style_${s}` as Key),
        ]),
      },
      { key: 'text', kind: 'textarea', label: L('text') },
    ],
    compute({ style = 'superscript', text = '' }): Outcome {
      if (!text) return { field: 'text', error: 'empty' };
      const r = smallText(text, style as SmallStyle);
      return {
        rows: [{ label: L('result'), value: r.output, primary: true, copy: true }],
        notes: r.unsupported.length ? [L('smallUnsupported', { list: list(r.unsupported) })] : [],
      };
    },
  });
};

// ---------- Runic ----------

export const runicTranslator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const table = RUNIC_TABLE.map(([from, to]) => `${from} ${to}`).join(' · ');
  return toolForm(ctx, {
    prefix: 'runic',
    submit: L('btnConvert'),
    live: true,
    errorText: err(L),
    notesText: [L('runicN1'), L('runicN2'), L('runicTable', { table }), L('local')],
    fields: [
      { key: 'text', kind: 'textarea', label: L('runicText') },
      { key: 'dots', kind: 'checkbox', label: L('runicDots') },
    ],
    compute({ text = '', dots = '0' }): Outcome {
      if (!text) return { field: 'text', error: 'empty' };
      return {
        rows: [
          { label: L('result'), value: toRunes(text, dots === '1'), primary: true, copy: true },
        ],
      };
    },
  });
};

// ---------- Invisible characters ----------

export const invisibleCharacter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const create = toolForm(ctx, {
    prefix: 'inv-gen',
    memoPrefix: 'gen_',
    resultLabel: L('invCreateResult'),
    submit: L('btnCreate'),
    errorText: err(L),
    notesText: [L('invWarn'), L('invN1'), L('local')],
    fields: [
      {
        key: 'char',
        kind: 'select',
        label: L('invChar'),
        options: INVISIBLE_CHARS.map((c) => [
          String(c.code),
          `${codePointLabel(c.code)} ${c.name}`,
        ]),
      },
      {
        key: 'count',
        kind: 'text',
        label: L('invCount'),
        hint: L('invCountHint', { max: MAX_INVISIBLE }),
        inputmode: 'numeric',
        default: '1',
      },
    ],
    compute({ char = '', count = '' }): Outcome {
      const digits = toEnglishDigits(count).trim();
      const n = /^\d+$/.test(digits) ? Number(digits) : NaN;
      const code = Number(char);
      const r = repeatInvisible(code, n);
      if (!r.ok)
        return { field: 'count', error: r.error === 'unknown' ? 'count-invalid' : r.error };
      const name = INVISIBLE_CHARS.find((c) => c.code === code)?.name ?? '';
      return {
        rows: [
          { label: L('invText'), value: r.value, primary: true, copy: true },
          {
            label: L('invContains'),
            value: L('invContainsValue', { count: n, code: codePointLabel(code), name }),
            lang: 'en',
          },
        ],
      };
    },
  });

  const check = toolForm(ctx, {
    prefix: 'inv-chk',
    memoPrefix: 'chk_',
    resultLabel: L('invCheckResult'),
    submit: L('btnCheck'),
    errorText: err(L),
    notesText: [L('invN2')],
    fields: [{ key: 'text', kind: 'textarea', label: L('invCheckText') }],
    compute({ text = '' }): Outcome {
      if (!text) return { field: 'text', error: 'empty' };
      const found = findInvisible(text);
      if (!found.length)
        return { rows: [{ label: L('result'), value: L('invNone'), primary: true }] };
      const strip = new Set(found.map((f) => String.fromCharCode(f.code)));
      return {
        rows: [
          ...found.map((f) => ({
            label: `${codePointLabel(f.code)} ${f.name}`,
            value: L('invFoundValue', { count: f.count, pos: f.firstIndex + 1 }),
          })),
          {
            label: L('invClean'),
            value: [...text].filter((ch) => !strip.has(ch)).join(''),
            copy: true,
          },
        ],
      };
    },
  });

  return h(
    'div',
    { class: 'tool-stack' },
    h('h2', { class: 'tool-section-title' }, L('invCreateTitle')),
    create,
    h('h2', { class: 'tool-section-title' }, L('invCheckTitle')),
    check,
  );
};
