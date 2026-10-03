import { describe, expect, it } from 'vitest';
import {
  clampQuality,
  compareSizes,
  compressedFilename,
  formatRatio,
  parseTargetKB,
  QUALITY,
  searchQuality,
  usesQuality,
} from '../../src/calc/compress';

describe('quality', () => {
  it('applies to JPEG and WebP only', () => {
    expect(usesQuality('jpeg')).toBe(true);
    expect(usesQuality('webp')).toBe(true);
    expect(usesQuality('png')).toBe(false);
  });

  it('clamps to whole percents in the supported range', () => {
    expect(QUALITY).toEqual({ min: 10, max: 100, default: 80 });
    expect(clampQuality(55.4)).toBe(55);
    expect(clampQuality(0)).toBe(10);
    expect(clampQuality(150)).toBe(100);
    expect(clampQuality(Number.NaN)).toBe(80);
  });
});

describe('size comparison', () => {
  it('reports savings, percent and ratio when smaller', () => {
    expect(compareSizes(10_000, 4_000)).toEqual({
      change: 'smaller',
      savedBytes: 6_000,
      savedPercent: 60,
      ratio: 2.5,
    });
    expect(compareSizes(3, 2).savedPercent).toBe(33.3);
  });

  it('never claims savings when the size is equal or larger', () => {
    expect(compareSizes(5_000, 5_000)).toEqual({
      change: 'same',
      savedBytes: 0,
      savedPercent: 0,
      ratio: 1,
    });
    expect(compareSizes(4_000, 5_000)).toEqual({
      change: 'larger',
      savedBytes: -1_000,
      savedPercent: -25,
      ratio: 0.8,
    });
  });

  it('guards against empty inputs', () => {
    expect(compareSizes(0, 10)).toMatchObject({ savedPercent: 0, change: 'larger' });
    expect(compareSizes(10, 0).ratio).toBe(0);
  });

  it('formats the ratio with two decimals', () => {
    expect(formatRatio(2.5)).toBe('2.50 : 1');
    expect(formatRatio(0.8)).toBe('0.80 : 1');
  });
});

describe('compressedFilename', () => {
  it('describes the output and uses the real format extension', () => {
    expect(compressedFilename('holiday photo.PNG', 'jpeg', 80)).toBe(
      'holiday photo-compressed-q80.jpg',
    );
    expect(compressedFilename('a.jpg', 'webp', 55)).toBe('a-compressed-q55.webp');
    // PNG ignores quality, so it is not in the name.
    expect(compressedFilename('scan.png', 'png', 80)).toBe('scan-compressed.png');
    expect(compressedFilename('x/../bad<name>.jpg', 'jpeg', null)).toBe('bad-name-compressed.jpg');
  });
});

describe('target size', () => {
  it('parses KB in English or Bangla digits', () => {
    expect(parseTargetKB('200')).toEqual({ ok: true, bytes: 204_800 });
    expect(parseTargetKB('১৫০')).toEqual({ ok: true, bytes: 153_600 });
    expect(parseTargetKB('1.5')).toEqual({ ok: true, bytes: 1_536 });
    for (const bad of ['', 'abc', '-5', '1.25', '1e3', '1,000'])
      expect(parseTargetKB(bad)).toEqual({ ok: false, error: 'invalid' });
    expect(parseTargetKB('0.5')).toEqual({ ok: false, error: 'too-small' });
    expect(parseTargetKB('30000')).toEqual({ ok: false, error: 'too-large' });
  });

  /** A deterministic encoder: size grows linearly with quality. */
  const linear = (perPercent: number, base = 0) => {
    const calls: number[] = [];
    const encode = async (q: number) => {
      calls.push(q);
      return { bytes: base + q * perPercent, value: `q${q}` };
    };
    return { encode, calls };
  };

  it('finds the highest quality that fits, in at most 8 encodes', async () => {
    const { encode, calls } = linear(100); // q → q × 100 bytes
    const r = await searchQuality(encode, 5_050);
    expect(r).toEqual({
      ok: true,
      best: { quality: 50, bytes: 5_000, value: 'q50' },
      attempts: calls.length,
    });
    expect(calls[0]).toBe(10); // the lowest quality is tried first
    expect(calls.length).toBeLessThanOrEqual(8);
  });

  it('returns the maximum quality when everything fits', async () => {
    const { encode } = linear(1);
    const r = await searchQuality(encode, 10_000);
    expect(r.ok && r.best.quality).toBe(100);
  });

  it('reports an unreachable target with the smallest size tried', async () => {
    const { encode, calls } = linear(100, 50_000);
    const r = await searchQuality(encode, 40_000);
    expect(r).toEqual({
      ok: false,
      smallest: { quality: 10, bytes: 51_000, value: 'q10' },
      attempts: 1,
    });
    expect(calls).toEqual([10]);
  });

  it('copes with encoders that are not monotonic', async () => {
    // Sizes jump around; the result must still fit the target.
    const sizes = (q: number) => 1_000 + ((q * 37) % 23) * 100;
    const r = await searchQuality(async (q) => ({ bytes: sizes(q), value: q }), 2_000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.best.bytes).toBeLessThanOrEqual(2_000);
  });

  it('propagates encoder errors', async () => {
    await expect(
      searchQuality(async () => {
        throw new Error('encode');
      }, 1_000),
    ).rejects.toThrow('encode');
  });
});
