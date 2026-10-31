import type { IconName } from '../registry';

export type UiIcon =
  | 'eye-off'
  | 'users'
  | 'github'
  | 'info'
  | 'map'
  | 'chevron-right'
  | 'star'
  | 'clock'
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
  | 'alert'
  | 'swap'
  | 'home'
  | 'bolt'
  | 'devices'
  | 'lock'
  | 'leaf'
  | 'grid'
  | 'gear'
  | 'calendar'
  | 'calendar-range'
  | 'chart'
  | 'doc'
  | 'mail'
  | 'list-check'
  | 'hash'
  | 'words'
  | 'banknote'
  | 'sparkle'
  | 'image'
  | 'crop'
  | 'compress'
  | 'convert'
  | 'portrait'
  | 'file-plus'
  | 'layers'
  | 'pages'
  | 'file-minus'
  | 'server'
  | 'activity'
  | 'ruler';

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
  swap: 'M7 4 3 8l4 4 M3 8h14 M17 12l4 4-4 4 M21 16H7',
  home: 'M4 11.5 12 5l8 6.5 M6 10v9.5h4.5V15h3v4.5H18V10',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  devices: 'M3.5 5h13v9h-13z M2 17h11 M17.5 9h4v10.5h-4z',
  lock: 'M6.5 10.5h11v9.5h-11z M9 10.5V8a3 3 0 0 1 6 0v2.5 M12 14.5v2',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14z M5 19l8-8',
  grid: 'M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 3v2.5 M12 18.5V21 M3 12h2.5 M18.5 12H21 M5.6 5.6l1.8 1.8 M16.6 16.6l1.8 1.8 M5.6 18.4l1.8-1.8 M16.6 7.4l1.8-1.8',
  calendar: 'M4.5 6h15v14h-15z M4.5 10h15 M8.5 3.5V7 M15.5 3.5V7 M8 14h3',
  'calendar-range': 'M4.5 6h15v14h-15z M4.5 10h15 M8.5 3.5V7 M15.5 3.5V7 M8 15h8 M14 13l2 2-2 2',
  chart: 'M4 20h16 M7 20v-6 M11 20V9 M15 20v-4 M19 20V6',
  doc: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 15.5h6 M9 8.5h2',
  mail: 'M3.5 6h17v12h-17z M3.5 7l8.5 6 8.5-6',
  'list-check':
    'M4 7l1.5 1.5L8 6 M4 12.5 5.5 14 8 11.5 M4 18l1.5 1.5L8 17 M11 7.5h9 M11 13h9 M11 18.5h9',
  hash: 'M9 4 7 20 M17 4l-2 16 M4 9h16 M3.5 15h16',
  words: 'M4 7V5h16v2 M12 5v14 M9 19h6',
  banknote: 'M3 7h18v10H3z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M6 10v4 M18 10v4',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  image: 'M4 5h16v14H4z M8.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M4 16l5-4.5 4 3.5 3-2.5 4 3.5',
  crop: 'M6 3v15h15 M3 6h15v15',
  compress:
    'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5 M9 9l-4.5-4.5 M15 9l4.5-4.5 M9 15l-4.5 4.5 M15 15l4.5 4.5',
  convert:
    'M4 12a8 8 0 0 1 13.7-5.6L20 8.5 M20 4v4.5h-4.5 M20 12a8 8 0 0 1-13.7 5.6L4 15.5 M4 20v-4.5h4.5',
  portrait:
    'M5 3.5h14v17H5z M12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M8 17.5c.8-2 2.2-3 4-3s3.2 1 4 3',
  'file-plus': 'M6 3h8l4 4v14H6z M14 3v4h4 M12 11v6 M9 14h6',
  layers: 'M12 4 3 9l9 5 9-5z M3 14l9 5 9-5',
  pages: 'M8 3h9l3 3v12H8z M17 3v3h3 M4.5 7v14H16',
  'file-minus': 'M6 3h8l4 4v14H6z M14 3v4h4 M9 14h6',
  server: 'M4 4.5h16v6H4z M4 13.5h16v6H4z M7.5 7.5h.01 M7.5 16.5h.01',
  activity: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  ruler: 'M3 15.5 15.5 3 21 8.5 8.5 21z M7 11.5l2 2 M10 8.5l1.5 1.5 M13 5.5l2 2 M5.5 13.5 7 15',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5V12l3 2',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  'chevron-right': 'M9.5 6l6 6-6 6',
  map: 'M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5z M9 4v13.5 M15 6.5V20',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5.5 M12 7.75h.01',
  github:
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M17.5 14.7c2.2.6 3.6 2.5 4 5.3',
  'eye-off':
    'M3 3l18 18 M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.5.9-1.5 2.4-3 3.7 M6.4 7.5C4.6 8.8 3.3 10.6 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1 M9.9 10a3 3 0 0 0 4.2 4.2',
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
