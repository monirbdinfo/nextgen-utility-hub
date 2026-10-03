import { describe, expect, it } from 'vitest';
import { CONVERT_FORMATS, convertedFilename, defaultTargetFormat } from '../../src/calc/convert';
import type { ImageFormat } from '../../src/calc/image';

const all = () => true;
const without =
  (...missing: ImageFormat[]) =>
  (f: ImageFormat) =>
    !missing.includes(f);

describe('defaultTargetFormat', () => {
  it('picks a different format: PNG for JPEG/WebP, JPEG for PNG', () => {
    expect(CONVERT_FORMATS).toEqual(['jpeg', 'png', 'webp']);
    expect(defaultTargetFormat('jpeg', all)).toBe('png');
    expect(defaultTargetFormat('webp', all)).toBe('png');
    expect(defaultTargetFormat('png', all)).toBe('jpeg');
  });

  it('falls back to what the browser can encode', () => {
    expect(defaultTargetFormat('jpeg', without('png'))).toBe('webp');
    expect(defaultTargetFormat('webp', without('png', 'jpeg'))).toBe('webp');
    expect(defaultTargetFormat('png', () => false)).toBeNull();
  });
});

describe('convertedFilename', () => {
  it('uses the real output extension and a safe base name', () => {
    expect(convertedFilename('photo.jpg', 'jpeg')).toBe('photo-converted.jpg');
    expect(convertedFilename('holiday photo.PNG', 'webp')).toBe('holiday photo-converted.webp');
    expect(convertedFilename('C:\\x\\a<b>.webp', 'png')).toBe('a-b-converted.png');
    expect(convertedFilename('ছবি.jpg', 'png')).toBe('ছবি-converted.png');
    expect(convertedFilename('.png', 'jpeg')).toBe('image-converted.jpg');
  });
});
