import { describe, expect, it } from 'vitest';
import {
  checkDecodedSize,
  checkImageFile,
  formatBytes,
  formatFromMime,
  hasTransparency,
  heightForWidth,
  IMAGE_LIMITS,
  outputFilename,
  parseDimension,
  percentChange,
  resolveOutputFormat,
  scaleByPercent,
  sniffImageFormat,
  transparencyRisk,
  validateDimensions,
  widthForHeight,
} from '../../src/calc/image';

const bytes = (...b: number[]): Uint8Array => new Uint8Array(b);
const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 16, ...ascii('JFIF'), 0, 1);
const WEBP = bytes(...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBP'));

describe('sniffImageFormat', () => {
  it('recognises JPEG, PNG and WebP signatures', () => {
    expect(sniffImageFormat(JPEG)).toBe('jpeg');
    expect(sniffImageFormat(PNG)).toBe('png');
    expect(sniffImageFormat(WEBP)).toBe('webp');
  });

  it('rejects other or truncated data', () => {
    expect(sniffImageFormat(bytes())).toBeNull();
    expect(sniffImageFormat(bytes(0xff, 0xd8))).toBeNull(); // truncated JPEG marker
    expect(sniffImageFormat(PNG.subarray(0, 7))).toBeNull();
    expect(sniffImageFormat(bytes(...ascii('GIF89a'), 0, 0, 0, 0, 0, 0))).toBeNull();
    expect(sniffImageFormat(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')))).toBeNull();
    expect(sniffImageFormat(bytes(...ascii('%PDF-1.7 abc')))).toBeNull();
    expect(sniffImageFormat(bytes(...ascii('<svg xmlns=')))).toBeNull();
  });

  it('maps MIME types', () => {
    expect(formatFromMime('image/png')).toBe('png');
    expect(formatFromMime('image/jpeg')).toBe('jpeg');
    expect(formatFromMime('image/gif')).toBeNull();
  });
});

describe('checkImageFile', () => {
  it('accepts supported images within the size limit', () => {
    expect(checkImageFile(1234, PNG)).toEqual({ ok: true, value: 'png' });
    expect(checkImageFile(IMAGE_LIMITS.maxFileBytes, JPEG)).toEqual({ ok: true, value: 'jpeg' });
  });

  it('rejects empty, oversized and unsupported files', () => {
    expect(checkImageFile(0, PNG)).toEqual({ ok: false, error: 'empty' });
    expect(checkImageFile(IMAGE_LIMITS.maxFileBytes + 1, PNG)).toEqual({
      ok: false,
      error: 'too-large',
    });
    expect(checkImageFile(500, bytes(...ascii('hello world!')))).toEqual({
      ok: false,
      error: 'unsupported',
    });
  });

  it('limits decoded pixel counts', () => {
    expect(checkDecodedSize(4000, 3000).ok).toBe(true);
    expect(checkDecodedSize(10_000, 5_001)).toEqual({ ok: false, error: 'too-many-pixels' });
    expect(checkDecodedSize(0, 10)).toEqual({ ok: false, error: 'empty' });
  });

  it('uses the documented limits', () => {
    expect(IMAGE_LIMITS).toEqual({
      maxFileBytes: 26_214_400,
      maxInputPixels: 50_000_000,
      maxSide: 8192,
      maxOutputPixels: 16_777_216,
    });
  });
});

describe('dimensions', () => {
  const photo = { width: 4000, height: 3000 };

  it('scales by preset percentages with whole-pixel rounding', () => {
    expect(scaleByPercent(photo, 25)).toEqual({ width: 1000, height: 750 });
    expect(scaleByPercent(photo, 50)).toEqual({ width: 2000, height: 1500 });
    expect(scaleByPercent(photo, 75)).toEqual({ width: 3000, height: 2250 });
    expect(scaleByPercent(photo, 100)).toEqual(photo);
    expect(scaleByPercent({ width: 333, height: 101 }, 50)).toEqual({ width: 167, height: 51 }); // 166.5 → 167, 50.5 → 51
    expect(scaleByPercent({ width: 3, height: 1 }, 25)).toEqual({ width: 1, height: 1 }); // never below 1
  });

  it('keeps the aspect ratio from either side', () => {
    expect(heightForWidth(photo, 800)).toBe(600);
    expect(widthForHeight(photo, 600)).toBe(800);
    expect(heightForWidth({ width: 1920, height: 1080 }, 1280)).toBe(720);
    expect(heightForWidth({ width: 1000, height: 333 }, 100)).toBe(33); // 33.3 → 33
    expect(widthForHeight({ width: 1, height: 1000 }, 10)).toBe(1); // never below 1
  });

  it('parses typed dimensions, including Bangla digits', () => {
    expect(parseDimension(' 800 ')).toBe(800);
    expect(parseDimension('৮০০')).toBe(800);
    for (const bad of ['', '8.5', '-5', '1e3', 'abc', '12px', '1 000', '12345678']) {
      expect(parseDimension(bad), bad).toBeNull();
    }
  });

  it('rejects invalid, zero, negative and excessive sizes', () => {
    expect(validateDimensions(800, 600)).toEqual({ ok: true, value: { width: 800, height: 600 } });
    expect(validateDimensions(8192, 2048).ok).toBe(true); // exactly the area limit
    expect(validateDimensions(0, 600)).toEqual({ ok: false, error: 'too-small' });
    expect(validateDimensions(-5, 600)).toEqual({ ok: false, error: 'too-small' });
    expect(validateDimensions(1.5, 600)).toEqual({ ok: false, error: 'invalid' });
    expect(validateDimensions(Number.NaN, 600)).toEqual({ ok: false, error: 'invalid' });
    expect(validateDimensions(8193, 100)).toEqual({ ok: false, error: 'side-too-large' });
    expect(validateDimensions(8192, 2049)).toEqual({ ok: false, error: 'area-too-large' });
  });
});

describe('formats and transparency', () => {
  it('resolves "same as original"', () => {
    expect(resolveOutputFormat('same', 'png')).toBe('png');
    expect(resolveOutputFormat('jpeg', 'png')).toBe('jpeg');
  });

  it('warns only when a format that can be transparent becomes JPEG', () => {
    expect(transparencyRisk('png', 'jpeg')).toBe(true);
    expect(transparencyRisk('webp', 'jpeg')).toBe(true);
    expect(transparencyRisk('jpeg', 'jpeg')).toBe(false);
    expect(transparencyRisk('png', 'webp')).toBe(false);
    expect(transparencyRisk('jpeg', 'png')).toBe(false);
  });

  it('detects non-opaque pixels in RGBA data', () => {
    expect(hasTransparency(bytes(10, 20, 30, 255, 1, 2, 3, 255))).toBe(false);
    expect(hasTransparency(bytes(10, 20, 30, 255, 1, 2, 3, 254))).toBe(true);
    expect(hasTransparency(bytes(0, 0, 0, 0))).toBe(true);
    expect(hasTransparency(bytes())).toBe(false);
  });
});

describe('outputFilename', () => {
  const size = { width: 800, height: 600 };

  it('keeps the base name and adds size and extension', () => {
    expect(outputFilename('holiday photo.JPG', size, 'jpeg')).toBe('holiday photo-800x600.jpg');
    expect(outputFilename('scan.png', size, 'webp')).toBe('scan-800x600.webp');
    expect(outputFilename('archive.tar.png', size, 'png')).toBe('archive.tar-800x600.png');
    expect(outputFilename('ছবি ১.png', size, 'png')).toBe('ছবি ১-800x600.png');
  });

  it('removes paths, unsafe characters and falls back to "image"', () => {
    expect(outputFilename('C:\\Users\\me\\pic.png', size, 'png')).toBe('pic-800x600.png');
    expect(outputFilename('../../etc/passwd.png', size, 'png')).toBe('passwd-800x600.png');
    expect(outputFilename('a<b>c:d"e|f?g*h.png', size, 'png')).toBe('a-b-c-d-e-f-g-h-800x600.png');
    expect(outputFilename(`bad${String.fromCharCode(0, 7)}name.png`, size, 'png')).toBe(
      'bad-name-800x600.png',
    );
    expect(outputFilename('.png', size, 'png')).toBe('image-800x600.png');
    expect(outputFilename('', size, 'jpeg')).toBe('image-800x600.jpg');
    expect(outputFilename('...---.png', size, 'png')).toBe('image-800x600.png');
  });

  it('limits very long names', () => {
    const name = outputFilename(`${'x'.repeat(300)}.png`, size, 'png');
    expect(name).toBe(`${'x'.repeat(80)}-800x600.png`);
  });
});

describe('size reporting', () => {
  it('formats bytes', () => {
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('computes signed percentage change', () => {
    expect(percentChange(800, 600)).toBe(-25);
    expect(percentChange(600, 900)).toBe(50);
    expect(percentChange(0, 100)).toBe(0);
  });
});
