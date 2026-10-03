/**
 * Pure logic for the Image Compressor: size comparison, quality handling, target-size
 * search and file names. No DOM, canvas or network access.
 */
import { toEnglishDigits } from './digits';
import { FORMATS, IMAGE_LIMITS, safeBaseName, type ImageFormat } from './image';

/** Quality slider range, in whole percent. Below 10 % JPEG/WebP output is rarely usable. */
export const QUALITY = { min: 10, max: 100, default: 80 } as const;

/** Whether the browser's quality setting affects this output format (PNG ignores it). */
export function usesQuality(format: ImageFormat): boolean {
  return format !== 'png';
}

export function clampQuality(percent: number): number {
  if (!Number.isFinite(percent)) return QUALITY.default;
  return Math.min(QUALITY.max, Math.max(QUALITY.min, Math.round(percent)));
}

export type SizeChange = 'smaller' | 'same' | 'larger';

export interface SizeComparison {
  change: SizeChange;
  /** Bytes saved; negative when the output is larger. */
  savedBytes: number;
  /** Percent of the original saved (one decimal); negative when larger. */
  savedPercent: number;
  /** Original ÷ output, e.g. 2.5 means the output is 2.5 times smaller. */
  ratio: number;
}

/** Compare sizes honestly: equal sizes are "same", never "0 % smaller". */
export function compareSizes(originalBytes: number, outputBytes: number): SizeComparison {
  const savedBytes = originalBytes - outputBytes;
  const change: SizeChange = savedBytes > 0 ? 'smaller' : savedBytes < 0 ? 'larger' : 'same';
  const savedPercent = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 1000) / 10 : 0;
  const ratio = outputBytes > 0 ? originalBytes / outputBytes : 0;
  return { change, savedBytes, savedPercent, ratio };
}

/** "2.45 : 1"-style ratio text with two decimals (digits converted by the caller). */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)} : 1`;
}

/**
 * Download name such as `holiday-photo-compressed-q80.jpg` (quality only for formats that
 * use it), with the extension of the format actually produced.
 */
export function compressedFilename(
  originalName: string,
  format: ImageFormat,
  qualityPercent: number | null,
): string {
  const q = qualityPercent !== null && usesQuality(format) ? `-q${qualityPercent}` : '';
  return `${safeBaseName(originalName)}-compressed${q}.${FORMATS[format].ext}`;
}

export type TargetError = 'invalid' | 'too-small' | 'too-large';

/** Parse a target size in KB (1 KB = 1024 bytes): Bangla or English digits, up to 1 decimal. */
export function parseTargetKB(
  text: string,
): { ok: true; bytes: number } | { ok: false; error: TargetError } {
  const t = toEnglishDigits(text.trim());
  if (!/^\d{1,6}(\.\d)?$/.test(t)) return { ok: false, error: 'invalid' };
  const bytes = Math.round(Number(t) * 1024);
  if (bytes < 1024) return { ok: false, error: 'too-small' };
  if (bytes > IMAGE_LIMITS.maxFileBytes) return { ok: false, error: 'too-large' };
  return { ok: true, bytes };
}

export interface TargetAttempt<T> {
  quality: number;
  bytes: number;
  value: T;
}

export type TargetResult<T> =
  | { ok: true; best: TargetAttempt<T>; attempts: number }
  /** `smallest` is the smallest output tried (at the lowest quality). */
  | { ok: false; smallest: TargetAttempt<T>; attempts: number };

/**
 * Find the highest whole-percent quality in [min, max] whose output is at most
 * `targetBytes`, with a binary search: at most ⌈log2(max − min + 1)⌉ + 1 encodes
 * (8 for 10–100 %). Encoders are not perfectly monotonic, so the answer is the best
 * quality *found* that fits, never a promise that no higher quality would fit.
 */
export async function searchQuality<T>(
  encode: (quality: number) => Promise<{ bytes: number; value: T }>,
  targetBytes: number,
  min: number = QUALITY.min,
  max: number = QUALITY.max,
): Promise<TargetResult<T>> {
  let attempts = 0;
  const tryQuality = async (quality: number): Promise<TargetAttempt<T>> => {
    attempts++;
    const out = await encode(quality);
    return { quality, bytes: out.bytes, value: out.value };
  };
  // The lowest quality decides whether the target is reachable at all.
  const lowest = await tryQuality(min);
  if (lowest.bytes > targetBytes) return { ok: false, smallest: lowest, attempts };
  let best = lowest;
  let lo = min + 1;
  let hi = max;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const attempt = await tryQuality(mid);
    if (attempt.bytes <= targetBytes) {
      if (attempt.quality > best.quality) best = attempt;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return { ok: true, best, attempts };
}
