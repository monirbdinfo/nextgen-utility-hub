import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tool } from '../src/registry/types';

/**
 * Every registry tool is available now, but the UI still has to handle planned roadmap
 * entries. This file adds one synthetic planned tool to the real registry and checks how
 * it is listed, searched and routed.
 */
const PLANNED: Tool = {
  id: 'zz-planned-probe',
  category: 'network',
  name: { en: 'Zebra Planned Probe', bn: 'জেব্রা পরিকল্পিত প্রোব' },
  description: { en: 'A roadmap item used only by tests.', bn: 'শুধু টেস্টের জন্য।' },
  keywords: ['zebraprobe', 'জেব্রা'],
  status: 'planned',
};

vi.mock('../src/registry/tools', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/registry/tools')>();
  return { tools: [...mod.tools, PLANNED] };
});

const { mountApp } = await import('../src/ui/app');
const { parseHash } = await import('../src/router/router');
const { toolViews } = await import('../src/ui/tools');

let dispose: (() => void) | null = null;

function setup(hash = ''): HTMLElement {
  history.replaceState(null, '', hash ? `/${hash}` : '/');
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}

const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
};

function type(root: HTMLElement, value: string): HTMLInputElement {
  const input = root.querySelector('#search') as HTMLInputElement;
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input'));
  return input;
}

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
});

describe('planned tools', () => {
  it('have no route and no view', () => {
    expect(parseHash(`#/tool/${PLANNED.id}`)).toEqual({ name: 'home' });
    expect(toolViews[PLANNED.id]).toBeUndefined();
    const root = setup(`#/tool/${PLANNED.id}`);
    expect(root.querySelector('#tool-title')).toBeNull();
    expect(root.querySelectorAll('.card')).toHaveLength(6);
  });

  it('are labelled Planned in search, and Enter goes to their toolkit', () => {
    const root = setup();
    const input = type(root, 'zebraprobe');
    expect(root.querySelector(`#search-opt-${PLANNED.id} .pill`)?.textContent).toBe('Planned');
    key(input, 'ArrowDown');
    key(input, 'Enter');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(location.hash).toBe('#/category/network');
    expect(root.querySelector('#category-heading')?.textContent).toBe(
      'Network & IT Diagnostic Toolkit',
    );
    expect(document.activeElement?.id).toBe(`tool-${PLANNED.id}`);
  });

  it('are listed after available tools, without a link, as Coming soon', () => {
    const root = setup('#/category/network');
    const items = [...root.querySelectorAll('.tool')];
    expect(items).toHaveLength(27);
    const last = items.at(-1)!;
    expect(last.id).toBe(`tool-${PLANNED.id}`);
    expect(last.querySelector('.pill')?.textContent).toBe('Planned');
    expect(last.querySelector('a')).toBeNull();
    expect(last.querySelector('.tool-soon')?.textContent).toBe('Coming soon');
    let sawPlanned = false;
    for (const item of items) {
      const planned = item.querySelector('.pill')?.textContent === 'Planned';
      if (planned) sawPlanned = true;
      expect(!!item.querySelector('a')).toBe(!planned);
      if (!planned) expect(sawPlanned).toBe(false);
    }
  });

  it('are counted separately on the toolkit card', () => {
    const root = setup();
    const counts = [...root.querySelectorAll('.card-count')].map((c) => c.textContent);
    expect(counts[4]).toBe('20 available · 7 planned');
  });
});
