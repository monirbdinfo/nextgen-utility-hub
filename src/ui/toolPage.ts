import { h } from '../lib/dom';
import { getCategory, toolsByCategory, type Tool } from '../registry';
import { toHash } from '../router/router';
import { statusKey, type AppContext } from './context';
import { icon } from './icons';
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

  return h(
    'section',
    { class: 'container tool-page', 'aria-labelledby': 'tool-title' },
    breadcrumb,
    h(
      'header',
      { class: `tool-header card-${tool.category}` },
      cat ? h('div', { class: 'card-icon card-icon-lg' }, icon(cat.icon, 28)) : null,
      h(
        'div',
        { class: 'tool-heading' },
        h('h1', { id: 'tool-title', class: 'tool-title', tabindex: '-1' }, tool.name[lang]),
        h('p', { class: 'tool-desc' }, tool.description[lang]),
        h(
          'p',
          { class: 'tool-badges' },
          h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
          h('span', { class: 'pill pill-local' }, icon('shield', 14), t('runsLocally')),
        ),
      ),
    ),
    view ? view({ lang, t: ctx.t, ...store }) : null,
    h('p', { class: 'tool-privacy' }, icon('shield', 18), t('toolPrivacy')),
    related.length
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
