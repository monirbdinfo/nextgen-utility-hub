import { describe, expect, it } from 'vitest';
import { OCR_MAX_SIDE, ocrAssetUrls, ocrScale } from '../src/lib/ocr';

describe('ocrScale', () => {
  it('scales large pictures down to the maximum side', () => {
    expect(ocrScale(6000, 4000)).toBe(OCR_MAX_SIDE / 6000);
    expect(ocrScale(2000, 9000)).toBe(OCR_MAX_SIDE / 9000);
  });
  it('leaves mid-sized pictures alone and doubles small ones', () => {
    expect(ocrScale(1600, 1200)).toBe(1);
    expect(ocrScale(3000, 10)).toBe(1);
    expect(ocrScale(800, 200)).toBe(2);
    expect(ocrScale(0, 0)).toBe(1);
  });
});

describe('ocrAssetUrls', () => {
  it('points at this site, also under a sub-path', () => {
    expect(ocrAssetUrls('https://tools.example.com/')).toEqual({
      workerPath: 'https://tools.example.com/ocr/worker.min.js',
      corePath: 'https://tools.example.com/ocr/core',
      langPath: 'https://tools.example.com/ocr/lang',
    });
    expect(ocrAssetUrls('https://user.github.io/hub/index.html').langPath).toBe(
      'https://user.github.io/hub/ocr/lang',
    );
  });
});
