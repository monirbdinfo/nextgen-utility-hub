import { h } from '../lib/dom';
import {
  categories,
  getCategory,
  getTool,
  sortByAvailability,
  toolsByCategory,
  type Category,
  type Tool,
} from '../registry';
import { toHash } from '../router/router';
import { icon, type UiIcon } from './icons';
import { statusKey, type AppContext } from './context';

export interface ToolkitsHandle {
  el: HTMLElement;
  /** "Featured tools", shown on the home page only. */
  featured: HTMLElement;
  /** Re-render for the current route. */
  update(): void;
  /** Element that should receive focus after navigating to the current route. */
  heading(): HTMLElement | null;
  /** The toolkit cards; focus stays on a card the user just activated. */
  chipNav: HTMLElement;
}

/** Icon shown next to each tool; tools without one use their toolkit's icon. */
export const TOOL_ICONS: Readonly<Record<string, UiIcon>> = {
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

/**
 * Hand-picked shortcuts on the home page. The site collects no usage data, so this is an
 * editorial choice, not a popularity ranking. Only available tools are shown.
 */
export const FEATURED_TOOLS = [
  'age-calculator',
  'date-difference',
  'emi-calculator',
  'text-counter',
  'unit-converter',
  'bandwidth-calculator',
  'number-to-words-bn',
  'image-compressor',
] as const;

export function createToolkits(ctx: AppContext): ToolkitsHandle {
  const { t, state } = ctx;

  const cardLinks = new Map<string, HTMLAnchorElement>();
  const grid = h('ul', { class: 'grid', role: 'list' }, ...categories.map(card));
  const chipNav = h('nav', { class: 'toolkit-nav', 'aria-label': t('toolkitsNav') }, grid);

  const body = h('div', { class: 'toolkits-body' });
  const el = h(
    'section',
    { id: 'toolkits', class: 'section section-toolkits', 'aria-labelledby': 'toolkits-title' },
    // The cards speak for themselves visually; the heading keeps the page outline intact.
    h('h2', { id: 'toolkits-title', class: 'sr-only', tabindex: '-1' }, t('toolkitsTitle')),
    chipNav,
    body,
  );

  const featuredList = FEATURED_TOOLS.map((id) => getTool(id)).filter(
    (x): x is Tool => !!x && x.status === 'available',
  );
  const featured = h(
    'section',
    { id: 'featured', class: 'section', 'aria-labelledby': 'featured-title' },
    h(
      'div',
      { class: 'section-head' },
      h(
        'div',
        { class: 'section-intro' },
        h(
          'h2',
          { id: 'featured-title', class: 'section-title section-title-icon' },
          h('span', { class: 'title-star' }, icon('star', 26)),
          t('featuredTitle'),
        ),
        h('p', { class: 'section-text' }, t('featuredText')),
      ),
      h(
        'a',
        { href: '#toolkits', class: 'btn btn-outline' },
        t('featuredAll'),
        icon('arrow-right', 18),
      ),
    ),
    h(
      'ul',
      { class: 'featured-grid', role: 'list' },
      ...featuredList.map((tool) => featuredCard(tool)),
    ),
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

  function toolIcon(tool: Tool): HTMLElement {
    const cat = getCategory(tool.category);
    return h(
      'span',
      { class: `tool-icon card-${tool.category}` },
      icon(TOOL_ICONS[tool.id] ?? cat?.icon ?? 'toolbox', 22),
    );
  }

  /** The tool name links to the tool; the link covers the whole card. */
  function nameLink(tool: Tool): HTMLAnchorElement {
    return h(
      'a',
      { href: toHash({ name: 'tool', id: tool.id }), class: 'tool-link' },
      tool.name[state.lang],
    );
  }

  function openCta(): HTMLElement {
    return h(
      'span',
      { class: 'tool-cta', 'aria-hidden': 'true' },
      t('openTool'),
      icon('arrow-right', 16),
    );
  }

  function featuredCard(tool: Tool): HTMLElement {
    return h(
      'li',
      { class: 'tool-card tool-available' },
      h(
        'div',
        { class: 'tool-card-top' },
        toolIcon(tool),
        h(
          'div',
          { class: 'tool-body' },
          h(
            'div',
            { class: 'tool-card-head' },
            h('h3', { class: 'tool-name' }, nameLink(tool)),
            h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
          ),
          h('p', { class: 'tool-desc' }, tool.description[state.lang]),
        ),
      ),
      h('div', { class: 'tool-card-foot' }, openCta()),
    );
  }

  function toolItem(tool: Tool): HTMLElement {
    const isAvailable = tool.status === 'available';
    return h(
      'li',
      {
        id: `tool-${tool.id}`,
        class: `tool${isAvailable ? ' tool-available' : ''}`,
        tabindex: '-1',
      },
      toolIcon(tool),
      h(
        'div',
        { class: 'tool-body' },
        h('h4', { class: 'tool-name' }, isAvailable ? nameLink(tool) : tool.name[state.lang]),
        h('p', { class: 'tool-desc' }, tool.description[state.lang]),
      ),
      h(
        'div',
        { class: 'tool-actions' },
        h('span', { class: `pill pill-${tool.status}` }, t(statusKey[tool.status])),
        isAvailable ? openCta() : h('span', { class: 'tool-soon' }, t('comingSoon')),
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
    featured.hidden = route.name !== 'home';

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
          ...sortByAvailability(toolsByCategory(cat.id)).map(toolItem),
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
  return { el, featured, update, heading, chipNav };
}
