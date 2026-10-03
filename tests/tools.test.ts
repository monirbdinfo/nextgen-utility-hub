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

  it('do not open for planned tools', () => {
    const root = open('#/tool/pdf-merge');
    expect(root.querySelector('#tool-title')).toBeNull();
    expect(root.querySelectorAll('.card')).toHaveLength(5);
  });

  it('link available tools from their category and keep planned ones unlinked', () => {
    const root = open('#/category/general');
    const items = [...root.querySelectorAll('.tool')];
    expect(items[0]?.id).toBe('tool-age-calculator');
    expect($<HTMLAnchorElement>(items[0]!, 'a').getAttribute('href')).toBe('#/tool/age-calculator');
    const planned = items.filter((i) => i.querySelector('.pill')?.textContent === 'Planned');
    expect(planned.length).toBeGreaterThan(0);
    for (const p of planned) expect(p.querySelector('a')).toBeNull();
  });

  it('show available and planned counts on cards', () => {
    const root = open('');
    const counts = [...root.querySelectorAll('.card-count')].map((c) => c.textContent);
    expect(counts[0]).toBe('3 available · 3 planned');
    expect(counts[3]).toBe('4 available · 5 planned');
    expect(counts[4]).toBe('5 planned tools');
  });

  it('starts at the top of home when leaving a tool via the breadcrumb', () => {
    const root = open('#/tool/date-formatter');
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(root.querySelectorAll('.card')).toHaveLength(5);
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
  it('calculates age and the next birthday', () => {
    const root = open('#/tool/age-calculator');
    set(root, '#age-dob', '1990-06-15');
    set(root, '#age-ref', '2026-10-02');
    submit(root);
    expect(rowValue(root, 'Age')).toBe('36 years, 3 months, 17 days');
    expect(rowValue(root, 'Next birthday')).toBe('Tuesday, 15 June 2027 — in 256 days (turns 37)');
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
    expect(resultText(root)).toContain('৩৬ বছর, ৩ মাস, ১৭ দিন');
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
    expect(root.querySelector('.result-list')).toBeNull();
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
