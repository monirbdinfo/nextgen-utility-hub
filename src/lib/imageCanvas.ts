/**
 * Browser-side image decoding, resizing, cropping and encoding with HTMLImageElement and
 * HTMLCanvasElement only (supported by every browser the ES2022 build targets;
 * OffscreenCanvas is avoided because it needs Safari 16.4+). Nothing here makes a
 * network request: images are read from local Blob object URLs.
 */
import {
  FORMATS,
  formatFromMime,
  hasTransparency,
  type ImageFormat,
  type Size,
} from '../calc/image';
import type { Rect } from '../calc/crop';

export type ProcessingError = 'decode' | 'canvas' | 'encode';

export class ImageProcessingError extends Error {
  constructor(readonly code: ProcessingError) {
    super(code);
    this.name = 'ImageProcessingError';
  }
}

export interface DecodedImage {
  image: HTMLImageElement;
  /** Object URL backing `image`; the caller must revoke it with `releaseDecoded`. */
  url: string;
  width: number;
  height: number;
}

/**
 * Decode a local image. Uses an <img> element so the browser applies the photo's
 * EXIF orientation the same way it displays it.
 */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  try {
    image.src = url;
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageProcessingError('decode');
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new ImageProcessingError('decode');
  }
  return { image, url, width: image.naturalWidth, height: image.naturalHeight };
}

export function releaseDecoded(decoded: DecodedImage | null | undefined): void {
  if (!decoded) return;
  decoded.image.removeAttribute('src');
  URL.revokeObjectURL(decoded.url);
}

const encodeSupport = new Map<ImageFormat, boolean>();

/** Whether this browser's canvas can encode the format (Safari, for example, cannot encode WebP). */
export function canEncode(format: ImageFormat): boolean {
  const cached = encodeSupport.get(format);
  if (cached !== undefined) return cached;
  let supported = false;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    supported = c.toDataURL(FORMATS[format].mime).startsWith(`data:${FORMATS[format].mime}`);
  } catch {
    supported = false;
  }
  encodeSupport.set(format, supported);
  return supported;
}

export interface ResizeResult {
  blob: Blob;
  /** The format the browser actually produced (it may differ from the request). */
  format: ImageFormat;
  size: Size;
  /** Output is JPEG and the source had transparent pixels, which were filled with white. */
  filledTransparency: boolean;
}

/** JPEG/WebP quality used for re-encoding. Re-encoding is lossy for these formats. */
export const ENCODE_QUALITY = 0.92;

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, mime, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Draw `source` at the requested size and encode it. Transparent pixels become
 * white for JPEG (canvases would otherwise turn them black). The canvas is
 * shrunk to 0×0 afterwards so its memory is released promptly.
 */
export function resizeImage(
  source: CanvasImageSource,
  size: Size,
  format: ImageFormat,
  /** Only formats that can be transparent need the (memory-heavy) transparency scan. */
  sourceMayBeTransparent: boolean,
): Promise<ResizeResult> {
  return render(source, null, size, format, sourceMayBeTransparent);
}

/**
 * Copy the `rect` region (source pixels, whole numbers) at 1:1 scale, without
 * resampling, and encode it. Same transparency and error handling as `resizeImage`.
 */
export function cropImage(
  source: CanvasImageSource,
  rect: Rect,
  format: ImageFormat,
  sourceMayBeTransparent: boolean,
): Promise<ResizeResult> {
  return render(
    source,
    rect,
    { width: rect.width, height: rect.height },
    format,
    sourceMayBeTransparent,
  );
}

async function render(
  source: CanvasImageSource,
  from: Rect | null,
  size: Size,
  format: ImageFormat,
  sourceMayBeTransparent: boolean,
): Promise<ResizeResult> {
  const encoder = openEncoder(source, from, size, format, sourceMayBeTransparent);
  try {
    const out = await encoder.encode(ENCODE_QUALITY);
    return { ...out, size, filledTransparency: encoder.filledTransparency };
  } finally {
    encoder.close();
  }
}

export interface EncodedImage {
  blob: Blob;
  /** The format the browser actually produced (it may differ from the request). */
  format: ImageFormat;
}

/** A drawn canvas that can be encoded repeatedly (for example at several qualities). */
export interface Encoder {
  /** Output is JPEG and the source had transparent pixels, which were filled with white. */
  filledTransparency: boolean;
  /** Encode at `quality` (0–1; ignored by the browser for PNG). */
  encode(quality: number): Promise<EncodedImage>;
  /** Release the canvas memory. Always call this when done. */
  close(): void;
}

/**
 * Draw `source` (or its `from` region at 1:1) at `size` once, ready to be encoded as
 * `format`. Transparent pixels become white for JPEG (canvases would otherwise turn
 * them black). Throws `ImageProcessingError('canvas')` if the canvas cannot be created.
 */
export function openEncoder(
  source: CanvasImageSource,
  from: Rect | null,
  size: Size,
  format: ImageFormat,
  /** Only formats that can be transparent need the (memory-heavy) transparency scan. */
  sourceMayBeTransparent: boolean,
): Encoder {
  const canvas = document.createElement('canvas');
  const close = (): void => {
    // Shrinking the canvas releases its memory promptly.
    canvas.width = 0;
    canvas.height = 0;
  };
  let filledTransparency = false;
  try {
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width !== size.width || canvas.height !== size.height) {
      throw new ImageProcessingError('canvas');
    }
    if (from) {
      // 1:1 copy at whole-pixel offsets: no smoothing, so pixels are copied exactly.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, from.x, from.y, from.width, from.height, 0, 0, size.width, size.height);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, size.width, size.height);
    }
    if (!FORMATS[format].alpha) {
      filledTransparency =
        sourceMayBeTransparent &&
        hasTransparency(ctx.getImageData(0, 0, size.width, size.height).data);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size.width, size.height);
    }
  } catch (error) {
    close();
    if (error instanceof ImageProcessingError) throw error;
    // Allocation failures surface as RangeError/DOMException depending on the browser.
    throw new ImageProcessingError('canvas');
  }
  return {
    filledTransparency,
    async encode(quality) {
      let blob: Blob | null;
      try {
        blob = await toBlob(canvas, FORMATS[format].mime, quality);
      } catch {
        throw new ImageProcessingError('canvas');
      }
      if (!blob || blob.size === 0) throw new ImageProcessingError('encode');
      const produced = formatFromMime(blob.type);
      if (!produced) throw new ImageProcessingError('encode');
      return { blob, format: produced };
    },
    close,
  };
}
