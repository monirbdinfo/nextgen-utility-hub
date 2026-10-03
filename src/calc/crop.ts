/**
 * Pure crop-selection maths for the Image Cropper. No DOM access.
 *
 * Coordinate spaces:
 * - **Source pixels**: the decoded image's natural pixels (`naturalWidth` × `naturalHeight`,
 *   after EXIF orientation). Every `Rect` here, the numeric fields and the output are in
 *   source pixels, as whole numbers.
 * - **Display pixels**: CSS pixels of the scaled preview on screen. Pointer movements arrive
 *   in display pixels and are converted with `displayToSource` before they touch a `Rect`.
 * - The on-screen selection is positioned with percentages of the source size
 *   (`rectToPercent`), so it stays aligned however the preview is scaled.
 */
import { toEnglishDigits } from './digits';
import type { Size } from './image';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Width ÷ height, or null for freeform. */
export type Ratio = number | null;

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export type AspectId = 'free' | '1:1' | '4:3' | '3:2' | '16:9' | '3:4' | '2:3' | 'passport';

/**
 * Aspect-ratio presets. "passport" is the 35:45 ratio of a 35 × 45 mm photo, which is
 * common but not universal; it is a crop ratio only, not a size or an official rule.
 */
export const ASPECTS: ReadonlyArray<{ id: AspectId; w: number; h: number }> = [
  { id: 'free', w: 0, h: 0 },
  { id: '1:1', w: 1, h: 1 },
  { id: '4:3', w: 4, h: 3 },
  { id: '3:2', w: 3, h: 2 },
  { id: '16:9', w: 16, h: 9 },
  { id: '3:4', w: 3, h: 4 },
  { id: '2:3', w: 2, h: 3 },
  { id: 'passport', w: 35, h: 45 },
];

export function aspectRatio(id: AspectId): Ratio {
  const a = ASPECTS.find((x) => x.id === id);
  return a && a.w > 0 ? a.w / a.h : null;
}

export function isAspectId(v: string): v is AspectId {
  return ASPECTS.some((a) => a.id === v);
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** Source pixels per display pixel on each axis. */
export function displayScale(display: Size, natural: Size): Point {
  return {
    x: display.width > 0 ? natural.width / display.width : 1,
    y: display.height > 0 ? natural.height / display.height : 1,
  };
}

/** Convert a distance or position in display (CSS) pixels to source pixels (not rounded). */
export function displayToSource(p: Point, display: Size, natural: Size): Point {
  const s = displayScale(display, natural);
  return { x: p.x * s.x, y: p.y * s.y };
}

/** Percentages of the source image, for positioning the on-screen selection. */
export function rectToPercent(
  r: Rect,
  natural: Size,
): { left: number; top: number; width: number; height: number } {
  return {
    left: (r.x / natural.width) * 100,
    top: (r.y / natural.height) * 100,
    width: (r.width / natural.width) * 100,
    height: (r.height / natural.height) * 100,
  };
}

/** Whole-pixel rectangle that lies inside the image and is at least 1 × 1. */
export function clampRect(r: Rect, bounds: Size): Rect {
  const width = clamp(Math.round(r.width), 1, bounds.width);
  const height = clamp(Math.round(r.height), 1, bounds.height);
  return {
    x: clamp(Math.round(r.x), 0, bounds.width - width),
    y: clamp(Math.round(r.y), 0, bounds.height - height),
    width,
    height,
  };
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** Move without changing the size; the rectangle stops at the image edges. */
export function moveRect(r: Rect, dx: number, dy: number, bounds: Size): Rect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy }, bounds);
}

/**
 * Whole-pixel size for a width at a ratio, no larger than `max`. The result's ratio is
 * as close as whole pixels allow (within half a pixel on the derived side).
 */
export function sizeAtRatio(width: number, ratio: number, max: Size): Size {
  let w = clamp(Math.round(width), 1, max.width);
  let h = Math.max(1, Math.round(w / ratio));
  if (h > max.height) {
    h = max.height;
    w = clamp(Math.round(h * ratio), 1, max.width);
  }
  return { width: w, height: h };
}

/** Largest size with the ratio that fits in `bounds` (the whole image for freeform). */
export function largestSize(bounds: Size, ratio: Ratio): Size {
  if (ratio === null) return { width: bounds.width, height: bounds.height };
  return sizeAtRatio(Math.min(bounds.width, bounds.height * ratio), ratio, bounds);
}

/** Centred starting selection: `fraction` of the largest rectangle with the ratio. */
export function initialRect(bounds: Size, ratio: Ratio, fraction = 0.8): Rect {
  const big = largestSize(bounds, ratio);
  const size =
    ratio === null
      ? {
          width: Math.max(1, Math.round(big.width * fraction)),
          height: Math.max(1, Math.round(big.height * fraction)),
        }
      : sizeAtRatio(big.width * fraction, ratio, bounds);
  return centredRect(size, bounds);
}

function centredRect(size: Size, bounds: Size): Rect {
  return clampRect(
    {
      x: (bounds.width - size.width) / 2,
      y: (bounds.height - size.height) / 2,
      width: size.width,
      height: size.height,
    },
    bounds,
  );
}

/**
 * Change the ratio of an existing selection: keep its centre and roughly its area,
 * shrinking only as far as needed to stay inside the image.
 */
export function applyRatio(r: Rect, ratio: Ratio, bounds: Size): Rect {
  if (ratio === null) return clampRect(r, bounds);
  const area = r.width * r.height;
  let width = Math.sqrt(area * ratio);
  const big = largestSize(bounds, ratio);
  width = Math.min(width, big.width);
  const size = sizeAtRatio(width, ratio, bounds);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  return clampRect(
    { x: cx - size.width / 2, y: cy - size.height / 2, width: size.width, height: size.height },
    bounds,
  );
}

/**
 * Resize by dragging a handle by (dx, dy) source pixels from the starting rectangle.
 * The opposite edge or corner stays fixed. With a ratio, corner handles follow the
 * axis that moved more, and edge handles keep the selection centred on the other axis.
 * The result stays inside the image and is never smaller than `min` (when the image
 * allows it).
 */
export function resizeRect(
  start: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  bounds: Size,
  ratio: Ratio,
  min: Size = { width: 1, height: 1 },
): Rect {
  const minW = Math.min(Math.max(1, min.width), bounds.width);
  const minH = Math.min(Math.max(1, min.height), bounds.height);
  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const east = handle.includes('e');
  const west = handle.includes('w');
  const south = handle.includes('s');
  const north = handle.includes('n');

  if (ratio === null) {
    const l = west ? clamp(left + dx, 0, right - minW) : left;
    const r = east ? clamp(right + dx, left + minW, bounds.width) : right;
    const t = north ? clamp(top + dy, 0, bottom - minH) : top;
    const b = south ? clamp(bottom + dy, top + minH, bounds.height) : bottom;
    // Round the moving edges only, so the fixed edges never shift.
    const rl = Math.round(l);
    const rt = Math.round(t);
    return clampRect(
      { x: rl, y: rt, width: Math.round(r) - rl, height: Math.round(b) - rt },
      bounds,
    );
  }

  const horizontal = east || west;
  const vertical = north || south;
  // Space available from the fixed side.
  const spaceX = east ? bounds.width - left : west ? right : bounds.width;
  const spaceY = south ? bounds.height - top : north ? bottom : bounds.height;
  const maxW = Math.min(spaceX, spaceY * ratio);
  const minWidth = Math.min(Math.max(minW, minH * ratio), maxW);

  const fromX = start.width + (east ? dx : west ? -dx : 0);
  const fromY = (start.height + (south ? dy : north ? -dy : 0)) * ratio;
  let width: number;
  if (horizontal && vertical) width = Math.abs(dx) >= Math.abs(dy) * ratio ? fromX : fromY;
  else width = horizontal ? fromX : fromY;
  width = clamp(width, minWidth, maxW);
  const size = sizeAtRatio(width, ratio, { width: spaceX, height: spaceY });

  let x: number;
  if (east) x = left;
  else if (west) x = right - size.width;
  else x = start.x + start.width / 2 - size.width / 2;
  let y: number;
  if (south) y = top;
  else if (north) y = bottom - size.height;
  else y = start.y + start.height / 2 - size.height / 2;
  return clampRect({ x, y, ...size }, bounds);
}

/** Parse a typed coordinate or size: Bangla or English digits, whole numbers only. */
export function parsePixels(text: string): number | null {
  const t = toEnglishDigits(text.trim());
  return /^\d{1,7}$/.test(t) ? Number(t) : null;
}

export type CropField = 'x' | 'y' | 'width' | 'height';
export type CropFieldError =
  'invalid' | 'too-small' | 'past-right' | 'past-bottom' | 'ratio-no-fit';
export interface FieldProblem {
  field: CropField;
  error: CropFieldError;
}
export type FieldsResult = { ok: true; value: Rect } | { ok: false; error: FieldProblem };

const problem = (field: CropField, error: CropFieldError): FieldsResult => ({
  ok: false,
  error: { field, error },
});

/**
 * Build a selection from the four typed values. `changed` is the field the user edited;
 * with a ratio, editing the width sets the height (and vice versa). Nothing is clamped
 * silently: values that do not fit are reported against the field that was edited.
 */
export function rectFromFields(
  values: Record<CropField, string>,
  changed: CropField,
  bounds: Size,
  ratio: Ratio,
): FieldsResult {
  const parsed = {} as Record<CropField, number>;
  for (const f of ['x', 'y', 'width', 'height'] as const) {
    const n = parsePixels(values[f]);
    if (n === null) return problem(f, 'invalid');
    parsed[f] = n;
  }
  let { width, height } = parsed;
  const { x, y } = parsed;
  if (width < 1) return problem('width', 'too-small');
  if (height < 1) return problem('height', 'too-small');
  if (ratio !== null) {
    if (changed === 'height') width = Math.max(1, Math.round(height * ratio));
    else height = Math.max(1, Math.round(width / ratio));
  }
  const blame = (axis: 'x' | 'y'): CropField => {
    if (ratio !== null && (changed === 'width' || changed === 'height')) return changed;
    if (changed === axis || changed === (axis === 'x' ? 'width' : 'height')) return changed;
    return axis === 'x' ? 'width' : 'height';
  };
  if (x + width > bounds.width) {
    return problem(blame('x'), ratio !== null ? 'ratio-no-fit' : 'past-right');
  }
  if (y + height > bounds.height) {
    return problem(blame('y'), ratio !== null ? 'ratio-no-fit' : 'past-bottom');
  }
  return { ok: true, value: { x, y, width, height } };
}

/** Keyboard step in source pixels: 1, or 10 with Shift. */
export function keyStep(shift: boolean): number {
  return shift ? 10 : 1;
}

/** Arrow key → direction, or null for any other key. */
export function arrowDelta(key: string): Point | null {
  switch (key) {
    case 'ArrowLeft':
      return { x: -1, y: 0 };
    case 'ArrowRight':
      return { x: 1, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -1 };
    case 'ArrowDown':
      return { x: 0, y: 1 };
    default:
      return null;
  }
}
