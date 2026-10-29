import { fail, ok, type Result } from './result';

/**
 * Reverse image search hand-off. This site never uploads or fetches the picture: it only builds
 * links that open a search provider with the picture's public address, or links to the
 * provider's own upload page.
 */

export type ProviderId = 'google' | 'bing' | 'tineye' | 'yandex';

export interface Provider {
  id: ProviderId;
  name: string;
  /** Search by the address of a picture that is already online. */
  byUrl(imageUrl: string): string;
  /** The provider's own page for uploading a picture from the device. */
  uploadPage: string;
}

export const PROVIDERS: readonly Provider[] = [
  {
    id: 'google',
    name: 'Google Lens',
    byUrl: (u) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(u)}`,
    uploadPage: 'https://lens.google.com/',
  },
  {
    id: 'bing',
    name: 'Bing Visual Search',
    byUrl: (u) =>
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(u)}`,
    uploadPage: 'https://www.bing.com/visualsearch',
  },
  {
    id: 'tineye',
    name: 'TinEye',
    byUrl: (u) => `https://tineye.com/search?url=${encodeURIComponent(u)}`,
    uploadPage: 'https://tineye.com/',
  },
  {
    id: 'yandex',
    name: 'Yandex Images',
    byUrl: (u) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(u)}`,
    uploadPage: 'https://yandex.com/images/',
  },
];

export type ImageUrlError = 'empty' | 'invalid' | 'scheme' | 'private' | 'too-long';

/** Longest address accepted; providers and browsers reject much longer query strings. */
export const MAX_URL_LENGTH = 2000;

/** Host names and addresses a search provider on the internet could never reach. */
function isPrivateHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // single-label intranet name
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (h.includes(':')) return h === '::1' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h);
  return false;
}

/** Check that the text is the public http(s) address of a picture; returns the normalised URL. */
export function checkImageUrl(text: string): Result<string, ImageUrlError> {
  const t = text.trim();
  if (!t) return fail('empty');
  if (t.length > MAX_URL_LENGTH) return fail('too-long');
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return fail('invalid');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('scheme');
  if (!url.hostname) return fail('invalid');
  if (isPrivateHost(url.hostname)) return fail('private');
  return ok(url.href);
}

export interface SearchLink {
  provider: Provider;
  href: string;
}

export const searchLinks = (imageUrl: string): SearchLink[] =>
  PROVIDERS.map((provider) => ({ provider, href: provider.byUrl(imageUrl) }));
