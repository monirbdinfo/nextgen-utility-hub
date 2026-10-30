import { describe, expect, it } from 'vitest';
import {
  assess,
  family,
  hostOf,
  hostsFrom,
  type HostAddresses,
  type Ipv6DnsFindings,
} from '../../src/calc/ipv6Compat';
import type { DnsResult } from '../../src/calc/netDiag';

const dns = (type: string, data: string[]): DnsResult => ({
  status: 0,
  statusName: 'NOERROR',
  authenticated: false,
  answers: data.map((d) => ({ name: 'example.com', type, ttl: 60, data: d })),
});
const host = (name: string, a: string[], aaaa: string[]): HostAddresses => ({ name, a, aaaa });
const findings = (over: Partial<Ipv6DnsFindings> = {}): Ipv6DnsFindings => ({
  domain: 'example.com',
  exists: true,
  website: host('example.com', ['192.0.2.1'], ['2001:db8::1']),
  www: host('www.example.com', ['192.0.2.1'], ['2001:db8::1']),
  nameServers: { checked: [host('ns1.example.net', [], ['2001:db8::53'])], more: 0 },
  mailServers: { checked: [host('mx.example.net', [], ['2001:db8::25'])], more: 0 },
  ...over,
});

describe('DNS helpers', () => {
  it('classifies address families', () => {
    expect(family({ a: ['1'], aaaa: ['2'] })).toBe('dual');
    expect(family({ a: [], aaaa: ['2'] })).toBe('ipv6-only');
    expect(family({ a: ['1'], aaaa: [] })).toBe('ipv4-only');
    expect(family({ a: [], aaaa: [] })).toBe('none');
  });

  it('reads NS and MX host names, ignoring the null MX', () => {
    expect(hostOf('ns1.Example.NET.')).toBe('ns1.example.net');
    expect(hostOf('10 mail.example.com.')).toBe('mail.example.com');
    expect(hostOf('0 .')).toBeNull();
  });

  it('orders MX hosts by preference, removes duplicates and caps the list', () => {
    const r = hostsFrom(
      dns('MX', ['20 b.example.', '10 a.example.', '10 a.example.', '30 c.', '40 d.', '50 e.']),
      'MX',
    );
    expect(r).toEqual({ hosts: ['a.example', 'b.example', 'c', 'd'], more: 1 });
  });
});

describe('assess (DNS only)', () => {
  it('is ready when every published part has IPv6', () => {
    expect(assess(findings()).readiness).toBe('ready');
  });

  it('is partial when some parts lack IPv6', () => {
    const r = assess(
      findings({ mailServers: { checked: [host('mx.example.net', [], [])], more: 0 } }),
    );
    expect(r).toMatchObject({ readiness: 'partial', websiteIpv6: true, mxWithIpv6: 0 });
  });

  it('is not ready when nothing publishes IPv6', () => {
    const r = assess(
      findings({
        website: host('example.com', ['192.0.2.1'], []),
        www: host('www.example.com', ['192.0.2.1'], []),
        nameServers: { checked: [host('ns1', [], [])], more: 0 },
        mailServers: { checked: [], more: 0 },
      }),
    );
    expect(r.readiness).toBe('not-ready');
  });

  it('ignores parts that do not exist (no www, no mail)', () => {
    const r = assess(
      findings({ www: host('www.example.com', [], []), mailServers: { checked: [], more: 0 } }),
    );
    expect(r).toMatchObject({ readiness: 'ready', wwwIpv6: null });
  });

  it('is unknown for a missing domain or one with no addresses', () => {
    expect(assess(findings({ exists: false })).readiness).toBe('unknown');
    expect(
      assess(findings({ website: host('example.com', [], []), www: host('www', [], []) }))
        .readiness,
    ).toBe('unknown');
  });
});
