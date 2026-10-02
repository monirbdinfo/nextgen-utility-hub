import type { IconName } from '../registry';

type UiIcon =
  | IconName
  | 'search'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'arrow-right'
  | 'arrow-left'
  | 'check'
  | 'code'
  | 'copy'
  | 'reset'
  | 'calculator'
  | 'upload'
  | 'download'
  | 'alert';

// 24×24 stroke icons drawn for this project (no icon library dependency).
const paths: Record<UiIcon, string> = {
  toolbox: 'M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z',
  briefcase: 'M4 7.5h16v11H4z M9 7.5V5.5h6v2 M4 12.5c5 2 11 2 16 0',
  bangla: 'M9 4 7 20 M17 4l-2 16 M4 9h17 M3 15h17',
  shield: 'M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z M9 12l2.2 2.2L15.5 10',
  network:
    'M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M5 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M19 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M12 8.5V12 M12 12l-5.2 4 M12 12l5.2 4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6 6 18',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.4 2.5 3.5 5.5 3.5 9s-1.1 6.5-3.5 9 M12 3c-2.4 2.5-3.5 5.5-3.5 9s1.1 6.5 3.5 9',
  'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5 M11 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  code: 'M8.5 7 3.5 12l5 5 M15.5 7l5 5-5 5',
  copy: 'M9 9h10v11H9z M5 15H4.5A.5.5 0 0 1 4 14.5V4.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5V5',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6 M4 4v4.5h4.5',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  download: 'M12 4v12 M7 11l5 5 5-5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  alert: 'M12 4 2.5 20h19z M12 10v4.5 M12 17.5h.01',
  calculator:
    'M6 3h12v18H6z M9 6.5h6 M9 11h.01 M12 11h.01 M15 11h.01 M9 14.5h.01 M12 14.5h.01 M15 14.5h.01 M9 18h.01 M12 18h.01 M15 18h.01',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name: UiIcon, size = 20): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', paths[name]);
  svg.append(path);
  return svg;
}
