import { h } from '../lib/dom';
import { icon } from './icons';
import { REPO_URL, type AppContext } from './context';

const DESKTOP_QUERY = '(min-width: 860px)';

export interface HeaderHandle {
  el: HTMLElement;
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

  const nav = h(
    'nav',
    { id: 'site-nav', class: 'nav', 'aria-label': t('navPrimary') },
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
      { class: 'container header-inner' },
      h(
        'a',
        { class: 'brand', href: '#/' },
        h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'N'),
        h('span', { class: 'brand-name' }, t('siteName')),
      ),
      nav,
      h('div', { class: 'header-actions' }, langBtn, themeBtn, menuBtn),
    ),
  );

  return {
    el,
    destroy() {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('pointerdown', onPointerDown);
      mq?.removeEventListener?.('change', onMq);
    },
  };
}
