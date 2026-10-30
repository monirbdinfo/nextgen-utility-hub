import { formatIPv4 } from './ipv4';
import { formatIPv6Full } from './ipv6';
import type { ParsedIp } from './rdap';

/**
 * Team Cymru's IP-to-ASN mapping over DNS (https://www.team-cymru.com/ip-asn-mapping): a TXT
 * query for the reversed address under `origin.asn.cymru.com` (IPv4) or `origin6.asn.cymru.com`
 * (IPv6, reversed nibbles) answers "ASN | prefix | CC | registry | allocated", and a TXT query for
 * `AS<n>.asn.cymru.com` answers "ASN | CC | registry | allocated | AS name". The country is the
 * one the address block is registered in, not where any device is. Pure data handling; the DNS
 * questions are asked through Cloudflare's public resolver by src/lib/ipIntel.ts.
 */

export const CYMRU_INFO = 'https://www.team-cymru.com/ip-asn-mapping';

export function originName(ip: ParsedIp): string {
  if (ip.version === 4)
    return `${formatIPv4(Number(ip.value)).split('.').reverse().join('.')}.origin.asn.cymru.com`;
  const hex = formatIPv6Full(ip.value).replace(/:/g, '');
  return `${hex.split('').reverse().join('.')}.origin6.asn.cymru.com`;
}

export const asNameQuery = (asn: number): string => `AS${asn}.asn.cymru.com`;

export interface Origin {
  /** One block can be announced by more than one AS. */
  asns: number[];
  prefix: string | null;
  country: string | null;
  registry: string | null;
  allocated: string | null;
}

export interface AsInfo {
  asn: number;
  name: string | null;
  country: string | null;
  registry: string | null;
  allocated: string | null;
}

const MAX_TEXT = 200;
const field = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return t && t !== 'NA' ? t.slice(0, MAX_TEXT) : null;
};
const asnList = (v: string | undefined): number[] =>
  (v ?? '')
    .trim()
    .split(/\s+/)
    .filter((n) => /^\d{1,10}$/.test(n))
    .map(Number)
    .filter((n) => n > 0 && n < 2 ** 32);

/** Read an origin TXT string. Returns null when it does not have the documented shape. */
export function parseOrigin(txt: string): Origin | null {
  const parts = txt.split('|');
  if (parts.length < 4) return null;
  const asns = asnList(parts[0]);
  const prefix = field(parts[1]);
  if (!asns.length || !prefix || !/^[\d.:a-f]+\/\d{1,3}$/i.test(prefix)) return null;
  const country = field(parts[2]);
  return {
    asns,
    prefix,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    registry: field(parts[3]),
    allocated: field(parts[4]),
  };
}

/** Read an `AS<n>.asn.cymru.com` TXT string. */
export function parseAsInfo(txt: string): AsInfo | null {
  const parts = txt.split('|');
  if (parts.length < 5) return null;
  const [asn] = asnList(parts[0]);
  if (!asn) return null;
  const country = field(parts[1]);
  return {
    asn,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    registry: field(parts[2]),
    allocated: field(parts[3]),
    // The name itself may contain "|"-free commas, e.g. "GOOGLE, US".
    name: field(parts.slice(4).join('|')),
  };
}

/** The most specific of several origin answers (longest prefix). */
export function bestOrigin(list: readonly Origin[]): Origin | null {
  const len = (o: Origin): number => Number(o.prefix?.split('/')[1] ?? 0);
  return list.reduce<Origin | null>((a, b) => (!a || len(b) > len(a) ? b : a), null);
}
