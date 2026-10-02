import { h } from '../lib/dom';
import { categories, getCategory, searchTools, toolsByCategory, type Tool } from '../registry';
import { icon } from './icons';
import { statusKey, type AppContext } from './context';

export interface SearchHandle {
  el: HTMLElement;
  input: HTMLInputElement;
  /** Re-run the query, e.g. after the active category (search scope) changes. */
  refresh(): void;
}

/**
 * ARIA 1.2 combobox with a listbox popup. Focus stays in the input; the active
 * option is exposed through aria-activedescendant.
 */
export function createSearch(ctx: AppContext): SearchHandle {
  const { t, state } = ctx;
  let results: Tool[] = [];
  let active = -1;

  const input = h('input', {
    id: 'search',
    class: 'search-input',
    type: 'search',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': 'search-listbox',
    'aria-describedby': 'search-hint',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: t('searchPlaceholder'),
  });
  input.value = state.query;

  const listbox = h('ul', {
    id: 'search-listbox',
    class: 'search-listbox',
    role: 'listbox',
    'aria-label': t('searchLabel'),
  });
  const status = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const scope = h('p', { class: 'search-scope' });
  const empty = h('p', { class: 'search-empty' }, t('searchEmpty'));

  function optionId(tool: Tool): string {
    return `search-opt-${tool.id}`;
  }

  function choose(tool: Tool): void {
    state.query = '';
    input.value = '';
    refresh();
    if (tool.status === 'available') ctx.navigate({ name: 'tool', id: tool.id }, 'tool-title');
    else ctx.navigate({ name: 'category', id: tool.category }, `tool-${tool.id}`);
  }

  function setActive(index: number): void {
    active = index;
    listbox.querySelectorAll<HTMLElement>('[role="option"]').forEach((opt, i) => {
      opt.setAttribute('aria-selected', String(i === active));
      if (i === active) opt.scrollIntoView?.({ block: 'nearest' });
    });
    const current = results[active];
    if (current) input.setAttribute('aria-activedescendant', optionId(current));
    else input.removeAttribute('aria-activedescendant');
  }

  function refresh(): void {
    const route = state.route;
    const scoped = route.name === 'category' ? toolsByCategory(route.id) : undefined;
    const scopeCat = route.name === 'category' ? getCategory(route.id) : undefined;
    scope.textContent = scopeCat ? t('searchScope', { category: scopeCat.name[state.lang] }) : '';
    scope.hidden = !scopeCat;

    const q = state.query.trim();
    results = q ? searchTools(q, state.lang, scoped) : [];
    active = -1;
    input.removeAttribute('aria-activedescendant');

    listbox.replaceChildren(
      ...results.map((tool) => {
        const cat = categories.find((c) => c.id === tool.category);
        const opt = h(
          'li',
          { id: optionId(tool), role: 'option', class: 'search-option', 'aria-selected': 'false' },
          h(
            'span',
            { class: 'search-option-text' },
            h('span', { class: 'search-option-name' }, tool.name[state.lang]),
            h('span', { class: 'search-option-meta' }, cat?.name[state.lang] ?? ''),
          ),
          h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
        );
        // mousedown keeps focus in the input; click performs the selection.
        opt.addEventListener('mousedown', (e) => e.preventDefault());
        opt.addEventListener('click', () => choose(tool));
        return opt;
      }),
    );

    const expanded = q.length > 0;
    input.setAttribute('aria-expanded', String(expanded && results.length > 0));
    listbox.hidden = results.length === 0;
    empty.hidden = !(expanded && results.length === 0);
    status.textContent = !expanded
      ? ''
      : results.length
        ? t('searchCount', { n: results.length })
        : t('searchEmpty');
  }

  input.addEventListener('input', () => {
    state.query = input.value;
    refresh();
  });

  input.addEventListener('keydown', (e) => {
    const n = results.length;
    switch (e.key) {
      case 'ArrowDown':
        if (!n) return;
        e.preventDefault();
        setActive((active + 1) % n);
        break;
      case 'ArrowUp':
        if (!n) return;
        e.preventDefault();
        setActive(active <= 0 ? n - 1 : active - 1);
        break;
      case 'Enter': {
        const tool = results[active] ?? (n === 1 ? results[0] : undefined);
        if (tool) {
          e.preventDefault();
          choose(tool);
        }
        break;
      }
      case 'Escape':
        if (state.query) {
          e.preventDefault();
          e.stopPropagation();
          state.query = '';
          input.value = '';
          refresh();
        }
        break;
    }
  });

  const el = h(
    'div',
    { class: 'search', role: 'search' },
    h('label', { class: 'sr-only', for: 'search' }, t('searchLabel')),
    h(
      'div',
      { class: 'search-field' },
      icon('search'),
      input,
      h('kbd', { class: 'search-kbd', 'aria-hidden': 'true' }, '/'),
    ),
    h('p', { id: 'search-hint', class: 'search-hint' }, t('searchHint')),
    scope,
    h('div', { class: 'search-popup' }, listbox, empty),
    status,
  );

  refresh();
  return { el, input, refresh };
}
