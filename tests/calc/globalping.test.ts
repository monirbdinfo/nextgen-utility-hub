import { describe, expect, it } from 'vitest';
import {
  apiErrorKind,
  measurementBody,
  parseCreated,
  parseMeasurement,
  parseTarget,
} from '../../src/calc/globalping';
import { CREATED, PING_DONE, PING_RUNNING, TRACE_DONE } from '../fixtures/globalping';

describe('parseTarget', () => {
  it('accepts public addresses of the right family and host names', () => {
    expect(parseTarget(' 8.8.8.8 ', 4)).toEqual({
      ok: true,
      value: { value: '8.8.8.8', isHost: false },
    });
    expect(parseTarget('[2001:4860:4860::8888]', 6)).toEqual({
      ok: true,
      value: { value: '2001:4860:4860::8888', isHost: false },
    });
    expect(parseTarget('https://Example.COM/path', 4)).toEqual({
      ok: true,
      value: { value: 'example.com', isHost: true },
    });
  });

  it('refuses empty, invalid, wrong-family and non-public targets', () => {
    expect(parseTarget('  ', 4)).toEqual({ ok: false, error: 'empty' });
    expect(parseTarget('not a host', 4)).toEqual({ ok: false, error: 'invalid' });
    expect(parseTarget('2001:db8::zz', 6)).toEqual({ ok: false, error: 'invalid' });
    expect(parseTarget('2001:4860:4860::8888', 4)).toEqual({ ok: false, error: 'wrong-family' });
    expect(parseTarget('8.8.8.8', 6)).toEqual({ ok: false, error: 'wrong-family' });
    for (const t of ['10.0.0.1', '127.0.0.1', '192.168.1.1', '192.0.2.5'])
      expect(parseTarget(t, 4)).toEqual({ ok: false, error: 'not-public' });
    expect(parseTarget('fe80::1', 6)).toEqual({ ok: false, error: 'not-public' });
    expect(parseTarget('2001:db8::1', 6)).toEqual({ ok: false, error: 'not-public' });
    expect(parseTarget('app.localhost', 4)).toEqual({ ok: false, error: 'not-public' });
  });
});

describe('measurementBody', () => {
  it('sends packets for ping and ipVersion only for host names', () => {
    expect(
      measurementBody({
        type: 'ping',
        target: { value: 'example.com', isHost: true },
        family: 6,
        location: 'Bangladesh',
        probes: 3,
        packets: 5,
      }),
    ).toEqual({
      type: 'ping',
      target: 'example.com',
      locations: [{ magic: 'Bangladesh', limit: 3 }],
      measurementOptions: { packets: 5, ipVersion: 6 },
    });
    expect(
      measurementBody({
        type: 'traceroute',
        target: { value: '8.8.8.8', isHost: false },
        family: 4,
        location: 'world',
        probes: 1,
      }),
    ).toEqual({
      type: 'traceroute',
      target: '8.8.8.8',
      locations: [{ magic: 'world', limit: 1 }],
      measurementOptions: {},
    });
  });
});

describe('responses', () => {
  it('reads the created id and refuses anything else', () => {
    expect(parseCreated(CREATED)).toEqual({ ok: true, value: 'PY8lHBpNhG0rOVpp' });
    expect(parseCreated({ id: '../x' }).ok).toBe(false);
    expect(parseCreated(null).ok).toBe(false);
  });

  it('reads a running and a finished ping', () => {
    const running = parseMeasurement(PING_RUNNING);
    expect(running.ok && running.value.finished).toBe(false);
    const done = parseMeasurement(PING_DONE);
    if (!done.ok) throw new Error('parse');
    expect(done.value.finished).toBe(true);
    const r = done.value.results[0]!;
    expect(r.probe).toEqual({
      continent: 'AS',
      country: 'BD',
      city: 'Dhaka',
      asn: 63526,
      network: 'Example Networks Ltd',
    });
    expect(r.status).toBe('finished');
    expect(r.resolvedAddress).toBe('93.184.215.14');
    expect(r.stats).toEqual({ min: 11.5, avg: 12.3, max: 13.2, total: 3, rcv: 3, loss: 0 });
    expect(r.hops).toEqual([]);
  });

  it('reads traceroute hops, keeping silent hops', () => {
    const m = parseMeasurement(TRACE_DONE);
    if (!m.ok) throw new Error('parse');
    expect(m.value.results[0]!.stats).toBeNull();
    expect(m.value.results[0]!.hops).toEqual([
      { address: '10.0.0.1', hostname: 'gw.local', rtts: [1.2, 1.4] },
      { address: null, hostname: null, rtts: [] },
      { address: '8.8.8.8', hostname: 'dns.google', rtts: [20.5] },
    ]);
  });

  it('refuses bodies without the documented fields and caps raw output', () => {
    expect(parseMeasurement({ id: 'x', results: [] }).ok).toBe(false);
    expect(parseMeasurement({ id: 'x', status: 'finished' }).ok).toBe(false);
    const big = parseMeasurement({
      id: 'x',
      status: 'finished',
      results: [{ result: { status: 'weird', rawOutput: 'a'.repeat(50_000) } }],
    });
    if (!big.ok) throw new Error('parse');
    expect(big.value.results[0]!.rawOutput).toHaveLength(20_000);
    expect(big.value.results[0]!.status).toBe('in-progress');
  });

  it('classifies API errors by status and documented type', () => {
    expect(apiErrorKind(429, null)).toBe('rate-limited');
    expect(apiErrorKind(422, null)).toBe('no-probes');
    expect(apiErrorKind(400, null)).toBe('validation');
    expect(apiErrorKind(404, null)).toBe('not-found');
    expect(apiErrorKind(500, { error: { type: 'no_probes_found' } })).toBe('no-probes');
    expect(apiErrorKind(500, null)).toBe('other');
  });
});
