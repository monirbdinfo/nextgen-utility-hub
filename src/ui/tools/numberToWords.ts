import { toBanglaDigits, toEnglishDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import {
  MAX_FRACTION_DIGITS,
  numberToWords,
  parseNumberInput,
  type EnglishScale,
  type ParsedNumber,
} from '../../calc/numberWords';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { toolsByCategory, type Lang } from '../../registry';
import { toHash } from '../../router/router';
import { icon, type UiIcon } from '../icons';
import { TOOL_ICONS } from '../toolkits';
import { wordsStrings } from './wordsShared';
import {
  bindMemo,
  copyText,
  field,
  formActions,
  textInput,
  wireForm,
  type ResultPanel,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    formTitle: 'Enter number',
    formIntro: 'Type a number in Bangla or English digits.',
    number: 'Number',
    numberHint:
      'Bangla or English digits. Commas and spaces are ignored. Example: 12,34,567.89 or 1234567',
    clear: 'Clear the number',
    system: 'Number system for the English words',
    sysSouthAsian: 'Lakh and crore (1,00,000)',
    sysSouthAsianHint: 'Used in Bangladesh and India.',
    sysInternational: 'Million and billion (1,000,000)',
    sysInternationalHint: 'Used internationally. Bangla words always use লক্ষ and কোটি.',
    convert: 'Convert to words',
    swap: 'Swap digits',
    swapLabel: 'Swap the number between Bangla and English digits',
    swapped: 'Digits switched to {to}.',
    swapEmpty: 'Type a number first.',
    toBangla: 'Bangla digits',
    toEnglish: 'English digits',
    quick: 'Quick examples',
    useExample: 'Convert {n}',
    resultTitle: 'Result',
    empty: 'Enter a number and convert it to see the result.',
    tabs: 'Result language',
    tabBn: 'In Bangla words',
    tabEn: 'In English words',
    copy: 'Copy',
    copyBn: 'Copy the Bangla words',
    copyEn: 'Copy the English words',
    copied: 'Copied to clipboard.',
    copyFailed: 'Copy is not available in this browser. Select the text and copy it instead.',
    systemShown: 'English words: {system}',
    f1Title: 'Large numbers',
    f1: 'Whole numbers up to 15 digits, with up to 10 decimal places.',
    f2Title: 'Instant results',
    f2: 'Converted right here in your browser. Nothing is sent anywhere.',
    f3Title: 'Two number systems',
    f3: 'English words in lakh/crore or in million/billion. Bangla uses লক্ষ/কোটি.',
    f4Title: 'Copy and use',
    f4: 'Copy the words for cheques, forms and documents.',
    examplesTitle: 'Examples',
    examplesIntro: 'Choose an example to convert it. The words below come from this converter.',
    colNumber: 'Number',
    colBangla: 'Bangla words (লক্ষ/কোটি)',
    colEnglish: 'English words ({system})',
    lakhCrore: 'lakh/crore',
    millionBillion: 'million/billion',
    howTitle: 'How is this calculated?',
    how1: 'The number is split into groups (thousand, lakh, crore or million, billion) and each group is converted to words. This tool supports both the bangladesh, Indian numbering system (lakh and crore) and the international system (million and billion)',
    how2: 'Bangla always uses শত, হাজার, লক্ষ and কোটি; above 99 crore the crore count is itself written out (“এক লক্ষ কোটি”)'.
    useeTitle: 'Common uses',
    use1: 'Writing amounts on cheques and bank forms',
    use2: 'Official, legal and financial documents',
    use3: 'Job applications and government forms',
    use4: 'Invoices and reports',
    usesNote: 'For money in Taka and poisha, use Taka in Words.',
    relatedTitle: 'Related tools',
    relatedIntro: 'More in the Bangla Number & Text Toolkit.',
    'rel_digit-converter': 'Switch digits between Bangla and English',
    'rel_taka-in-words': 'Write a Taka amount in words',
    'rel_date-formatter': 'Write a date in Bangla or English',
    'rel_unicode-cleaner': 'Clean up spaces and hidden characters',
  },
  bn: {
    formTitle: 'সংখ্যা দিন',
    formIntro: 'বাংলা বা ইংরেজি অঙ্কে একটি সংখ্যা লিখুন।',
    number: 'সংখ্যা',
    numberHint:
      'বাংলা বা ইংরেজি অঙ্ক। কমা ও ফাঁকা জায়গা উপেক্ষা করা হয়। উদাহরণ: ১২,৩৪,৫৬৭.৮৯ বা ১২৩৪৫৬৭',
    clear: 'সংখ্যাটি মুছুন',
    system: 'ইংরেজি কথার সংখ্যা পদ্ধতি',
    sysSouthAsian: 'লাখ ও কোটি (1,00,000)',
    sysSouthAsianHint: 'বাংলাদেশ ও ভারতে প্রচলিত।',
    sysInternational: 'মিলিয়ন ও বিলিয়ন (1,000,000)',
    sysInternationalHint: 'আন্তর্জাতিকভাবে প্রচলিত। বাংলা কথায় সবসময় লক্ষ ও কোটি থাকে।',
    convert: 'কথায় রূপান্তর',
    swap: 'অঙ্ক বদলান',
    swapLabel: 'সংখ্যাটির অঙ্ক বাংলা ও ইংরেজির মধ্যে বদলান',
    swapped: 'অঙ্ক {to}-এ বদলানো হয়েছে।',
    swapEmpty: 'আগে একটি সংখ্যা লিখুন।',
    toBangla: 'বাংলা অঙ্ক',
    toEnglish: 'ইংরেজি অঙ্ক',
    quick: 'দ্রুত উদাহরণ',
    useExample: '{n} রূপান্তর করুন',
    resultTitle: 'ফলাফল',
    empty: 'একটি সংখ্যা লিখে রূপান্তর করুন, ফলাফল এখানে দেখা যাবে।',
    tabs: 'ফলাফলের ভাষা',
    tabBn: 'বাংলা কথায়',
    tabEn: 'ইংরেজি কথায়',
    copy: 'কপি',
    copyBn: 'বাংলা কথা কপি করুন',
    copyEn: 'ইংরেজি কথা কপি করুন',
    copied: 'ক্লিপবোর্ডে কপি হয়েছে।',
    copyFailed: 'এই ব্রাউজারে কপি করা যাচ্ছে না। লেখাটি সিলেক্ট করে কপি করুন।',
    systemShown: 'ইংরেজি কথা: {system}',
    f1Title: 'বড় সংখ্যা',
    f1: '১৫ অঙ্ক পর্যন্ত পূর্ণসংখ্যা, দশমিকের পরে সর্বোচ্চ ১০টি অঙ্ক।',
    f2Title: 'তাৎক্ষণিক ফলাফল',
    f2: 'আপনার ব্রাউজারেই রূপান্তর হয়। কিছুই কোথাও পাঠানো হয় না।',
    f3Title: 'দুই সংখ্যা পদ্ধতি',
    f3: 'ইংরেজি কথা লাখ/কোটি বা মিলিয়ন/বিলিয়নে। বাংলায় লক্ষ/কোটি।',
    f4Title: 'কপি করে ব্যবহার',
    f4: 'চেক, ফর্ম ও নথির জন্য কথাগুলো কপি করুন।',
    examplesTitle: 'উদাহরণ',
    examplesIntro: 'একটি উদাহরণ বেছে নিলে তা রূপান্তর হবে। নিচের কথাগুলো এই কনভার্টার থেকেই।',
    colNumber: 'সংখ্যা',
    colBangla: 'বাংলা কথায় (লক্ষ/কোটি)',
    colEnglish: 'ইংরেজি কথায় ({system})',
    lakhCrore: 'লাখ/কোটি',
    millionBillion: 'মিলিয়ন/বিলিয়ন',
    howTitle: 'কীভাবে হিসাব করা হয়?',
    how1: 'সংখ্যাটি যেমন লেখা তেমনই পড়া হয়: বাংলা অঙ্ক ইংরেজি অঙ্কে রূপান্তর হয়, কমা ও ফাঁকা জায়গা উপেক্ষা করা হয়, এবং একটি মাইনাস চিহ্ন ও একটি দশমিক বিন্দু চলে।',
    how2: 'পূর্ণ অংশটি বাছাই করা পদ্ধতিতে ভাগ করা হয়: হাজার, লক্ষ ও কোটি (প্রথম হাজারের পরে ২ অঙ্কের দল), অথবা থাউজ্যান্ড, মিলিয়ন ও বিলিয়ন (৩ অঙ্কের দল)। প্রতিটি দল কথায় লিখে তার এককের সঙ্গে জোড়া হয়।',
    how3: 'দশমিকের পরের অঙ্কগুলো একটি একটি করে পড়া হয় (১২.০৫ → “বারো দশমিক শূন্য পাঁচ”)। বাংলায় সবসময় শত, হাজার, লক্ষ ও কোটি; ৯৯ কোটির বেশি হলে কোটির সংখ্যাটিও কথায় লেখা হয় (“এক লক্ষ কোটি”)।',
    how4: 'বাংলা সংখ্যাবাচক শব্দে প্রচলিত প্রমিত বানান ব্যবহার করা হয়েছে; কিছু শব্দের আঞ্চলিক রূপও প্রচলিত (যেমন ঊনত্রিশ / উনত্রিশ)।',
    usesTitle: 'সাধারণ ব্যবহার',
    use1: 'চেক ও ব্যাংক ফর্মে অঙ্ক লেখা',
    use2: 'দাপ্তরিক, আইনি ও আর্থিক নথি',
    use3: 'চাকরির আবেদন ও সরকারি ফর্ম',
    use4: 'ইনভয়েস ও প্রতিবেদন',
    usesNote: 'টাকা ও পয়সার অঙ্কের জন্য “টাকা কথায়” টুল ব্যবহার করুন।',
    relatedTitle: 'সম্পর্কিত টুল',
    relatedIntro: 'বাংলা সংখ্যা ও টেক্সট টুলকিটের আরও টুল।',
    'rel_digit-converter': 'বাংলা ও ইংরেজি অঙ্ক বদলান',
    'rel_taka-in-words': 'টাকার অঙ্ক কথায় লিখুন',
    'rel_date-formatter': 'তারিখ বাংলা বা ইংরেজিতে লিখুন',
    'rel_unicode-cleaner': 'ফাঁকা জায়গা ও লুকানো অক্ষর পরিষ্কার করুন',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

/** Related tools with a short description of their own (others use the registry text). */
const RELATED_TEXT = new Set([
  'digit-converter',
  'taka-in-words',
  'date-formatter',
  'unicode-cleaner',
]);

const QUICK = ['1', '12', '100', '1000', '100000', '1234567', '10000000'];
const EXAMPLES = ['125', '1000', '12345', '125000', '10000000'];

/** Digits as written: "1,25,000" (lakh/crore) or "125,000" (international); Bangla digits for bn. */
function digitsOf(p: ParsedNumber, scale: EnglishScale, bangla: boolean): string {
  const s = `${p.negative ? '-' : ''}${groupDigits(p.integer, scale)}${p.fraction ? `.${p.fraction}` : ''}`;
  return bangla ? toBanglaDigits(s) : s;
}

/** Example digits in the page language (Bangla digits in Bangla), lakh/crore grouping. */
const exampleDigits = (lang: Lang, n: string): string =>
  lang === 'bn' ? toBanglaDigits(groupDigits(n)) : groupDigits(n);

interface Converted {
  bn: string;
  en: string;
  bnDigits: string;
  enDigits: string;
  scale: EnglishScale;
}

/** The result card: language tabs, a words panel per language, copy buttons. */
function resultCard(
  ctx: Parameters<ToolView>[0],
  L: L,
  copyStatus: HTMLElement,
): ResultPanel & { render(c: Converted): void } {
  const W = wordsStrings(ctx.lang);
  const body = h('div', { class: 'nw-result-body', 'aria-live': 'polite' });
  let text = '';
  // Which tab was chosen survives a language switch.
  let active: 'bn' | 'en' = ctx.memo.tab === 'en' ? 'en' : 'bn';

  const el = h(
    'section',
    { class: 'result nw-result', 'aria-labelledby': 'nw-result-title' },
    h(
      'div',
      { class: 'nw-result-head' },
      h('span', { class: 'nw-head-icon nw-tone-green' }, icon('check', 22)),
      h('h2', { id: 'nw-result-title', class: 'nw-card-title' }, L('resultTitle')),
    ),
    body,
    copyStatus,
  );

  const copyButton = (label: string, value: () => string): HTMLButtonElement => {
    const b = h(
      'button',
      { type: 'button', class: 'nw-copy', 'aria-label': label, title: label },
      icon('copy', 18),
    );
    b.addEventListener('click', async () => {
      copyStatus.textContent = L((await copyText(value())) ? 'copied' : 'copyFailed');
    });
    return b;
  };

  const clear = (): void => {
    text = '';
    copyStatus.textContent = '';
    body.replaceChildren(
      h(
        'div',
        { class: 'nw-empty' },
        h('span', { class: 'nw-empty-icon', 'aria-hidden': 'true' }, '🔢'),
        h('p', { class: 'result-empty' }, L('empty')),
      ),
    );
  };

  const render = (c: Converted): void => {
    const panels = {
      bn: { words: c.bn, digits: c.bnDigits, lang: 'bn', copy: L('copyBn') },
      en: { words: c.en, digits: c.enDigits, lang: 'en', copy: L('copyEn') },
    } as const;
    const tabs = (['bn', 'en'] as const).map((k) =>
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          id: `nw-tab-${k}`,
          class: 'nw-tab',
          'aria-controls': `nw-panel-${k}`,
          'aria-selected': String(k === active),
          tabindex: k === active ? '0' : '-1',
        },
        L(k === 'bn' ? 'tabBn' : 'tabEn'),
      ),
    );
    const panelEls = (['bn', 'en'] as const).map((k) => {
      const p = panels[k];
      return h(
        'div',
        {
          role: 'tabpanel',
          id: `nw-panel-${k}`,
          class: `nw-panel nw-panel-${k}`,
          'aria-labelledby': `nw-tab-${k}`,
          hidden: k === active ? undefined : '',
        },
        h(
          'div',
          { class: 'nw-words-row' },
          h('p', { class: 'nw-words', lang: p.lang }, p.words),
          copyButton(p.copy, () => p.words),
        ),
        h('p', { class: 'nw-digits', lang: p.lang }, `(${p.digits})`),
      );
    });
    const select = (k: 'bn' | 'en', focus: boolean): void => {
      active = k;
      ctx.memo.tab = k;
      tabs.forEach((t, i) => {
        const on = (i === 0 ? 'bn' : 'en') === k;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panelEls.forEach((p, i) => (p.hidden = (i === 0 ? 'bn' : 'en') !== k));
    };
    tabs.forEach((t, i) => {
      const k = i === 0 ? 'bn' : 'en';
      t.addEventListener('click', () => select(k, false));
      t.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          const next = e.key === 'Home' ? 'bn' : e.key === 'End' ? 'en' : k === 'bn' ? 'en' : 'bn';
          select(next, true);
        }
      });
    });
    body.replaceChildren(
      h('div', { class: 'nw-tabs', role: 'tablist', 'aria-label': L('tabs') }, ...tabs),
      ...panelEls,
      h(
        'p',
        { class: 'nw-system-note' },
        L('systemShown', {
          system: L(c.scale === 'international' ? 'millionBillion' : 'lakhCrore'),
        }),
      ),
    );
    text = [
      `${W('bangla')}: ${c.bn}`,
      `${W('english')}: ${c.en}`,
      `${W('digitsBn')}: ${c.bnDigits}`,
      `${W('digitsEn')}: ${c.enDigits}`,
    ].join('\n');
  };

  clear();
  return { el, show: () => undefined, clear, text: () => text, render };
}

export const numberToWordsTool: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const W = wordsStrings(ctx.lang);

  const formStatus = h('p', { class: 'nw-form-status', role: 'status' });

  // ---- Number input with a clear button inside the field ----
  const input = textInput({
    id: 'words-number',
    inputmode: 'decimal',
    required: '',
    autocomplete: 'off',
  });
  const num = field(L('number'), input, { hint: L('numberHint') });
  const clearBtn = h(
    'button',
    { type: 'button', class: 'nw-clear', 'aria-label': L('clear'), title: L('clear') },
    icon('close', 18),
  );
  const wrap = h('div', { class: 'nw-input-wrap' });
  input.replaceWith(wrap);
  wrap.append(input, clearBtn);
  bindMemo(input, ctx.memo, 'number');
  const syncClear = (): void => {
    clearBtn.hidden = !input.value;
  };
  input.addEventListener('input', () => {
    syncClear();
    // A swap or empty-input message no longer applies once the number is edited.
    formStatus.textContent = '';
  });

  // ---- Number system: two radio cards ----
  const current = (): EnglishScale =>
    ctx.memo.scale === 'international' ? 'international' : 'south-asian';
  const radios = (['south-asian', 'international'] as const).map((value) => {
    const radio = h('input', {
      type: 'radio',
      name: 'words-scale',
      id: `words-scale-${value}`,
      value,
      class: 'nw-radio-input',
    });
    radio.checked = current() === value;
    return radio;
  });
  const systemGroup = h(
    'fieldset',
    { class: 'nw-system' },
    h('legend', { class: 'field-label' }, L('system')),
    ...radios.map((radio) =>
      h(
        'label',
        { class: 'nw-radio', for: radio.id },
        radio,
        h(
          'span',
          { class: 'nw-radio-text' },
          h(
            'span',
            { class: 'nw-radio-title' },
            L(radio.value === 'international' ? 'sysInternational' : 'sysSouthAsian'),
          ),
          h(
            'span',
            { class: 'nw-radio-hint' },
            L(radio.value === 'international' ? 'sysInternationalHint' : 'sysSouthAsianHint'),
          ),
        ),
      ),
    ),
  );

  const copyStatus = h('p', { class: 'copy-status', role: 'status' });
  const panel = resultCard(ctx, L, copyStatus);

  const form = h(
    'form',
    { class: 'tool-form nw-form', 'aria-labelledby': 'nw-form-title' },
    h(
      'div',
      { class: 'nw-card-head' },
      h('span', { class: 'nw-head-icon nw-head-icon-solid' }, icon('words', 22)),
      h(
        'div',
        {},
        h('h2', { id: 'nw-form-title', class: 'nw-card-title' }, L('formTitle')),
        h('p', { class: 'nw-card-intro' }, L('formIntro')),
      ),
    ),
    h('div', { class: 'nw-inputs' }, num.el, systemGroup),
  );

  const convert = (): void => form.requestSubmit();
  const setNumber = (value: string): void => {
    input.value = value;
    ctx.memo.number = value;
    syncClear();
  };

  // ---- Actions: Convert, Reset, Copy result (shared), Swap ----
  const actions = formActions(ctx, {
    submitLabel: L('convert'),
    panel,
    onReset() {
      setNumber('');
      Object.assign(ctx.memo, { scale: 'south-asian', __done: '', tab: 'bn' });
      radios.forEach((r) => (r.checked = r.value === 'south-asian'));
      num.setError(null);
      formStatus.textContent = '';
      panel.clear();
      input.focus();
    },
  });
  actions.querySelector('button[type="submit"]')?.append(icon('arrow-right', 18));
  const swap = h(
    'button',
    { type: 'button', class: 'btn', 'aria-label': L('swapLabel'), title: L('swapLabel') },
    icon('swap', 18),
    L('swap'),
  );
  swap.addEventListener('click', () => {
    const v = input.value;
    if (!v.trim()) {
      formStatus.textContent = L('swapEmpty');
      return;
    }
    // Any Bangla digit present → switch to English digits; otherwise to Bangla digits.
    const toEnglish = /[০-৯]/.test(v);
    setNumber(toEnglish ? toEnglishDigits(v) : toBanglaDigits(v));
    formStatus.textContent = L('swapped', { to: L(toEnglish ? 'toEnglish' : 'toBangla') });
    if (ctx.memo.__done === '1') convert();
  });
  actions.append(swap);

  const quick = h(
    'div',
    { class: 'nw-quick', role: 'group', 'aria-labelledby': 'nw-quick-label' },
    h('span', { id: 'nw-quick-label', class: 'nw-quick-label' }, `${L('quick')}:`),
    ...QUICK.map((n) => {
      const shown = exampleDigits(ctx.lang, n);
      const b = h(
        'button',
        { type: 'button', class: 'chip-btn', 'aria-label': L('useExample', { n: shown }) },
        shown,
      );
      b.addEventListener('click', () => {
        setNumber(shown);
        convert();
      });
      return b;
    }),
  );
  form.append(actions, formStatus, quick);

  clearBtn.addEventListener('click', () => {
    setNumber('');
    num.setError(null);
    input.focus();
  });
  syncClear();

  // ---- Examples table (words generated by the converter) ----
  const examplesBody = h('tbody', {});
  const englishHead = h('th', { scope: 'col' });
  const renderExamples = (): void => {
    const scale = current();
    englishHead.textContent = L('colEnglish', {
      system: L(scale === 'international' ? 'millionBillion' : 'lakhCrore'),
    });
    examplesBody.replaceChildren(
      ...EXAMPLES.map((n) => {
        const shown = exampleDigits(ctx.lang, n);
        const bn = numberToWords(n, 'bn');
        const en = numberToWords(n, 'en', scale);
        const b = h(
          'button',
          { type: 'button', class: 'nw-example-btn', 'aria-label': L('useExample', { n: shown }) },
          shown,
        );
        b.addEventListener('click', () => {
          setNumber(shown);
          convert();
          input.scrollIntoView?.({ block: 'center' });
        });
        return h(
          'tr',
          {},
          h('td', { 'data-label': L('colNumber') }, b),
          h('td', { 'data-label': L('colBangla'), lang: 'bn' }, bn.ok ? bn.value : ''),
          h(
            'td',
            { 'data-label': englishHead.textContent ?? '', lang: 'en' },
            en.ok ? en.value : '',
          ),
        );
      }),
    );
  };

  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (!r.checked) return;
      ctx.memo.scale = r.value;
      renderExamples();
      if (ctx.memo.__done === '1') convert();
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const scale = current();
      const en = numberToWords(input.value, 'en', scale);
      const bn = numberToWords(input.value, 'bn');
      const p = parseNumberInput(input.value);
      if (!en.ok) return [[num, W(en.error, { max: MAX_FRACTION_DIGITS })]];
      if (!bn.ok || !p.ok)
        return [[num, W(bn.ok ? 'invalid' : bn.error, { max: MAX_FRACTION_DIGITS })]];
      panel.render({
        bn: bn.value,
        en: en.value,
        bnDigits: digitsOf(p.value, 'south-asian', true),
        enDigits: digitsOf(p.value, scale, false),
        scale,
      });
      return null;
    },
    [num],
  );

  renderExamples();

  // ---- Information sections ----
  const features: Array<[UiIcon, string, string, string]> = [
    ['layers', 'green', L('f1Title'), L('f1')],
    ['bolt', 'amber', L('f2Title'), L('f2')],
    ['globe', 'blue', L('f3Title'), L('f3')],
    ['copy', 'rose', L('f4Title'), L('f4')],
  ];
  const related = toolsByCategory('bangla').filter(
    (t) => t.id !== 'number-to-words-bn' && t.status === 'available',
  );

  return h(
    'div',
    { class: 'nw-page', 'data-own-related': 'true' },
    h('div', { class: 'tool-layout nw-main' }, form, panel.el),
    h(
      'ul',
      { class: 'nw-features', role: 'list' },
      ...features.map(([name, tone, title, text]) =>
        h(
          'li',
          { class: 'nw-feature' },
          h('span', { class: `nw-feature-icon nw-tone-${tone}` }, icon(name, 22)),
          h('div', {}, h('h3', {}, title), h('p', {}, text)),
        ),
      ),
    ),
    h(
      'div',
      { class: 'nw-info' },
      h(
        'section',
        { class: 'nw-panel-card nw-examples', 'aria-labelledby': 'nw-examples-title' },
        h(
          'div',
          { class: 'nw-panel-head' },
          h('span', { class: 'nw-emoji', 'aria-hidden': 'true' }, '💡'),
          h(
            'div',
            {},
            h('h2', { id: 'nw-examples-title' }, L('examplesTitle')),
            h('p', {}, L('examplesIntro')),
          ),
        ),
        h(
          'table',
          { class: 'nw-table' },
          h('caption', { class: 'sr-only' }, L('examplesTitle')),
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              h('th', { scope: 'col' }, L('colNumber')),
              h('th', { scope: 'col' }, L('colBangla')),
              englishHead,
            ),
          ),
          examplesBody,
        ),
      ),
      h(
        'div',
        { class: 'nw-side' },
        h(
          'section',
          { class: 'nw-panel-card nw-how', 'aria-labelledby': 'nw-how-title' },
          h('span', { class: 'nw-head-icon nw-tone-blue' }, icon('info', 22)),
          h(
            'div',
            {},
            h('h2', { id: 'nw-how-title' }, L('howTitle')),
            ...(['how1', 'how2', 'how3', 'how4'] as const).map((k) => h('p', {}, L(k))),
          ),
        ),
        h(
          'section',
          { class: 'nw-panel-card nw-uses', 'aria-labelledby': 'nw-uses-title' },
          h('span', { class: 'nw-head-icon nw-tone-green' }, icon('check', 22)),
          h(
            'div',
            {},
            h('h2', { id: 'nw-uses-title' }, L('usesTitle')),
            h(
              'ul',
              { class: 'nw-checks', role: 'list' },
              ...(['use1', 'use2', 'use3', 'use4'] as const).map((k) =>
                h('li', {}, icon('check', 16), L(k)),
              ),
            ),
            h('p', {}, L('usesNote')),
          ),
        ),
      ),
    ),
    related.length
      ? h(
          'nav',
          { class: 'nw-panel-card nw-related', 'aria-labelledby': 'nw-related-title' },
          h(
            'div',
            { class: 'nw-panel-head' },
            h('span', { class: 'nw-head-icon nw-tone-violet' }, icon('grid', 22)),
            h(
              'div',
              {},
              h('h2', { id: 'nw-related-title' }, L('relatedTitle')),
              h('p', {}, L('relatedIntro')),
            ),
          ),
          h(
            'ul',
            { class: 'nw-related-list', role: 'list' },
            ...related.map((t) =>
              h(
                'li',
                {},
                h(
                  'a',
                  { href: toHash({ name: 'tool', id: t.id }), class: 'nw-related-link' },
                  h(
                    'span',
                    { class: 'nw-related-icon card-icon card-bangla' },
                    icon(TOOL_ICONS[t.id] ?? 'toolbox', 18),
                  ),
                  h(
                    'span',
                    { class: 'nw-related-text' },
                    h('span', { class: 'nw-related-name' }, t.name[ctx.lang]),
                    h(
                      'span',
                      { class: 'nw-related-desc' },
                      RELATED_TEXT.has(t.id) ? L(`rel_${t.id}` as Key) : t.description[ctx.lang],
                    ),
                  ),
                  icon('arrow-right', 16),
                ),
              ),
            ),
          ),
        )
      : null,
  );
};
