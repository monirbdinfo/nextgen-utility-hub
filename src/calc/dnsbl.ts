import { formatIPv4 } from './ipv4';
import type { DnsResult } from './netDiag';

/**
 * DNS-based blocklists (RFC 5782): an IPv4 address is listed when `<reversed address>.<zone>`
 * has an A record in 127.0.0.0/8 (normally 127.0.0.2 and up); NXDOMAIN means it is not listed.
 * Lists can refuse queries from big public resolvers, which is why the answer is checked with
 * care: Spamhaus, for example, answers 127.255.255.254 to queries that come through public
 * resolvers such as Cloudflare's, and 127.255.255.252/255 for typing or volume problems. Those
 * answers are reported as "could not check", never as a listing.
 *
 * Only the lists below are checked. They are a small sample, not every blocklist there is.
 */

export interface Blocklist {
  id: string;
  name: string;
  zone: string;
  info: string;
}

export const BLOCKLISTS: readonly Blocklist[] = [
  {
    id: 'spamhaus',
    name: 'Spamhaus ZEN',
    zone: 'zen.spamhaus.org',
    info: 'https://www.spamhaus.org/',
  },
  {
    id: 'spamcop',
    name: 'SpamCop',
    zone: 'bl.spamcop.net',
    info: 'https://www.spamcop.net/bl.shtml',
  },
  {
    id: 'psbl',
    name: 'PSBL (Passive Spam Block List)',
    zone: 'psbl.surriel.com',
    info: 'https://psbl.org/',
  },
  { id: 'dronebl', name: 'DroneBL', zone: 'dnsbl.dronebl.org', info: 'https://dronebl.org/' },
  { id: 'mailspike', name: 'Mailspike', zone: 'bl.mailspike.net', info: 'https://mailspike.org/' },
];

export const dnsblName = (ipv4: number, zone: string): string =>
  `${formatIPv4(ipv4).split('.').reverse().join('.')}.${zone}`;

export type ListVerdict =
  | { kind: 'listed'; codes: string[] }
  | { kind: 'not-listed' }
  /** The list answered with one of its "query refused / error" codes. */
  | { kind: 'refused'; codes: string[] }
  /** An answer that is neither a listing nor a documented refusal. */
  | { kind: 'unexpected'; codes: string[] }
  /** The resolver could not get an answer (e.g. SERVFAIL). */
  | { kind: 'no-answer'; status: string };

const NOERROR = 0;
const NXDOMAIN = 3;

/** Turn a DNS A answer for a blocklist name into a verdict. */
export function classifyAnswer(result: DnsResult): ListVerdict {
  if (result.status === NXDOMAIN) return { kind: 'not-listed' };
  if (result.status !== NOERROR) return { kind: 'no-answer', status: result.statusName };
  const codes = result.answers.filter((a) => a.type === 'A').map((a) => a.data.trim());
  // NOERROR with no A record: the name exists but carries no listing.
  if (!codes.length) return { kind: 'not-listed' };
  if (codes.some((c) => c.startsWith('127.255.255.'))) return { kind: 'refused', codes };
  const listing = /^127\.0\.\d{1,3}\.\d{1,3}$/;
  if (codes.every((c) => listing.test(c) && c !== '127.0.0.1')) return { kind: 'listed', codes };
  return { kind: 'unexpected', codes };
}
