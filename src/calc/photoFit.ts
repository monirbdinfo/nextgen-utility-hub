/**
 * Pure logic for the Photo & Signature Resizer: how an image is placed on an exact
 * output size without stretching (crop to fill, or fit inside with padding), how much is
 * cut off or padded, and the file-size limit check. No DOM, canvas or network access.
 *
 * No official presets are defined here on purpose: a size or file-size rule for a
 * specific recruiter may only be added with a cited official source (see docs/TOOLS.md).
 */
import type { Size } from './image';

/** `crop`: fill the whole output, cutting off what does not fit (centred).
 *  `pad`: show the whole image, filling the empty space with white (centred). */
export type FitMode = 'crop' | 'pad';

/** Where the whole (upright) source image is drawn on the output canvas, in output pixels. */
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scale factor applied to the source: above 1 means the image is enlarged. */
export function fitScale(source: Size, target: Size, mode: FitMode): number {
  const sx = target.width / source.width;
  const sy = target.height / source.height;
  return mode === 'crop' ? Math.max(sx, sy) : Math.min(sx, sy);
}

/** Centred placement with the same proportions as the source (never stretched). */
export function placeImage(source: Size, target: Size, mode: FitMode): Placement {
  const s = fitScale(source, target, mode);
  const width = source.width * s;
  const height = source.height * s;
  return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height };
}

/** Whether the two sizes have different proportions (beyond whole-pixel rounding). */
export function sameProportions(source: Size, target: Size): boolean {
  // Placing the source at this size leaves less than half a pixel of crop or padding.
  const p = placeImage(source, target, 'crop');
  return Math.abs(p.width - target.width) < 1 && Math.abs(p.height - target.height) < 1;
}

export interface FitSummary {
  /** Which sides lose (crop) or gain (pad) area; `none` when the proportions match. */
  axis: 'none' | 'sides' | 'top-bottom';
  /** Percent (one decimal) of the source cut off (crop) or of the output that is padding (pad). */
  percent: number;
  /** The source is enlarged, which cannot add detail. */
  enlarged: boolean;
}

/** What the chosen fit does to this image, for the explanation shown before saving. */
export function describeFit(source: Size, target: Size, mode: FitMode): FitSummary {
  const enlarged = fitScale(source, target, mode) > 1;
  if (sameProportions(source, target)) return { axis: 'none', percent: 0, enlarged };
  const p = placeImage(source, target, mode);
  const wider = source.width / source.height > target.width / target.height;
  const area = (mode === 'crop' ? p.width * p.height : target.width * target.height) || 1;
  const kept = mode === 'crop' ? target.width * target.height : p.width * p.height;
  const percent = Math.round((1 - kept / area) * 1000) / 10;
  // A wider source loses its sides when cropped, and gets bands above and below when padded.
  const axis = wider === (mode === 'crop') ? 'sides' : 'top-bottom';
  return { axis, percent, enlarged };
}

/** Whether a file fits a limit in bytes (`null` means no limit). */
export function withinLimit(bytes: number, limitBytes: number | null): boolean {
  return limitBytes === null || bytes <= limitBytes;
}
