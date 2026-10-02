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
    expect(counts[3]).toBe('7 planned tools');
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
