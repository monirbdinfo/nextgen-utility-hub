import { h } from '../lib/dom';
import { icon } from './icons';
import { REPO_URL, type AppContext } from './context';
import { logoImage } from './logo';

/** Width at which the sidebar is a fixed column instead of a drawer (keep in sync with CSS). */
const DESKTOP_QUERY = '(min-width: 1024px)';

export interface HeaderHandle {
  el: HTMLElement;
  /** Put the site search in the header (tool pages), or remove it (home, where the hero has it). */
  setSearch(search: HTMLElement | null): void;
  destroy(): void;
}

/**
 * Top bar: brand, optional search, source link, language and theme. On small screens the
 * menu button opens `nav` (the sidebar) as a drawer.
 */
export function createHeader(ctx: AppContext, nav: HTMLElement): HeaderHandle {
  const { t, state } = ctx;
  let open = false;

  const menuBtn = h('button', {
    id: 'menu-btn',
    class: 'btn btn-icon menu-toggle',
    type: 'button',
    'aria-controls': nav.id,
  });

  function setOpen(next: boolean, returnFocus = false): void {
    open = next;
    nav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', t(open ? 'menuClose' : 'menuOpen'));
    menuBtn.replaceChildren(icon(open ? 'close' : 'menu'));
    if (!open && returnFocus) menuBtn.focus();
  }
  setOpen(false);

  menuBtn.addEventListener('click', () => setOpen(!open));
  const onNavClick = (e: Event): void => {
    if ((e.target as HTMLElement).closest('a') && open) setOpen(false);
  };
  nav.addEventListener('click', onNavClick);

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false, true);
    }
  };
  const onPointerDown = (e: Event): void => {
    const target = e.target as Node;
    if (open && !nav.contains(target) && !menuBtn.contains(target)) setOpen(false);
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

  const searchSlot = h('div', { class: 'header-search' });
  const el = h(
    'header',
    { class: 'header' },
    h(
      'div',
      { class: 'header-inner' },
      menuBtn,
      h(
        'a',
        { class: 'brand', href: '#/', 'aria-label': t('brandHome') },
        logoImage('mark', 38, { className: 'brand-mark' }),
        h(
          'span',
          { class: 'brand-text' },
          h('span', { class: 'brand-name', lang: 'en' }, t('brandName')),
          h('span', { class: 'brand-sub' }, t('brandSub')),
        ),
      ),
      searchSlot,
      h(
        'div',
        { class: 'header-actions' },
        h(
          'a',
          { href: REPO_URL, class: 'btn btn-ghost header-source', rel: 'noopener' },
          icon('github', 18),
          h('span', { class: 'header-source-label' }, t('navSource')),
        ),
        langBtn,
        themeBtn,
      ),
    ),
  );

  return {
    el,
    setSearch(search) {
      searchSlot.replaceChildren(...(search ? [search] : []));
      el.classList.toggle('has-search', !!search);
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('pointerdown', onPointerDown);
      mq?.removeEventListener?.('change', onMq);
      nav.removeEventListener('click', onNavClick);
      document.body.classList.remove('nav-open');
    },
  };
}
