import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

/**
 * IPv4 subnet arithmetic. Addresses are plain non-negative numbers in 0 … 2³² − 1.
 *
 * JavaScript bitwise operators work on *signed* 32-bit integers (so `255 << 24` is negative),
 * so everything here uses ordinary arithmetic on powers of two instead. All values stay well
 * inside Number.MAX_SAFE_INTEGER. IPv6 is not supported.
 */

export const IPV4_SIZE = 2 ** 32;
export const MAX_IPV4 = IPV4_SIZE - 1;

export type AddressError = 'empty' | 'format' | 'octet-range' | 'leading-zero';
export type PrefixError = 'prefix-empty' | 'prefix-range' | 'mask-invalid' | 'mask-noncontiguous';

/** Normalise user input: Bangla digits → ASCII, surrounding spaces removed. */
const clean = (text: string): string => toEnglishDigits(text).trim();

/** Parse a dotted-quad IPv4 address such as `192.168.1.10`. */
export function parseIPv4(text: string): Result<number, AddressError> {
  const s = clean(text);
  if (!s) return fail('empty');
  const parts = s.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return fail('format');
  let value = 0;
  for (const p of parts) {
    // "010" is read as octal by some tools and decimal by others, so it is refused outright.
    if (p.length > 1 && p.startsWith('0')) return fail('leading-zero');
    const n = Number(p);
    if (n > 255) return fail('octet-range');
    value = value * 256 + n;
  }
  return ok(value);
}

export function formatIPv4(value: number): string {
  const octets: number[] = [];
  let v = value;
  for (let i = 0; i < 4; i++) {
    octets.unshift(v % 256);
    v = Math.floor(v / 256);
  }
  return octets.join('.');
}

/** Number of addresses in a /prefix block. */
export const blockSize = (prefix: number): number => 2 ** (32 - prefix);

export function maskFromPrefix(prefix: number): number {
  return IPV4_SIZE - blockSize(prefix);
}

/** Prefix length for a contiguous netmask, or null when the mask has gaps (e.g. 255.0.255.0). */
export function prefixFromMask(mask: number): number | null {
  for (let p = 0; p <= 32; p++) if (maskFromPrefix(p) === mask) return p;
  return null;
}

/** Parse `24`, `/24` or a dotted netmask such as `255.255.255.0`. */
export function parsePrefix(text: string): Result<number, PrefixError> {
  const s = clean(text).replace(/^\//, '').trim();
  if (!s) return fail('prefix-empty');
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n <= 32 ? ok(n) : fail('prefix-range');
  }
  if (s.includes('.')) {
    const m = parseIPv4(s);
    if (!m.ok) return fail('mask-invalid');
    const p = prefixFromMask(m.value);
    return p === null ? fail('mask-noncontiguous') : ok(p);
  }
  return fail('prefix-range');
}

export type CidrError = AddressError | PrefixError;

/** Parse `address/prefix` (the prefix may also be a dotted mask). */
export function parseCidr(text: string): Result<{ address: number; prefix: number }, CidrError> {
  const s = clean(text);
  if (!s) return fail('empty');
  const slash = s.indexOf('/');
  if (slash < 0) return fail('prefix-empty');
  const a = parseIPv4(s.slice(0, slash));
  if (!a.ok) return a;
  const p = parsePrefix(s.slice(slash + 1));
  if (!p.ok) return p;
  return ok({ address: a.value, prefix: p.value });
}

export type AddressKind =
  | 'unspecified'
  | 'private'
  | 'shared'
  | 'loopback'
  | 'link-local'
  | 'documentation'
  | 'benchmarking'
  | 'multicast'
  | 'reserved'
  | 'broadcast'
  | 'public';

/** Special-purpose ranges (RFC 6890 and friends), most specific first where they overlap. */
const SPECIAL: Array<[string, number, AddressKind]> = [
  ['255.255.255.255', 32, 'broadcast'],
  ['0.0.0.0', 8, 'unspecified'],
  ['10.0.0.0', 8, 'private'],
  ['100.64.0.0', 10, 'shared'],
  ['127.0.0.0', 8, 'loopback'],
  ['169.254.0.0', 16, 'link-local'],
  ['172.16.0.0', 12, 'private'],
  ['192.0.2.0', 24, 'documentation'],
  ['192.168.0.0', 16, 'private'],
  ['198.18.0.0', 15, 'benchmarking'],
  ['198.51.100.0', 24, 'documentation'],
  ['203.0.113.0', 24, 'documentation'],
  ['224.0.0.0', 4, 'multicast'],
  ['240.0.0.0', 4, 'reserved'],
];

export function addressKind(address: number): AddressKind {
  for (const [base, prefix, kind] of SPECIAL) {
    const start = (parseIPv4(base) as { value: number }).value;
    if (address >= start && address < start + blockSize(prefix)) return kind;
  }
  return 'public';
}

/** Dotted binary, e.g. `11111111.11111111.11111111.00000000`. */
export function toBinary(value: number): string {
  return formatIPv4(value)
    .split('.')
    .map((o) => Number(o).toString(2).padStart(8, '0'))
    .join('.');
}

export interface Subnet {
  address: number;
  prefix: number;
  network: number;
  /** null for /31 and /32, which have no broadcast address. */
  broadcast: number | null;
  /** Last address in the block (equals broadcast for /0–/30). */
  last: number;
  mask: number;
  wildcard: number;
  firstHost: number;
  lastHost: number;
  usableHosts: number;
  totalAddresses: number;
  /** The entered address had host bits set (it is not the network address). */
  hostBitsSet: boolean;
}

export function subnet(address: number, prefix: number): Subnet {
  if (!Number.isInteger(address) || address < 0 || address > MAX_IPV4)
    throw new RangeError('address');
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError('prefix');
  const size = blockSize(prefix);
  const network = address - (address % size);
  const last = network + size - 1;
  const mask = maskFromPrefix(prefix);
  const base = {
    address,
    prefix,
    network,
    last,
    mask,
    wildcard: size - 1,
    totalAddresses: size,
    hostBitsSet: address !== network,
  };
  // RFC 3021: a /31 is a point-to-point link where both addresses are hosts.
  if (prefix === 31) {
    return { ...base, broadcast: null, firstHost: network, lastHost: last, usableHosts: 2 };
  }
  if (prefix === 32) {
    return { ...base, broadcast: null, firstHost: network, lastHost: network, usableHosts: 1 };
  }
  return {
    ...base,
    broadcast: last,
    firstHost: network + 1,
    lastHost: last - 1,
    usableHosts: size - 2,
  };
}

export const formatCidr = (network: number, prefix: number): string =>
  `${formatIPv4(network)}/${prefix}`;

export type RangeToCidrError = 'start-after-end';

/**
 * The smallest list of CIDR blocks that exactly covers `start … end` (inclusive).
 * An IPv4 range never needs more than 62 blocks.
 */
export function rangeToCidrs(
  start: number,
  end: number,
): Result<Array<{ network: number; prefix: number }>, RangeToCidrError> {
  if (start > end) return fail('start-after-end');
  const out: Array<{ network: number; prefix: number }> = [];
  let cur = start;
  while (cur <= end) {
    let prefix = 32;
    // Grow the block while it stays aligned on `cur` and inside the range.
    while (prefix > 0) {
      const size = blockSize(prefix - 1);
      if (cur % size !== 0 || cur + size - 1 > end) break;
      prefix--;
    }
    out.push({ network: cur, prefix });
    cur += blockSize(prefix);
  }
  return ok(out);
}
