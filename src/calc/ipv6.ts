import { toEnglishDigits } from './digits';
import { parseIPv4 } from './ipv4';
import { fail, ok, type Result } from './result';

/**
 * IPv6 arithmetic on BigInt (addresses are 128-bit). Forms supported on input: full,
 * `::` compressed, and an embedded dotted IPv4 in the last 32 bits (`::ffff:192.0.2.1`).
 * Zone identifiers (`fe80::1%eth0`) are refused: they are interface-specific.
 */

export const IPV6_BITS = 128;
export const MAX_IPV6 = (1n << 128n) - 1n;

export type IPv6Error =
  | 'empty'
  | 'format'
  | 'group-range'
  | 'double-compression'
  | 'too-many-groups'
  | 'too-few-groups'
  | 'ipv4-part'
  | 'zone';

const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

/** Parse an IPv6 address into its 128-bit value. */
export function parseIPv6(text: string): Result<bigint, IPv6Error> {
  const s = toEnglishDigits(text).trim();
  if (!s) return fail('empty');
  if (s.includes('%')) return fail('zone');
  if (!/^[0-9a-f:.]+$/i.test(s) || !s.includes(':')) return fail('format');
  // A dotted IPv4 may only be the last part of the whole address.
  if (s.indexOf('.') >= 0 && s.indexOf('.') < s.lastIndexOf(':')) return fail('ipv4-part');

  const halves = s.split('::');
  if (halves.length > 2) return fail('double-compression');
  const compressed = halves.length === 2;

  const groups: number[] = [];
  const sides: number[][] = [];
  for (const side of halves) {
    const out: number[] = [];
    if (side !== '') {
      for (const p of side.split(':')) {
        if (p.includes('.')) {
          const v4 = parseIPv4(p);
          if (!v4.ok) return fail('ipv4-part');
          out.push(Math.floor(v4.value / 65536), v4.value % 65536);
        } else if (HEX_GROUP.test(p)) {
          out.push(parseInt(p, 16));
        } else {
          return fail(p === '' ? 'format' : 'group-range');
        }
      }
    }
    sides.push(out);
  }
  const total = sides.reduce((n, x) => n + x.length, 0);
  if (compressed) {
    if (total > 7) return fail('too-many-groups');
    groups.push(...sides[0]!, ...new Array<number>(8 - total).fill(0), ...sides[1]!);
  } else {
    if (total > 8) return fail('too-many-groups');
    if (total < 8) return fail('too-few-groups');
    groups.push(...sides[0]!);
  }
  return ok(groups.reduce((acc, g) => (acc << 16n) | BigInt(g), 0n));
}

/** The eight 16-bit groups of an address. */
export function groupsOf(value: bigint): number[] {
  const out: number[] = [];
  for (let i = 7; i >= 0; i--) out.push(Number((value >> BigInt(i * 16)) & 0xffffn));
  return out;
}

/** Every group written in full: 2001:0db8:0000:0000:0000:ff00:0042:8329 */
export function formatIPv6Full(value: bigint): string {
  return groupsOf(value)
    .map((g) => g.toString(16).padStart(4, '0'))
    .join(':');
}

/**
 * RFC 5952 text form: lower case, no leading zeros, the longest run of two or more zero
 * groups replaced by `::` (the first one when runs are equal). A single zero group is not
 * compressed.
 */
export function formatIPv6(value: bigint): string {
  const g = groupsOf(value);
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < 8;) {
    if (g[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestLen && j - i >= 2) {
      bestStart = i;
      bestLen = j - i;
    }
    i = j;
  }
  const hex = g.map((x) => x.toString(16));
  if (bestStart < 0) return hex.join(':');
  const head = hex.slice(0, bestStart).join(':');
  const tail = hex.slice(bestStart + bestLen).join(':');
  return `${head}::${tail}`;
}

/** Number of addresses in a /prefix block (BigInt). */
export const blockSize6 = (prefix: number): bigint => 1n << BigInt(IPV6_BITS - prefix);

export interface Subnet6 {
  address: bigint;
  prefix: number;
  network: bigint;
  last: bigint;
  total: bigint;
  /** Host bits of the entered address are set (it is not the network address). */
  hostBitsSet: boolean;
}

/** IPv6 has no broadcast address, so every address in the block is usable. */
export function subnet6(address: bigint, prefix: number): Subnet6 {
  if (address < 0n || address > MAX_IPV6) throw new RangeError('address');
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > IPV6_BITS) throw new RangeError('prefix');
  const size = blockSize6(prefix);
  const network = address - (address % size);
  return {
    address,
    prefix,
    network,
    last: network + size - 1n,
    total: size,
    hostBitsSet: address !== network,
  };
}

export function formatCidr6(network: bigint, prefix: number): string {
  return `${formatIPv6(network)}/${prefix}`;
}

/** Parse `address/prefix`. */
export function parseCidr6(
  text: string,
): Result<{ address: bigint; prefix: number }, IPv6Error | 'prefix-empty' | 'prefix-range'> {
  const s = toEnglishDigits(text).trim();
  const slash = s.indexOf('/');
  if (slash < 0) return fail('prefix-empty');
  const a = parseIPv6(s.slice(0, slash));
  if (!a.ok) return a;
  const p = s.slice(slash + 1).trim();
  if (!/^\d{1,3}$/.test(p)) return fail('prefix-range');
  const n = Number(p);
  if (n > IPV6_BITS) return fail('prefix-range');
  return ok({ address: a.value, prefix: n });
}

/**
 * The smallest list of prefixes that exactly covers `start … end` (inclusive). At most
 * 2 × 128 − 2 blocks for any IPv6 range.
 */
export function rangeToCidrs6(
  start: bigint,
  end: bigint,
): Result<Array<{ network: bigint; prefix: number }>, 'start-after-end'> {
  if (start > end) return fail('start-after-end');
  const out: Array<{ network: bigint; prefix: number }> = [];
  let cur = start;
  while (cur <= end) {
    let prefix = IPV6_BITS;
    while (prefix > 0) {
      const size = blockSize6(prefix - 1);
      if (cur % size !== 0n || cur + size - 1n > end) break;
      prefix--;
    }
    out.push({ network: cur, prefix });
    cur += blockSize6(prefix);
  }
  return ok(out);
}

// ---------- IPv4 <-> IPv6 representations ----------

/** IPv4-mapped ::ffff:a.b.c.d (RFC 4291). */
export const ipv4Mapped = (v4: number): bigint => (0xffffn << 32n) | BigInt(v4);
/** IPv4-compatible ::a.b.c.d (deprecated, RFC 4291). */
export const ipv4Compatible = (v4: number): bigint => BigInt(v4);
/** NAT64 well-known prefix 64:ff9b::/96 (RFC 6052). */
export const nat64 = (v4: number): bigint => (0x0064ff9bn << 96n) | BigInt(v4);
/** 6to4 prefix 2002:AABB:CCDD::/48 for an IPv4 address (RFC 3056). */
export const sixToFour = (v4: number): bigint => (0x2002n << 112n) | (BigInt(v4) << 80n);

export type Embedded = { kind: 'mapped' | 'compatible' | 'nat64' | '6to4'; ipv4: number };

/** Extract an IPv4 address embedded in a well-known IPv6 form, if there is one. */
export function embeddedIPv4(value: bigint): Embedded | null {
  const top96 = value >> 32n;
  const low32 = Number(value & 0xffffffffn);
  if (top96 === 0xffffn) return { kind: 'mapped', ipv4: low32 };
  // ::0 and ::1 are unspecified and loopback, not embedded addresses.
  if (top96 === 0n && low32 > 1) return { kind: 'compatible', ipv4: low32 };
  if (top96 === 0x0064ff9bn << 64n) return { kind: 'nat64', ipv4: low32 };
  if (value >> 112n === 0x2002n)
    return { kind: '6to4', ipv4: Number((value >> 80n) & 0xffffffffn) };
  return null;
}

export type AddressKind6 =
  | 'unspecified'
  | 'loopback'
  | 'ipv4-mapped'
  | 'ula'
  | 'link-local'
  | 'multicast'
  | 'documentation'
  | 'global';

export function addressKind6(value: bigint): AddressKind6 {
  if (value === 0n) return 'unspecified';
  if (value === 1n) return 'loopback';
  const top16 = value >> 112n;
  if (value >> 32n === 0xffffn) return 'ipv4-mapped';
  if (top16 >> 9n === 0x7en) return 'ula'; // fc00::/7
  if (top16 >> 6n === 0x3fan) return 'link-local'; // fe80::/10
  if (top16 >> 8n === 0xffn) return 'multicast'; // ff00::/8
  if (value >> 96n === 0x20010db8n) return 'documentation'; // 2001:db8::/32
  return 'global';
}

// ---------- Local (ULA) address generation, RFC 4193 ----------

/**
 * A random unique-local /48 (fd + 40-bit Global ID) with subnet 0 and a random 64-bit
 * interface ID. `random` must return cryptographically random bytes in production.
 */
export function generateUla(random: (n: number) => Uint8Array): {
  address: bigint;
  prefix48: bigint;
} {
  const r = random(13);
  let globalId = 0n;
  for (let i = 0; i < 5; i++) globalId = (globalId << 8n) | BigInt(r[i] ?? 0);
  const prefix48 = (0xfdn << 120n) | (globalId << 80n);
  let iid = 0n;
  for (let i = 5; i < 13; i++) iid = (iid << 8n) | BigInt(r[i] ?? 0);
  return { address: prefix48 | iid, prefix48 };
}
