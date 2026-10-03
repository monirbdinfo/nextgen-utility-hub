import { describe, expect, it } from 'vitest';
import {
  describeFit,
  fitScale,
  placeImage,
  sameProportions,
  withinLimit,
} from '../../src/calc/photoFit';

const size = (width: number, height: number) => ({ width, height });

describe('placeImage', () => {
  it('crops a landscape image to a square by cutting the sides, centred', () => {
    // 400 × 300 → 300 × 300: scale 1 (height fits), 50 px cut off each side.
    expect(placeImage(size(400, 300), size(300, 300), 'crop')).toEqual({
      x: -50,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  it('pads a landscape image into a square with bands above and below, centred', () => {
    // 400 × 300 → 300 × 300: scale 0.75, image 300 × 225, 37.5 px band top and bottom.
    expect(placeImage(size(400, 300), size(300, 300), 'pad')).toEqual({
      x: 0,
      y: 37.5,
      width: 300,
      height: 225,
    });
  });

  it('crops a portrait to a wide signature shape by cutting top and bottom', () => {
    const p = placeImage(size(600, 800), size(300, 80), 'crop');
    expect(p.width).toBe(300);
    expect(p.height).toBe(400);
    expect(p.x).toBe(0);
    expect(p.y).toBe(-160);
  });

  it('never stretches: the placement keeps the source proportions', () => {
    for (const mode of ['crop', 'pad'] as const) {
      for (const [s, t] of [
        [size(4032, 3024), size(300, 300)],
        [size(1, 5000), size(300, 80)],
        [size(5000, 1), size(80, 300)],
        [size(123, 457), size(999, 17)],
      ] as const) {
        const p = placeImage(s, t, mode);
        expect(p.width / p.height).toBeCloseTo(s.width / s.height, 9);
        if (mode === 'crop') {
          // Covers the whole output.
          expect(p.x).toBeLessThanOrEqual(1e-9);
          expect(p.y).toBeLessThanOrEqual(1e-9);
          expect(p.x + p.width).toBeGreaterThanOrEqual(t.width - 1e-9);
          expect(p.y + p.height).toBeGreaterThanOrEqual(t.height - 1e-9);
        } else {
          // Stays inside the output.
          expect(p.x).toBeGreaterThanOrEqual(-1e-9);
          expect(p.y).toBeGreaterThanOrEqual(-1e-9);
          expect(p.x + p.width).toBeLessThanOrEqual(t.width + 1e-9);
          expect(p.y + p.height).toBeLessThanOrEqual(t.height + 1e-9);
        }
      }
    }
  });

  it('fills the output exactly when the proportions match', () => {
    for (const mode of ['crop', 'pad'] as const) {
      expect(placeImage(size(600, 600), size(300, 300), mode)).toEqual({
        x: 0,
        y: 0,
        width: 300,
        height: 300,
      });
    }
  });
});

describe('fitScale', () => {
  it('reports enlargement above 1 and reduction below 1', () => {
    expect(fitScale(size(100, 100), size(300, 300), 'crop')).toBe(3);
    expect(fitScale(size(400, 300), size(300, 300), 'crop')).toBe(1);
    expect(fitScale(size(400, 300), size(300, 300), 'pad')).toBe(0.75);
  });
});

describe('sameProportions', () => {
  it('ignores differences smaller than a pixel', () => {
    expect(sameProportions(size(3000, 3000), size(300, 300))).toBe(true);
    // 1001 × 1000 → 300 × 300: the crop would cut 0.3 px, which rounds away.
    expect(sameProportions(size(1001, 1000), size(300, 300))).toBe(true);
    expect(sameProportions(size(400, 300), size(300, 300))).toBe(false);
  });
});

describe('describeFit', () => {
  it('describes a crop by the share of the image cut off and where', () => {
    // 400 × 300 → 300 × 300: 100 of 400 px of width removed = 25 %.
    expect(describeFit(size(400, 300), size(300, 300), 'crop')).toEqual({
      axis: 'sides',
      percent: 25,
      enlarged: false,
    });
    expect(describeFit(size(300, 400), size(300, 300), 'crop').axis).toBe('top-bottom');
  });

  it('describes padding by the share of the output that is white space and where', () => {
    // 400 × 300 → 300 × 300: image 300 × 225, so 25 % of the output is padding.
    expect(describeFit(size(400, 300), size(300, 300), 'pad')).toEqual({
      axis: 'top-bottom',
      percent: 25,
      enlarged: false,
    });
    expect(describeFit(size(300, 400), size(300, 300), 'pad').axis).toBe('sides');
  });

  it('reports matching proportions and enlargement', () => {
    expect(describeFit(size(150, 40), size(300, 80), 'crop')).toEqual({
      axis: 'none',
      percent: 0,
      enlarged: true,
    });
  });
});

describe('withinLimit', () => {
  it('treats the limit as inclusive and null as no limit', () => {
    expect(withinLimit(100 * 1024, 100 * 1024)).toBe(true);
    expect(withinLimit(100 * 1024 + 1, 100 * 1024)).toBe(false);
    expect(withinLimit(Number.MAX_SAFE_INTEGER, null)).toBe(true);
  });
});
