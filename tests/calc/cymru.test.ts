import { describe, expect, it } from 'vitest';
import {
  asNameQuery,
  bestOrigin,
  originName,
  parseAsInfo,
  parseOrigin,
} from '../../src/calc/cymru';
import { parseIpInput, type ParsedIp } from '../../src/calc/rdap';

const ip = (t: string, v: 4 | 6): ParsedIp => {
  const r = parseIpInput(t, v);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('Team Cymru names', () => {
  it('reverses IPv4 octets and IPv6 nibbles', () => {
    expect(originName(ip('8.8.4.1', 4))).toBe('1.4.8.8.origin.asn.cymru.com');
    const v6 = originName(ip('2001:4860::8888', 6));
    expect(v6.endsWith('.0.6.8.4.1.0.0.2.origin6.asn.cymru.com')).toBe(true);
    expect(v6.startsWith('8.8.8.8.0.0.0.0.')).toBe(true);
    expect(v6.split('.')).toHaveLength(32 + 4);
    expect(asNameQuery(15169)).toBe('AS15169.asn.cymru.com');
  });
});

describe('parseOrigin', () => {
  it('reads the documented answer', () => {
    expect(parseOrigin('15169 | 8.8.8.0/24 | US | arin | 2023-12-28')).toEqual({
      asns: [15169],
      prefix: '8.8.8.0/24',
      country: 'US',
      registry: 'arin',
      allocated: '2023-12-28',
    });
  });

  it('keeps several origin ASes and treats empty fields as unknown', () => {
    expect(parseOrigin('23028 3356 | 2001:db8::/32 |  | ripencc | ')).toEqual({
      asns: [23028, 3356],
      prefix: '2001:db8::/32',
      country: null,
      registry: 'ripencc',
      allocated: null,
    });
  });

  it('refuses answers that do not have the shape', () => {
    expect(parseOrigin('hello')).toBeNull();
    expect(parseOrigin('x | 8.8.8.0/24 | US | arin')).toBeNull();
    expect(parseOrigin('15169 | not a prefix | US | arin')).toBeNull();
    expect(parseOrigin('15169 | 8.8.8.0/24 | United States | arin')?.country).toBeNull();
  });

  it('picks the most specific prefix', () => {
    const a = parseOrigin('1 | 8.0.0.0/9 | US | arin')!;
    const b = parseOrigin('2 | 8.8.8.0/24 | US | arin')!;
    expect(bestOrigin([a, b])).toBe(b);
    expect(bestOrigin([])).toBeNull();
  });
});

describe('parseAsInfo', () => {
  it('reads the AS description answer', () => {
    expect(parseAsInfo('15169 | US | arin | 2000-03-30 | GOOGLE, US')).toEqual({
      asn: 15169,
      country: 'US',
      registry: 'arin',
      allocated: '2000-03-30',
      name: 'GOOGLE, US',
    });
    expect(parseAsInfo('15169 | US | arin')).toBeNull();
  });
});
