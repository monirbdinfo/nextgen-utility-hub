import { describe, expect, it } from 'vitest';
import {
  applyRatio,
  arrowDelta,
  aspectRatio,
  ASPECTS,
  clampRect,
  displayScale,
  displayToSource,
  initialRect,
  isAspectId,
  keyStep,
  largestSize,
  moveRect,
  parsePixels,
  rectFromFields,
  rectToPercent,
  resizeRect,
  sizeAtRatio,
  type Rect,
} from '../../src/calc/crop';

// A non-square image (4:3) used throughout.
const B = { width: 400, height: 300 };
const R = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
const fields = (x: string, y: string, width: string, height: string) => ({ x, y, width, height });

describe('coordinate conversion', () => {
  it('converts display (CSS) pixels to source pixels with the preview scale', () => {
    // 400 × 300 image shown at 200 × 150: one CSS pixel is two source pixels.
    expect(displayScale({ width: 200, height: 150 }, B)).toEqual({ x: 2, y: 2 });
    expect(displayToSource({ x: 10, y: 5 }, { width: 200, height: 150 }, B)).toEqual({
      x: 20,
      y: 10,
    });
    // Enlarged display (800 × 600): half a source pixel per CSS pixel.
    expect(displayToSource({ x: 10, y: 6 }, { width: 800, height: 600 }, B)).toEqual({
      x: 5,
      y: 3,
    });
    // Each axis uses its own scale.
    expect(displayToSource({ x: 10, y: 5 }, { width: 100, height: 150 }, B)).toEqual({
      x: 40,
      y: 10,
    });
  });

  it('positions the on-screen selection as percentages of the source size', () => {
    expect(rectToPercent(R(100, 30, 200, 150), B)).toEqual({
      left: 25,
      top: 10,
      width: 50,
      height: 50,
    });
  });

  it('guards against a zero-size display', () => {
    expect(displayScale({ width: 0, height: 0 }, B)).toEqual({ x: 1, y: 1 });
  });
});

describe('boundaries', () => {
  it('keeps a rectangle inside the image with whole pixels', () => {
    expect(clampRect(R(-5, 280, 50, 50), B)).toEqual(R(0, 250, 50, 50));
    expect(clampRect(R(10, 10, 500, 400), B)).toEqual(R(0, 0, 400, 300));
    expect(clampRect(R(10.4, 9.6, 0, -3), B)).toEqual(R(10, 10, 1, 1));
  });

  it('moves without changing size and stops at the edges', () => {
    expect(moveRect(R(10, 10, 100, 100), 25, 15, B)).toEqual(R(35, 25, 100, 100));
    expect(moveRect(R(10, 10, 100, 100), 1000, -50, B)).toEqual(R(300, 0, 100, 100));
    expect(moveRect(R(10, 10, 100, 100), -1000, 1000, B)).toEqual(R(0, 200, 100, 100));
  });
});

describe('aspect ratios', () => {
  it('has the presets, with passport-style as a 35:45 crop ratio', () => {
    expect(ASPECTS.map((a) => a.id)).toEqual([
      'free',
      '1:1',
      '4:3',
      '3:2',
      '16:9',
      '3:4',
      '2:3',
      'passport',
    ]);
    expect(aspectRatio('free')).toBeNull();
    expect(aspectRatio('16:9')).toBeCloseTo(16 / 9);
    expect(aspectRatio('passport')).toBeCloseTo(35 / 45);
    expect(isAspectId('3:2')).toBe(true);
    expect(isAspectId('5:4')).toBe(false);
  });

  it('computes whole-pixel sizes at a ratio within limits', () => {
    expect(sizeAtRatio(500, 2, B)).toEqual({ width: 400, height: 200 });
    expect(sizeAtRatio(400, 0.5, B)).toEqual({ width: 150, height: 300 });
    expect(sizeAtRatio(0, 1, B)).toEqual({ width: 1, height: 1 });
    expect(largestSize(B, null)).toEqual({ width: 400, height: 300 });
    expect(largestSize(B, 1)).toEqual({ width: 300, height: 300 });
    expect(largestSize(B, 16 / 9)).toEqual({ width: 400, height: 225 });
    expect(largestSize(B, 35 / 45)).toEqual({ width: 233, height: 300 });
  });

  it('starts with a centred selection at 80 % of the largest fitting rectangle', () => {
    expect(initialRect(B, null)).toEqual(R(40, 30, 320, 240));
    expect(initialRect(B, 1)).toEqual(R(80, 30, 240, 240));
    expect(initialRect(B, 16 / 9)).toEqual(R(40, 60, 320, 180));
    // 80 % of 233 px is 186.4 → 186; 186 ÷ (35/45) = 239.1 → 239.
    expect(initialRect(B, 35 / 45)).toEqual(R(107, 31, 186, 239));
    expect(initialRect({ width: 1, height: 1 }, 1)).toEqual(R(0, 0, 1, 1));
  });

  it('switching ratio keeps the centre and area, shrinking only to fit', () => {
    expect(applyRatio(R(40, 30, 320, 240), 1, B)).toEqual(R(62, 12, 277, 277));
    expect(applyRatio(R(0, 0, 400, 300), 16 / 9, B)).toEqual(R(0, 38, 400, 225));
    expect(applyRatio(R(10, 20, 30, 40), null, B)).toEqual(R(10, 20, 30, 40));
  });
});

describe('resizing with handles (freeform)', () => {
  const start = R(100, 100, 100, 100);

  it('moves only the dragged edges', () => {
    expect(resizeRect(start, 'se', 50, 20, B, null)).toEqual(R(100, 100, 150, 120));
    expect(resizeRect(start, 'n', 0, 30.4, B, null)).toEqual(R(100, 130, 100, 70));
    expect(resizeRect(start, 'w', -40, 999, B, null)).toEqual(R(60, 100, 140, 100));
  });

  it('stops at the image edges', () => {
    expect(resizeRect(start, 'nw', -500, -500, B, null)).toEqual(R(0, 0, 200, 200));
    expect(resizeRect(start, 'e', 1000, 0, B, null)).toEqual(R(100, 100, 300, 100));
    expect(resizeRect(start, 's', 0, 1000, B, null)).toEqual(R(100, 100, 100, 200));
  });

  it('never goes below the minimum size and never flips', () => {
    expect(resizeRect(start, 'w', 200, 0, B, null, { width: 20, height: 20 })).toEqual(
      R(180, 100, 20, 100),
    );
    expect(resizeRect(start, 'se', -500, -500, B, null)).toEqual(R(100, 100, 1, 1));
  });
});

describe('resizing with handles (fixed ratio)', () => {
  const start = R(100, 100, 100, 100);

  it('keeps the ratio on corner handles, following the axis that moved more', () => {
    expect(resizeRect(start, 'se', 50, 10, B, 1)).toEqual(R(100, 100, 150, 150));
    expect(resizeRect(start, 'nw', -30, -10, B, 1)).toEqual(R(70, 70, 130, 130));
    expect(resizeRect(R(0, 0, 120, 90), 'se', 10, 0, B, 4 / 3)).toEqual(R(0, 0, 130, 98));
  });

  it('limits growth by the space on both axes', () => {
    // Only 200 px below the top edge, so a square can be at most 200 × 200.
    expect(resizeRect(start, 'se', 500, 0, B, 1)).toEqual(R(100, 100, 200, 200));
  });

  it('edge handles keep the other axis centred, shifting only to stay inside', () => {
    expect(resizeRect(start, 'e', 40, 0, B, 1)).toEqual(R(100, 80, 140, 140));
    expect(resizeRect(R(100, 250, 50, 50), 'e', 100, 0, B, 1)).toEqual(R(100, 150, 150, 150));
  });

  it('shrinks with the keyboard step on the corner handle', () => {
    expect(resizeRect(start, 'se', -1, 0, B, 1)).toEqual(R(100, 100, 99, 99));
    expect(resizeRect(start, 'se', 0, 10, B, 1)).toEqual(R(100, 100, 110, 110));
  });
});

describe('numeric fields', () => {
  it('parses whole numbers in English or Bangla digits', () => {
    expect(parsePixels(' 120 ')).toBe(120);
    expect(parsePixels('১০০')).toBe(100);
    expect(parsePixels('0')).toBe(0);
    for (const bad of ['', '-5', '12.5', '1e3', 'abc', '1,000'])
      expect(parsePixels(bad)).toBeNull();
  });

  it('accepts a selection that fits', () => {
    expect(rectFromFields(fields('10', '20', '100', '80'), 'x', B, null)).toEqual({
      ok: true,
      value: R(10, 20, 100, 80),
    });
    expect(rectFromFields(fields('0', '0', '400', '300'), 'width', B, null).ok).toBe(true);
  });

  it('rejects invalid, zero and out-of-bounds values without clamping', () => {
    const err = (r: ReturnType<typeof rectFromFields>) => (r.ok ? null : r.error);
    expect(err(rectFromFields(fields('a', '0', '10', '10'), 'x', B, null))).toEqual({
      field: 'x',
      error: 'invalid',
    });
    expect(err(rectFromFields(fields('0', '0', '0', '10'), 'width', B, null))).toEqual({
      field: 'width',
      error: 'too-small',
    });
    expect(err(rectFromFields(fields('350', '0', '100', '10'), 'x', B, null))).toEqual({
      field: 'x',
      error: 'past-right',
    });
    expect(err(rectFromFields(fields('350', '0', '100', '10'), 'width', B, null))).toEqual({
      field: 'width',
      error: 'past-right',
    });
    expect(err(rectFromFields(fields('0', '280', '10', '50'), 'y', B, null))).toEqual({
      field: 'y',
      error: 'past-bottom',
    });
  });

  it('derives the other side from the ratio and explains when it cannot fit', () => {
    expect(rectFromFields(fields('0', '0', '999', '50'), 'height', B, 1)).toEqual({
      ok: true,
      value: R(0, 0, 50, 50),
    });
    expect(rectFromFields(fields('0', '0', '160', '1'), 'width', B, 16 / 9)).toEqual({
      ok: true,
      value: R(0, 0, 160, 90),
    });
    const r = rectFromFields(fields('0', '100', '250', '250'), 'width', B, 1);
    expect(r).toEqual({ ok: false, error: { field: 'width', error: 'ratio-no-fit' } });
  });
});

describe('keyboard helpers', () => {
  it('maps arrow keys and step sizes', () => {
    expect(arrowDelta('ArrowLeft')).toEqual({ x: -1, y: 0 });
    expect(arrowDelta('ArrowDown')).toEqual({ x: 0, y: 1 });
    expect(arrowDelta('Enter')).toBeNull();
    expect(keyStep(false)).toBe(1);
    expect(keyStep(true)).toBe(10);
  });
});
