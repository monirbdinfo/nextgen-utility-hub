import { h } from '../lib/dom';
import {
  categories,
  getCategory,
  sortByAvailability,
  tools,
  toolsByCategory,
  type Category,
  type Tool,
} from '../registry';
import { toHash } from '../router/router';
import { icon, type UiIcon } from './icons';
import { statusKey, type AppContext } from './context';

export interface ToolkitsHandle {
  el: HTMLElement;
  /** Re-render for the current route. */
  update(): void;
  /** Element that should receive focus after navigating to the current route. */
  heading(): HTMLElement | null;
  /** The toolkit cards; focus stays on a card the user just activated. */
  chipNav: HTMLElement;
}

/** Icon shown next to each tool in a toolkit; tools without one use their toolkit's icon. */
const TOOL_ICONS: Readonly<Record<string, UiIcon>> = {
  'age-calculator': 'calendar',
  'date-difference': 'calendar-range',
  'emi-calculator': 'calculator',
  'bandwidth-calculator': 'chart',
  'unit-converter': 'swap',
  'text-counter': 'doc',
  'cv-templates': 'doc',
  'cover-letter-templates': 'mail',
  'cv-checklist': 'list-check',
  'digit-converter': 'hash',
  'number-to-words-bn': 'words',
  'taka-in-words': 'banknote',
  'date-formatter': 'calendar',
  'unicode-cleaner': 'sparkle',
  'image-compressor': 'compress',
  'image-converter': 'convert',
  'image-resizer': 'image',
  'image-cropper': 'crop',
  'job-photo-resizer': 'portrait',
  'pdf-create': 'file-plus',
  'pdf-merge': 'layers',
  'pdf-tools': 'pages',
  'pdf-compress': 'file-minus',
  'subnet-calculator': 'network',
  'cidr-calculator': 'ruler',
  'my-ip-info': 'globe',
  'dns-lookup': 'server',
  'latency-test': 'activity',
};

export function createToolkits(ctx: AppContext): ToolkitsHandle {
  const { t, state } = ctx;

  const available = tools.filter((x) => x.status === 'available').length;
  const stats: Array<[UiIcon, number, 'statToolkits' | 'statAvailable' | 'statPlanned']> = [
    ['gear', categories.length, 'statToolkits'],
    ['grid', available, 'statAvailable'],
    ['bolt', tools.length - available, 'statPlanned'],
  ];
  const statList = h(
    'ul',
    { class: 'stats', role: 'list', 'aria-label': t('statsLabel') },
    ...stats.map(([name, n, key]) =>
      h(
        'li',
        { class: `stat stat-${key}` },
        h('span', { class: 'stat-icon' }, icon(name, 20)),
        h(
          'span',
          { class: 'stat-body' },
          h('strong', { class: 'stat-value' }, t('statValue', { n })),
          h('span', { class: 'stat-label' }, t(key)),
        ),
      ),
    ),
  );

  const cardLinks = new Map<string, HTMLAnchorElement>();
  const grid = h('ul', { class: 'grid', role: 'list' }, ...categories.map(card));
  const chipNav = h('nav', { class: 'toolkit-nav', 'aria-label': t('toolkitsNav') }, grid);

  const body = h('div', { class: 'toolkits-body' });
  const el = h(
    'section',
    {
      id: 'toolkits',
      class: 'container container-wide section',
      'aria-labelledby': 'toolkits-title',
    },
    h(
      'div',
      { class: 'section-head' },
      h(
        'div',
        { class: 'section-intro' },
        h('h2', { id: 'toolkits-title', class: 'section-title' }, t('toolkitsTitle')),
        h('p', { class: 'section-text' }, t('toolkitsText')),
      ),
      statList,
    ),
    chipNav,
    body,
  );

  function card(cat: Category): HTMLElement {
    const link = h(
      'a',
      { href: toHash({ name: 'category', id: cat.id }), class: 'card-link' },
      cat.name[state.lang],
    );
    cardLinks.set(cat.id, link);
    return h(
      'li',
      { class: `card card-${cat.id}` },
      h(
        'div',
        { class: 'card-top' },
        h('div', { class: 'card-icon' }, icon(cat.icon, 26)),
        h(
          'div',
          { class: 'card-heading' },
          h('h3', { class: 'card-title' }, link),
          h('p', { class: 'card-text' }, cat.description[state.lang]),
        ),
      ),
      h(
        'p',
        { class: 'card-foot' },
        h('span', { class: 'card-count' }, countLabel(cat)),
        h('span', { class: 'card-cta', 'aria-hidden': 'true' }, icon('arrow-right', 18)),
      ),
    );
  }

  function countLabel(cat: Category): string {
    const list = toolsByCategory(cat.id);
    const ready = list.filter((x) => x.status === 'available').length;
    const planned = list.length - ready;
    if (!ready) return t('toolCount', { n: planned });
    if (!planned) return t('toolCountAvailable', { n: ready });
    return t('toolCountMixed', { available: ready, planned });
  }

  function toolItem(tool: Tool, cat: Category): HTMLElement {
    const isAvailable = tool.status === 'available';
    const name = isAvailable
      ? h(
          'a',
          { href: toHash({ name: 'tool', id: tool.id }), class: 'tool-link' },
          tool.name[state.lang],
        )
      : tool.name[state.lang];
    return h(
      'li',
      {
        id: `tool-${tool.id}`,
        class: `tool${isAvailable ? ' tool-available' : ''}`,
        tabindex: '-1',
      },
      h('span', { class: 'tool-icon' }, icon(TOOL_ICONS[tool.id] ?? cat.icon, 22)),
      h(
        'div',
        { class: 'tool-body' },
        h('h4', { class: 'tool-name' }, name),
        h('p', { class: 'tool-desc' }, tool.description[state.lang]),
      ),
      h(
        'div',
        { class: 'tool-actions' },
        h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
        isAvailable
          ? // The whole row is clickable through the name link; this is its visible button.
            h(
              'span',
              { class: 'tool-cta', 'aria-hidden': 'true' },
              t('openTool'),
              icon('arrow-right', 16),
            )
          : h('span', { class: 'tool-soon' }, t('comingSoon')),
      ),
    );
  }

  function update(): void {
    const route = state.route;
    const activeId = route.name === 'category' ? route.id : null;
    for (const [id, link] of cardLinks) {
      const active = id === activeId;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      link.closest('.card')?.classList.toggle('card-active', active);
    }

    if (route.name === 'home') {
      body.replaceChildren();
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
            { class: 'panel-intro' },
            h(
              'h3',
              { id: 'category-heading', class: 'panel-title', tabindex: '-1' },
              cat.name[state.lang],
            ),
            h('p', { class: 'panel-text' }, cat.description[state.lang]),
          ),
          h(
            'a',
            { href: toHash({ name: 'home' }), class: 'back-link' },
            icon('arrow-left', 16),
            t('backToAll'),
          ),
        ),
        h('p', { class: 'panel-subtitle' }, t('toolsInCategory')),
        h(
          'ul',
          { class: 'tool-grid', role: 'list' },
          ...sortByAvailability(toolsByCategory(cat.id)).map((tool) => toolItem(tool, cat)),
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
