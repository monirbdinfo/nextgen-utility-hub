import { formatInteger } from '../../calc/format';
import { analyzeText, MAX_TEXT_LENGTH, READING_WPM, type TextStats } from '../../calc/textCount';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { icon } from '../icons';
import { bindMemo, copyText, field, notes, type ToolView } from './kit';

const S = defineStrings({
  en: {
    input: 'Text',
    inputHint: 'Type or paste text. The counts update as you type; nothing is sent or saved.',
    counts: 'Counts',
    characters: 'Characters',
    charactersNoSpaces: 'Characters without spaces',
    words: 'Words',
    sentences: 'Sentences',
    lines: 'Lines',
    paragraphs: 'Paragraphs',
    bytes: 'Size in UTF-8',
    bytesValue: '{n} bytes',
    reading: 'Reading time (estimate)',
    readingNone: '—',
    readingSec: 'about {s} s',
    readingMin: 'about {m} min {s} s',
    empty: 'Start typing to see the counts.',
    approx:
      'This browser cannot split text into user-perceived characters, so characters are counted as Unicode code points: a Bangla conjunct or an emoji may count as more than one.',
    tooLong: 'The text is longer than {max} characters. Shorten it to see the counts.',
    copy: 'Copy counts',
    copyEmpty: 'There is nothing to copy yet.',
    n1: 'Characters are counted as you see them: a Bangla conjunct such as ক্ষ, a letter with a vowel sign such as কি, or an emoji counts once. Spaces, tabs and line breaks are characters too; the second count leaves all of them out.',
    n2: 'Words are runs of letters and digits (an apostrophe keeps “don’t” together; a hyphen splits “well-known” into two). Bangla words with vowel signs are kept whole. Languages written without spaces, such as Chinese, Japanese or Thai, are not split into words.',
    n3: 'Sentences end with . ! ? … । or ॥. Abbreviations such as “Dr.” are counted as sentence ends, so treat the sentence count as approximate. Paragraphs are separated by blank lines.',
    n4: 'Reading time assumes {wpm} words per minute, a common average for silent reading in English; real speed varies by reader, language and text.',
    n5: 'Everything is counted in your browser. The text is not uploaded or stored and is cleared when you leave this tool.',
  },
  bn: {
    input: 'লেখা',
    inputHint:
      'লেখা টাইপ বা পেস্ট করুন। টাইপ করার সঙ্গে সঙ্গে গণনা হালনাগাদ হয়; কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
    counts: 'গণনা',
    characters: 'অক্ষর',
    charactersNoSpaces: 'স্পেস ছাড়া অক্ষর',
    words: 'শব্দ',
    sentences: 'বাক্য',
    lines: 'লাইন',
    paragraphs: 'অনুচ্ছেদ',
    bytes: 'UTF-8-এ আকার',
    bytesValue: '{n} বাইট',
    reading: 'পড়ার সময় (আনুমানিক)',
    readingNone: '—',
    readingSec: 'প্রায় {s} সেকেন্ড',
    readingMin: 'প্রায় {m} মিনিট {s} সেকেন্ড',
    empty: 'গণনা দেখতে লিখতে শুরু করুন।',
    approx:
      'এই ব্রাউজার লেখাকে দৃশ্যমান অক্ষরে ভাগ করতে পারে না, তাই অক্ষর ইউনিকোড কোড পয়েন্ট হিসেবে গোনা হচ্ছে: একটি যুক্তাক্ষর বা ইমোজি একাধিক গোনা হতে পারে।',
    tooLong: 'লেখাটি {max} অক্ষরের বেশি। গণনা দেখতে লেখা ছোট করুন।',
    copy: 'গণনা কপি করুন',
    copyEmpty: 'কপি করার মতো কিছু এখনো নেই।',
    n1: 'অক্ষর যেভাবে দেখা যায় সেভাবে গোনা হয়: ক্ষ-এর মতো যুক্তাক্ষর, কি-এর মতো কার-যুক্ত অক্ষর বা একটি ইমোজি একবার গোনা হয়। স্পেস, ট্যাব ও লাইন ব্রেকও অক্ষর; দ্বিতীয় গণনায় এগুলো সব বাদ দেওয়া হয়।',
    n2: 'শব্দ মানে অক্ষর ও অঙ্কের ধারাবাহিক অংশ (অ্যাপস্ট্রফি “don’t”-কে এক রাখে; হাইফেন “well-known”-কে দুই ভাগ করে)। কার-চিহ্নসহ বাংলা শব্দ পুরো থাকে। চীনা, জাপানি বা থাইয়ের মতো ফাঁকা ছাড়া লেখা ভাষা শব্দে ভাগ হয় না।',
    n3: 'বাক্য শেষ হয় . ! ? … । বা ॥ দিয়ে। “Dr.”-এর মতো সংক্ষেপকেও বাক্যের শেষ ধরা হয়, তাই বাক্যের সংখ্যা আনুমানিক। ফাঁকা লাইন দিয়ে অনুচ্ছেদ আলাদা হয়।',
    n4: 'পড়ার সময় ধরা হয়েছে মিনিটে {wpm} শব্দ, যা ইংরেজিতে নীরবে পড়ার একটি প্রচলিত গড়; আসল গতি পাঠক, ভাষা ও লেখাভেদে আলাদা।',
    n5: 'সব গণনা আপনার ব্রাউজারেই হয়। লেখা আপলোড বা সংরক্ষণ করা হয় না, এবং টুল ছেড়ে গেলে মুছে যায়।',
  },
});

type CountKey =
  'characters' | 'charactersNoSpaces' | 'words' | 'sentences' | 'lines' | 'paragraphs';
const COUNTS: readonly CountKey[] = [
  'characters',
  'charactersNoSpaces',
  'words',
  'sentences',
  'lines',
  'paragraphs',
];

export const textCounter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const n = (v: number): string => formatInteger(v, ctx.lang);

  const input = field(
    L('input'),
    h('textarea', {
      id: 'count-input',
      class: 'input textarea',
      rows: '10',
      spellcheck: 'false',
    }),
    { hint: L('inputHint') },
  );
  bindMemo(input.control, ctx.memo, 'text');

  // Values update on every keystroke, so the list is not a live region (that would make
  // screen readers read every change); users can move to it to hear the current counts.
  const values = new Map<CountKey | 'bytes' | 'reading', HTMLElement>();
  const row = (key: CountKey | 'bytes' | 'reading', primary = false): HTMLElement => {
    const v = h('span', { class: 'result-value', id: `count-${key}` });
    values.set(key, v);
    return h(
      'div',
      { class: `result-row${primary ? ' result-row-primary' : ''}` },
      h('dt', {}, L(key === 'reading' ? 'reading' : key)),
      h('dd', {}, v),
    );
  };
  const list = h(
    'dl',
    { class: 'result-list count-list' },
    ...COUNTS.map((k) => row(k, k === 'characters' || k === 'words')),
    row('bytes'),
    row('reading'),
  );
  const message = h('p', { class: 'field-hint', id: 'count-message' });
  const status = h('p', { class: 'copy-status', role: 'status' });

  let current: TextStats | null = null;

  function readingText(seconds: number): string {
    if (!seconds) return L('readingNone');
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m ? L('readingMin', { m: n(m), s: n(s) }) : L('readingSec', { s: n(s) });
  }

  function update(): void {
    status.textContent = '';
    const text = input.control.value;
    if (text.length > MAX_TEXT_LENGTH) {
      current = null;
      input.setError(L('tooLong', { max: n(MAX_TEXT_LENGTH) }));
      for (const v of values.values()) v.textContent = '—';
      message.textContent = '';
      return;
    }
    input.setError(null);
    const stats = analyzeText(text);
    current = text ? stats : null;
    for (const k of COUNTS) (values.get(k) as HTMLElement).textContent = n(stats[k]);
    (values.get('bytes') as HTMLElement).textContent = L('bytesValue', { n: n(stats.utf8Bytes) });
    (values.get('reading') as HTMLElement).textContent = readingText(stats.readingSeconds);
    message.textContent = !text ? L('empty') : stats.approximateCharacters ? L('approx') : '';
  }
  input.control.addEventListener('input', update);

  const copyBtn = h(
    'button',
    { type: 'button', class: 'btn btn-primary', id: 'count-copy' },
    icon('copy', 18),
    L('copy'),
  );
  copyBtn.addEventListener('click', async () => {
    if (!current) {
      status.textContent = L('copyEmpty');
      return;
    }
    const lines = [
      ...COUNTS.map((k) => `${L(k)}: ${n((current as TextStats)[k])}`),
      `${L('bytes')}: ${L('bytesValue', { n: n(current.utf8Bytes) })}`,
      `${L('reading')}: ${readingText(current.readingSeconds)}`,
    ];
    status.textContent = ctx.t((await copyText(lines.join('\n'))) ? 'copied' : 'copyFailed');
  });
  const resetBtn = h(
    'button',
    { type: 'button', class: 'btn', id: 'count-reset' },
    icon('reset', 18),
    ctx.t('reset'),
  );
  resetBtn.addEventListener('click', () => {
    input.control.value = '';
    ctx.memo.text = '';
    update();
    input.control.focus();
  });

  update();
  return h(
    'div',
    { class: 'tool-layout' },
    h('div', { class: 'tool-form' }, input.el),
    h(
      'section',
      { class: 'result', 'aria-labelledby': 'count-title' },
      h('h2', { class: 'result-title', id: 'count-title' }, L('counts')),
      list,
      message,
      h('div', { class: 'form-actions' }, copyBtn, resetBtn),
      status,
    ),
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4', { wpm: n(READING_WPM) }), L('n5')]),
  );
};
