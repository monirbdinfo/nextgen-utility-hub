import { describe, expect, it } from 'vitest';
import {
  addressKind,
  formatCidr,
  formatIPv4,
  maskFromPrefix,
  MAX_IPV4,
  parseCidr,
  parseIPv4,
  parsePrefix,
  prefixFromMask,
  rangeToCidrs,
  subnet,
  toBinary,
} from '../../src/calc/ipv4';

const ip = (s: string): number => {
  const r = parseIPv4(s);
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return r.value;
};
const view = (s: ReturnType<typeof subnet>) => ({
  network: formatIPv4(s.network),
  broadcast: s.broadcast === null ? null : formatIPv4(s.broadcast),
  mask: formatIPv4(s.mask),
  wildcard: formatIPv4(s.wildcard),
  first: formatIPv4(s.firstHost),
  last: formatIPv4(s.lastHost),
  usable: s.usableHosts,
  total: s.totalAddresses,
});

describe('parseIPv4', () => {
  it('parses dotted quads, including Bangla digits and the extremes', () => {
    expect(ip('0.0.0.0')).toBe(0);
    expect(ip('255.255.255.255')).toBe(MAX_IPV4);
    expect(ip('192.168.1.10')).toBe(3232235786);
    expect(ip(' ১৯২.১৬৮.১.১০ ')).toBe(3232235786);
    // A value above 2^31 stays positive (no signed 32-bit wrap-around).
    expect(ip('200.0.0.1')).toBeGreaterThan(2 ** 31);
  });

  it('rejects malformed input with a specific reason', () => {
    expect(parseIPv4('')).toEqual({ ok: false, error: 'empty' });
    expect(parseIPv4('1.2.3')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('1.2.3.4.5')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('1.2.3.x')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('1..3.4')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('-1.2.3.4')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('1.2.3.1000')).toEqual({ ok: false, error: 'format' });
    expect(parseIPv4('256.1.1.1')).toEqual({ ok: false, error: 'octet-range' });
    expect(parseIPv4('10.01.0.1')).toEqual({ ok: false, error: 'leading-zero' });
    expect(parseIPv4('::1')).toEqual({ ok: false, error: 'format' });
  });

  it('round-trips through formatIPv4', () => {
    for (const s of ['0.0.0.0', '1.2.3.4', '10.0.0.255', '172.31.255.254', '255.255.255.255']) {
      expect(formatIPv4(ip(s))).toBe(s);
    }
  });
});

describe('masks and prefixes', () => {
  it('builds every mask from /0 to /32 without bitwise overflow', () => {
    expect(formatIPv4(maskFromPrefix(0))).toBe('0.0.0.0');
    expect(formatIPv4(maskFromPrefix(1))).toBe('128.0.0.0');
    expect(formatIPv4(maskFromPrefix(8))).toBe('255.0.0.0');
    expect(formatIPv4(maskFromPrefix(20))).toBe('255.255.240.0');
    expect(formatIPv4(maskFromPrefix(31))).toBe('255.255.255.254');
    expect(formatIPv4(maskFromPrefix(32))).toBe('255.255.255.255');
    for (let p = 0; p <= 32; p++) {
      expect(prefixFromMask(maskFromPrefix(p))).toBe(p);
      expect(maskFromPrefix(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it('parses a prefix written as 24, /24 or a dotted mask', () => {
    expect(parsePrefix('24')).toEqual({ ok: true, value: 24 });
    expect(parsePrefix('/0')).toEqual({ ok: true, value: 0 });
    expect(parsePrefix('৩২')).toEqual({ ok: true, value: 32 });
    expect(parsePrefix('255.255.255.192')).toEqual({ ok: true, value: 26 });
    expect(parsePrefix('')).toEqual({ ok: false, error: 'prefix-empty' });
    expect(parsePrefix('33')).toEqual({ ok: false, error: 'prefix-range' });
    expect(parsePrefix('-1')).toEqual({ ok: false, error: 'prefix-range' });
    expect(parsePrefix('2.5')).toEqual({ ok: false, error: 'mask-invalid' });
    expect(parsePrefix('255.0.255.0')).toEqual({ ok: false, error: 'mask-noncontiguous' });
    expect(parsePrefix('255.255.255.1')).toEqual({ ok: false, error: 'mask-noncontiguous' });
  });

  it('parses CIDR notation', () => {
    expect(parseCidr('10.0.0.0/8')).toEqual({
      ok: true,
      value: { address: ip('10.0.0.0'), prefix: 8 },
    });
    expect(parseCidr('10.0.0.0 / 255.255.0.0')).toEqual({
      ok: true,
      value: { address: ip('10.0.0.0'), prefix: 16 },
    });
    expect(parseCidr('10.0.0.0')).toEqual({ ok: false, error: 'prefix-empty' });
    expect(parseCidr('10.0.0/8')).toEqual({ ok: false, error: 'format' });
    expect(parseCidr('10.0.0.0/40')).toEqual({ ok: false, error: 'prefix-range' });
  });

  it('formats masks in binary', () => {
    expect(toBinary(maskFromPrefix(26))).toBe('11111111.11111111.11111111.11000000');
  });
});

describe('subnet (known answers)', () => {
  it('192.168.1.10/24', () => {
    const s = subnet(ip('192.168.1.10'), 24);
    expect(view(s)).toEqual({
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      first: '192.168.1.1',
      last: '192.168.1.254',
      usable: 254,
      total: 256,
    });
    expect(s.hostBitsSet).toBe(true);
  });

  it('172.16.35.123/20', () => {
    expect(view(subnet(ip('172.16.35.123'), 20))).toEqual({
      network: '172.16.32.0',
      broadcast: '172.16.47.255',
      mask: '255.255.240.0',
      wildcard: '0.0.15.255',
      first: '172.16.32.1',
      last: '172.16.47.254',
      usable: 4094,
      total: 4096,
    });
  });

  it('10.20.30.40/30 (smallest subnet with a broadcast)', () => {
    expect(view(subnet(ip('10.20.30.40'), 30))).toMatchObject({
      network: '10.20.30.40',
      broadcast: '10.20.30.43',
      first: '10.20.30.41',
      last: '10.20.30.42',
      usable: 2,
      total: 4,
    });
  });

  it('/31 has two usable hosts and no broadcast (RFC 3021)', () => {
    expect(view(subnet(ip('10.0.0.1'), 31))).toEqual({
      network: '10.0.0.0',
      broadcast: null,
      mask: '255.255.255.254',
      wildcard: '0.0.0.1',
      first: '10.0.0.0',
      last: '10.0.0.1',
      usable: 2,
      total: 2,
    });
  });

  it('/32 is a single host', () => {
    const s = subnet(ip('8.8.8.8'), 32);
    expect(view(s)).toEqual({
      network: '8.8.8.8',
      broadcast: null,
      mask: '255.255.255.255',
      wildcard: '0.0.0.0',
      first: '8.8.8.8',
      last: '8.8.8.8',
      usable: 1,
      total: 1,
    });
    expect(s.hostBitsSet).toBe(false);
  });

  it('/0 covers the whole IPv4 space', () => {
    expect(view(subnet(ip('203.0.113.9'), 0))).toEqual({
      network: '0.0.0.0',
      broadcast: '255.255.255.255',
      mask: '0.0.0.0',
      wildcard: '255.255.255.255',
      first: '0.0.0.1',
      last: '255.255.255.254',
      usable: 4294967294,
      total: 4294967296,
    });
  });

  it('works at the top of the address space (/1 and 255.x)', () => {
    expect(view(subnet(ip('200.1.2.3'), 1))).toMatchObject({
      network: '128.0.0.0',
      broadcast: '255.255.255.255',
      usable: 2 ** 31 - 2,
    });
    expect(view(subnet(ip('255.255.255.200'), 27))).toMatchObject({
      network: '255.255.255.192',
      broadcast: '255.255.255.223',
    });
  });

  it('matches a brute-force check for every prefix', () => {
    const a = ip('198.51.100.77');
    for (let p = 0; p <= 32; p++) {
      const s = subnet(a, p);
      expect(s.network).toBeLessThanOrEqual(a);
      expect(s.last).toBeGreaterThanOrEqual(a);
      expect(s.last - s.network + 1).toBe(2 ** (32 - p));
      expect(s.network % 2 ** (32 - p)).toBe(0);
      expect(s.mask + s.wildcard).toBe(MAX_IPV4);
    }
  });

  it('rejects out-of-range input', () => {
    expect(() => subnet(-1, 24)).toThrow();
    expect(() => subnet(2 ** 32, 24)).toThrow();
    expect(() => subnet(0, 33)).toThrow();
    expect(() => subnet(0, 1.5)).toThrow();
  });
});

describe('addressKind', () => {
  it.each([
    ['10.1.2.3', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['172.32.0.1', 'public'],
    ['192.168.0.1', 'private'],
    ['100.64.0.1', 'shared'],
    ['127.0.0.1', 'loopback'],
    ['169.254.1.1', 'link-local'],
    ['192.0.2.1', 'documentation'],
    ['198.18.0.1', 'benchmarking'],
    ['224.0.0.251', 'multicast'],
    ['240.0.0.1', 'reserved'],
    ['255.255.255.255', 'broadcast'],
    ['0.0.0.0', 'unspecified'],
    ['8.8.8.8', 'public'],
  ])('%s is %s', (a, kind) => {
    expect(addressKind(ip(a))).toBe(kind);
  });
});

describe('rangeToCidrs', () => {
  const blocks = (a: string, b: string): string[] => {
    const r = rangeToCidrs(ip(a), ip(b));
    if (!r.ok) throw new Error(r.error);
    return r.value.map((x) => formatCidr(x.network, x.prefix));
  };

  it('returns a single block for an aligned range', () => {
    expect(blocks('192.168.0.0', '192.168.255.255')).toEqual(['192.168.0.0/16']);
    expect(blocks('10.0.0.5', '10.0.0.5')).toEqual(['10.0.0.5/32']);
    expect(blocks('0.0.0.0', '255.255.255.255')).toEqual(['0.0.0.0/0']);
  });

  it('splits an unaligned range into the fewest blocks', () => {
    expect(blocks('192.168.1.10', '192.168.1.20')).toEqual([
      '192.168.1.10/31',
      '192.168.1.12/30',
      '192.168.1.16/30',
      '192.168.1.20/32',
    ]);
    expect(blocks('10.0.0.0', '10.0.2.255')).toEqual(['10.0.0.0/23', '10.0.2.0/24']);
  });

  it('handles the worst case (62 blocks) and covers the range exactly', () => {
    const r = rangeToCidrs(1, MAX_IPV4 - 1);
    if (!r.ok) throw new Error();
    expect(r.value).toHaveLength(62);
    let next = 1;
    for (const b of r.value) {
      expect(b.network).toBe(next);
      next = b.network + 2 ** (32 - b.prefix);
    }
    expect(next).toBe(MAX_IPV4);
  });

  it('refuses a reversed range', () => {
    expect(rangeToCidrs(ip('10.0.0.2'), ip('10.0.0.1'))).toEqual({
      ok: false,
      error: 'start-after-end',
    });
  });
});
