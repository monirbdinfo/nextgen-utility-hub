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
function tick(root: ParentNode, sel: string, on: boolean): void {
  const el = $<HTMLInputElement>(root, sel);
  el.checked = on;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const submit = (root: ParentNode, n = 0): void =>
  root.querySelectorAll<HTMLFormElement>('form.tool-form')[n]!.requestSubmit();
const row = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;
const err = (root: ParentNode, id: string): string =>
  $<HTMLElement>(root, `#${id}-error`).textContent ?? '';
const notesText = (root: ParentNode): string =>
  root.querySelector('.result-notes')?.textContent ?? '';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
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

describe('Lorem Ipsum Generator', () => {
  it('generates three paragraphs starting with the classic opening', () => {
    const root = open('#/tool/lorem-ipsum');
    submit(root);
    const text = row(root, 'Placeholder text') ?? '';
    expect(text.startsWith('Lorem ipsum dolor sit amet, consectetur adipiscing elit')).toBe(true);
    expect(text.split('\n\n')).toHaveLength(3);
    expect(row(root, 'Length')).toMatch(/^\d+ words, \d+ characters$/);
  });

  it('honours the unit, the count (Bangla digits too) and the opening option', () => {
    const root = open('#/tool/lorem-ipsum');
    set(root, '#lorem-unit', 'words');
    set(root, '#lorem-count', '৫');
    tick(root, '#lorem-start', false);
    submit(root);
    expect((row(root, 'Placeholder text') ?? '').split(' ')).toHaveLength(5);
    set(root, '#lorem-unit', 'sentences');
    set(root, '#lorem-count', '2');
    submit(root);
    expect((row(root, 'Placeholder text') ?? '').match(/\./g)).toHaveLength(2);
  });

  it('refuses a bad or too-large count and focuses the field', () => {
    const root = open('#/tool/lorem-ipsum');
    set(root, '#lorem-count', '0');
    submit(root);
    expect(err(root, 'lorem-count')).toBe('Enter a whole number, 1 or more.');
    expect(document.activeElement?.id).toBe('lorem-count');
    set(root, '#lorem-count', '51');
    submit(root);
    expect(err(root, 'lorem-count')).toContain('too many');
  });
});

describe('ROT13', () => {
  it('converts as you type, with no button press', () => {
    const root = open('#/tool/rot13-decoder');
    set(root, '#rot-text', 'Hello, World!');
    expect(row(root, 'Result')).toBe('Uryyb, Jbeyq!');
  });

  it('rotates digits only when asked, and clears when the text is emptied', () => {
    const root = open('#/tool/rot13-decoder');
    set(root, '#rot-text', 'abc 012');
    expect(row(root, 'Result')).toBe('nop 012');
    tick(root, '#rot-digits', true);
    expect(row(root, 'Result')).toBe('nop 567');
    set(root, '#rot-text', '');
    expect(root.querySelector('.result-list')).toBeNull();
    expect(root.querySelector('.field-error:not([hidden])')).toBeNull();
  });

  it('shows an error if the button is pressed with no text', () => {
    const root = open('#/tool/rot13-decoder');
    submit(root);
    expect(err(root, 'rot-text')).toBe('Enter some text.');
    expect(document.activeElement?.id).toBe('rot-text');
  });

  it('keeps the text and result across a language switch', async () => {
    const root = open('#/tool/rot13-decoder');
    set(root, '#rot-text', 'Hello');
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('ROT13 এনকোডার / ডিকোডার');
    expect($<HTMLTextAreaElement>(root, '#rot-text').value).toBe('Hello');
    await vi.waitFor(() => expect(row(root, 'ফলাফল')).toBe('Uryyb'));
  });
});

describe('Morse Code Translator', () => {
  it('encodes and decodes', () => {
    const root = open('#/tool/morse-translator');
    set(root, '#morse-text', 'SOS');
    expect(row(root, 'Result')).toBe('... --- ...');
    set(root, '#morse-mode', 'decode');
    set(root, '#morse-text', '.... .. / - .... . .-. .');
    expect(row(root, 'Result')).toBe('HI THERE');
  });

  it('says which characters have no Morse code', () => {
    const root = open('#/tool/morse-translator');
    set(root, '#morse-text', 'a ক');
    expect(row(root, 'Result')).toBe('.-');
    expect(notesText(root)).toContain('ক');
  });
});

describe('Small Text Generator', () => {
  it('converts to each style and lists unsupported letters', () => {
    const root = open('#/tool/small-text-generator');
    set(root, '#small-text', 'hello q');
    expect(row(root, 'Result')).toBe('ʰᵉˡˡᵒ q');
    expect(notesText(root)).toContain('q');
    set(root, '#small-style', 'small-caps');
    expect(row(root, 'Result')).toBe('ʜᴇʟʟᴏ ǫ');
  });
});

describe('Runic Translator', () => {
  it('transliterates and can use runic word separators', () => {
    const root = open('#/tool/runic-translator');
    set(root, '#runic-text', 'the thing');
    expect(row(root, 'Result')).toBe('ᚦᛖ ᚦᛁᛜ');
    tick(root, '#runic-dots', true);
    expect(row(root, 'Result')).toBe('ᚦᛖ᛫ᚦᛁᛜ');
    expect($(root, '.tool-notes').textContent).toContain('decorative');
  });
});

describe('Invisible Character Generator', () => {
  it('creates the chosen invisible character the chosen number of times', () => {
    const root = open('#/tool/invisible-character');
    set(root, '#inv-gen-char', String(0x200b));
    set(root, '#inv-gen-count', '3');
    submit(root, 0);
    expect(row(root, 'Invisible text')).toBe('​​​');
    expect(row(root, 'What it contains')).toBe('3 × U+200B Zero Width Space');
    expect($(root, '.tool-notes').textContent).toContain('impersonate');
  });

  it('refuses a bad count and one over the limit', () => {
    const root = open('#/tool/invisible-character');
    set(root, '#inv-gen-count', 'x');
    submit(root, 0);
    expect(err(root, 'inv-gen-count')).toBe('Enter a whole number, 1 or more.');
    set(root, '#inv-gen-count', '1001');
    submit(root, 0);
    expect(err(root, 'inv-gen-count')).toContain('too many');
  });

  it('finds hidden characters in pasted text and offers the text without them', () => {
    const root = open('#/tool/invisible-character');
    set(root, '#inv-chk-text', 'a​b c​');
    submit(root, 1);
    expect(row(root, 'U+200B Zero Width Space')).toBe('2 found, first at position 2');
    expect(row(root, 'U+00A0 No-Break Space')).toBe('1 found, first at position 4');
    expect(row(root, 'Text without them')).toBe('abc');
  });

  it('says when nothing hidden was found', () => {
    const root = open('#/tool/invisible-character');
    set(root, '#inv-chk-text', 'plain text');
    submit(root, 1);
    expect(root.textContent).toContain('None of the known invisible characters were found.');
  });
});

describe('Time Card Calculator', () => {
  it('shows paid time and decimal hours for the default shift', () => {
    const root = open('#/tool/time-card-calculator');
    submit(root);
    expect(row(root, 'Paid time per day')).toBe('8 h 0 min');
    expect(row(root, 'In decimal hours')).toBe('8.00');
  });

  it('subtracts a break, multiplies by days and calculates pay', () => {
    const root = open('#/tool/time-card-calculator');
    set(root, '#tc-end', '17:30');
    set(root, '#tc-break', '30');
    set(root, '#tc-days', '5');
    set(root, '#tc-rate', '250');
    submit(root);
    expect(row(root, 'Paid time per day')).toBe('8 h 0 min');
    expect(row(root, 'Total for 5 days')).toBe('40 h 0 min');
    expect(row(root, 'Total pay')).toBe('10,000.00');
  });

  it('explains an overnight shift', () => {
    const root = open('#/tool/time-card-calculator');
    set(root, '#tc-start', '22:00');
    set(root, '#tc-end', '06:00');
    submit(root);
    expect(row(root, 'Paid time per day')).toBe('8 h 0 min');
    expect(notesText(root)).toContain('next day');
  });

  it('refuses equal times and focuses the first time field', () => {
    const root = open('#/tool/time-card-calculator');
    set(root, '#tc-end', '09:00');
    submit(root);
    expect(err(root, 'tc-start')).toContain('same time');
    expect(document.activeElement?.id).toBe('tc-start');
  });

  it('shows Bangla labels and digits', async () => {
    const root = open('#/tool/time-card-calculator');
    submit(root);
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    await vi.waitFor(() => expect(row(root, 'প্রতিদিনের বেতনযোগ্য সময়')).toBe('৮ ঘণ্টা ০ মিনিট'));
    expect(row(root, 'দশমিক ঘণ্টায়')).toBe('৮.০০');
  });
});

describe('Credit Card Number Checker', () => {
  it('accepts a valid test number and names the network', () => {
    const root = open('#/tool/credit-card-checker');
    set(root, '#cc-number', '4111 1111 1111 1111');
    submit(root);
    expect(row(root, 'Checksum (Luhn)')).toBe('Valid');
    expect(row(root, 'Likely network')).toBe('Visa');
    expect(row(root, 'Number')).toBe('4111 1111 1111 1111');
    expect(row(root, 'Length')).toContain('16 digits');
  });

  it('flags a failed checksum and an unusual length', () => {
    const root = open('#/tool/credit-card-checker');
    set(root, '#cc-number', '4111111111111112');
    submit(root);
    expect(row(root, 'Checksum (Luhn)')).toBe('Not valid');
    set(root, '#cc-number', '41111111111111');
    submit(root);
    expect(row(root, 'Length')).toContain('unusual');
  });

  it('refuses letters and wrong lengths', () => {
    const root = open('#/tool/credit-card-checker');
    set(root, '#cc-number', '4111 abcd');
    submit(root);
    expect(err(root, 'cc-number')).toBe('Use digits only. Spaces and hyphens are fine.');
    set(root, '#cc-number', '4111');
    submit(root);
    expect(err(root, 'cc-number')).toBe('A card number has 12 to 19 digits.');
  });

  it('says it verifies nothing about the card', () => {
    const root = open('#/tool/credit-card-checker');
    expect($(root, '.tool-notes').textContent).toContain('does not show that a card exists');
  });
});

describe('Notepad Online', () => {
  it('counts words and characters as you type and keeps the note across a language switch', async () => {
    const root = open('#/tool/notepad-online');
    expect($(root, '#note-counts').textContent).toBe('0 words, 0 characters');
    set(root, '#note-text', 'Hello world');
    expect($(root, '#note-counts').textContent).toBe('2 words, 11 characters');
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($<HTMLTextAreaElement>(root, '#note-text').value).toBe('Hello world');
    expect($(root, '#note-counts').textContent).toBe('২টি শব্দ, ১১টি অক্ষর');
  });

  it('copies, downloads and clears', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    URL.createObjectURL = vi.fn(() => 'blob:note') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });
    const root = open('#/tool/notepad-online');
    const button = (name: string): HTMLButtonElement =>
      [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')].find(
        (b) => b.textContent === name,
      )!;

    button('Copy').click();
    await vi.waitFor(() =>
      expect($(root, '.copy-status').textContent).toBe('There is nothing to copy or download yet.'),
    );

    set(root, '#note-text', 'My note');
    button('Copy').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('My note'));
    button('Download .txt').click();
    expect(downloadName).toBe('note.txt');
    expect($(root, '.copy-status').textContent).toBe('Download started.');

    button('Clear note').click();
    expect($<HTMLTextAreaElement>(root, '#note-text').value).toBe('');
    expect($(root, '.copy-status').textContent).toBe('Note cleared.');
    expect(document.activeElement?.id).toBe('note-text');
  });

  it('says the note is not saved or sent anywhere', () => {
    const root = open('#/tool/notepad-online');
    expect($(root, '.net-notice').textContent).toContain('not saved or sent anywhere');
  });
});
