import { addressKind, formatIPv4, parseIPv4 } from './ipv4';
import { addressKind6, formatIPv6, parseIPv6 } from './ipv6';
import { fail, ok, type Result } from './result';

/**
 * RDAP (RFC 9082/9083) for IP addresses: finding the registry responsible for an address from
 * IANA's bootstrap files (RFC 9224), and reading the registry's "ip network" answer. Pure data
 * handling; the requests are made by src/lib/rdap.ts. Nothing here invents a value: a field the
 * registry did not send stays null or empty.
 */

export type IpVersion = 4 | 6;

export const BOOTSTRAP_URLS: Record<IpVersion, string> = {
  4: 'https://data.iana.org/rdap/ipv4.json',
  6: 'https://data.iana.org/rdap/ipv6.json',
};

export interface ParsedIp {
  version: IpVersion;
  /** Canonical text form, used in the RDAP request. */
  text: string;
  value: bigint;
}

export type IpInputError = 'empty' | 'invalid' | 'wrong-version' | 'not-public';

/**
 * Validate an address for a lookup of `version`. Private, loopback, link-local, documentation
 * and other special-purpose addresses are refused: they are not registered to anyone in RDAP.
 */
export function parseIpInput(text: string, version: IpVersion): Result<ParsedIp, IpInputError> {
  const t = text.trim();
  if (!t) return fail('empty');
  const v4 = parseIPv4(t);
  const v6 = v4.ok ? null : parseIPv6(t);
  if (!v4.ok && !v6?.ok) return fail('invalid');
  if (v4.ok) {
    if (version !== 4) return fail('wrong-version');
    if (addressKind(v4.value) !== 'public') return fail('not-public');
    return ok({ version: 4, text: formatIPv4(v4.value), value: BigInt(v4.value) });
  }
  const value = (v6 as { ok: true; value: bigint }).value;
  if (version !== 6) return fail('wrong-version');
  if (addressKind6(value) !== 'global') return fail('not-public');
  return ok({ version: 6, text: formatIPv6(value), value });
}

// ---------- Bootstrap (RFC 9224) ----------

export interface BootstrapEntry {
  network: bigint;
  length: number;
  /** Service base URLs, https first. */
  urls: string[];
}

const BITS: Record<IpVersion, number> = { 4: 32, 6: 128 };

function parsePrefix(text: string, version: IpVersion): { network: bigint; length: number } | null {
  const [addr, len] = text.split('/');
  const length = Number(len);
  if (!addr || !Number.isInteger(length) || length < 0 || length > BITS[version]) return null;
  if (version === 4) {
    const p = parseIPv4(addr);
    return p.ok ? { network: BigInt(p.value), length } : null;
  }
  const p = parseIPv6(addr);
  return p.ok ? { network: p.value, length } : null;
}

/** Read an IANA bootstrap file: `{ services: [[["prefix", …], ["https://…/", …]], …] }`. */
export function parseBootstrap(
  body: unknown,
  version: IpVersion,
): Result<BootstrapEntry[], 'parse'> {
  if (!body || typeof body !== 'object') return fail('parse');
  const services = (body as { services?: unknown }).services;
  if (!Array.isArray(services)) return fail('parse');
  const out: BootstrapEntry[] = [];
  for (const svc of services) {
    if (!Array.isArray(svc) || !Array.isArray(svc[0]) || !Array.isArray(svc[1])) continue;
    const urls = (svc[1] as unknown[])
      .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
      .sort((a, b) => Number(b.startsWith('https:')) - Number(a.startsWith('https:')));
    if (!urls.length) continue;
    for (const prefix of svc[0] as unknown[]) {
      if (typeof prefix !== 'string') continue;
      const p = parsePrefix(prefix, version);
      if (p) out.push({ ...p, urls });
    }
  }
  return out.length ? ok(out) : fail('parse');
}

/** The https service URL for the most specific bootstrap prefix that contains `ip`, if any. */
export function findService(entries: readonly BootstrapEntry[], ip: ParsedIp): string | null {
  const bits = BigInt(BITS[ip.version]);
  let best: BootstrapEntry | null = null;
  for (const e of entries) {
    const shift = bits - BigInt(e.length);
    if (ip.value >> shift === e.network >> shift && (!best || e.length > best.length)) best = e;
  }
  return best?.urls.find((u) => u.startsWith('https:')) ?? null;
}

export const rdapIpUrl = (base: string, ip: ParsedIp): string =>
  `${base.replace(/\/?$/, '/')}ip/${encodeURIComponent(ip.text)}`;

// ---------- Response (RFC 9083) ----------

export interface RdapEntity {
  handle: string | null;
  roles: string[];
  name: string | null;
  org: string | null;
  kind: string | null;
  emails: string[];
  phones: string[];
  address: string | null;
}

export interface RdapEvent {
  action: string;
  date: string;
}

export interface RdapNetwork {
  handle: string | null;
  name: string | null;
  type: string | null;
  startAddress: string | null;
  endAddress: string | null;
  ipVersion: string | null;
  cidrs: string[];
  country: string | null;
  parentHandle: string | null;
  status: string[];
  events: RdapEvent[];
  entities: RdapEntity[];
  remarks: string[];
  port43: string | null;
}

/** Longest text kept from any field, so a hostile or broken answer cannot flood the page. */
const MAX_TEXT = 300;
const MAX_ENTITIES = 20;
const MAX_REMARKS = 5;

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  // Control characters (newlines, escapes) are replaced so the text stays on one line.
  const t = [...v]
    .map((c) => (c < ' ' || c === '\u007f' ? ' ' : c))
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim();
  return t ? t.slice(0, MAX_TEXT) : null;
};
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap((x) => (str(x) ? [str(x)!] : [])) : [];
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Read a jCard (RFC 7095) `vcardArray` into the fields shown. */
function readVcard(vcardArray: unknown): Omit<RdapEntity, 'handle' | 'roles'> {
  const out: Omit<RdapEntity, 'handle' | 'roles'> = {
    name: null,
    org: null,
    kind: null,
    emails: [],
    phones: [],
    address: null,
  };
  if (!Array.isArray(vcardArray) || vcardArray[0] !== 'vcard' || !Array.isArray(vcardArray[1]))
    return out;
  for (const prop of vcardArray[1] as unknown[]) {
    if (!Array.isArray(prop) || typeof prop[0] !== 'string') continue;
    const [key, params, , ...values] = prop as [string, unknown, unknown, ...unknown[]];
    const first = values[0];
    const text = Array.isArray(first) ? strings(first).join(', ') || null : str(first);
    switch (key.toLowerCase()) {
      case 'fn':
        out.name ??= text;
        break;
      case 'org':
        out.org ??= text;
        break;
      case 'kind':
        out.kind ??= text;
        break;
      case 'email':
        if (text) out.emails.push(text);
        break;
      case 'tel':
        if (text) out.phones.push(text.replace(/^tel:/i, ''));
        break;
      case 'adr': {
        const label = str(obj(params)?.label);
        const parts = Array.isArray(first)
          ? (first as unknown[]).flatMap((p) =>
              Array.isArray(p) ? strings(p) : str(p) ? [str(p)!] : [],
            )
          : [];
        out.address ??= label ?? (parts.length ? parts.join(', ').slice(0, MAX_TEXT) : null);
        break;
      }
    }
  }
  return out;
}

function readEntities(list: unknown, depth: number, out: RdapEntity[]): void {
  if (!Array.isArray(list) || depth > 3) return;
  for (const raw of list) {
    const e = obj(raw);
    if (!e || out.length >= MAX_ENTITIES) continue;
    out.push({ handle: str(e.handle), roles: strings(e.roles), ...readVcard(e.vcardArray) });
    readEntities(e.entities, depth + 1, out);
  }
}

function readCidrs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((c) => {
    const o = obj(c);
    const prefix = str(o?.v4prefix) ?? str(o?.v6prefix);
    const length = o?.length;
    return prefix && typeof length === 'number' ? [`${prefix}/${length}`] : [];
  });
}

/** Read an RDAP "ip network" object. Anything else, or a body that is not an object, is refused. */
export function parseRdapNetwork(body: unknown): Result<RdapNetwork, 'parse' | 'not-network'> {
  const b = obj(body);
  if (!b) return fail('parse');
  if (b.objectClassName !== 'ip network') return fail('not-network');
  const entities: RdapEntity[] = [];
  readEntities(b.entities, 0, entities);
  const events = Array.isArray(b.events)
    ? b.events.flatMap((raw) => {
        const e = obj(raw);
        const action = str(e?.eventAction);
        const date = str(e?.eventDate);
        return action && date ? [{ action, date }] : [];
      })
    : [];
  const remarks = Array.isArray(b.remarks)
    ? b.remarks
        .flatMap((raw) => {
          const r = obj(raw);
          const lines = strings(r?.description);
          const title = str(r?.title);
          const text = [title, ...lines].filter(Boolean).join(' — ');
          return text ? [text.slice(0, MAX_TEXT)] : [];
        })
        .slice(0, MAX_REMARKS)
    : [];
  return ok({
    handle: str(b.handle),
    name: str(b.name),
    type: str(b.type),
    startAddress: str(b.startAddress),
    endAddress: str(b.endAddress),
    ipVersion: str(b.ipVersion),
    cidrs: readCidrs(b.cidr0_cidrs),
    country: str(b.country),
    parentHandle: str(b.parentHandle),
    status: strings(b.status),
    events,
    entities,
    remarks,
    port43: str(b.port43),
  });
}

/** Entities that describe who holds the block (registrant first), for the summary line. */
export function holder(n: RdapNetwork): RdapEntity | null {
  return (
    n.entities.find((e) => e.roles.includes('registrant')) ??
    n.entities.find((e) => e.roles.includes('administrative')) ??
    null
  );
}

/** The date of the first event with one of these actions, as the registry wrote it. */
export const eventDate = (n: RdapNetwork, ...actions: string[]): string | null =>
  n.events.find((e) => actions.includes(e.action))?.date ?? null;
