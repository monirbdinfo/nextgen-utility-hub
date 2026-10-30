import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_KEY, mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

function open(hash: string): HTMLElement {
  history.replaceState(null, '', `/${hash}`);
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}
function type(root: ParentNode, value: string): void {
  const el = root.querySelector<HTMLInputElement>('#name-name')!;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
const row = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Name Checker', () => {
  it('checks the format live for every platform without any request', () => {
    const root = open('#/tool/username-checker');
    type(root, '@my.name');
    expect(row(root, 'Fits the format on')).toBe('4 of 8 platforms');
    expect(row(root, 'GitHub *')).toBe('Does not fit: not allowed: . (only letters, digits and -)');
    expect(row(root, 'Instagram *')).toBe('Fits the format');
    expect(row(root, 'X (Twitter)')).toBe(
      'Does not fit: not allowed: . (only letters, digits and _)',
    );
    expect(row(root, 'Telegram *')).toBe(
      'Does not fit: not allowed: . (only letters, digits and _)',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists every reason a name does not fit', () => {
    const root = open('#/tool/username-checker');
    type(root, '_x');
    expect(row(root, 'Telegram *')).toBe(
      'Does not fit: at least 5 characters; must start with a letter',
    );
  });

  it('says it does not check availability', () => {
    const root = open('#/tool/username-checker');
    expect(root.querySelector('.tool-notes')?.textContent).toContain(
      'It does not check whether the name is free',
    );
    expect(root.querySelector('.tool-notes')?.textContent).toContain(
      'not an official verification',
    );
  });

  it('explains input errors and clears the result for empty input', () => {
    const root = open('#/tool/username-checker');
    type(root, 'two words');
    expect(root.querySelector('#name-name-error')?.textContent).toBe(
      'Usernames cannot contain spaces.',
    );
    type(root, '');
    expect(root.querySelector('.result-list')).toBeNull();
  });

  it('works in Bangla with Bangla digits', () => {
    localStorage.setItem(LANG_KEY, 'bn');
    const root = open('#/tool/username-checker');
    type(root, 'ab');
    expect(row(root, 'যতগুলো প্ল্যাটফর্মের ফরম্যাটে মেলে')).toBe('৮টির মধ্যে ৩টি'); // GitHub, Instagram, TikTok;
    expect(row(root, 'Reddit *')).toBe('মেলে না: কমপক্ষে ৩ অক্ষর');
  });
});
