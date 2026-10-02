/**
 * Pure image-tool logic: format sniffing, validation, dimensions, file names.
 * No DOM, canvas or network access, so everything here is unit-testable.
 */
import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const FORMATS: Readonly<
  Record<ImageFormat, { mime: string; ext: string; label: string; alpha: boolean }>
> = {
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG', alpha: false },
  png: { mime: 'image/png', ext: 'png', label: 'PNG', alpha: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', alpha: true },
};

/**
 * Limits chosen for browser memory safety. A decoded image uses about 4 bytes per pixel,
 * and older iOS Safari refuses canvases larger than 16,777,216 pixels (4096 × 4096).
 */
export const IMAGE_LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxInputPixels: 50_000_000,
  maxSide: 8192,
  maxOutputPixels: 16_777_216,
} as const;

/** Identify JPEG, PNG or WebP from the file's first bytes (ignores the file name and MIME type). */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  const b = (i: number): number => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((v, i) => b(i) === v)) return 'png';
  const ascii = (from: number, to: number): string =>
    String.fromCharCode(...Array.from(bytes.subarray(from, to)));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Map a MIME type such as `image/png` to a supported format. */
export function formatFromMime(mime: string): ImageFormat | null {
  const found = (Object.keys(FORMATS) as ImageFormat[]).find((f) => FORMATS[f].mime === mime);
  return found ?? null;
}

export type FileError = 'empty' | 'too-large' | 'unsupported';

/** Validate a picked file from its size and first 12+ bytes. */
export function checkImageFile(size: number, header: Uint8Array): Result<ImageFormat, FileError> {
  if (size === 0) return fail('empty');
  if (size > IMAGE_LIMITS.maxFileBytes) return fail('too-large');
  const format = sniffImageFormat(header);
  return format ? ok(format) : fail('unsupported');
}

export function checkDecodedSize(
  width: number,
  height: number,
): Result<true, 'too-many-pixels' | 'empty'> {
  if (width < 1 || height < 1) return fail('empty');
  if (width * height > IMAGE_LIMITS.maxInputPixels) return fail('too-many-pixels');
  return ok(true);
}

export interface Size {
  width: number;
  height: number;
}

const atLeastOne = (n: number): number => Math.max(1, Math.round(n));

/** Scale both sides by a percentage, rounding to whole pixels (never below 1). */
export function scaleByPercent(original: Size, percent: number): Size {
  return {
    width: atLeastOne((original.width * percent) / 100),
    height: atLeastOne((original.height * percent) / 100),
  };
}

/** Height that keeps the original aspect ratio for a given width. */
export function heightForWidth(original: Size, width: number): number {
  return atLeastOne((width * original.height) / original.width);
}

/** Width that keeps the original aspect ratio for a given height. */
export function widthForHeight(original: Size, height: number): number {
  return atLeastOne((height * original.width) / original.height);
}

/** Parse a typed dimension: Bangla or English digits, whole numbers only. */
export function parseDimension(text: string): number | null {
  const t = toEnglishDigits(text.trim());
  return /^\d{1,7}$/.test(t) ? Number(t) : null;
}

export type DimensionError = 'invalid' | 'too-small' | 'side-too-large' | 'area-too-large';

export function validateDimensions(width: number, height: number): Result<Size, DimensionError> {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return fail('invalid');
  if (width < 1 || height < 1) return fail('too-small');
  if (width > IMAGE_LIMITS.maxSide || height > IMAGE_LIMITS.maxSide) return fail('side-too-large');
  if (width * height > IMAGE_LIMITS.maxOutputPixels) return fail('area-too-large');
  return ok({ width, height });
}

export type FormatChoice = 'same' | ImageFormat;

export function resolveOutputFormat(choice: FormatChoice, input: ImageFormat): ImageFormat {
  return choice === 'same' ? input : choice;
}

/** Converting from a format that can be transparent to JPEG loses transparency. */
export function transparencyRisk(input: ImageFormat, output: ImageFormat): boolean {
  return FORMATS[input].alpha && !FORMATS[output].alpha;
}

/** True when any pixel in RGBA data is not fully opaque. */
export function hasTransparency(rgba: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) return true;
  return false;
}

/**
 * Download name such as `holiday-photo-800x600.jpg`. Keeps the original base name
 * (without its extension), removes characters that are unsafe in file names, and
 * falls back to `image`.
 */
export function outputFilename(originalName: string, size: Size, format: ImageFormat): string {
  const withoutPath = originalName.split(/[\\/]/).pop() ?? '';
  const base = withoutPath.replace(/\.[^.]*$/, '');
  const unsafe = (c: string): boolean =>
    c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || '<>:"/\\|?*'.includes(c);
  const safe = [...base]
    .map((c) => (unsafe(c) ? '-' : c))
    .join('')
    .replace(/-{2,}/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')
    .slice(0, 80);
  return `${safe || 'image'}-${size.width}x${size.height}.${FORMATS[format].ext}`;
}

/** Human-readable size with one decimal: 999 B, 12.3 KB, 4.5 MB (1 KB = 1024 bytes). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Change in size as a signed whole percentage: 800 → 600 bytes is -25. */
export function percentChange(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((after - before) / before) * 100);
}
