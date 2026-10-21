import { h } from '../lib/dom';
import { icon } from './icons';
import { REPO_URL, type AppContext } from './context';
import { logoMark } from './logo';
import type { Route } from '../router/router';

const DESKTOP_QUERY = '(min-width: 860px)';

export interface HeaderHandle {
  el: HTMLElement;
  /** Mark the nav link for the current route. */
  setRoute(route: Route): void;
  destroy(): void;
}

export function createHeader(ctx: AppContext): HeaderHandle {
  const { t, state } = ctx;
  let open = false;

  const menuBtn = h('button', {
    id: 'menu-btn',
    class: 'btn btn-icon menu-toggle',
    type: 'button',
    'aria-controls': 'site-nav',
  });

  const homeLink = h('a', { href: '#/', class: 'nav-link' }, icon('home', 18), t('navHome'));
  const nav = h(
    'nav',
    { id: 'site-nav', class: 'nav', 'aria-label': t('navPrimary') },
    homeLink,
    h('a', { href: '#toolkits', class: 'nav-link' }, t('navToolkits')),
    h('a', { href: '#about', class: 'nav-link' }, t('navAbout')),
    h(
      'a',
      { href: REPO_URL, class: 'nav-link', rel: 'noopener' },
      icon('code', 18),
      t('navSource'),
    ),
  );

  function setOpen(next: boolean, returnFocus = false): void {
    open = next;
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', t(open ? 'menuClose' : 'menuOpen'));
    menuBtn.replaceChildren(icon(open ? 'close' : 'menu'));
    if (!open && returnFocus) menuBtn.focus();
  }
  setOpen(false);

  menuBtn.addEventListener('click', () => setOpen(!open));
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a') && open) setOpen(false);
  });

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false, true);
    }
  };
  const onPointerDown = (e: Event): void => {
    if (open && !el.contains(e.target as Node)) setOpen(false);
  };
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
  const onMq = (): void => {
    if (mq?.matches && open) setOpen(false);
  };
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown);
  mq?.addEventListener?.('change', onMq);

  const otherLang = state.lang === 'en' ? 'bn' : 'en';
  const langBtn = h(
    'button',
    { id: 'lang-btn', class: 'btn btn-lang', type: 'button', 'aria-label': t('languageLabel') },
    icon('globe', 18),
    h('span', { lang: otherLang }, t('languageSwitch')),
  );
  langBtn.addEventListener('click', () => ctx.setLang(otherLang));

  const themeBtn = h('button', { id: 'theme-btn', class: 'btn btn-icon', type: 'button' });
  const syncTheme = (): void => {
    const dark = state.theme === 'dark';
    themeBtn.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark'));
    themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon'));
  };
  syncTheme();
  themeBtn.addEventListener('click', () => {
    ctx.setTheme(state.theme === 'dark' ? 'light' : 'dark');
    syncTheme();
  });

  const el = h(
    'header',
    { class: 'header' },
    h(
      'div',
      { class: 'container container-wide header-inner' },
      h(
        'a',
        { class: 'brand', href: '#/', 'aria-label': t('brandHome') },
        logoMark(64, { className: 'brand-mark' }),
        h('span', { class: 'brand-name', lang: 'en' }, t('brandName')),
      ),
      nav,
      h('div', { class: 'header-actions' }, langBtn, themeBtn, menuBtn),
    ),
  );

  return {
    el,
    setRoute(route) {
      if (route.name === 'home') homeLink.setAttribute('aria-current', 'page');
      else homeLink.removeAttribute('aria-current');
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('pointerdown', onPointerDown);
      mq?.removeEventListener?.('change', onMq);
    },
  };
}
