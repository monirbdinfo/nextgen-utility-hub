import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import {
  byteCapacity,
  ECC_LEVELS,
  encodeQr,
  QUIET_ZONE,
  toSvgPath,
  totalModules,
  type EccLevel,
  type QrSymbol,
} from '../../src/calc/qr';

/** Render a symbol (with its quiet zone) to RGBA pixels, `scale` pixels per module. */
function render(
  symbol: QrSymbol,
  scale = 4,
): { data: Uint8ClampedArray; width: number; height: number } {
  const modules = totalModules(symbol);
  const width = modules * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < symbol.size; y++) {
    for (let x = 0; x < symbol.size; x++) {
      if (!symbol.modules[y]![x]) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const px = ((y + QUIET_ZONE) * scale + dy) * width + (x + QUIET_ZONE) * scale + dx;
          data.set([0, 0, 0, 255], px * 4);
        }
    }
  }
  return { data, width, height: width };
}

/** Decode with an independent decoder. */
function decode(symbol: QrSymbol): string | null {
  const img = render(symbol);
  return jsQR(img.data, img.width, img.height)?.data ?? null;
}

const encode = (text: string, options = {}): QrSymbol => {
  const r = encodeQr(text, options);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

/** Distinct, repeatable text of an exact byte length. */
const sample = (length: number): string =>
  Array.from({ length }, (_, i) => String.fromCharCode(33 + ((i * 7 + (i >> 3)) % 90))).join('');

describe('capacity (byte mode, from the QR specification)', () => {
  it('matches the published numbers for versions 1 and 40', () => {
    expect(ECC_LEVELS.map((l) => byteCapacity(1, l))).toEqual([17, 14, 11, 7]);
    expect(ECC_LEVELS.map((l) => byteCapacity(40, l))).toEqual([2953, 2331, 1663, 1273]);
  });

  it('grows with the version at every level', () => {
    for (const level of ECC_LEVELS)
      for (let v = 2; v <= 40; v++)
        expect(byteCapacity(v, level)).toBeGreaterThan(byteCapacity(v - 1, level));
  });
});

describe('encodeQr structure', () => {
  it('chooses the smallest version that fits and sizes the symbol 4v+17', () => {
    const s = encode('Hello', { ecc: 'M' });
    expect(s.version).toBe(1);
    expect(s.size).toBe(21);
    expect(s.modules).toHaveLength(21);
    expect(s.modules.every((row) => row.length === 21)).toBe(true);
    expect(encode('x'.repeat(15), { ecc: 'M' }).version).toBe(2); // version 1-M holds 14 bytes
  });

  it('draws the three finder patterns and the always-dark module', () => {
    const s = encode('structure', { ecc: 'L' });
    for (const [x0, y0] of [
      [0, 0],
      [s.size - 7, 0],
      [0, s.size - 7],
    ] as const) {
      expect(s.modules[y0]![x0]).toBe(true); // outer ring corner
      expect(s.modules[y0 + 3]![x0 + 3]).toBe(true); // 3x3 core
      expect(s.modules[y0 + 1]![x0 + 1]).toBe(false); // light ring
    }
    expect(s.modules[s.size - 8]![8]).toBe(true);
  });

  it('is deterministic', () => {
    expect(encode('same input').modules).toEqual(encode('same input').modules);
  });

  it('honours a minimum version and a forced mask', () => {
    expect(encode('hi', { minVersion: 5 }).version).toBe(5);
    expect(encode('hi', { mask: 3 }).mask).toBe(3);
  });

  it('refuses empty text and text that is too long for version 40', () => {
    expect(encodeQr('')).toEqual({ ok: false, error: 'empty' });
    expect(encodeQr('a'.repeat(2953), { ecc: 'L' }).ok).toBe(true);
    expect(encodeQr('a'.repeat(2954), { ecc: 'L' })).toEqual({ ok: false, error: 'too-long' });
    expect(encodeQr('a'.repeat(1274), { ecc: 'H' })).toEqual({ ok: false, error: 'too-long' });
  });
});

describe('round trip through an independent decoder (jsQR)', () => {
  it('decodes short text at every level', () => {
    for (const level of ECC_LEVELS)
      expect(decode(encode('Hello, QR!', { ecc: level }))).toBe('Hello, QR!');
  });

  it('decodes with every one of the 8 masks', () => {
    for (let mask = 0; mask < 8; mask++) {
      expect(decode(encode('https://example.com/path?q=1&r=2', { mask }))).toBe(
        'https://example.com/path?q=1&r=2',
      );
    }
  });

  it('keeps Bangla, accented and emoji text intact (UTF-8)', () => {
    for (const text of ['আমার সোনার বাংলা', 'Café — naïve', 'Smile 😀 ok', '১২৩ abc ক্ষ']) {
      expect(decode(encode(text)), text).toBe(text);
    }
  });

  it('decodes a symbol filled to capacity for every version and level (160 combinations)', () => {
    const undecodable: string[] = [];
    for (const level of ECC_LEVELS as readonly EccLevel[]) {
      for (let version = 1; version <= 40; version++) {
        const text = sample(byteCapacity(version, level));
        const symbol = encode(text, { ecc: level });
        expect(symbol.version, `v${version}-${level}`).toBe(version);
        if (decode(symbol) !== text) undecodable.push(`v${version}-${level}`);
      }
    }
    // jsQR cannot read version 23 at level L at all: it returns nothing for every mask, scale and
    // text length, and it did the same for a second, independent encoder's version 23-L symbol,
    // while versions 22, 24 and 25 decode. Versions 1-40 at M, Q and H, and 1-40 at L apart from
    // this one, all decode. If this list changes (a decoder fix, or a regression here), look.
    expect(undecodable).toEqual(['v23-L']);
  }, 120_000);
});

describe('toSvgPath', () => {
  it('draws only dark modules, inside the quiet zone', () => {
    const s = encode('svg');
    const path = toSvgPath(s);
    expect(path.startsWith('M')).toBe(true);
    // The first dark module is the top-left finder corner, offset by the quiet zone.
    expect(path.startsWith(`M${QUIET_ZONE} ${QUIET_ZONE}h`)).toBe(true);
    const total = totalModules(s);
    for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(total - QUIET_ZONE);
      expect(Number(m[2])).toBeLessThan(total - QUIET_ZONE);
    }
  });
});
