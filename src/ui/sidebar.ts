import { h } from '../lib/dom';
import { categories } from '../registry';
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
    return { id: cat.id, link };
  });

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
      ...toolkitLinks.map(({ link }) => h('li', {}, link)),
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
    },
  };
}
