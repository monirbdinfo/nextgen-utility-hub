import { detectLang, t as translate } from '../i18n';
import { focusAndReveal, h } from '../lib/dom';
import { readPref, writePref } from '../lib/storage';
import { getCategory, type Lang } from '../registry';
import { parseHash, toHash } from '../router/router';
import type { AppContext, AppState, Theme } from './context';
import { createHeader, type HeaderHandle } from './header';
import { icon } from './icons';
import { createSearch, type SearchHandle } from './search';
import { createToolkits, type ToolkitsHandle } from './toolkits';

export const LANG_KEY = 'nguh.lang';
export const THEME_KEY = 'nguh.theme';

function initialTheme(): Theme {
  const stored = readPref(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Mounts the homepage into `root`. Returns a function that removes global listeners. */
export function mountApp(root: HTMLElement): () => void {
  const state: AppState = {
    lang: detectLang(readPref(LANG_KEY), navigator.language),
    theme: initialTheme(),
    route: parseHash(location.hash) ?? { name: 'home' },
    query: '',
  };

  let header: HeaderHandle | null = null;
  let search: SearchHandle | null = null;
  let toolkits: ToolkitsHandle | null = null;
  let pendingFocus: string | null = null;

  const ctx: AppContext = {
    state,
    t: (key, vars) => translate(state.lang, key, vars),
    navigate(route, focusId) {
      pendingFocus = focusId ?? null;
      const hash = toHash(route);
      if (location.hash === hash) onRouteChange();
      else location.hash = hash;
    },
    setLang(lang: Lang) {
      if (lang === state.lang) return;
      state.lang = lang;
      writePref(LANG_KEY, lang);
      renderShell();
      document.getElementById('lang-btn')?.focus();
    },
    setTheme(theme) {
      state.theme = theme;
      writePref(THEME_KEY, theme);
      applyDocumentState();
    },
  };
  const { t } = ctx;

  function applyDocumentState(): void {
    const doc = document.documentElement;
    doc.lang = state.lang;
    doc.dataset.theme = state.theme;
    const cat = state.route.name === 'category' ? getCategory(state.route.id) : undefined;
    document.title = cat ? `${cat.name[state.lang]} · ${t('siteName')}` : t('siteName');
  }

  function hero(searchEl: HTMLElement): HTMLElement {
    return h(
      'section',
      { class: 'hero', 'aria-labelledby': 'hero-title' },
      h(
        'div',
        { class: 'container hero-inner' },
        h(
          'p',
          { class: 'badge' },
          h('span', { class: 'badge-dot', 'aria-hidden': 'true' }),
          t('heroBadge'),
        ),
        h('h1', { id: 'hero-title', class: 'hero-title' }, t('heroTitle')),
        h('p', { class: 'hero-text' }, t('heroText')),
        searchEl,
      ),
    );
  }

  function about(): HTMLElement {
    const principles = (['principle1', 'principle2', 'principle3'] as const).map((k) =>
      h('li', {}, icon('check', 18), t(k)),
    );
    return h(
      'section',
      { id: 'about', class: 'container section', 'aria-labelledby': 'about-title' },
      h(
        'div',
        { class: 'about' },
        h('h2', { id: 'about-title', class: 'section-title' }, t('aboutTitle')),
        h('p', { class: 'about-text' }, t('aboutText')),
        h('ul', { class: 'principles', role: 'list' }, ...principles),
      ),
    );
  }

  function renderShell(): void {
    header?.destroy();
    header = createHeader(ctx);
    search = createSearch(ctx);
    toolkits = createToolkits(ctx);
    applyDocumentState();

    root.replaceChildren(
      h('a', { class: 'skip-link', href: '#main' }, t('skipLink')),
      header.el,
      h('main', { id: 'main', tabindex: '-1' }, hero(search.el), toolkits.el, about()),
      h(
        'footer',
        { class: 'footer' },
        h(
          'div',
          { class: 'container footer-inner' },
          h('span', {}, `© 2026 ${t('siteName')}`),
          h('span', {}, t('footer')),
        ),
      ),
    );
  }

  function onRouteChange(initial = false): void {
    const next = parseHash(location.hash);
    if (!next) return; // plain in-page anchor, not a route
    const changed = toHash(next) !== toHash(state.route);
    state.route = next;
    applyDocumentState();
    toolkits?.update();
    search?.refresh();

    const focusTarget = pendingFocus ? document.getElementById(pendingFocus) : null;
    pendingFocus = null;
    if (focusTarget) {
      focusAndReveal(focusTarget);
    } else if (initial) {
      if (next.name === 'category' && toolkits) focusAndReveal(toolkits.el, { focus: false });
    } else if (changed && toolkits) {
      // Keep focus on the chip the user just pressed; otherwise move it to the new view's heading.
      const fromChip = toolkits.chipNav.contains(document.activeElement);
      const target = toolkits.heading();
      if (fromChip) focusAndReveal(toolkits.el, { focus: false });
      else if (target) focusAndReveal(target);
    }
  }

  // In-page anchors (#main, #about, #toolkits) scroll and move focus without
  // touching the hash, so the current route is preserved in the URL.
  const onClick = (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || !root.contains(link)) return;
    const href = link.getAttribute('href') ?? '';
    if (href === '#/' && link.classList.contains('brand')) {
      e.preventDefault();
      ctx.navigate({ name: 'home' }, 'main');
      return;
    }
    if (href.startsWith('#/')) return; // real route: let the hash change
    const target = document.getElementById(href.slice(1));
    if (target) {
      e.preventDefault();
      const heading = target.matches('section') ? target.querySelector<HTMLElement>('h2') : null;
      focusAndReveal(heading ?? target);
    }
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
    if (el instanceof HTMLElement && el.isContentEditable) return;
    e.preventDefault();
    search?.input.focus();
  };

  const onHashChange = (): void => onRouteChange();

  renderShell();
  onRouteChange(true);
  window.addEventListener('hashchange', onHashChange);
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);

  return () => {
    header?.destroy();
    window.removeEventListener('hashchange', onHashChange);
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeydown);
  };
}
