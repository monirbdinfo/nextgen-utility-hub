import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseIpInput, type ParsedIp } from '../src/calc/rdap';
import { GlobalpingFailure, runMeasurement } from '../src/lib/globalping';
import { checkBlocklists, lookupNetwork } from '../src/lib/ipIntel';
import { lookupDomainRdap, RdapFailure, resetDomainRdapCache } from '../src/lib/rdap';
import { CREATED, PING_DONE, PING_RUNNING } from './fixtures/globalping';
import { BOOTSTRAP_DNS, VERISIGN_DOMAIN } from './fixtures/rdap';

let fetchMock: ReturnType<typeof vi.fn>;
const signal = (): AbortSignal => new AbortController().signal;
const ip = (t: string, v: 4 | 6): ParsedIp => {
  const r = parseIpInput(t, v);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const status = (code: number): Response => new Response('{}', { status: code });

/** Cloudflare DoH answers keyed by "name TYPE": [status, data[]]. Unknown names are NXDOMAIN. */
function doh(map: Record<string, [number, string[]]>): void {
  const codes: Record<string, number> = { A: 1, TXT: 16 };
  fetchMock.mockImplementation(async (url: string) => {
    const u = new URL(url);
    expect(u.origin).toBe('https://cloudflare-dns.com');
    const key = `${u.searchParams.get('name')} ${u.searchParams.get('type')}`;
    const [Status, data] = map[key] ?? [3, []];
    return Response.json({
      Status,
      Answer: data.map((d) => ({
        name: 'x.',
        type: codes[u.searchParams.get('type')!],
        TTL: 60,
        data: d,
      })),
    });
  });
}

beforeEach(() => {
  resetDomainRdapCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('runMeasurement (Globalping)', () => {
  const spec = {
    type: 'ping' as const,
    target: { value: 'example.com', isHost: true },
    family: 4 as const,
    location: 'world' as const,
    probes: 1,
    packets: 3,
  };

  it('POSTs only the target and options, then polls until finished', async () => {
    const answers = [PING_RUNNING, PING_DONE];
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === 'POST') return Response.json(CREATED, { status: 202 });
      expect(url).toBe('https://api.globalping.io/v1/measurements/PY8lHBpNhG0rOVpp');
      return Response.json(answers.shift());
    });
    const updates: boolean[] = [];
    const m = await runMeasurement(spec, signal(), (p) => updates.push(p.finished));
    expect(m.finished).toBe(true);
    expect(updates).toEqual([false, true]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.globalping.io/v1/measurements');
    expect(init.credentials).toBe('omit');
    expect(init.referrerPolicy).toBe('no-referrer');
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'ping',
      target: 'example.com',
      locations: [{ magic: 'world', limit: 1 }],
      measurementOptions: { packets: 3, ipVersion: 4 },
    });
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization/i);
  });

  it('reports rate limits, missing probes and refused targets by kind', async () => {
    for (const [code, kind] of [
      [429, 'rate-limited'],
      [422, 'no-probes'],
      [400, 'validation'],
    ] as const) {
      fetchMock.mockResolvedValueOnce(status(code));
      const e = await runMeasurement(spec, signal()).catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GlobalpingFailure);
      expect((e as GlobalpingFailure).kind).toBe(kind);
    }
  });

  it('gives up after the deadline instead of waiting forever', async () => {
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) =>
      init.method === 'POST'
        ? Response.json(CREATED, { status: 202 })
        : Response.json(PING_RUNNING),
    );
    let t = 0;
    const e = await runMeasurement(spec, signal(), undefined, () => (t += 61_000)).catch(
      (x: unknown) => x,
    );
    expect((e as GlobalpingFailure).kind).toBe('gave-up');
  });

  it('refuses an unreadable answer', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ nope: true }, { status: 202 }));
    const e = await runMeasurement(spec, signal()).catch((x: unknown) => x);
    expect((e as GlobalpingFailure).kind).toBe('parse');
  });
});

describe('lookupNetwork (Team Cymru via Cloudflare DNS)', () => {
  it('reads the origin and the AS name', async () => {
    doh({
      '8.8.8.8.origin.asn.cymru.com TXT': [0, ['"15169 | 8.8.8.0/24 | US | arin | 2023-12-28"']],
      'AS15169.asn.cymru.com TXT': [0, ['"15169 | US | arin | 2000-03-30 | GOOGLE, US"']],
    });
    const r = await lookupNetwork(ip('8.8.8.8', 4), signal());
    expect(r.origin?.prefix).toBe('8.8.8.0/24');
    expect(r.as?.name).toBe('GOOGLE, US');
    expect(r.noAnswer).toBeNull();
  });

  it('says when there is no route, or no answer, without inventing one', async () => {
    doh({});
    expect(await lookupNetwork(ip('8.8.8.8', 4), signal())).toMatchObject({
      origin: null,
      noAnswer: null,
    });
    doh({ '8.8.8.8.origin.asn.cymru.com TXT': [2, []] });
    expect(await lookupNetwork(ip('8.8.8.8', 4), signal())).toMatchObject({
      origin: null,
      noAnswer: 'SERVFAIL',
    });
  });

  it('still shows the origin when the AS name lookup fails', async () => {
    doh({ '8.8.8.8.origin.asn.cymru.com TXT': [0, ['"15169 | 8.8.8.0/24 | US | arin | "']] });
    const r = await lookupNetwork(ip('8.8.8.8', 4), signal());
    expect(r.origin?.asns).toEqual([15169]);
    expect(r.as).toBeNull();
  });
});

describe('checkBlocklists', () => {
  it('reports each list separately and keeps going after a failure', async () => {
    const codes: Record<string, number> = { A: 1 };
    fetchMock.mockImplementation(async (url: string) => {
      const name = new URL(url).searchParams.get('name')!;
      if (name.endsWith('psbl.surriel.com')) throw new TypeError('Failed to fetch');
      const data = name.endsWith('zen.spamhaus.org')
        ? ['127.255.255.254']
        : name.endsWith('bl.spamcop.net')
          ? ['127.0.0.2']
          : [];
      return Response.json({
        Status: data.length ? 0 : 3,
        Answer: data.map((d) => ({ name, type: codes.A, TTL: 60, data: d })),
      });
    });
    const seen: number[] = [];
    const r = await checkBlocklists(0x08080808, signal(), (n) => seen.push(n));
    expect(seen).toEqual([1, 2, 3, 4, 5]);
    expect(r.map((x) => [x.list.id, x.verdict.kind])).toEqual([
      ['spamhaus', 'refused'],
      ['spamcop', 'listed'],
      ['psbl', 'error'],
      ['dronebl', 'not-listed'],
      ['mailspike', 'not-listed'],
    ]);
    expect(new URL(fetchMock.mock.calls[1]![0] as string).searchParams.get('name')).toBe(
      '8.8.8.8.bl.spamcop.net',
    );
  });
});

describe('lookupDomainRdap', () => {
  const routes = (map: Record<string, () => Response>): void => {
    fetchMock.mockImplementation(async (url: string) => {
      const f = map[url];
      if (!f) throw new Error(`unexpected request ${url}`);
      return f();
    });
  };

  it('reports a registered name from its registry', async () => {
    routes({
      'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS),
      'https://rdap.verisign.com/com/v1/domain/example.com': () => Response.json(VERISIGN_DOMAIN),
    });
    const r = await lookupDomainRdap('example.com', signal());
    expect(r.kind).toBe('registered');
    if (r.kind === 'registered') expect(r.domain.registrar).toBe('Example Registrar, Inc.');
  });

  it('treats only a registry 404 as not found', async () => {
    routes({
      'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS),
      'https://rdap.verisign.com/com/v1/domain/free-name-123.com': () => status(404),
    });
    expect((await lookupDomainRdap('free-name-123.com', signal())).kind).toBe('not-found');
    routes({
      'https://rdap.verisign.com/com/v1/domain/busy.com': () => status(503),
    });
    const e = await lookupDomainRdap('busy.com', signal()).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(RdapFailure);
    expect((e as RdapFailure).kind).toBe('http');
  });

  it('cannot say anything for a TLD without RDAP, such as .bd', async () => {
    routes({ 'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS) });
    expect(await lookupDomainRdap('example.com.bd', signal())).toMatchObject({
      kind: 'no-service',
      tld: 'bd',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
