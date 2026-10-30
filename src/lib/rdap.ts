import {
  BOOTSTRAP_URLS,
  DNS_BOOTSTRAP_URL,
  findDomainService,
  findService,
  parseBootstrap,
  parseDnsBootstrap,
  parseRdapDomain,
  rdapDomainUrl,
  parseRdapNetwork,
  rdapIpUrl,
  type BootstrapEntry,
  type IpVersion,
  type ParsedIp,
  type RdapDomain,
  type RdapNetwork,
} from '../calc/rdap';
import { NetFailure, request, type NetError } from './net';

/**
 * RDAP lookups for IP addresses, shared by the IPv4 and IPv6 WHOIS tools. Requests go through
 * request() (no cookies, no referrer, no cache, with a timeout). The bootstrap file is kept in
 * memory for the page's lifetime only; nothing is stored.
 */

export const RDAP_TIMEOUT_MS = 10_000;

export type RdapError = NetError | 'bootstrap' | 'no-service' | 'not-found' | 'rate-limited';

export class RdapFailure extends Error {
  constructor(
    readonly kind: RdapError,
    readonly status?: number,
  ) {
    super(kind);
  }
}

export interface RdapLookup {
  network: RdapNetwork;
  /** The registry service chosen from the bootstrap file. */
  server: string;
  /** The URL that finally answered (after any redirect). */
  source: string;
  redirected: boolean;
  /** When the answer was received. */
  at: Date;
}

const bootstrapCache = new Map<IpVersion, Promise<BootstrapEntry[]>>();

/** Clear the in-memory bootstrap cache (tests, or after a failed download). */
export const resetRdapCache = (): void => bootstrapCache.clear();

function translate(e: unknown): RdapFailure {
  if (e instanceof RdapFailure) return e;
  if (e instanceof NetFailure) {
    if (e.kind === 'http' && e.status === 404) return new RdapFailure('not-found', 404);
    if (e.kind === 'http' && e.status === 429) return new RdapFailure('rate-limited', 429);
    return new RdapFailure(e.kind, e.status);
  }
  return new RdapFailure('blocked');
}

async function json(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new RdapFailure('parse');
  }
}

function bootstrap(version: IpVersion, signal: AbortSignal): Promise<BootstrapEntry[]> {
  let p = bootstrapCache.get(version);
  if (!p) {
    p = (async () => {
      const res = await request(BOOTSTRAP_URLS[version], {
        timeoutMs: RDAP_TIMEOUT_MS,
        headers: { accept: 'application/json' },
        signal,
      });
      const parsed = parseBootstrap(await json(res), version);
      if (!parsed.ok) throw new RdapFailure('bootstrap');
      return parsed.value;
    })();
    bootstrapCache.set(version, p);
    // A failed download is not kept, so the next lookup tries again.
    p.catch(() => bootstrapCache.delete(version));
  }
  return p;
}

/** Find the registry for `ip` and fetch its RDAP record. Rejects with RdapFailure only. */
export async function lookupIpRdap(ip: ParsedIp, signal: AbortSignal): Promise<RdapLookup> {
  try {
    const entries = await bootstrap(ip.version, signal);
    const server = findService(entries, ip);
    if (!server) throw new RdapFailure('no-service');
    const url = rdapIpUrl(server, ip);
    const res = await request(url, {
      timeoutMs: RDAP_TIMEOUT_MS,
      headers: { accept: 'application/rdap+json' },
      signal,
    });
    const parsed = parseRdapNetwork(await json(res));
    if (!parsed.ok) throw new RdapFailure('parse');
    return {
      network: parsed.value,
      server,
      source: res.url || url,
      redirected: res.redirected || (!!res.url && res.url !== url),
      at: new Date(),
    };
  } catch (e) {
    throw translate(e);
  }
}

// ---------- Domains ----------

export type DomainLookup =
  | { kind: 'registered'; domain: RdapDomain; server: string; source: string; at: Date }
  /** The registry answered 404: it holds no record of this name. */
  | { kind: 'not-found'; server: string; source: string; at: Date }
  /** No RDAP service is listed for this name's TLD, so nothing can be said. */
  | { kind: 'no-service'; tld: string; at: Date };

let dnsBootstrap: Promise<Map<string, string>> | null = null;

/** Clear the in-memory domain bootstrap cache (tests). */
export const resetDomainRdapCache = (): void => {
  dnsBootstrap = null;
};

function domainBootstrap(signal: AbortSignal): Promise<Map<string, string>> {
  if (!dnsBootstrap) {
    const p = (async () => {
      const res = await request(DNS_BOOTSTRAP_URL, {
        timeoutMs: RDAP_TIMEOUT_MS,
        headers: { accept: 'application/json' },
        signal,
      });
      const parsed = parseDnsBootstrap(await json(res));
      if (!parsed.ok) throw new RdapFailure('bootstrap');
      return parsed.value;
    })();
    dnsBootstrap = p;
    p.catch(() => {
      if (dnsBootstrap === p) dnsBootstrap = null;
    });
  }
  return dnsBootstrap;
}

/**
 * Ask the registry responsible for `name` (already normalised to ASCII) whether it holds the name.
 * Rejects with RdapFailure for anything other than an answer or a 404.
 */
export async function lookupDomainRdap(name: string, signal: AbortSignal): Promise<DomainLookup> {
  try {
    const services = await domainBootstrap(signal);
    const server = findDomainService(services, name);
    if (!server) return { kind: 'no-service', tld: name.split('.').pop() ?? name, at: new Date() };
    const url = rdapDomainUrl(server, name);
    let res: Response;
    try {
      res = await request(url, {
        timeoutMs: RDAP_TIMEOUT_MS,
        headers: { accept: 'application/rdap+json' },
        signal,
      });
    } catch (e) {
      if (e instanceof NetFailure && e.kind === 'http' && e.status === 404)
        return { kind: 'not-found', server, source: url, at: new Date() };
      throw e;
    }
    const parsed = parseRdapDomain(await json(res));
    if (!parsed.ok) throw new RdapFailure('parse');
    return {
      kind: 'registered',
      domain: parsed.value,
      server,
      source: res.url || url,
      at: new Date(),
    };
  } catch (e) {
    throw translate(e);
  }
}
