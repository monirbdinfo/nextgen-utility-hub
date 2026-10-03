import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_KEY, mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;

function setup(hash = ''): HTMLElement {
  history.replaceState(null, '', hash ? `/${hash}` : '/');
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}

function key(el: Element, k: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

function type(root: HTMLElement, value: string): HTMLInputElement {
  const input = root.querySelector('#search') as HTMLInputElement;
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input'));
  return input;
}

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
});

describe('homepage', () => {
  it('renders five category cards with the specified names', () => {
    const root = setup();
    const titles = [...root.querySelectorAll('.card-title')].map((e) => e.textContent);
    expect(titles).toEqual([
      'General Utilities',
      'Job Application Toolkit',
      'Bangla Number & Text Toolkit',
      'Privacy-First File Tools',
      'Network & IT Diagnostic Toolkit',
    ]);
  });

  it('switches to Bangla, sets html lang and persists the choice', () => {
    const root = setup();
    (root.querySelector('#lang-btn') as HTMLButtonElement).click();
    expect(document.documentElement.lang).toBe('bn');
    expect(root.querySelector('h1')?.textContent).toContain('প্রাইভেসি');
    expect(localStorage.getItem(LANG_KEY)).toBe('bn');
    expect(document.activeElement?.id).toBe('lang-btn');
  });

  it('restores the stored language on load', () => {
    localStorage.setItem(LANG_KEY, 'bn');
    setup();
    expect(document.documentElement.lang).toBe('bn');
  });
});

describe('search combobox', () => {
  it('shows planned results and exposes listbox state', () => {
    const root = setup();
    const input = type(root, 'pdf');
    const options = root.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(6);
    for (const o of options) expect(o.querySelector('.pill')?.textContent).toBe('Planned');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('[role="status"]')?.textContent).toBe('6 matching tools');
  });

  it('labels available tools in results', () => {
    const root = setup();
    type(root, 'taka');
    const pills = [...root.querySelectorAll('[role="option"] .pill')].map((p) => p.textContent);
    expect(pills).toContain('Available');
  });

  it('Enter on an available tool opens its page', () => {
    const root = setup();
    const input = type(root, 'cheque');
    key(input, 'ArrowDown');
    key(input, 'Enter');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(location.hash).toBe('#/tool/taka-in-words');
    expect(root.querySelector('h1')?.textContent).toBe('Taka in Words');
    expect(document.activeElement?.id).toBe('tool-title');
  });

  it('moves the active option with arrow keys and wraps', () => {
    const root = setup();
    const input = type(root, 'a');
    const n = root.querySelectorAll('[role="option"]').length;
    expect(n).toBeGreaterThan(1);
    key(input, 'ArrowDown');
    const first = root.querySelectorAll('[role="option"]')[0]!;
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id);
    expect(first.getAttribute('aria-selected')).toBe('true');
    key(input, 'ArrowUp');
    key(input, 'ArrowUp');
    const last = root.querySelectorAll('[role="option"]')[n - 2]!;
    expect(input.getAttribute('aria-activedescendant')).toBe(last.id);
  });

  it('Enter on a planned tool navigates to its category', () => {
    const root = setup();
    const input = type(root, 'merge');
    key(input, 'ArrowDown');
    key(input, 'Enter');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(location.hash).toBe('#/category/files');
    expect(root.querySelector('#category-heading')?.textContent).toBe('Privacy-First File Tools');
    expect(document.activeElement?.id).toBe('tool-pdf-merge');
  });

  it('Escape clears the query', () => {
    const root = setup();
    const input = type(root, 'pdf');
    key(input, 'Escape');
    expect(input.value).toBe('');
    expect(root.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('"/" focuses the search box', () => {
    setup();
    key(document.body, '/');
    expect(document.activeElement?.id).toBe('search');
  });
});

describe('routing', () => {
  it('renders a category view on direct load', () => {
    const root = setup('#/category/bangla');
    expect(root.querySelector('#category-heading')?.textContent).toBe(
      'Bangla Number & Text Toolkit',
    );
    expect(root.querySelector('.chip[aria-current="page"]')?.textContent).toBe(
      'Bangla Number & Text Toolkit',
    );
    expect(document.title).toContain('Bangla Number & Text Toolkit');
  });

  it('marks every listed tool as planned and not linked', () => {
    const root = setup('#/category/network'); // a toolkit with no available tools yet
    const tools = root.querySelectorAll('.tool');
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.querySelector('.pill')?.textContent).toBe('Planned');
      expect(tool.querySelector('a')).toBeNull();
    }
  });

  it('scopes search to the active category', () => {
    const root = setup('#/category/network');
    type(root, 'pdf');
    expect(root.querySelectorAll('[role="option"]')).toHaveLength(0);
  });

  it('returns to all toolkits on hash change', () => {
    const root = setup('#/category/files');
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(root.querySelectorAll('.card')).toHaveLength(5);
    expect(document.activeElement?.id).toBe('toolkits-title');
  });
});

describe('mobile menu', () => {
  it('opens, then closes on Escape and returns focus to the toggle', () => {
    const root = setup();
    const btn = root.querySelector('#menu-btn') as HTMLButtonElement;
    btn.click();
    expect(root.querySelector('#site-nav')?.classList.contains('open')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    key(document.body, 'Escape');
    expect(root.querySelector('#site-nav')?.classList.contains('open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn);
  });
});
