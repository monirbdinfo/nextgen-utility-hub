import { h } from '../lib/dom';
import { categories, getTool, toolsByCategory, type CategoryId } from '../registry';
import type { Route } from '../router/router';
import { toHash } from '../router/router';
import { REPO_URL, type AppContext } from './context';
import { icon } from './icons';

export const ROADMAP_URL = `${REPO_URL}/blob/main/docs/PROJECT_ROADMAP.md`;

export interface SidebarHandle {
  /** The primary navigation (`#site-nav`): a fixed column on wide screens, a drawer on small ones. */
  el: HTMLElement;
  /** Mark the link for the current route. */
  setRoute(route: Route): void;
}

export function createSidebar(ctx: AppContext): SidebarHandle {
  const { t, state } = ctx;

  const home = h(
    'a',
    { href: toHash({ name: 'home' }), class: 'nav-link side-link' },
    h('span', { class: 'side-icon' }, icon('home', 20)),
    h('span', { class: 'side-label' }, t('navHome')),
  );
  const toolkitLinks = categories.map((cat) => {
    const link = h(
      'a',
      { href: toHash({ name: 'category', id: cat.id }), class: 'nav-link side-link' },
      h('span', { class: `side-icon side-icon-tile card-${cat.id}` }, icon(cat.icon, 18)),
      h('span', { class: 'side-label' }, cat.name[state.lang]),
      h('span', { class: 'side-chevron', 'aria-hidden': 'true' }, icon('chevron-right', 16)),
    );
    const item = h('li', {}, link);
    return { id: cat.id, link, item };
  });

  /** Most tools listed under the open toolkit; the rest are reached through "View all tools". */
  const SUBMENU_MAX = 6;
  let submenu: HTMLElement | null = null;
  const openToolkit = (catId: CategoryId | null, toolId: string | null): void => {
    submenu?.remove();
    submenu = null;
    for (const { id, item } of toolkitLinks) item.classList.toggle('is-open', id === catId);
    const entry = toolkitLinks.find((x) => x.id === catId);
    if (!entry) return;
    const available = toolsByCategory(entry.id).filter((x) => x.status === 'available');
    let shown = available.slice(0, SUBMENU_MAX);
    const current = available.find((x) => x.id === toolId);
    if (current && !shown.includes(current)) shown = [...shown.slice(0, SUBMENU_MAX - 1), current];
    submenu = h(
      'ul',
      { class: 'side-sublist', role: 'list' },
      ...shown.map((x) => {
        const a = h(
          'a',
          { href: toHash({ name: 'tool', id: x.id }), class: 'side-sublink' },
          x.name[state.lang],
        );
        if (x.id === toolId) a.setAttribute('aria-current', 'page');
        return h('li', {}, a);
      }),
      h(
        'li',
        {},
        h(
          'a',
          {
            href: toHash({ name: 'category', id: entry.id }),
            class: 'side-sublink side-sublink-all',
          },
          t('viewAllTools'),
        ),
      ),
    );
    entry.item.append(submenu);
  };

  const external = (href: string, iconName: 'map' | 'code', label: string): HTMLElement =>
    h(
      'a',
      { href, class: 'nav-link side-link', rel: 'noopener' },
      h('span', { class: 'side-icon' }, icon(iconName, 20)),
      h('span', { class: 'side-label' }, label),
    );

  const el = h(
    'nav',
    { id: 'site-nav', class: 'nav sidebar', 'aria-label': t('navPrimary') },
    h(
      'ul',
      { class: 'side-list', role: 'list' },
      h('li', {}, home),
      ...toolkitLinks.map(({ item }) => item),
    ),
    h(
      'ul',
      { class: 'side-list side-list-secondary', role: 'list' },
      h(
        'li',
        {},
        h(
          'a',
          { href: '#about', class: 'nav-link side-link' },
          h('span', { class: 'side-icon' }, icon('info', 20)),
          h('span', { class: 'side-label' }, t('navAbout')),
        ),
      ),
      h('li', {}, external(ROADMAP_URL, 'map', t('navRoadmap'))),
      h('li', {}, external(REPO_URL, 'code', t('navSource'))),
    ),
    h(
      'div',
      { class: 'side-card' },
      h('span', { class: 'side-card-icon' }, icon('shield', 26)),
      h('p', { class: 'side-card-title' }, t('sidebarPrivacyTitle')),
      h('p', { class: 'side-card-text' }, t('sidebarPrivacyText')),
    ),
  );

  return {
    el,
    setRoute(route) {
      const current = (a: HTMLAnchorElement, on: boolean): void => {
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      };
      current(home, route.name === 'home');
      for (const { id, link } of toolkitLinks) {
        current(link, route.name === 'category' && route.id === id);
      }
      // On a tool page its toolkit opens to list neighbouring tools; a toolkit page already
      // lists all of them in the main content, so the sidebar stays collapsed there.
      const toolId = route.name === 'tool' ? route.id : null;
      openToolkit(toolId ? (getTool(toolId)?.category ?? null) : null, toolId);
    },
  };
}
