import { h } from '../lib/dom';
import {
  categories,
  getCategory,
  sortByAvailability,
  toolsByCategory,
  type Category,
  type Tool,
} from '../registry';
import type { Route } from '../router/router';
import { toHash } from '../router/router';
import { icon } from './icons';
import { statusKey, type AppContext } from './context';

export interface ToolkitsHandle {
  el: HTMLElement;
  /** Re-render for the current route. */
  update(): void;
  /** Element that should receive focus after navigating to the current route. */
  heading(): HTMLElement | null;
  chipNav: HTMLElement;
}

export function createToolkits(ctx: AppContext): ToolkitsHandle {
  const { t, state } = ctx;

  const chips: Array<{ route: Route; link: HTMLAnchorElement }> = [
    { name: 'home' } as Route,
    ...categories.map((c): Route => ({ name: 'category', id: c.id })),
  ].map((route) => {
    const label =
      route.name === 'category'
        ? (getCategory(route.id)?.name[state.lang] ?? '')
        : t('allToolkits');
    return { route, link: h('a', { href: toHash(route), class: 'chip' }, label) };
  });

  const chipNav = h(
    'nav',
    { class: 'chips', 'aria-label': t('toolkitsNav') },
    h('ul', { role: 'list' }, ...chips.map((c) => h('li', {}, c.link))),
  );

  const body = h('div', { class: 'toolkits-body' });
  const el = h(
    'section',
    { id: 'toolkits', class: 'container section', 'aria-labelledby': 'toolkits-title' },
    h(
      'div',
      { class: 'section-head' },
      h('h2', { id: 'toolkits-title', class: 'section-title' }, t('toolkitsTitle')),
    ),
    chipNav,
    body,
  );

  function card(cat: Category): HTMLElement {
    return h(
      'li',
      { class: `card card-${cat.id}` },
      h('div', { class: 'card-icon' }, icon(cat.icon, 24)),
      h(
        'h3',
        { class: 'card-title' },
        h(
          'a',
          { href: toHash({ name: 'category', id: cat.id }), class: 'card-link' },
          cat.name[state.lang],
        ),
      ),
      h('p', { class: 'card-text' }, cat.description[state.lang]),
      h(
        'p',
        { class: 'card-foot' },
        h('span', { class: 'card-count' }, countLabel(cat)),
        h(
          'span',
          { class: 'card-cta', 'aria-hidden': 'true' },
          t('viewToolkit'),
          icon('arrow-right', 16),
        ),
      ),
    );
  }

  function countLabel(cat: Category): string {
    const list = toolsByCategory(cat.id);
    const available = list.filter((x) => x.status === 'available').length;
    const planned = list.length - available;
    if (!available) return t('toolCount', { n: planned });
    if (!planned) return t('toolCountAvailable', { n: available });
    return t('toolCountMixed', { available, planned });
  }

  function toolItem(tool: Tool): HTMLElement {
    const available = tool.status === 'available';
    const name = available
      ? h(
          'a',
          { href: toHash({ name: 'tool', id: tool.id }), class: 'tool-link' },
          tool.name[state.lang],
        )
      : tool.name[state.lang];
    return h(
      'li',
      { id: `tool-${tool.id}`, class: `tool${available ? ' tool-available' : ''}`, tabindex: '-1' },
      h(
        'div',
        { class: 'tool-head' },
        h('h5', { class: 'tool-name' }, name),
        h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
      ),
      h('p', { class: 'tool-desc' }, tool.description[state.lang]),
      available
        ? h(
            'p',
            { class: 'tool-cta', 'aria-hidden': 'true' },
            t('openTool'),
            icon('arrow-right', 16),
          )
        : h('p', { class: 'tool-note' }, t('plannedNote')),
    );
  }

  function update(): void {
    const route = state.route;
    for (const c of chips) {
      if (toHash(c.route) === toHash(route)) c.link.setAttribute('aria-current', 'page');
      else c.link.removeAttribute('aria-current');
    }

    if (route.name === 'home') {
      body.replaceChildren(h('ul', { class: 'grid', role: 'list' }, ...categories.map(card)));
      return;
    }

    if (route.name !== 'category') return; // tool pages do not show this section
    const cat = getCategory(route.id);
    if (!cat) return;
    body.replaceChildren(
      h(
        'article',
        { class: `panel card-${cat.id}`, 'aria-labelledby': 'category-heading' },
        h(
          'div',
          { class: 'panel-head' },
          h('div', { class: 'card-icon card-icon-lg' }, icon(cat.icon, 28)),
          h(
            'div',
            {},
            h(
              'h3',
              { id: 'category-heading', class: 'panel-title', tabindex: '-1' },
              cat.name[state.lang],
            ),
            h('p', { class: 'panel-text' }, cat.description[state.lang]),
          ),
        ),
        h('h4', { class: 'panel-subtitle' }, t('toolsInCategory')),
        h(
          'ul',
          { class: 'tool-grid', role: 'list' },
          ...sortByAvailability(toolsByCategory(cat.id)).map(toolItem),
        ),
        h(
          'a',
          { href: toHash({ name: 'home' }), class: 'back-link' },
          icon('arrow-left', 16),
          t('backToAll'),
        ),
      ),
    );
  }

  function heading(): HTMLElement | null {
    return state.route.name === 'category'
      ? document.getElementById('category-heading')
      : document.getElementById('toolkits-title');
  }

  update();
  return { el, update, heading, chipNav };
}
