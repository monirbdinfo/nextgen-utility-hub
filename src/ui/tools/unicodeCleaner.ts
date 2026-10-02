import { formatInteger } from '../../calc/format';
import {
  cleanText,
  DEFAULT_CLEAN_OPTIONS,
  MAX_INPUT_LENGTH,
  stats,
  type BlankLineMode,
  type CleanOptions,
  type CleanResult,
  type NormalizationForm,
} from '../../calc/textClean';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  wireForm,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    input: 'Text to clean',
    inputHint:
      'Paste Bangla, English or mixed text. Nothing is changed until you press “Clean text”.',
    count: '{chars} characters · {lines} lines',
    output: 'Cleaned text',
    clean: 'Clean text',
    copyOutput: 'Copy cleaned text',
    nothingToCopy: 'Clean some text first.',
    empty: 'Enter or paste some text to clean.',
    tooLong: 'The text is too long. Up to {max} characters can be cleaned at once.',
    whitespace: 'Spaces and lines',
    trimEnds: 'Trim spaces and blank lines at the start and end',
    trimLineEnds: 'Remove spaces at the end of each line',
    collapseSpaces: 'Replace repeated spaces with one space',
    convertUnusualSpaces: 'Convert non-breaking and other unusual spaces to normal spaces',
    normalizeLineEndings:
      'Convert line endings to LF (Windows CRLF, old Mac CR, U+0085, U+2028, U+2029)',
    blankLines: 'Blank lines',
    blankKeep: 'Keep all blank lines',
    blankCollapse: 'Keep paragraph breaks (at most one blank line)',
    blankRemove: 'Remove all blank lines',
    keep: 'Keep',
    keepTabs: 'Keep tabs (untick to turn tabs into spaces)',
    keepLineBreaks: 'Keep line breaks (untick to join all lines into one)',
    invisible: 'Invisible and control characters',
    removeZeroWidth: 'Remove zero-width spaces, word joiners, BOM and soft hyphens',
    removeControl: 'Remove control characters (tab and line breaks are kept)',
    removeJoiners: 'Remove zero-width joiners (ZWJ and ZWNJ)',
    removeJoinersHint:
      'Caution: Bangla uses these to control conjuncts (for example র + ZWJ + ্ + য for ra-phala) and emoji use ZWJ to combine 👨 👩 👧 into one family. Removing them can change how text looks.',
    removeBidi: 'Remove direction marks and bidi controls',
    removeBidiHint:
      'Caution: these are needed in Arabic, Urdu or Hebrew text. In Bangla/English text they are usually stray, and hidden bidi overrides can make text display in a misleading order.',
    normalization: 'Unicode normalization',
    normNone: 'None (recommended for most text)',
    normNfc: 'NFC — combine characters into their standard composed form',
    normNfcHint:
      'Text looks the same. In Bangla, য়/ড়/ঢ় are stored as letter + nukta (a Unicode rule), and split vowel signs such as ো are combined.',
    normNfkc: 'NFKC — also replace compatibility characters',
    normNfkcHint:
      'Changes how some text looks or means: ﬁ → fi, ① → 1, Ａ → A, x² → x2. Not suitable for every task.',
    characters: 'Characters',
    lines: 'Lines',
    beforeAfter: '{before} → {after}',
    summary: 'What was found',
    found: '{what}: {n} found, {done}',
    removed: '{n} removed',
    converted: '{n} converted',
    keptOff: 'kept (option is off)',
    keptJoiners: 'kept (option is off — may be needed in Bangla or emoji)',
    keptBidi: 'kept (option is off — may be needed in right-to-left text)',
    zeroWidth: 'Zero-width characters (U+200B, U+2060, U+FEFF, U+00AD)',
    joiners: 'Zero-width joiners (U+200C ZWNJ, U+200D ZWJ)',
    bidi: 'Direction marks and bidi controls',
    control: 'Control characters',
    unusualSpaces: 'Unusual spaces (such as non-breaking U+00A0)',
    lineEndings: 'Non-LF line endings (CRLF, CR, U+0085, U+2028, U+2029)',
    tabs: 'Tabs',
    notNfc: 'The text is not in NFC form (some characters are stored decomposed).',
    normalized: 'Normalization ({form}) changed how some characters are stored.',
    nothingFound: 'No invisible, control or unusual whitespace characters were found.',
    unchanged: 'No changes were needed with the selected options.',
    onlyWhitespace: 'The text contained only whitespace, so the cleaned result is empty.',
    n1: 'Operations run in a fixed order: normalization, line endings, invisible and control characters, spaces and tabs, joining lines, line ends and repeated spaces, blank lines, and finally trimming the whole text. Running the tool twice with the same options gives the same result.',
    n2: 'Bangla letters, vowel signs (কার), ফলা, যুক্তাক্ষর, hasanta, nukta, chandrabindu and punctuation are never removed. Only the characters listed in each option are affected.',
    n3: 'Characters are counted as Unicode code points: a conjunct such as ক্ষ counts as 3 and 👍🏽 as 2.',
    n4: 'Your text is processed only in this browser tab. It is not uploaded, stored or logged.',
  },
  bn: {
    input: 'যে লেখা পরিষ্কার করবেন',
    inputHint:
      'বাংলা, ইংরেজি বা মিশ্র লেখা পেস্ট করুন। “লেখা পরিষ্কার করুন” না চাপা পর্যন্ত কিছুই বদলাবে না।',
    count: '{chars}টি অক্ষর · {lines}টি লাইন',
    output: 'পরিষ্কার করা লেখা',
    clean: 'লেখা পরিষ্কার করুন',
    copyOutput: 'পরিষ্কার লেখা কপি করুন',
    nothingToCopy: 'আগে লেখা পরিষ্কার করুন।',
    empty: 'পরিষ্কার করার জন্য লেখা দিন বা পেস্ট করুন।',
    tooLong: 'লেখাটি খুব বড়। একবারে সর্বোচ্চ {max} অক্ষর পরিষ্কার করা যায়।',
    whitespace: 'স্পেস ও লাইন',
    trimEnds: 'শুরু ও শেষের স্পেস ও ফাঁকা লাইন মুছুন',
    trimLineEnds: 'প্রতিটি লাইনের শেষের স্পেস মুছুন',
    collapseSpaces: 'একাধিক স্পেসের জায়গায় একটি স্পেস রাখুন',
    convertUnusualSpaces: 'নন-ব্রেকিং ও অন্যান্য অস্বাভাবিক স্পেসকে সাধারণ স্পেসে রূপান্তর করুন',
    normalizeLineEndings:
      'লাইন শেষের চিহ্ন LF-এ রূপান্তর করুন (Windows CRLF, পুরোনো Mac CR, U+0085, U+2028, U+2029)',
    blankLines: 'ফাঁকা লাইন',
    blankKeep: 'সব ফাঁকা লাইন রাখুন',
    blankCollapse: 'অনুচ্ছেদের বিরতি রাখুন (সর্বোচ্চ একটি ফাঁকা লাইন)',
    blankRemove: 'সব ফাঁকা লাইন মুছুন',
    keep: 'যা রাখবেন',
    keepTabs: 'ট্যাব রাখুন (টিক তুলে দিলে ট্যাব স্পেসে বদলাবে)',
    keepLineBreaks: 'লাইন ব্রেক রাখুন (টিক তুলে দিলে সব লাইন এক লাইনে জুড়বে)',
    invisible: 'অদৃশ্য ও কন্ট্রোল অক্ষর',
    removeZeroWidth: 'জিরো-উইডথ স্পেস, ওয়ার্ড জয়নার, BOM ও সফট হাইফেন মুছুন',
    removeControl: 'কন্ট্রোল অক্ষর মুছুন (ট্যাব ও লাইন ব্রেক থাকবে)',
    removeJoiners: 'জিরো-উইডথ জয়নার (ZWJ ও ZWNJ) মুছুন',
    removeJoinersHint:
      'সাবধান: বাংলায় যুক্তাক্ষর নিয়ন্ত্রণে এগুলো লাগে (যেমন র + ZWJ + ্ + য দিয়ে র-ফলা), আর ইমোজিতে ZWJ দিয়ে 👨 👩 👧 মিলে একটি পরিবার হয়। মুছলে লেখার চেহারা বদলাতে পারে।',
    removeBidi: 'দিক নির্দেশক চিহ্ন ও বাইডাই কন্ট্রোল মুছুন',
    removeBidiHint:
      'সাবধান: আরবি, উর্দু বা হিব্রু লেখায় এগুলো দরকার। বাংলা/ইংরেজি লেখায় সাধারণত এগুলো অপ্রয়োজনীয়, আর লুকানো বাইডাই ওভাররাইড লেখাকে বিভ্রান্তিকর ক্রমে দেখাতে পারে।',
    normalization: 'ইউনিকোড নরমালাইজেশন',
    normNone: 'কিছু নয় (বেশিরভাগ লেখার জন্য উপযুক্ত)',
    normNfc: 'NFC — অক্ষরগুলোকে প্রমিত যুক্ত (composed) রূপে আনে',
    normNfcHint:
      'লেখা দেখতে একই থাকে। বাংলায় য়/ড়/ঢ় ইউনিকোড নিয়মে অক্ষর + নুক্তা হিসেবে সংরক্ষিত হয়, আর ভাঙা কার যেমন ো জুড়ে যায়।',
    normNfkc: 'NFKC — কম্প্যাটিবিলিটি অক্ষরও বদলায়',
    normNfkcHint:
      'কিছু লেখার চেহারা বা অর্থ বদলায়: ﬁ → fi, ① → 1, Ａ → A, x² → x2। সব কাজের জন্য উপযুক্ত নয়।',
    characters: 'অক্ষর',
    lines: 'লাইন',
    beforeAfter: '{before} → {after}',
    summary: 'যা পাওয়া গেছে',
    found: '{what}: {n}টি পাওয়া গেছে, {done}',
    removed: '{n}টি মুছে ফেলা হয়েছে',
    converted: '{n}টি রূপান্তর করা হয়েছে',
    keptOff: 'রাখা হয়েছে (অপশন বন্ধ)',
    keptJoiners: 'রাখা হয়েছে (অপশন বন্ধ — বাংলা বা ইমোজিতে দরকার হতে পারে)',
    keptBidi: 'রাখা হয়েছে (অপশন বন্ধ — ডান-থেকে-বাম লেখায় দরকার হতে পারে)',
    zeroWidth: 'জিরো-উইডথ অক্ষর (U+200B, U+2060, U+FEFF, U+00AD)',
    joiners: 'জিরো-উইডথ জয়নার (U+200C ZWNJ, U+200D ZWJ)',
    bidi: 'দিক নির্দেশক চিহ্ন ও বাইডাই কন্ট্রোল',
    control: 'কন্ট্রোল অক্ষর',
    unusualSpaces: 'অস্বাভাবিক স্পেস (যেমন নন-ব্রেকিং U+00A0)',
    lineEndings: 'LF ছাড়া অন্য লাইন শেষের চিহ্ন (CRLF, CR, U+0085, U+2028, U+2029)',
    tabs: 'ট্যাব',
    notNfc: 'লেখাটি NFC রূপে নেই (কিছু অক্ষর ভাঙা রূপে সংরক্ষিত)।',
    normalized: 'নরমালাইজেশন ({form}) কিছু অক্ষরের সংরক্ষণ-রূপ বদলেছে।',
    nothingFound: 'কোনো অদৃশ্য, কন্ট্রোল বা অস্বাভাবিক স্পেস পাওয়া যায়নি।',
    unchanged: 'নির্বাচিত অপশনে কোনো পরিবর্তনের দরকার হয়নি।',
    onlyWhitespace: 'লেখায় শুধু ফাঁকা জায়গা ছিল, তাই পরিষ্কার করা ফলাফল খালি।',
    n1: 'কাজগুলো নির্দিষ্ট ক্রমে হয়: নরমালাইজেশন, লাইন শেষের চিহ্ন, অদৃশ্য ও কন্ট্রোল অক্ষর, স্পেস ও ট্যাব, লাইন জোড়া, লাইনের শেষ ও একাধিক স্পেস, ফাঁকা লাইন, শেষে পুরো লেখার শুরু-শেষ। একই অপশনে দুবার চালালেও ফল একই থাকে।',
    n2: 'বাংলা বর্ণ, কার, ফলা, যুক্তাক্ষর, হসন্ত, নুক্তা, চন্দ্রবিন্দু ও যতিচিহ্ন কখনো মোছা হয় না। প্রতিটি অপশনে উল্লেখ করা অক্ষরগুলোই শুধু প্রভাবিত হয়।',
    n3: 'অক্ষর গোনা হয় ইউনিকোড কোড পয়েন্ট হিসেবে: ক্ষ-এর মতো যুক্তাক্ষর ৩টি এবং 👍🏽 ২টি।',
    n4: 'আপনার লেখা শুধু এই ব্রাউজার ট্যাবে প্রসেস হয়। এটি আপলোড, সংরক্ষণ বা লগ করা হয় না।',
  },
});

type BoolOption = Exclude<keyof CleanOptions, 'blankLines' | 'normalization'>;
const bit = (v: boolean): string => (v ? '1' : '0');

export const unicodeCleaner: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const n = (x: number): string => formatInteger(x, ctx.lang);

  // ----- Input -----
  const input = field(
    L('input'),
    h('textarea', {
      id: 'clean-input',
      class: 'input textarea textarea-lg',
      rows: '10',
      spellcheck: 'false',
    }),
    { hint: L('inputHint') },
  );
  bindMemo(input.control, ctx.memo, 'text');
  const counter = h('p', {
    id: 'clean-input-count',
    class: 'field-hint counter',
    'aria-live': 'off',
  });
  input.el.append(counter);
  const updateCount = (): void => {
    const s = stats(input.control.value);
    counter.textContent = L('count', { chars: n(s.characters), lines: n(s.lines) });
  };
  input.control.addEventListener('input', updateCount);

  // ----- Options -----
  const boxes = new Map<BoolOption, HTMLInputElement>();
  const option = (key: BoolOption, label: string, hint?: string): HTMLElement => {
    const box = h('input', {
      type: 'checkbox',
      class: 'check-input',
      id: `clean-${key}`,
      name: key,
    });
    bindMemo(box, ctx.memo, key, bit(DEFAULT_CLEAN_OPTIONS[key]));
    boxes.set(key, box);
    const hintEl = hint
      ? h('p', { id: `clean-${key}-hint`, class: 'field-hint check-hint' }, hint)
      : null;
    if (hintEl) box.setAttribute('aria-describedby', hintEl.id);
    return h(
      'div',
      { class: 'check-block' },
      h('div', { class: 'check' }, box, h('label', { for: box.id }, label)),
      hintEl,
    );
  };
  const group = (legend: string, ...children: HTMLElement[]): HTMLElement =>
    h(
      'fieldset',
      { class: 'option-group' },
      h('legend', { class: 'field-label' }, legend),
      ...children,
    );

  const blank = field(
    L('blankLines'),
    select(
      [
        ['collapse', L('blankCollapse')],
        ['remove', L('blankRemove')],
        ['keep', L('blankKeep')],
      ],
      { id: 'clean-blankLines' },
    ),
  );
  bindMemo(blank.control, ctx.memo, 'blankLines', DEFAULT_CLEAN_OPTIONS.blankLines);

  const forms: Array<[NormalizationForm, string, string | null]> = [
    ['none', L('normNone'), null],
    ['NFC', L('normNfc'), L('normNfcHint')],
    ['NFKC', L('normNfkc'), L('normNfkcHint')],
  ];
  const currentForm = (): NormalizationForm =>
    (ctx.memo.normalization as NormalizationForm | undefined) ??
    DEFAULT_CLEAN_OPTIONS.normalization;
  const radios = forms.map(([value, label, hint]) => {
    const r = h('input', {
      type: 'radio',
      name: 'clean-normalization',
      id: `clean-norm-${value}`,
      value,
      class: 'check-input',
    });
    r.checked = currentForm() === value;
    r.addEventListener('change', () => (ctx.memo.normalization = value));
    const hintEl = hint
      ? h('p', { id: `${r.id}-hint`, class: 'field-hint check-hint' }, hint)
      : null;
    if (hintEl) r.setAttribute('aria-describedby', hintEl.id);
    return {
      r,
      el: h(
        'div',
        { class: 'check-block' },
        h('div', { class: 'check' }, r, h('label', { for: r.id }, label)),
        hintEl,
      ),
    };
  });

  const readOptions = (): CleanOptions => {
    const b = (k: BoolOption): boolean => boxes.get(k)?.checked ?? DEFAULT_CLEAN_OPTIONS[k];
    return {
      trimEnds: b('trimEnds'),
      trimLineEnds: b('trimLineEnds'),
      collapseSpaces: b('collapseSpaces'),
      convertUnusualSpaces: b('convertUnusualSpaces'),
      normalizeLineEndings: b('normalizeLineEndings'),
      keepTabs: b('keepTabs'),
      keepLineBreaks: b('keepLineBreaks'),
      removeZeroWidth: b('removeZeroWidth'),
      removeControl: b('removeControl'),
      removeJoiners: b('removeJoiners'),
      removeBidi: b('removeBidi'),
      blankLines: blank.control.value as BlankLineMode,
      normalization: currentForm(),
    };
  };

  // ----- Output -----
  const output = field(
    L('output'),
    h('textarea', {
      id: 'clean-output',
      class: 'input textarea textarea-lg',
      rows: '10',
      readonly: '',
      spellcheck: 'false',
    }),
  );
  const outCount = h('p', { id: 'clean-output-count', class: 'field-hint counter' });
  output.el.append(outCount);
  const panel = resultPanel(ctx, L('clean'), { prepend: output.el });
  output.el.hidden = true;

  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': L('clean') },
    input.el,
    group(
      L('whitespace'),
      option('trimEnds', L('trimEnds')),
      option('trimLineEnds', L('trimLineEnds')),
      option('collapseSpaces', L('collapseSpaces')),
      option('convertUnusualSpaces', L('convertUnusualSpaces')),
      option('normalizeLineEndings', L('normalizeLineEndings')),
      blank.el,
    ),
    group(
      L('keep'),
      option('keepTabs', L('keepTabs')),
      option('keepLineBreaks', L('keepLineBreaks')),
    ),
    group(
      L('invisible'),
      option('removeZeroWidth', L('removeZeroWidth')),
      option('removeControl', L('removeControl')),
      option('removeJoiners', L('removeJoiners'), L('removeJoinersHint')),
      option('removeBidi', L('removeBidi'), L('removeBidiHint')),
    ),
    group(L('normalization'), ...radios.map((x) => x.el)),
  );
  form.append(
    formActions(ctx, {
      submitLabel: L('clean'),
      panel,
      copy: {
        label: L('copyOutput'),
        text: () => output.control.value,
        emptyMessage: L('nothingToCopy'),
      },
      onReset() {
        input.control.value = '';
        for (const [key, box] of boxes) box.checked = DEFAULT_CLEAN_OPTIONS[key];
        blank.control.value = DEFAULT_CLEAN_OPTIONS.blankLines;
        for (const x of radios) x.r.checked = x.r.value === DEFAULT_CLEAN_OPTIONS.normalization;
        for (const k of Object.keys(ctx.memo)) delete ctx.memo[k];
        output.control.value = '';
        output.el.hidden = true;
        input.setError(null);
        panel.clear();
        updateCount();
        input.control.focus();
      },
    }),
  );

  function summary(r: CleanResult, o: CleanOptions): string[] {
    const d = r.detected;
    const c = r.changed;
    const lines: string[] = [];
    const add = (what: string, found: number, done: string): void => {
      if (found) lines.push(L('found', { what, n: n(found), done }));
    };
    const removedOr = (enabled: boolean, count: number, kept: string): string =>
      enabled ? L('removed', { n: n(count) }) : kept;
    add(
      L('zeroWidth'),
      d.zeroWidth,
      removedOr(o.removeZeroWidth, c.zeroWidthRemoved, L('keptOff')),
    );
    add(L('joiners'), d.joiners, removedOr(o.removeJoiners, c.joinersRemoved, L('keptJoiners')));
    add(L('bidi'), d.bidi, removedOr(o.removeBidi, c.bidiRemoved, L('keptBidi')));
    add(L('control'), d.control, removedOr(o.removeControl, c.controlRemoved, L('keptOff')));
    add(
      L('unusualSpaces'),
      d.unusualSpaces,
      o.convertUnusualSpaces ? L('converted', { n: n(c.unusualSpacesConverted) }) : L('keptOff'),
    );
    add(
      L('lineEndings'),
      d.crlf + d.cr + d.unicodeLineSeparators,
      o.normalizeLineEndings ? L('converted', { n: n(c.lineEndingsConverted) }) : L('keptOff'),
    );
    add(L('tabs'), d.tabs, o.keepTabs ? L('keptOff') : L('converted', { n: n(c.tabsConverted) }));
    if (d.notNFC && o.normalization === 'none') lines.push(L('notNfc'));
    if (c.normalized) lines.push(L('normalized', { form: o.normalization }));
    if (!lines.length) lines.push(L('nothingFound'));
    return lines;
  }

  wireForm(
    form,
    ctx.memo,
    () => {
      const text = input.control.value;
      if (text === '') return [[input, L('empty')]];
      if (text.length > MAX_INPUT_LENGTH)
        return [[input, L('tooLong', { max: n(MAX_INPUT_LENGTH) })]];
      const o = readOptions();
      const r = cleanText(text, o);
      output.control.value = r.text;
      output.el.hidden = false;
      outCount.textContent = L('count', { chars: n(r.after.characters), lines: n(r.after.lines) });
      const extra = summary(r, o);
      if (r.text === text) extra.push(L('unchanged'));
      else if (r.text === '' && text.trim() === '') extra.push(L('onlyWhitespace'));
      panel.show(
        [
          {
            label: L('characters'),
            value: L('beforeAfter', {
              before: n(r.before.characters),
              after: n(r.after.characters),
            }),
            primary: true,
          },
          {
            label: L('lines'),
            value: L('beforeAfter', { before: n(r.before.lines), after: n(r.after.lines) }),
          },
        ],
        extra,
      );
      return null;
    },
    [input],
  );

  updateCount();
  return h(
    'div',
    { class: 'tool-layout tool-layout-stacked' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')]),
  );
};
