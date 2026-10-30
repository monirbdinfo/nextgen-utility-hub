import {
  BOOTSTRAP_URLS,
  findService,
  parseBootstrap,
  parseRdapNetwork,
  rdapIpUrl,
  type BootstrapEntry,
  type IpVersion,
  type ParsedIp,
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
