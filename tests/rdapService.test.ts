import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseIpInput, type ParsedIp } from '../src/calc/rdap';
import { lookupIpRdap, RdapFailure, resetRdapCache } from '../src/lib/rdap';
import { APNIC_V6, ARIN_V4, BOOTSTRAP_V4, BOOTSTRAP_V6 } from './fixtures/rdap';

let fetchMock: ReturnType<typeof vi.fn>;
const ip = (text: string, v: 4 | 6): ParsedIp => {
  const r = parseIpInput(text, v);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
/** A JSON response, optionally pretending to come from another URL after a redirect. */
function json(body: unknown, init: { status?: number; url?: string } = {}): Response {
  const res = new Response(JSON.stringify(body), { status: init.status ?? 200 });
  if (init.url) {
    Object.defineProperty(res, 'url', { value: init.url });
    Object.defineProperty(res, 'redirected', { value: true });
  }
  return res;
}
/** Answer requests by URL; anything else fails the test. */
function routes(map: Record<string, () => Response | Promise<Response>>): void {
  fetchMock.mockImplementation(async (url: string) => {
    const f = map[url];
    if (!f) throw new Error(`unexpected request ${url}`);
    return f();
  });
}
const failure = async (p: Promise<unknown>): Promise<RdapFailure> => {
  try {
    await p;
  } catch (e) {
    if (e instanceof RdapFailure) return e;
    throw e;
  }
  throw new Error('expected a failure');
};

beforeEach(() => {
  resetRdapCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('lookupIpRdap', () => {
  it('discovers the registry from the IPv4 bootstrap file and reads its answer', async () => {
    routes({
      'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => json(ARIN_V4),
    });
    const r = await lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal);
    expect(r.server).toBe('https://rdap.arin.net/registry/');
    expect(r.source).toBe('https://rdap.arin.net/registry/ip/8.8.8.8');
    expect(r.redirected).toBe(false);
    expect(r.network.handle).toBe('NET-8-8-8-0-2');
    expect(r.at).toBeInstanceOf(Date);
    // Only the bootstrap and the registry were asked, with no credentials or referrer.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls as Array<[string, RequestInit]>)
      expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect((fetchMock.mock.calls[1]![1] as RequestInit).headers).toEqual({
      accept: 'application/rdap+json',
    });
  });

  it('uses the IPv6 bootstrap file for IPv6 addresses', async () => {
    routes({
      'https://data.iana.org/rdap/ipv6.json': () => json(BOOTSTRAP_V6),
      'https://rdap.apnic.net/ip/2404%3A6800%3A%3A1': () => json(APNIC_V6),
    });
    const r = await lookupIpRdap(ip('2404:6800::1', 6), new AbortController().signal);
    expect(r.network.country).toBe('BD');
  });

  it('downloads each bootstrap file once per page', async () => {
    routes({
      'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => json(ARIN_V4),
      'https://rdap.arin.net/registry/ip/8.8.4.4': () => json(ARIN_V4),
    });
    const s = new AbortController().signal;
    await lookupIpRdap(ip('8.8.8.8', 4), s);
    await lookupIpRdap(ip('8.8.4.4', 4), s);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://data.iana.org/rdap/ipv4.json',
      'https://rdap.arin.net/registry/ip/8.8.8.8',
      'https://rdap.arin.net/registry/ip/8.8.4.4',
    ]);
  });

  it('reports the registry that answered after a redirect', async () => {
    routes({
      'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () =>
        json(ARIN_V4, { url: 'https://rdap.db.ripe.net/ip/8.8.8.8' }),
    });
    const r = await lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal);
    expect(r.redirected).toBe(true);
    expect(r.source).toBe('https://rdap.db.ripe.net/ip/8.8.8.8');
    expect(r.server).toBe('https://rdap.arin.net/registry/');
  });

  it.each([
    [404, 'not-found'],
    [429, 'rate-limited'],
    [503, 'http'],
  ] as const)('HTTP %s from the registry → %s', async (status, kind) => {
    routes({
      'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => json({ errorCode: status }, { status }),
    });
    const f = await failure(lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal));
    expect([f.kind, f.status]).toEqual([kind, status]);
  });

  it('refuses malformed JSON and answers that are not IP networks', async () => {
    routes({
      'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => new Response('<html>oops</html>'),
      'https://rdap.arin.net/registry/ip/8.8.4.4': () => json({ objectClassName: 'domain' }),
    });
    const s = new AbortController().signal;
    expect((await failure(lookupIpRdap(ip('8.8.8.8', 4), s))).kind).toBe('parse');
    expect((await failure(lookupIpRdap(ip('8.8.4.4', 4), s))).kind).toBe('parse');
  });

  it('says when no registry covers the address, or the bootstrap file is unusable', async () => {
    routes({ 'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4) });
    expect(
      (await failure(lookupIpRdap(ip('45.1.2.3', 4), new AbortController().signal))).kind,
    ).toBe('no-service');
    resetRdapCache();
    routes({ 'https://data.iana.org/rdap/ipv4.json': () => json({ services: [] }) });
    expect((await failure(lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal))).kind).toBe(
      'bootstrap',
    );
  });

  it('retries the bootstrap download after a failure', async () => {
    let n = 0;
    routes({
      'https://data.iana.org/rdap/ipv4.json': () =>
        ++n === 1 ? json({}, { status: 500 }) : json(BOOTSTRAP_V4),
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => json(ARIN_V4),
    });
    const s = new AbortController().signal;
    expect((await failure(lookupIpRdap(ip('8.8.8.8', 4), s))).kind).toBe('http');
    await expect(lookupIpRdap(ip('8.8.8.8', 4), s)).resolves.toBeDefined();
  });

  it('times out a registry that does not answer', async () => {
    vi.useFakeTimers();
    routes({ 'https://data.iana.org/rdap/ipv4.json': () => json(BOOTSTRAP_V4) });
    fetchMock.mockImplementationOnce(async () => json(BOOTSTRAP_V4));
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_r, reject) =>
          init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
        ),
    );
    const p = failure(lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal));
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await p).kind).toBe('timeout');
  });

  it('reports a network or cross-origin failure as blocked', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect((await failure(lookupIpRdap(ip('8.8.8.8', 4), new AbortController().signal))).kind).toBe(
      'blocked',
    );
  });
});
