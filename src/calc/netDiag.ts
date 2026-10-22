import { fail, ok, type Result } from './result';

/**
 * Pure helpers for the online Network tools: building and reading Cloudflare responses and
 * summarising latency samples. No fetch here — see src/lib/net.ts.
 */

// ---------- DNS over HTTPS (Cloudflare JSON API) ----------

export const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';
export const TRACE_ENDPOINT = 'https://1.1.1.1/cdn-cgi/trace';

export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

/** DNS RR type numbers (RFC 1035, 3596, 8659) as returned in the JSON `type` field. */
const TYPE_NAMES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  39: 'DNAME',
  46: 'RRSIG',
  257: 'CAA',
};
export const typeName = (n: number): string => TYPE_NAMES[n] ?? `TYPE${n}`;

/** RCODE names (RFC 1035 / 6895) for the JSON `Status` field. */
const RCODES: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
};
export const rcodeName = (n: number): string => RCODES[n] ?? `RCODE${n}`;

export type DomainError = 'domain-empty' | 'domain-invalid' | 'domain-too-long' | 'domain-ip';

/**
 * Normalise a domain name the user typed: trims, drops a scheme, path or trailing dot,
 * lower-cases and converts internationalised names to their ASCII (punycode) form.
 */
export function normaliseDomain(text: string): Result<string, DomainError> {
  let s = text.trim();
  if (!s) return fail('domain-empty');
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/[/?#].*$/, '');
  s = s.replace(/\.$/, '');
  if (!s || /[\s@:]/.test(s)) return fail('domain-invalid');
  let ascii: string;
  try {
    ascii = new URL(`http://${s}`).hostname;
  } catch {
    return fail('domain-invalid');
  }
  if (/^\d+(\.\d+){3}$/.test(ascii) || ascii.startsWith('[')) return fail('domain-ip');
  if (ascii.length > 253) return fail('domain-too-long');
  const labels = ascii.split('.');
  if (labels.length < 2) return fail('domain-invalid');
  const label = /^(?!-)[a-z0-9_-]{1,63}(?<!-)$/;
  if (!labels.every((l) => label.test(l))) return fail('domain-invalid');
  return ok(ascii);
}

export function dohUrl(name: string, type: RecordType): string {
  const u = new URL(DOH_ENDPOINT);
  u.searchParams.set('name', name);
  u.searchParams.set('type', type);
  return u.toString();
}

export interface DnsAnswer {
  name: string;
  type: string;
  ttl: number;
  data: string;
}

export interface DnsResult {
  status: number;
  statusName: string;
  answers: DnsAnswer[];
  /** DNSSEC-validated by the resolver (the `AD` flag). */
  authenticated: boolean;
}

/** Read a Cloudflare DoH JSON body. Anything unexpected is a parse error, never trusted. */
export function parseDohJson(body: unknown): Result<DnsResult, 'parse'> {
  if (!body || typeof body !== 'object') return fail('parse');
  const b = body as Record<string, unknown>;
  if (typeof b.Status !== 'number') return fail('parse');
  const raw = b.Answer === undefined ? [] : b.Answer;
  if (!Array.isArray(raw)) return fail('parse');
  const answers: DnsAnswer[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') return fail('parse');
    const r = a as Record<string, unknown>;
    if (typeof r.name !== 'string' || typeof r.type !== 'number' || typeof r.data !== 'string')
      return fail('parse');
    answers.push({
      name: r.name.replace(/\.$/, ''),
      type: typeName(r.type),
      ttl: typeof r.TTL === 'number' ? r.TTL : 0,
      data: r.data,
    });
  }
  return ok({
    status: b.Status,
    statusName: rcodeName(b.Status),
    answers,
    authenticated: b.AD === true,
  });
}

// ---------- Public IP (Cloudflare trace) ----------

export interface TraceInfo {
  ip: string;
  /** IPv4 or IPv6, from the address syntax. */
  family: 4 | 6;
  /** ISO 3166 country code Cloudflare associates with the address (may be absent). */
  country?: string;
  /** Cloudflare data centre (IATA code) that answered. */
  colo?: string;
  http?: string;
  tls?: string;
}

/** Parse the `key=value` lines of /cdn-cgi/trace. */
export function parseTrace(text: string): Result<TraceInfo, 'parse'> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) map.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  const ip = map.get('ip') ?? '';
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const v6 = /^[0-9a-f:.]{2,45}$/i;
  const family = v4.test(ip) ? 4 : ip.includes(':') && v6.test(ip) ? 6 : null;
  if (!family) return fail('parse');
  const opt = (k: string, re: RegExp): string | undefined => {
    const v = map.get(k);
    return v && re.test(v) ? v : undefined;
  };
  return ok({
    ip,
    family,
    country: opt('loc', /^[A-Z]{2}$/),
    colo: opt('colo', /^[A-Z]{3}$/),
    http: opt('http', /^[\w/.]{1,16}$/),
    tls: opt('tls', /^[\w.]{1,16}$/),
  });
}

// ---------- Latency ----------

export interface LatencySummary {
  sent: number;
  received: number;
  failed: number;
  /** Failed requests as a percentage of those sent (0–100). */
  failedPercent: number;
  min: number | null;
  avg: number | null;
  median: number | null;
  max: number | null;
  /** Mean absolute difference between consecutive successful samples (RFC 3550-style). */
  jitter: number | null;
}

/** Summarise round-trip times in ms; `null` marks a failed or timed-out request. */
export function summariseLatency(samples: ReadonlyArray<number | null>): LatencySummary {
  const ok = samples.filter((s): s is number => s !== null && Number.isFinite(s));
  const sent = samples.length;
  const failed = sent - ok.length;
  const base = {
    sent,
    received: ok.length,
    failed,
    failedPercent: sent ? (failed / sent) * 100 : 0,
  };
  if (!ok.length) return { ...base, min: null, avg: null, median: null, max: null, jitter: null };
  const sorted = [...ok].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median =
    sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  let diff = 0;
  for (let i = 1; i < ok.length; i++) diff += Math.abs(ok[i]! - ok[i - 1]!);
  return {
    ...base,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: ok.reduce((a, b) => a + b, 0) / ok.length,
    median,
    jitter: ok.length > 1 ? diff / (ok.length - 1) : null,
  };
}
