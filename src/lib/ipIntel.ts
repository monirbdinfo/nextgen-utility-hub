import { txtValue } from '../calc/bimi';
import {
  asNameQuery,
  bestOrigin,
  originName,
  parseAsInfo,
  parseOrigin,
  type AsInfo,
  type Origin,
} from '../calc/cymru';
import {
  BLOCKLISTS,
  classifyAnswer,
  dnsblName,
  type Blocklist,
  type ListVerdict,
} from '../calc/dnsbl';
import {
  dohUrl,
  parseDohJson,
  parseTrace,
  TRACE_ENDPOINT,
  type DnsResult,
  type TraceInfo,
} from '../calc/netDiag';
import type { ParsedIp } from '../calc/rdap';
import { NetFailure, request } from './net';

/**
 * DNS questions for the ISP, IP location and blocklist tools. Every question goes to Cloudflare's
 * public resolver over HTTPS, so Team Cymru and the blocklists see Cloudflare's resolver, not the
 * visitor. Errors are thrown as NetFailure.
 */

export const LOOKUP_TIMEOUT_MS = 8000;

async function doh(name: string, type: 'A' | 'TXT', signal: AbortSignal): Promise<DnsResult> {
  const res = await request(dohUrl(name, type), {
    timeoutMs: LOOKUP_TIMEOUT_MS,
    headers: { accept: 'application/dns-json' },
    signal,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new NetFailure('parse');
  }
  const parsed = parseDohJson(body);
  if (!parsed.ok) throw new NetFailure('parse');
  return parsed.value;
}

const txts = (r: DnsResult): string[] =>
  r.answers.filter((a) => a.type === 'TXT').map((a) => txtValue(a.data));

export interface NetworkInfo {
  /** null when Team Cymru has no route for the address. */
  origin: Origin | null;
  /** Details of the first origin AS, when Team Cymru publishes them. */
  as: AsInfo | null;
  /** Set when the resolver could not get an answer (e.g. SERVFAIL); origin is then null. */
  noAnswer: string | null;
  at: Date;
}

/** Which network (AS) announces `ip`, and what that network is called. */
export async function lookupNetwork(ip: ParsedIp, signal: AbortSignal): Promise<NetworkInfo> {
  const at = new Date();
  const r = await doh(originName(ip), 'TXT', signal);
  if (r.status === 3) return { origin: null, as: null, noAnswer: null, at };
  if (r.status !== 0) return { origin: null, as: null, noAnswer: r.statusName, at };
  const answers = txts(r);
  const origin = bestOrigin(answers.flatMap((t) => parseOrigin(t) ?? []));
  if (!origin) {
    if (answers.length) throw new NetFailure('parse');
    return { origin: null, as: null, noAnswer: null, at };
  }
  let as: AsInfo | null = null;
  try {
    const a = await doh(asNameQuery(origin.asns[0]!), 'TXT', signal);
    as = txts(a).flatMap((t) => parseAsInfo(t) ?? [])[0] ?? null;
  } catch (e) {
    // The origin is still worth showing without the network name, unless the user stopped.
    if (e instanceof NetFailure && e.kind === 'aborted') throw e;
  }
  return { origin, as, noAnswer: null, at };
}

/** The visitor's public IPv4 address as Cloudflare sees it (1.1.1.1 is an IPv4 address). */
export async function publicIp(signal: AbortSignal): Promise<TraceInfo> {
  const res = await request(TRACE_ENDPOINT, { timeoutMs: LOOKUP_TIMEOUT_MS, signal });
  const parsed = parseTrace(await res.text());
  if (!parsed.ok) throw new NetFailure('parse');
  return parsed.value;
}

export interface ListResult {
  list: Blocklist;
  verdict: ListVerdict | { kind: 'error'; error: NetFailure['kind'] };
}

/** Ask each list in turn. One list failing does not stop the others. */
export async function checkBlocklists(
  ipv4: number,
  signal: AbortSignal,
  onEach: (done: number) => void = () => undefined,
): Promise<ListResult[]> {
  const out: ListResult[] = [];
  for (const list of BLOCKLISTS) {
    try {
      out.push({
        list,
        verdict: classifyAnswer(await doh(dnsblName(ipv4, list.zone), 'A', signal)),
      });
    } catch (e) {
      if (signal.aborted) throw new NetFailure('aborted');
      out.push({
        list,
        verdict: { kind: 'error', error: e instanceof NetFailure ? e.kind : 'blocked' },
      });
    }
    onEach(out.length);
  }
  return out;
}
