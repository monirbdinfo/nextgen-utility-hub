import { describe, expect, it } from 'vitest';
import {
  domainEventDate,
  eventDate,
  findDomainService,
  findService,
  holder,
  parseBootstrap,
  parseDnsBootstrap,
  parseIpInput,
  parseRdapDomain,
  parseRdapNetwork,
  rdapDomainUrl,
  rdapIpUrl,
  type ParsedIp,
} from '../../src/calc/rdap';
import {
  APNIC_V6,
  ARIN_V4,
  BOOTSTRAP_DNS,
  BOOTSTRAP_V4,
  BOOTSTRAP_V6,
  VERISIGN_DOMAIN,
} from '../fixtures/rdap';

const ip = (text: string, v: 4 | 6): ParsedIp => {
  const r = parseIpInput(text, v);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('parseIpInput', () => {
  it('accepts public addresses and canonicalises them', () => {
    expect(ip('8.8.8.8', 4)).toEqual({ version: 4, text: '8.8.8.8', value: 0x08080808n });
    expect(ip(' 2001:4860:4860:0:0:0:0:8888 ', 6).text).toBe('2001:4860:4860::8888');
  });

  it.each([
    ['', 4, 'empty'],
    ['999.1.1.1', 4, 'invalid'],
    ['example.com', 6, 'invalid'],
    ['2001:4860::1', 4, 'wrong-version'],
    ['8.8.8.8', 6, 'wrong-version'],
    ['10.0.0.1', 4, 'not-public'],
    ['192.168.1.1', 4, 'not-public'],
    ['127.0.0.1', 4, 'not-public'],
    ['192.0.2.1', 4, 'not-public'],
    ['::1', 6, 'not-public'],
    ['fe80::1', 6, 'not-public'],
    ['fd00::1', 6, 'not-public'],
    ['2001:db8::1', 6, 'not-public'],
    ['::ffff:8.8.8.8', 6, 'not-public'],
  ] as const)('%s for IPv%s → %s', (text, v, error) => {
    expect(parseIpInput(text, v)).toEqual({ ok: false, error });
  });
});

describe('bootstrap discovery', () => {
  const v4 = parseBootstrap(BOOTSTRAP_V4, 4);
  const v6 = parseBootstrap(BOOTSTRAP_V6, 6);
  if (!v4.ok || !v6.ok) throw new Error('fixture');

  it('finds the responsible registry, preferring https', () => {
    expect(findService(v4.value, ip('8.8.8.8', 4))).toBe('https://rdap.arin.net/registry/');
    expect(findService(v4.value, ip('1.1.1.1', 4))).toBe('https://rdap.apnic.net/');
    expect(findService(v6.value, ip('2001:4860:4860::8888', 6))).toBe(
      'https://rdap.arin.net/registry/',
    );
    expect(findService(v6.value, ip('2404:6800::1', 6))).toBe('https://rdap.apnic.net/');
  });

  it('uses the most specific prefix', () => {
    expect(findService(v4.value, ip('103.4.5.6', 4))).toBe('https://rdap.example-nir.net/');
    expect(findService(v4.value, ip('103.9.5.6', 4))).toBe('https://rdap.apnic.net/');
  });

  it('returns null when no registry covers the address', () => {
    expect(findService(v4.value, ip('45.1.2.3', 4))).toBeNull();
  });

  it('refuses malformed bootstrap files and skips bad entries', () => {
    expect(parseBootstrap(null, 4)).toEqual({ ok: false, error: 'parse' });
    expect(parseBootstrap({ services: 'x' }, 4)).toEqual({ ok: false, error: 'parse' });
    expect(parseBootstrap({ services: [[['nonsense'], ['https://a/']]] }, 4)).toEqual({
      ok: false,
      error: 'parse',
    });
    const mixed = parseBootstrap(
      {
        services: [
          [
            ['8.0.0.0/8', 'bad', '9.0.0.0/40'],
            ['ftp://x/', 'https://r.example/'],
          ],
        ],
      },
      4,
    );
    expect(mixed.ok && mixed.value).toEqual([
      { network: 0x08000000n, length: 8, urls: ['https://r.example/'] },
    ]);
  });

  it('builds the lookup URL', () => {
    expect(rdapIpUrl('https://rdap.arin.net/registry/', ip('8.8.8.8', 4))).toBe(
      'https://rdap.arin.net/registry/ip/8.8.8.8',
    );
    expect(rdapIpUrl('https://rdap.apnic.net', ip('2404:6800::1', 6))).toBe(
      'https://rdap.apnic.net/ip/2404%3A6800%3A%3A1',
    );
  });
});

describe('parseRdapNetwork', () => {
  it('reads an IPv4 network with nested entities', () => {
    const r = parseRdapNetwork(ARIN_V4);
    if (!r.ok) throw new Error(r.error);
    const n = r.value;
    expect(n).toMatchObject({
      handle: 'NET-8-8-8-0-2',
      name: 'GOGL',
      type: 'DIRECT ALLOCATION',
      startAddress: '8.8.8.0',
      endAddress: '8.8.8.255',
      cidrs: ['8.8.8.0/24'],
      parentHandle: 'NET-8-0-0-0-0',
      status: ['active'],
      country: null,
      port43: 'whois.arin.net',
    });
    expect(eventDate(n, 'registration')).toBe('2014-03-14T16:52:05-04:00');
    expect(eventDate(n, 'last changed')).toBe('2023-12-28T17:24:56-05:00');
    expect(n.entities).toHaveLength(2);
    expect(holder(n)).toMatchObject({
      handle: 'GOGL',
      name: 'Example Search LLC',
      kind: 'org',
      address: '1600 Example Pkwy Mountain View CA 94043 United States',
    });
    expect(n.entities[1]).toMatchObject({
      roles: ['abuse'],
      emails: ['network-abuse@example.com'],
      phones: ['+1-650-253-0000'],
    });
  });

  it('reads an IPv6 network, a structured address and remarks', () => {
    const r = parseRdapNetwork(APNIC_V6);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.cidrs).toEqual(['2001:db8::/32']);
    expect(r.value.country).toBe('BD');
    expect(holder(r.value)).toMatchObject({
      name: 'Example ISP Limited',
      address: 'House 1, Road 2, Dhaka, 1212, Bangladesh',
    });
    expect(r.value.remarks).toEqual(['description — Example ISP Limited — Dhaka']);
  });

  it('leaves missing fields empty instead of inventing them', () => {
    const r = parseRdapNetwork({ objectClassName: 'ip network' });
    expect(r).toEqual({
      ok: true,
      value: {
        handle: null,
        name: null,
        type: null,
        startAddress: null,
        endAddress: null,
        ipVersion: null,
        cidrs: [],
        country: null,
        parentHandle: null,
        status: [],
        events: [],
        entities: [],
        remarks: [],
        port43: null,
      },
    });
    expect(holder(r.ok ? r.value : (null as never))).toBeNull();
  });

  it('refuses malformed and non-network answers', () => {
    expect(parseRdapNetwork('<html>')).toEqual({ ok: false, error: 'parse' });
    expect(parseRdapNetwork([1, 2])).toEqual({ ok: false, error: 'parse' });
    expect(parseRdapNetwork({ objectClassName: 'entity' })).toEqual({
      ok: false,
      error: 'not-network',
    });
  });

  it('keeps hostile text on one line and short, and wrong types out', () => {
    const r = parseRdapNetwork({
      objectClassName: 'ip network',
      name: 'A\nB\u0007<script>',
      handle: 42,
      status: ['ok', 7, null],
      remarks: [{ description: ['x'.repeat(1000)] }],
      entities: Array.from({ length: 50 }, (_, i) => ({ handle: `E${i}`, roles: ['technical'] })),
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.name).toBe('A B <script>');
    expect(r.value.handle).toBeNull();
    expect(r.value.status).toEqual(['ok']);
    expect(r.value.remarks[0]!.length).toBe(300);
    expect(r.value.entities).toHaveLength(20);
  });
});

describe('domain RDAP', () => {
  it('reads the DNS bootstrap by TLD, https only', () => {
    const r = parseDnsBootstrap(BOOTSTRAP_DNS);
    if (!r.ok) throw new Error('parse');
    expect(r.value.get('com')).toBe('https://rdap.verisign.com/com/v1/');
    expect(r.value.get('uk')).toBe('https://rdap.nominet.uk/uk/');
    expect(findDomainService(r.value, 'example.com')).toBe('https://rdap.verisign.com/com/v1/');
    expect(findDomainService(r.value, 'example.co.uk')).toBe('https://rdap.nominet.uk/uk/');
    expect(findDomainService(r.value, 'example.com.bd')).toBeNull();
    expect(parseDnsBootstrap({ services: [] }).ok).toBe(false);
    expect(rdapDomainUrl('https://rdap.verisign.com/com/v1/', 'example.com')).toBe(
      'https://rdap.verisign.com/com/v1/domain/example.com',
    );
  });

  it('reads a domain answer without inventing fields', () => {
    const d = parseRdapDomain(VERISIGN_DOMAIN);
    if (!d.ok) throw new Error('parse');
    expect(d.value.name).toBe('example.com');
    expect(d.value.registrar).toBe('Example Registrar, Inc.');
    expect(d.value.nameservers).toEqual(['a.iana-servers.net', 'b.iana-servers.net']);
    expect(d.value.dnssec).toBe(true);
    expect(domainEventDate(d.value, 'expiration')).toBe('2027-08-13T04:00:00Z');
    const bare = parseRdapDomain({ objectClassName: 'domain' });
    if (!bare.ok) throw new Error('parse');
    expect(bare.value).toMatchObject({
      registrar: null,
      dnssec: null,
      nameservers: [],
      status: [],
    });
    expect(parseRdapDomain(ARIN_V4)).toEqual({ ok: false, error: 'not-domain' });
  });
});
