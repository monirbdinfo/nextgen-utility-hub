import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;

function open(hash: string): HTMLElement {
  history.replaceState(null, '', `/${hash}`);
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}

const $ = <T extends Element = HTMLInputElement>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

function set(root: ParentNode, sel: string, value: string): void {
  const el = $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(root, sel);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function submit(root: ParentNode): void {
  $<HTMLFormElement>(root, 'form.tool-form').requestSubmit();
}

const resultText = (root: ParentNode): string =>
  $<HTMLElement>(root, '.result-body').textContent ?? '';
const text = (root: ParentNode, sel: string): string => $<HTMLElement>(root, sel).textContent ?? '';
const rowValue = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; // not implemented in jsdom
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.restoreAllMocks();
});

describe('tool pages', () => {
  it('render on direct load with title, breadcrumb and status', () => {
    const root = open('#/tool/age-calculator');
    expect($(root, 'h1').textContent).toBe('Age Calculator');
    expect(document.title).toBe('Age Calculator · NextGen Utility Hub');
    const crumbs = [...root.querySelectorAll('.breadcrumb li')].map((li) => li.textContent);
    expect(crumbs).toEqual(['Home', 'General Utilities', 'Age Calculator']);
    expect($(root, '.tool-badges .pill-available').textContent).toBe('Available');
    expect(root.querySelector('.hero')).toBeNull();
  });

  it('link available tools from their category', () => {
    const root = open('#/category/files');
    const items = [...root.querySelectorAll('.tool')];
    expect(items[0]?.id).toBe('tool-image-compressor');
    expect($<HTMLAnchorElement>(items[0]!, 'a').getAttribute('href')).toBe(
      '#/tool/image-compressor',
    );
  });

  it('show available counts on cards', () => {
    const root = open('');
    const counts = [...root.querySelectorAll('.card-count')].map((c) => c.textContent);
    expect(counts[0]).toBe('5 available tools');
    expect(counts[3]).toBe('9 available tools');
    expect(counts[4]).toBe('26 available tools');
  });

  it('starts at the top of home when leaving a tool via the breadcrumb', () => {
    const root = open('#/tool/date-formatter');
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(root.querySelectorAll('.card')).toHaveLength(6);
    expect(document.activeElement?.id).toBe('main');
  });

  it('navigates to the home sections from header links', () => {
    const root = open('#/tool/emi-calculator');
    $<HTMLAnchorElement>(root, '.nav a[href="#about"]').click();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(location.hash).toBe('#/');
    expect(document.activeElement?.id).toBe('about-title');
  });
});

describe('age calculator', () => {
  const tile = (root: ParentNode, group: string, label: string): string | undefined =>
    [...root.querySelectorAll(`.age-tiles-${group} .age-tile`)]
      .find((t) => t.querySelector('dt')?.textContent === label)
      ?.querySelector('dd')?.textContent ?? undefined;

  it('calculates age, totals and the next birthday', () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '1990-06-15');
    set(root, '#age-ref', '2026-10-02');
    submit(root);
    expect(text(root, '.age-result-body .sr-only')).toBe('Age: 36 years, 3 months, 17 days');
    expect(tile(root, 'main', 'Years')).toBe('36');
    expect(tile(root, 'main', 'Months')).toBe('3');
    expect(tile(root, 'main', 'Days')).toBe('17');
    expect(tile(root, 'main', 'Total months')).toBe('435');
    expect(tile(root, 'totals', 'Days')).toBe('13,258');
    expect(tile(root, 'totals', 'Weeks')).toBe('1,894');
    expect(tile(root, 'totals', 'Hours')).toBe('318,192');
    expect([...root.querySelectorAll('.age-tiles-totals dt')].map((d) => d.textContent)).toEqual([
      'Weeks',
      'Days',
      'Hours',
    ]);
    expect(text(root, '.age-bday-next .age-bday-date')).toBe('15 June 2027');
    expect(text(root, '.age-bday-next .age-bday-sub')).toBe('Tuesday · 256 days from now');
    expect(text(root, '.age-bday-will')).toContain('37 years old');
    expect(text(root, '.age-asof')).toBe('As of 2 Oct 2026');
  });

  it('quick dates set the “age on” date and recalculate', () => {
    const root = open('#/tool/age-calculator');
    const chip = (label: string): HTMLButtonElement =>
      [...root.querySelectorAll<HTMLButtonElement>('.age-quick .chip-btn')].find(
        (b) => b.textContent === label,
      )!;
    chip('My next birthday').click();
    expect(text(root, '.age-quick-status')).toBe('Enter a date of birth first.');
    expect(document.activeElement?.id).toBe('age-dob');
    set(root, '#age-dob', '2000-01-01');
    set(root, '#age-ref', '2026-05-05');
    chip('Today').click();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect($(root, '#age-ref').value).toBe(iso);
    expect(root.querySelector('.age-tiles-main')).not.toBeNull();
    chip('My next birthday').click();
    expect($(root, '#age-ref').value).toMatch(/^\d{4}-01-01$/);
    // On that date it is the birthday itself, so the greeting shows and the next one is a year on.
    expect(text(root, '.age-result-body')).toContain('Happy birthday!');
    expect(tile(root, 'main', 'Months')).toBe('0');
    expect(tile(root, 'main', 'Days')).toBe('0');
  });

  it('examples fill in a date of birth and calculate', () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-ref', '2026-01-01');
    const examples = [...root.querySelectorAll<HTMLButtonElement>('.age-example')];
    expect(examples.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Child: born 1 Jan 2015',
      'Student: born 15 Jun 2000',
      'Adult: born 17 Oct 1990',
      'Senior: born 5 May 1960',
    ]);
    examples[0]!.click();
    expect($(root, '#age-dob').value).toBe('2015-01-01');
    expect(tile(root, 'main', 'Years')).toBe('11');
  });

  it('shows the illustration, offline badges and its own related tools', () => {
    const root = open('#/tool/age-calculator');
    expect($(root, '.age-hero-art').getAttribute('aria-hidden')).toBe('true');
    expect([...root.querySelectorAll('.tool-badges .pill')].map((p) => p.textContent)).toEqual([
      'Available',
      'Runs in your browser',
      'Private',
      'No data stored',
    ]);
    expect(root.querySelector('nav.related')).toBeNull();
    expect([...root.querySelectorAll('.age-related-name')].map((n) => n.textContent)).toEqual([
      'Date Difference',
      'Loan EMI Calculator',
      'Bandwidth & Data Usage',
      'Unit Converter',
    ]);
  });

  it('opens its toolkit in the sidebar and marks the tool', () => {
    const root = open('#/tool/age-calculator');
    const sub = $(root, '#site-nav .side-sublist');
    expect([...sub.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      'Age Calculator',
      'Date Difference',
      'Loan EMI Calculator',
      'Bandwidth & Data Usage',
      'Unit Converter',
      'View all tools',
    ]);
    expect($(sub, '[aria-current="page"]').textContent).toBe('Age Calculator');
  });

  it('rejects a future date of birth and focuses the field', () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '2030-01-01');
    set(root, '#age-ref', '2026-10-02');
    submit(root);
    const dob = $(root, '#age-dob');
    expect(dob.getAttribute('aria-invalid')).toBe('true');
    expect(dob.getAttribute('aria-describedby')).toContain('age-dob-error');
    expect($(root, '#age-dob-error').textContent).toContain('can’t be after');
    expect(document.activeElement).toBe(dob);
  });

  it('requires a date of birth', () => {
    const root = open('#/tool/age-calculator');
    submit(root);
    expect($(root, '#age-dob-error').textContent).toBe('Enter a date.');
  });

  it('keeps input and result when switching language', async () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '1990-06-15');
    set(root, '#age-ref', '2026-10-02');
    submit(root);
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('বয়স ক্যালকুলেটর');
    expect($(root, '#age-dob').value).toBe('1990-06-15');
    expect(text(root, '.age-result-body')).toContain('৩৬ বছর, ৩ মাস, ১৭ দিন');
    expect(text(root, '.age-tiles-totals')).toContain('১৩,২৫৮');
    expect(text(root, '.age-bday-next .age-bday-date')).toBe('১৫ জুন ২০২৭');
    expect(document.title).toBe('বয়স ক্যালকুলেটর · নেক্সটজেন ইউটিলিটি হাব');
  });

  it('resets the form and result', () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '1990-06-15');
    submit(root);
    [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')]
      .find((b) => b.textContent === 'Reset')!
      .click();
    expect($(root, '#age-dob').value).toBe('');
    expect(root.querySelector('.age-tiles')).toBeNull();
    expect(document.activeElement?.id).toBe('age-dob');
  });

  it('copies the result', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '2000-01-01');
    set(root, '#age-ref', '2026-01-01');
    submit(root);
    [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')]
      .find((b) => b.textContent === 'Copy result')!
      .click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0]?.[0]).toContain('Age: 26 years, 0 months, 0 days');
    await vi.waitFor(() =>
      expect($(root, '.copy-status').textContent).toBe('Copied to clipboard.'),
    );
  });
});

describe('date difference', () => {
  it('swaps reversed dates and explains the convention', () => {
    const root = open('#/tool/date-difference');
    set(root, '#diff-start', '2026-03-10');
    set(root, '#diff-end', '2025-01-01');
    submit(root);
    expect(rowValue(root, 'Difference')).toBe('1 year, 2 months, 9 days');
    expect(rowValue(root, 'Total days')).toBe('433 days');
    expect(resultText(root)).toContain('swapped');
    expect(resultText(root)).toContain('End date not counted');
  });

  it('counts both days when inclusive', () => {
    const root = open('#/tool/date-difference');
    set(root, '#diff-start', '2026-05-05');
    set(root, '#diff-end', '2026-05-05');
    $(root, '#diff-inclusive').click();
    submit(root);
    expect(rowValue(root, 'Total days')).toBe('1 day');
  });
});

describe('EMI calculator', () => {
  it('calculates a standard EMI', () => {
    const root = open('#/tool/emi-calculator');
    set(root, '#emi-principal', '1,00,000');
    set(root, '#emi-rate', '12');
    set(root, '#emi-term', '12');
    set(root, '#emi-unit', 'months');
    submit(root);
    expect(rowValue(root, 'Monthly installment (EMI)')).toBe('৳ 8,884.88');
    expect(rowValue(root, 'Total interest')).toBe('৳ 6,618.55');
    expect(rowValue(root, 'Total repayment')).toBe('৳ 1,06,618.55');
    expect(resultText(root)).toContain('Estimate only');
  });

  it('accepts Bangla digits', () => {
    const root = open('#/tool/emi-calculator');
    set(root, '#emi-principal', '১২০০০০');
    set(root, '#emi-rate', '০');
    set(root, '#emi-term', '২');
    submit(root);
    expect(rowValue(root, 'Monthly installment (EMI)')).toBe('৳ 5,000.00');
  });

  it('validates each field', () => {
    const root = open('#/tool/emi-calculator');
    set(root, '#emi-principal', '-5');
    set(root, '#emi-rate', 'abc');
    submit(root);
    expect($(root, '#emi-principal-error').textContent).toBe(
      'The loan amount must be more than 0.',
    );
    expect($(root, '#emi-rate-error').textContent).toContain('Enter a number');
    expect($(root, '#emi-term-error').textContent).toBe('Enter a value.');
    set(root, '#emi-rate', '10');
    set(root, '#emi-term', '1');
    submit(root);
    expect($(root, '#emi-principal-error').textContent).toBe(
      'The loan amount must be more than 0.',
    );
    set(root, '#emi-principal', '1000');
    set(root, '#emi-term', '10');
    set(root, '#emi-unit', 'months');
    set(root, '#emi-frequency', 'quarterly');
    submit(root);
    expect($(root, '#emi-term-error').textContent).toContain('divide evenly');
  });
});

describe('digit converter', () => {
  it('converts as you type and preserves other text', () => {
    const root = open('#/tool/digit-converter');
    set(root, '#digits-input', 'ফোন: ০১৭১২-৩৪৫৬৭৮!');
    expect($<HTMLTextAreaElement>(root, '#digits-output').value).toBe('ফোন: 01712-345678!');
    expect($(root, '#digits-info').textContent).toBe('11 digits converted.');
    $(root, '#digits-dir-bn').click();
    set(root, '#digits-input', 'Room 12, ১৩ floor');
    expect($<HTMLTextAreaElement>(root, '#digits-output').value).toBe('Room ১২, ১৩ floor');
  });
});

describe('number and Taka words', () => {
  it('shows English and Bangla words', () => {
    const root = open('#/tool/number-to-words-bn');
    set(root, '#words-number', '1,23,456');
    submit(root);
    expect(rowValue(root, 'English')).toBe('One Lakh Twenty-Three Thousand Four Hundred Fifty-Six');
    expect(rowValue(root, 'Bangla')).toBe('এক লক্ষ তেইশ হাজার চার শত ছাপ্পান্ন'.normalize('NFC'));
    expect(rowValue(root, 'Digits (Bangla)')).toBe('১,২৩,৪৫৬');
  });

  it('switches the English scale', () => {
    const root = open('#/tool/number-to-words-bn');
    set(root, '#words-number', '1000000');
    set(root, '#words-scale', 'international');
    submit(root);
    expect(rowValue(root, 'English')).toBe('One Million');
    expect(rowValue(root, 'Digits (English)')).toBe('1,000,000');
  });

  it('reports malformed numbers', () => {
    const root = open('#/tool/number-to-words-bn');
    set(root, '#words-number', '1.2.3');
    submit(root);
    expect($(root, '#words-number-error').textContent).toContain('isn’t a valid number');
  });

  it('writes Taka with poisha and refuses to round', () => {
    const root = open('#/tool/taka-in-words');
    set(root, '#taka-amount', '৳ 1,250.5');
    submit(root);
    expect(rowValue(root, 'English')).toBe(
      'One Thousand Two Hundred Fifty Taka and Fifty Poisha Only',
    );
    expect(rowValue(root, 'Amount')).toBe('৳ 1,250.50');
    set(root, '#taka-amount', '10.555');
    submit(root);
    expect($(root, '#taka-amount-error').textContent).toContain('never rounds');
    set(root, '#taka-amount', '-5');
    submit(root);
    expect($(root, '#taka-amount-error').textContent).toBe('A Taka amount can’t be negative.');
  });
});

describe('date formatter', () => {
  it('lists all formats with copy buttons', () => {
    const root = open('#/tool/date-formatter');
    set(root, '#fmt-date', '2026-10-02');
    submit(root);
    expect(rowValue(root, 'Numeric (DD/MM/YYYY)')).toBe('02/10/2026');
    expect(rowValue(root, 'Bangla with weekday')).toBe('শুক্রবার, ২ অক্টোবর ২০২৬'.normalize('NFC'));
    expect(rowValue(root, 'In words (English)')).toBe('Two October Two Thousand Twenty-Six');
    expect(root.querySelectorAll('.result-row button')).toHaveLength(9);
    expect(resultText(root)).not.toContain('বৈশাখ');
  });
});

describe('Unicode text cleaner', () => {
  const u = (...cps: number[]): string => String.fromCodePoint(...cps);
  const ZWSP = u(0x200b);
  const ZWJ = u(0x200d);
  const NBSP = u(0x00a0);
  // কোড (KA + O-kar), ক্ষ (KA + hasanta + SSA), দাঁড়ি
  const BN = u(0x0995, 0x09cb, 0x09a1) + ' ' + u(0x0995, 0x09cd, 0x09b7) + u(0x0964);
  // jsdom's textarea.value setter turns CRLF into LF (as browsers do for script-set values),
  // so these tests use U+2028; e2e/unicode.spec.ts covers typed CRLF in a real browser.
  const LS = u(0x2028);
  const messy = `  Hello${ZWSP}   world${NBSP}${LS}${LS}${LS}${BN}  ${u(0x09b0)}${ZWJ}${u(0x09cd, 0x09af)}\n`;
  const out = (root: ParentNode): string => $<HTMLTextAreaElement>(root, '#clean-output').value;
  const notesText = (root: ParentNode): string =>
    $<HTMLElement>(root, '.result-notes').textContent ?? '';

  it('opens directly with defaults and an empty output', () => {
    const root = open('#/tool/unicode-cleaner');
    expect($(root, 'h1').textContent).toBe('Unicode Text Cleaner');
    expect($(root, '#clean-trimEnds').checked).toBe(true);
    expect($(root, '#clean-removeJoiners').checked).toBe(false);
    expect($(root, '#clean-removeBidi').checked).toBe(false);
    expect($(root, '#clean-norm-none').checked).toBe(true);
    expect($(root, '#clean-removeJoiners').getAttribute('aria-describedby')).toBe(
      'clean-removeJoiners-hint',
    );
    expect($(root, '#clean-output').closest('.field')?.hasAttribute('hidden')).toBe(true);
  });

  it('requires some text', () => {
    const root = open('#/tool/unicode-cleaner');
    submit(root);
    expect($(root, '#clean-input-error').textContent).toBe('Enter or paste some text to clean.');
    expect(document.activeElement?.id).toBe('clean-input');
  });

  it('counts input characters live', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', `ab\n${u(0x1f44d)}`);
    expect($(root, '#clean-input-count').textContent).toBe('4 characters · 2 lines');
  });

  it('cleans mixed Bangla and English and reports found vs removed vs kept', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', messy);
    submit(root);
    expect(out(root)).toBe(`Hello world\n\n${BN} ${u(0x09b0)}${ZWJ}${u(0x09cd, 0x09af)}`);
    const n = notesText(root);
    expect(n).toContain(
      'Zero-width characters (U+200B, U+2060, U+FEFF, U+00AD): 1 found, 1 removed',
    );
    expect(n).toContain('Zero-width joiners (U+200C ZWNJ, U+200D ZWJ): 1 found, kept');
    expect(n).toContain('Unusual spaces (such as non-breaking U+00A0): 1 found, 1 converted');
    expect(n).toContain('3 found, 3 converted'); // U+2028 line separators
    expect(rowValue(root, 'Characters')).toBe(`${[...messy].length} → ${[...out(root)].length}`);
  });

  it('applies only the selected options', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', messy);
    for (const id of [
      'trimEnds',
      'trimLineEnds',
      'collapseSpaces',
      'convertUnusualSpaces',
      'normalizeLineEndings',
      'removeZeroWidth',
      'removeControl',
    ]) {
      $(root, `#clean-${id}`).click();
    }
    set(root, '#clean-blankLines', 'keep');
    submit(root);
    expect(out(root)).toBe(messy);
    expect(notesText(root)).toContain('No changes were needed');
    $(root, '#clean-removeJoiners').click();
    submit(root);
    expect(out(root)).toBe(messy.replace(ZWJ, ''));
  });

  it('can join lines and normalize with NFKC', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', `${u(0xfb01)}rst line\nsecond ${u(0x2460)}`);
    $(root, '#clean-keepLineBreaks').click();
    $(root, '#clean-norm-NFKC').click();
    submit(root);
    expect(out(root)).toBe('first line second 1');
    expect(notesText(root)).toContain('Normalization (NFKC) changed');
  });

  it('explains whitespace-only input', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', ` \n\t${NBSP} `);
    submit(root);
    expect(out(root)).toBe('');
    expect(notesText(root)).toContain('only whitespace');
  });

  it('keeps input, options and result across a language switch', async () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', messy);
    $(root, '#clean-removeJoiners').click();
    $(root, '#clean-norm-NFC').click();
    submit(root);
    const cleaned = out(root);
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('ইউনিকোড টেক্সট ক্লিনার');
    expect($<HTMLTextAreaElement>(root, '#clean-input').value).toBe(messy);
    expect($(root, '#clean-removeJoiners').checked).toBe(true);
    expect($(root, '#clean-norm-NFC').checked).toBe(true);
    expect(out(root)).toBe(cleaned);
    expect(notesText(root)).toContain('পাওয়া গেছে');
  });

  it('copies the cleaned text, not the summary', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const root = open('#/tool/unicode-cleaner');
    const copyBtn = (): HTMLButtonElement =>
      [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')].find(
        (b) => b.textContent === 'Copy cleaned text',
      )!;
    copyBtn().click();
    await vi.waitFor(() =>
      expect($(root, '.copy-status').textContent).toBe('Clean some text first.'),
    );
    expect(writeText).not.toHaveBeenCalled();
    set(root, '#clean-input', `a${ZWSP}  b`);
    submit(root);
    copyBtn().click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('a b'));
  });

  it('resets text, options and result to defaults', () => {
    const root = open('#/tool/unicode-cleaner');
    set(root, '#clean-input', messy);
    $(root, '#clean-removeBidi').click();
    $(root, '#clean-trimEnds').click();
    $(root, '#clean-norm-NFKC').click();
    set(root, '#clean-blankLines', 'remove');
    submit(root);
    [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')]
      .find((b) => b.textContent === 'Reset')!
      .click();
    expect($<HTMLTextAreaElement>(root, '#clean-input').value).toBe('');
    expect($(root, '#clean-removeBidi').checked).toBe(false);
    expect($(root, '#clean-trimEnds').checked).toBe(true);
    expect($(root, '#clean-norm-none').checked).toBe(true);
    expect($<HTMLSelectElement>(root, '#clean-blankLines').value).toBe('collapse');
    expect(root.querySelector('.result-list')).toBeNull();
    expect(document.activeElement?.id).toBe('clean-input');
  });
});

describe('word and character counter', () => {
  const value = (root: ParentNode, key: string): string =>
    $<HTMLElement>(root, `#count-${key}`).textContent ?? '';

  it('starts empty with an explanation, and counts live as the user types', () => {
    const root = open('#/tool/text-counter');
    expect($(root, 'h1').textContent).toBe('Word & Character Counter');
    expect(value(root, 'words')).toBe('0');
    expect($(root, '#count-message').textContent).toBe('Start typing to see the counts.');
    set(root, '#count-input', 'Hello world. How are you?\n\nFine, thanks!');
    expect(value(root, 'characters')).toBe('40');
    expect(value(root, 'charactersNoSpaces')).toBe('33');
    expect(value(root, 'words')).toBe('7');
    expect(value(root, 'sentences')).toBe('3');
    expect(value(root, 'lines')).toBe('3');
    expect(value(root, 'paragraphs')).toBe('2');
    expect(value(root, 'bytes')).toBe('40 bytes');
    expect(value(root, 'reading')).toBe('about 2 s');
    expect($(root, '#count-message').textContent).toBe('');
    // Values change on every keystroke, so the list must not be a live region.
    expect(root.querySelector('.count-list [aria-live], .count-list[aria-live]')).toBeNull();
  });

  it('counts Bangla with Bangla digits and labels', () => {
    const root = open('#/tool/text-counter');
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    set(root, '#count-input', 'আমি বাংলায় গান গাই। ক্ষমা');
    expect($(root, 'h1').textContent).toBe('শব্দ ও অক্ষর গণনা');
    expect(value(root, 'words')).toBe('৫');
    expect(value(root, 'sentences')).toBe('২');
    expect(value(root, 'reading')).toBe('প্রায় ২ সেকেন্ড');
  });

  it('shows minutes for long texts and refuses text over the limit', () => {
    const root = open('#/tool/text-counter');
    set(root, '#count-input', 'word '.repeat(450));
    expect(value(root, 'words')).toBe('450');
    expect(value(root, 'reading')).toBe('about 2 min 15 s');
    set(root, '#count-input', 'x'.repeat(1_000_001));
    expect($(root, '#count-input-error').textContent).toBe(
      'The text is longer than 10,00,000 characters. Shorten it to see the counts.',
    );
    expect(value(root, 'words')).toBe('—');
    set(root, '#count-input', 'ok');
    expect($<HTMLElement>(root, '#count-input-error').hidden).toBe(true);
  });

  it('copies the counts, resets, and keeps the text across a language switch in memory only', async () => {
    const write = vi.fn((text: string) => Promise.resolve(void text));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
    const root = open('#/tool/text-counter');
    $<HTMLButtonElement>(root, '#count-copy').click();
    await vi.waitFor(() =>
      expect($(root, '.copy-status').textContent).toBe('There is nothing to copy yet.'),
    );
    set(root, '#count-input', 'One two.');
    $<HTMLButtonElement>(root, '#count-copy').click();
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0]?.[0]).toContain('Words: 2');
    expect(write.mock.calls[0]?.[0]).toContain('Reading time (estimate): about 1 s');
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    expect($<HTMLTextAreaElement>(root, '#count-input').value).toBe('One two.');
    expect(value(root, 'words')).toBe('২');
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
    $<HTMLButtonElement>(root, '#count-reset').click();
    expect($<HTMLTextAreaElement>(root, '#count-input').value).toBe('');
    expect(value(root, 'words')).toBe('০');
    expect(document.activeElement).toBe($(root, '#count-input'));
  });
});
