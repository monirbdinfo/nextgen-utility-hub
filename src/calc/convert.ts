/**
 * Pure logic for the Image Converter: the default target format and file names.
 * No DOM, canvas or network access.
 */
import { FORMATS, safeBaseName, type ImageFormat } from './image';

/** Formats the converter offers, in the order shown. */
export const CONVERT_FORMATS: readonly ImageFormat[] = ['jpeg', 'png', 'webp'];

/**
 * A sensible first choice that differs from the source: PNG for JPEG and WebP sources
 * (lossless, keeps transparency), JPEG for PNG sources. Falls back to any format the
 * browser can encode, or null if none can.
 */
export function defaultTargetFormat(
  source: ImageFormat,
  canEncode: (f: ImageFormat) => boolean,
): ImageFormat | null {
  const preferred: ImageFormat = source === 'png' ? 'jpeg' : 'png';
  if (canEncode(preferred)) return preferred;
  return (
    CONVERT_FORMATS.find((f) => f !== source && canEncode(f)) ?? (canEncode(source) ? source : null)
  );
}

/** Download name such as `holiday-photo-converted.webp`, with the real output extension. */
export function convertedFilename(originalName: string, format: ImageFormat): string {
  return `${safeBaseName(originalName)}-converted.${FORMATS[format].ext}`;
}
