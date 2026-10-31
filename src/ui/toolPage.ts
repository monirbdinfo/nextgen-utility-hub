import { h } from '../lib/dom';
import { getCategory, toolsByCategory, type Tool } from '../registry';
import { fromLocalDate } from '../calc/dates';
import { toHash } from '../router/router';
import { ageHeroArt } from './art/ageHero';
import { statusKey, type AppContext } from './context';
import { icon } from './icons';
import { TOOL_ICONS } from './toolkits';
import { toolViews } from './tools';

/** Dedicated page for one available tool: breadcrumb, heading, the tool itself and related tools. */
export interface ToolStore {
  memo: Record<string, string>;
  session: Map<string, unknown>;
  onCleanup(fn: () => void): void;
}

export function createToolPage(ctx: AppContext, tool: Tool, store: ToolStore): HTMLElement {
  const { t, state } = ctx;
  const lang = state.lang;
  const cat = getCategory(tool.category);
  const view = toolViews[tool.id];
  const catName = cat?.name[lang] ?? '';

  const breadcrumb = h(
    'nav',
    { class: 'breadcrumb', 'aria-label': t('breadcrumb') },
    h(
      'ol',
      {},
      h('li', {}, h('a', { href: toHash({ name: 'home' }) }, t('home'))),
      h('li', {}, h('a', { href: toHash({ name: 'category', id: tool.category }) }, catName)),
      h('li', { 'aria-current': 'page' }, tool.name[lang]),
    ),
  );

  const related = toolsByCategory(tool.category).filter(
    (x) => x.id !== tool.id && x.status === 'available',
  );
  const body = view ? view({ lang, t: ctx.t, ...store }) : null;
  // A view that shows its own related tools (data-own-related) replaces the generic list.
  const ownRelated = body?.dataset.ownRelated === 'true';
  // Tool-specific header illustration (decorative).
  const art = tool.id === 'age-calculator' ? ageHeroArt(lang, fromLocalDate(new Date())) : null;

  return h(
    'section',
    { class: 'container tool-page', 'aria-labelledby': 'tool-title' },
    breadcrumb,
    h(
      'header',
      { class: `tool-header card-${tool.category}${art ? ' tool-header-art' : ''}` },
      cat
        ? h(
            'div',
            { class: `card-icon card-icon-lg card-${cat.id}` },
            icon(TOOL_ICONS[tool.id] ?? cat.icon, 28),
          )
        : null,
      h(
        'div',
        { class: 'tool-heading' },
        h('h1', { id: 'tool-title', class: 'tool-title', tabindex: '-1' }, tool.name[lang]),
        h('p', { class: 'tool-desc' }, tool.description[lang]),
        h(
          'p',
          { class: 'tool-badges' },
          h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
          ...(tool.online
            ? [h('span', { class: 'pill pill-online' }, icon('globe', 14), t('usesInternet'))]
            : [
                h('span', { class: 'pill pill-local' }, icon('shield', 14), t('runsLocally')),
                h('span', { class: 'pill pill-private' }, icon('lock', 14), t('badgePrivate')),
                h('span', { class: 'pill pill-nostore' }, icon('eye-off', 14), t('badgeNoStorage')),
              ]),
        ),
      ),
      art ? h('div', { class: 'tool-header-illustration' }, art) : null,
    ),
    body,
    h(
      'p',
      { class: 'tool-privacy' },
      icon('shield', 18),
      t(tool.online ? `toolPrivacyOnline_${tool.online}` : 'toolPrivacy'),
    ),
    related.length && !ownRelated
      ? h(
          'nav',
          { class: 'related', 'aria-labelledby': 'related-title' },
          h(
            'h2',
            { id: 'related-title', class: 'related-title' },
            t('moreInToolkit', { category: catName }),
          ),
          h(
            'ul',
            { class: 'related-list', role: 'list' },
            ...related.map((r) =>
              h(
                'li',
                {},
                h(
                  'a',
                  { href: toHash({ name: 'tool', id: r.id }), class: 'related-link' },
                  r.name[lang],
                  icon('arrow-right', 16),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}
