import { addressKind, parseIPv4 } from './ipv4';
import { addressKind6, parseIPv6 } from './ipv6';
import { normaliseDomain } from './netDiag';
import { fail, ok, type Result } from './result';

/**
 * Globalping (https://globalping.io) measurement requests and results, following its published
 * OpenAPI description (POST /v1/measurements, GET /v1/measurements/{id}). Pure data handling; the
 * requests are made by src/lib/globalping.ts. Measurements run on Globalping's probes around the
 * world, never on the visitor's device.
 */

export const GLOBALPING_API = 'https://api.globalping.io/v1/measurements';

export type MeasurementType = 'ping' | 'traceroute';
export type IpFamily = 4 | 6;

/** Where the probes should be: a Globalping "magic" location string. */
export const LOCATIONS = ['world', 'Bangladesh', 'Asia', 'Europe', 'North America'] as const;
export type LocationChoice = (typeof LOCATIONS)[number];

export const PROBE_COUNTS = [1, 3, 5] as const;
export const PACKET_COUNTS = [3, 5, 10] as const;

export type TargetError = 'empty' | 'invalid' | 'wrong-family' | 'not-public';

export interface Target {
  /** What is sent to Globalping. */
  value: string;
  /** True for a host name (Globalping then needs `ipVersion`), false for an IP literal. */
  isHost: boolean;
}

/**
 * A public IP address of the tool's family, or a host name. Private, loopback, link-local,
 * documentation and other special addresses are refused: probes on the internet cannot reach them.
 */
export function parseTarget(text: string, family: IpFamily): Result<Target, TargetError> {
  const t = text.trim();
  if (!t) return fail('empty');
  const v4 = parseIPv4(t);
  if (v4.ok) {
    if (family !== 4) return fail('wrong-family');
    if (addressKind(v4.value) !== 'public') return fail('not-public');
    return ok({ value: t, isHost: false });
  }
  // An IPv6 literal (optionally in brackets); a URL such as https://… is a host name below.
  if (/^\[?[\da-f:.]+\]?$/i.test(t) && t.includes(':')) {
    const v6 = parseIPv6(t.replace(/^\[|\]$/g, ''));
    if (!v6.ok) return fail('invalid');
    if (family !== 6) return fail('wrong-family');
    if (addressKind6(v6.value) !== 'global') return fail('not-public');
    return ok({ value: t.replace(/^\[|\]$/g, ''), isHost: false });
  }
  const host = normaliseDomain(t);
  if (!host.ok) return fail('invalid');
  if (host.value === 'localhost' || host.value.endsWith('.localhost')) return fail('not-public');
  return ok({ value: host.value, isHost: true });
}

export interface MeasurementSpec {
  type: MeasurementType;
  target: Target;
  family: IpFamily;
  location: LocationChoice;
  probes: number;
  packets?: number;
}

/** The POST body. `ipVersion` is only sent for host names, as the API requires. */
export function measurementBody(spec: MeasurementSpec): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  if (spec.type === 'ping') options.packets = spec.packets ?? 3;
  if (spec.target.isHost) options.ipVersion = spec.family;
  return {
    type: spec.type,
    target: spec.target.value,
    locations: [{ magic: spec.location, limit: spec.probes }],
    measurementOptions: options,
  };
}

// ---------- Responses ----------

export type ApiErrorKind = 'validation' | 'no-probes' | 'rate-limited' | 'not-found' | 'other';

/** Classify an API error body: `{ error: { type, message } }`. */
export function apiErrorKind(status: number, body: unknown): ApiErrorKind {
  const type = (body as { error?: { type?: unknown } } | null)?.error?.type;
  if (status === 429 || type === 'rate_limit_exceeded' || type === 'too_many_requests')
    return 'rate-limited';
  if (status === 422 || type === 'no_probes_found') return 'no-probes';
  if (status === 400 || type === 'validation_error') return 'validation';
  if (status === 404) return 'not-found';
  return 'other';
}

export interface Probe {
  continent: string | null;
  country: string | null;
  city: string | null;
  asn: number | null;
  network: string | null;
}

export interface PingStats {
  min: number | null;
  avg: number | null;
  max: number | null;
  total: number | null;
  rcv: number | null;
  loss: number | null;
}

export interface Hop {
  address: string | null;
  hostname: string | null;
  rtts: number[];
}

export type TestStatus = 'in-progress' | 'finished' | 'failed' | 'offline';

export interface ProbeResult {
  probe: Probe;
  status: TestStatus;
  resolvedAddress: string | null;
  resolvedHostname: string | null;
  rawOutput: string;
  stats: PingStats | null;
  hops: Hop[];
}

export interface Measurement {
  id: string;
  /** `in-progress` until every probe is done; any other value is final. */
  finished: boolean;
  results: ProbeResult[];
}

const MAX_TEXT = 200;
const MAX_RAW = 20_000;
const MAX_HOPS = 64;

const str = (v: unknown, max = MAX_TEXT): string | null =>
  typeof v === 'string' && v.trim() ? v.slice(0, max) : null;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const status = (v: unknown): TestStatus =>
  v === 'finished' || v === 'failed' || v === 'offline' ? v : 'in-progress';

/** Read POST's 202 body: `{ id, probesCount }`. */
export function parseCreated(body: unknown): Result<string, 'parse'> {
  const id = str(obj(body).id);
  return id && /^[\w-]+$/.test(id) ? ok(id) : fail('parse');
}

/** Read a GET /v1/measurements/{id} body. */
export function parseMeasurement(body: unknown): Result<Measurement, 'parse'> {
  const b = obj(body);
  const id = str(b.id);
  if (!id || !Array.isArray(b.results) || typeof b.status !== 'string') return fail('parse');
  const results = b.results.map((raw): ProbeResult => {
    const r = obj(raw);
    const p = obj(r.probe);
    const res = obj(r.result);
    const s = obj(res.stats);
    const hasStats = res.stats !== undefined && res.stats !== null;
    return {
      probe: {
        continent: str(p.continent),
        country: str(p.country),
        city: str(p.city),
        asn: num(p.asn),
        network: str(p.network),
      },
      status: status(res.status),
      resolvedAddress: str(res.resolvedAddress),
      resolvedHostname: str(res.resolvedHostname),
      rawOutput: typeof res.rawOutput === 'string' ? res.rawOutput.slice(0, MAX_RAW) : '',
      stats: hasStats
        ? {
            min: num(s.min),
            avg: num(s.avg),
            max: num(s.max),
            total: num(s.total),
            rcv: num(s.rcv),
            loss: num(s.loss),
          }
        : null,
      hops: Array.isArray(res.hops)
        ? res.hops.slice(0, MAX_HOPS).map((h): Hop => {
            const hop = obj(h);
            return {
              address: str(hop.resolvedAddress),
              hostname: str(hop.resolvedHostname),
              rtts: Array.isArray(hop.timings)
                ? hop.timings.flatMap((t) => (num(obj(t).rtt) === null ? [] : [num(obj(t).rtt)!]))
                : [],
            };
          })
        : [],
    };
  });
  return ok({ id, finished: b.status !== 'in-progress', results });
}
