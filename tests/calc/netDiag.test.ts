import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dohUrl,
  normaliseDomain,
  parseDohJson,
  parseTrace,
  rcodeName,
  summariseLatency,
  typeName,
} from '../../src/calc/netDiag';
import { NetFailure, request } from '../../src/lib/net';

describe('normaliseDomain', () => {
  it('cleans up what people paste', () => {
    expect(normaliseDomain('  Example.COM ')).toEqual({ ok: true, value: 'example.com' });
    expect(normaliseDomain('https://www.example.com/path?q=1')).toEqual({
      ok: true,
      value: 'www.example.com',
    });
    expect(normaliseDomain('example.com.')).toEqual({ ok: true, value: 'example.com' });
    expect(normaliseDomain('_dmarc.example.com')).toEqual({
      ok: true,
      value: '_dmarc.example.com',
    });
  });

  it('converts internationalised names to punycode', () => {
    expect(normaliseDomain('বাংলা.বাংলা')).toEqual({
      ok: true,
      value: 'xn--54b7fta0cc.xn--54b7fta0cc',
    });
  });

  it('rejects anything that is not a domain name', () => {
    expect(normaliseDomain('')).toEqual({ ok: false, error: 'domain-empty' });
    expect(normaliseDomain('localhost')).toEqual({ ok: false, error: 'domain-invalid' });
    expect(normaliseDomain('exa mple.com')).toEqual({ ok: false, error: 'domain-invalid' });
    expect(normaliseDomain('user@example.com')).toEqual({ ok: false, error: 'domain-invalid' });
    expect(normaliseDomain('-bad.example')).toEqual({ ok: false, error: 'domain-invalid' });
    expect(normaliseDomain('a..b')).toEqual({ ok: false, error: 'domain-invalid' });
    expect(normaliseDomain('8.8.8.8')).toEqual({ ok: false, error: 'domain-ip' });
    expect(normaliseDomain(`${'a'.repeat(63)}.`.repeat(4) + 'com')).toEqual({
      ok: false,
      error: 'domain-too-long',
    });
    expect(normaliseDomain(`${'a'.repeat(64)}.com`)).toEqual({
      ok: false,
      error: 'domain-invalid',
    });
  });
});

describe('Cloudflare DoH JSON', () => {
  it('builds the documented GET URL', () => {
    expect(dohUrl('example.com', 'MX')).toBe(
      'https://cloudflare-dns.com/dns-query?name=example.com&type=MX',
    );
  });

  it('parses answers and maps type and status numbers', () => {
    const r = parseDohJson({
      Status: 0,
      AD: true,
      Answer: [
        { name: 'www.example.com.', type: 5, TTL: 300, data: 'example.com.' },
        { name: 'example.com.', type: 1, TTL: 60, data: '93.184.215.14' },
      ],
    });
    expect(r).toEqual({
      ok: true,
      value: {
        status: 0,
        statusName: 'NOERROR',
        authenticated: true,
        answers: [
          { name: 'www.example.com', type: 'CNAME', ttl: 300, data: 'example.com.' },
          { name: 'example.com', type: 'A', ttl: 60, data: '93.184.215.14' },
        ],
      },
    });
    expect(parseDohJson({ Status: 3 })).toMatchObject({
      ok: true,
      value: { statusName: 'NXDOMAIN', answers: [], authenticated: false },
    });
    expect(typeName(257)).toBe('CAA');
    expect(typeName(9999)).toBe('TYPE9999');
    expect(rcodeName(42)).toBe('RCODE42');
  });

  it('refuses malformed bodies', () => {
    for (const bad of [
      null,
      'x',
      {},
      { Status: '0' },
      { Status: 0, Answer: {} },
      { Status: 0, Answer: [{ name: 1 }] },
    ])
      expect(parseDohJson(bad)).toEqual({ ok: false, error: 'parse' });
  });
});

describe('Cloudflare trace', () => {
  const TRACE =
    'fl=1f1\nh=1.1.1.1\nip=203.0.113.7\nts=1700000000.1\nvisit_scheme=https\nuag=Mozilla/5.0\ncolo=DAC\nhttp=http/2\nloc=BD\ntls=TLSv1.3\nwarp=off\n';

  it('reads the IP and a few safe fields', () => {
    expect(parseTrace(TRACE)).toEqual({
      ok: true,
      value: {
        ip: '203.0.113.7',
        family: 4,
        country: 'BD',
        colo: 'DAC',
        http: 'http/2',
        tls: 'TLSv1.3',
      },
    });
    expect(parseTrace('ip=2001:db8::1\r\nloc=XX\r\n')).toMatchObject({
      ok: true,
      value: { ip: '2001:db8::1', family: 6, country: 'XX' },
    });
  });

  it('ignores malformed optional fields and refuses a missing or bad IP', () => {
    expect(parseTrace('ip=198.51.100.1\nloc=<script>\ncolo=dhaka')).toEqual({
      ok: true,
      value: {
        ip: '198.51.100.1',
        family: 4,
        country: undefined,
        colo: undefined,
        http: undefined,
        tls: undefined,
      },
    });
    expect(parseTrace('loc=BD')).toEqual({ ok: false, error: 'parse' });
    expect(parseTrace('ip=999.1.1.1')).toEqual({ ok: false, error: 'parse' });
    expect(parseTrace('<html>blocked</html>')).toEqual({ ok: false, error: 'parse' });
  });
});

describe('summariseLatency', () => {
  it('computes min, average, median, max, jitter and failures', () => {
    const s = summariseLatency([20, 30, null, 10, 40]);
    expect(s).toEqual({
      sent: 5,
      received: 4,
      failed: 1,
      failedPercent: 20,
      min: 10,
      max: 40,
      avg: 25,
      median: 25,
      // |30-20| + |10-30| + |40-10| = 60 over 3 gaps
      jitter: 20,
    });
    expect(summariseLatency([5, 7, 9]).median).toBe(7);
  });

  it('handles one sample, all failures and no samples', () => {
    expect(summariseLatency([12])).toMatchObject({ avg: 12, jitter: null, failed: 0 });
    expect(summariseLatency([null, null])).toMatchObject({
      sent: 2,
      failed: 2,
      failedPercent: 100,
      avg: null,
      min: null,
    });
    expect(summariseLatency([])).toMatchObject({ sent: 0, failedPercent: 0, avg: null });
  });
});

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends no credentials, cache or referrer and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request('https://example.test/x', {
      timeoutMs: 1000,
      headers: { accept: 'a' },
    });
    expect(await res.text()).toBe('ok');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { accept: 'a' },
    });
  });

  it('classifies HTTP errors, network failures, timeouts and offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    await expect(request('https://x.test', { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'http',
      status: 429,
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('https://x.test', { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'blocked',
    });

    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: string, init: RequestInit) =>
          new Promise((_r, reject) =>
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('', 'AbortError')),
            ),
          ),
      ),
    );
    const pending = request('https://x.test', { timeoutMs: 500 });
    const check = expect(pending).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(500);
    await check;
    vi.useRealTimers();

    const ctrl = new AbortController();
    const aborted = request('https://x.test', { timeoutMs: 5000, signal: ctrl.signal });
    ctrl.abort();
    await expect(aborted).rejects.toMatchObject({ kind: 'aborted' });

    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(request('https://x.test', { timeoutMs: 1000 })).rejects.toBeInstanceOf(NetFailure);
    await expect(request('https://x.test', { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'offline',
    });
    online.mockRestore();
  });
});
