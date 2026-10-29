import { describe, expect, it } from 'vitest';
import {
  addressKind6,
  embeddedIPv4,
  formatCidr6,
  formatIPv6,
  formatIPv6Full,
  generateUla,
  MAX_IPV6,
  nat64,
  parseCidr6,
  parseIPv6,
  rangeToCidrs6,
  sixToFour,
  subnet6,
  ipv4Mapped,
} from '../../src/calc/ipv6';
import { parseIPv4 } from '../../src/calc/ipv4';

const ip = (s: string): bigint => {
  const r = parseIPv6(s);
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return r.value;
};
const v4 = (s: string): number => {
  const r = parseIPv4(s);
  if (!r.ok) throw new Error(s);
  return r.value;
};

describe('parseIPv6', () => {
  it('parses full, compressed and embedded-IPv4 forms', () => {
    expect(ip('2001:0db8:0000:0000:0000:ff00:0042:8329')).toBe(ip('2001:db8::ff00:42:8329'));
    expect(ip('::')).toBe(0n);
    expect(ip('::1')).toBe(1n);
    expect(ip('1::')).toBe(1n << 112n);
    expect(ip('::ffff:192.0.2.1')).toBe(ipv4Mapped(v4('192.0.2.1')));
    expect(ip('FE80::ABCD')).toBe(ip('fe80::abcd'));
    expect(ip('2001:db8::১')).toBe(ip('2001:db8::1'));
    expect(ip('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(MAX_IPV6);
  });

  it('rejects malformed input with a specific reason', () => {
    expect(parseIPv6('')).toEqual({ ok: false, error: 'empty' });
    expect(parseIPv6('12345')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv6('gggg::1')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv6('12345::')).toEqual({ ok: false, error: 'group-range' });
    expect(parseIPv6('1::2::3')).toEqual({ ok: false, error: 'double-compression' });
    expect(parseIPv6('1:2:3:4:5:6:7:8:9')).toEqual({ ok: false, error: 'too-many-groups' });
    expect(parseIPv6('1:2:3:4:5:6:7')).toEqual({ ok: false, error: 'too-few-groups' });
    expect(parseIPv6('fe80::1%eth0')).toEqual({ ok: false, error: 'zone' });
    expect(parseIPv6('1.2.3.4::')).toEqual({ ok: false, error: 'ipv4-part' });
    expect(parseIPv6('::1.2.3.400')).toEqual({ ok: false, error: 'ipv4-part' });
  });
});

describe('formatting (RFC 5952 examples)', () => {
  it.each([
    ['2001:0db8:0000:0000:0001:0000:0000:0001', '2001:db8::1:0:0:1'],
    ['2001:db8:0:0:0:0:2:1', '2001:db8::2:1'],
    ['2001:db8:0:1:1:1:1:1', '2001:db8:0:1:1:1:1:1'],
    ['2001:0:0:1:0:0:0:1', '2001:0:0:1::1'],
    ['2001:db8::0:1', '2001:db8::1'],
    ['0:0:0:0:0:0:0:0', '::'],
    ['0:0:0:0:0:0:0:1', '::1'],
    ['1:0:0:0:0:0:0:0', '1::'],
    ['2001:DB8::ABCD', '2001:db8::abcd'],
  ])('%s -> %s', (full, short) => {
    expect(formatIPv6(ip(full))).toBe(short);
    expect(ip(short)).toBe(ip(full));
  });

  it('chooses the first of two equal zero runs', () => {
    expect(formatIPv6(ip('1:0:0:2:0:0:3:4'))).toBe('1::2:0:0:3:4');
  });

  it('writes every group in full', () => {
    expect(formatIPv6Full(ip('2001:db8::1'))).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });
});

describe('subnet6', () => {
  it('finds the block for a /64', () => {
    const s = subnet6(ip('2001:db8:abcd:12:1:2:3:4'), 64);
    expect(formatCidr6(s.network, s.prefix)).toBe('2001:db8:abcd:12::/64');
    expect(formatIPv6(s.last)).toBe('2001:db8:abcd:12:ffff:ffff:ffff:ffff');
    expect(s.total).toBe(1n << 64n);
    expect(s.hostBitsSet).toBe(true);
  });

  it('covers the whole space at /0 and a single address at /128', () => {
    expect(subnet6(ip('::1'), 0)).toMatchObject({ network: 0n, last: MAX_IPV6, total: 1n << 128n });
    expect(subnet6(ip('2001:db8::5'), 128)).toMatchObject({
      network: ip('2001:db8::5'),
      last: ip('2001:db8::5'),
      total: 1n,
      hostBitsSet: false,
    });
  });

  it('rejects an out-of-range prefix', () => {
    expect(() => subnet6(0n, 129)).toThrow();
    expect(() => subnet6(0n, -1)).toThrow();
  });
});

describe('parseCidr6 and rangeToCidrs6', () => {
  it('parses CIDR and refuses a bad prefix', () => {
    expect(parseCidr6('2001:db8::/32')).toEqual({
      ok: true,
      value: { address: ip('2001:db8::'), prefix: 32 },
    });
    expect(parseCidr6('2001:db8::')).toEqual({ ok: false, error: 'prefix-empty' });
    expect(parseCidr6('2001:db8::/129')).toEqual({ ok: false, error: 'prefix-range' });
  });

  it('summarises a range into the fewest blocks', () => {
    const r = rangeToCidrs6(ip('2001:db8::'), ip('2001:db8::ffff'));
    expect(r).toEqual({ ok: true, value: [{ network: ip('2001:db8::'), prefix: 112 }] });
    const unaligned = rangeToCidrs6(ip('2001:db8::1'), ip('2001:db8::4'));
    if (!unaligned.ok) throw new Error();
    expect(unaligned.value.map((b) => formatCidr6(b.network, b.prefix))).toEqual([
      '2001:db8::1/128',
      '2001:db8::2/127',
      '2001:db8::4/128',
    ]);
  });

  it('covers the full space with one block and refuses a reversed range', () => {
    expect(rangeToCidrs6(0n, MAX_IPV6)).toEqual({ ok: true, value: [{ network: 0n, prefix: 0 }] });
    expect(rangeToCidrs6(5n, 4n)).toEqual({ ok: false, error: 'start-after-end' });
  });
});

describe('IPv4 representations', () => {
  const a = v4('192.0.2.1');
  it('builds the mapped, NAT64 and 6to4 forms', () => {
    expect(formatIPv6(ipv4Mapped(a))).toBe('::ffff:c000:201');
    expect(formatIPv6(nat64(a))).toBe('64:ff9b::c000:201');
    expect(formatIPv6(sixToFour(a))).toBe('2002:c000:201::');
  });

  it('extracts an embedded IPv4 back out', () => {
    expect(embeddedIPv4(ip('::ffff:192.0.2.1'))).toEqual({ kind: 'mapped', ipv4: a });
    expect(embeddedIPv4(ip('64:ff9b::192.0.2.1'))).toEqual({ kind: 'nat64', ipv4: a });
    expect(embeddedIPv4(ip('2002:c000:201::1'))).toEqual({ kind: '6to4', ipv4: a });
    expect(embeddedIPv4(ip('::c000:201'))).toEqual({ kind: 'compatible', ipv4: a });
    expect(embeddedIPv4(ip('::1'))).toBeNull();
    expect(embeddedIPv4(ip('2001:db8::1'))).toBeNull();
  });
});

describe('addressKind6', () => {
  it.each([
    ['::', 'unspecified'],
    ['::1', 'loopback'],
    ['::ffff:1.2.3.4', 'ipv4-mapped'],
    ['fd00::1', 'ula'],
    ['fc00::1', 'ula'],
    ['fe80::1', 'link-local'],
    ['febf::1', 'link-local'],
    ['ff02::1', 'multicast'],
    ['2001:db8::1', 'documentation'],
    ['2606:4700:4700::1111', 'global'],
  ])('%s is %s', (a, kind) => {
    expect(addressKind6(ip(a))).toBe(kind);
  });
});

describe('generateUla (RFC 4193)', () => {
  it('builds fd + Global ID /48 and a random interface ID from the supplied bytes', () => {
    const bytes = Uint8Array.from({ length: 13 }, (_, i) => i + 1);
    const { address, prefix48 } = generateUla(() => bytes);
    expect(formatCidr6(prefix48, 48)).toBe('fd01:203:405::/48');
    expect(formatIPv6(address)).toBe('fd01:203:405:0:607:809:a0b:c0d');
    expect(addressKind6(address)).toBe('ula');
  });
});
