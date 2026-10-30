import type { DnsResult } from './netDiag';

/**
 * IPv6 readiness of a domain, judged from public DNS only. A published AAAA record says a host
 * *claims* an IPv6 address; it does not prove the host answers over IPv6, nor that the visitor's
 * own connection has IPv6. Those are separate questions this module does not answer.
 */

/** Most name and mail servers checked for AAAA records (keeps the number of queries bounded). */
export const MAX_HOSTS = 4;

export type HostFamily = 'dual' | 'ipv6-only' | 'ipv4-only' | 'none';

export interface HostAddresses {
  name: string;
  a: string[];
  aaaa: string[];
}

export const family = (h: Pick<HostAddresses, 'a' | 'aaaa'>): HostFamily =>
  h.aaaa.length ? (h.a.length ? 'dual' : 'ipv6-only') : h.a.length ? 'ipv4-only' : 'none';

/** Addresses of one record type in an answer (CNAME hops and other types are skipped). */
export const answersOf = (r: DnsResult, type: 'A' | 'AAAA' | 'NS' | 'MX'): string[] =>
  r.answers.filter((x) => x.type === type).map((x) => x.data);

/** Host name of an NS answer (`ns1.example.com.`) or MX answer (`10 mail.example.com.`). */
export function hostOf(data: string): string | null {
  const host = data.trim().split(/\s+/).pop() ?? '';
  const name = host.replace(/\.$/, '').toLowerCase();
  // "." is the null MX (RFC 7505): the domain accepts no mail.
  return name && name !== '.' && /^[a-z0-9_.-]+$/.test(name) ? name : null;
}

/** Unique host names from NS or MX answers, MX sorted by preference, capped at MAX_HOSTS. */
export function hostsFrom(r: DnsResult, type: 'NS' | 'MX'): { hosts: string[]; more: number } {
  const rows = answersOf(r, type).map((d) => ({
    pref: type === 'MX' ? Number(d.trim().split(/\s+/)[0]) || 0 : 0,
    host: hostOf(d),
  }));
  rows.sort((x, y) => x.pref - y.pref);
  const unique = [...new Set(rows.flatMap((r2) => (r2.host ? [r2.host] : [])))];
  return { hosts: unique.slice(0, MAX_HOSTS), more: Math.max(0, unique.length - MAX_HOSTS) };
}

export interface ServerSet {
  checked: HostAddresses[];
  /** Hosts found but not checked because of MAX_HOSTS. */
  more: number;
}

export interface Ipv6DnsFindings {
  domain: string;
  /** False when the domain does not exist (NXDOMAIN). */
  exists: boolean;
  website: HostAddresses;
  www: HostAddresses | null;
  nameServers: ServerSet;
  mailServers: ServerSet;
}

export type Readiness = 'ready' | 'partial' | 'not-ready' | 'unknown';

export interface Assessment {
  readiness: Readiness;
  websiteIpv6: boolean;
  wwwIpv6: boolean | null;
  nsWithIpv6: number;
  mxWithIpv6: number;
}

/**
 * DNS-only readiness: `ready` when the website (and www, if it exists), at least one name server
 * and, if the domain receives mail, at least one mail server publish IPv6 addresses; `not-ready`
 * when none of them do; `partial` in between.
 */
export function assess(f: Ipv6DnsFindings): Assessment {
  const has6 = (h: HostAddresses): boolean => h.aaaa.length > 0;
  const websiteIpv6 = has6(f.website);
  const wwwExists = f.www !== null && family(f.www) !== 'none';
  const wwwIpv6 = wwwExists ? has6(f.www!) : null;
  const nsWithIpv6 = f.nameServers.checked.filter(has6).length;
  const mxWithIpv6 = f.mailServers.checked.filter(has6).length;
  if (!f.exists || (family(f.website) === 'none' && !wwwExists))
    return { readiness: 'unknown', websiteIpv6, wwwIpv6, nsWithIpv6, mxWithIpv6 };
  const parts = [
    websiteIpv6 || (family(f.website) === 'none' && wwwIpv6 === true),
    ...(wwwExists ? [wwwIpv6 === true] : []),
    ...(f.nameServers.checked.length ? [nsWithIpv6 > 0] : []),
    ...(f.mailServers.checked.length ? [mxWithIpv6 > 0] : []),
  ];
  const yes = parts.filter(Boolean).length;
  const readiness: Readiness = yes === parts.length ? 'ready' : yes === 0 ? 'not-ready' : 'partial';
  return { readiness, websiteIpv6, wwwIpv6, nsWithIpv6, mxWithIpv6 };
}
