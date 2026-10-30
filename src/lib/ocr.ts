/**
 * Optical character recognition with Tesseract.js, run in a Web Worker. The engine, its worker
 * script and the language data are all served by this site (see build/ocr-assets.mjs), so no
 * CDN or other third party is contacted and the picture never leaves the browser. Nothing is
 * cached in IndexedDB; the browser's normal HTTP cache keeps the engine files.
 */

export type OcrLanguage = 'eng' | 'ben' | 'eng+ben';
export const OCR_LANGUAGES: readonly OcrLanguage[] = ['eng', 'ben', 'eng+ben'];

export type OcrStage = 'engine' | 'language' | 'recognising';

export interface OcrProgress {
  stage: OcrStage;
  /** 0–1 within the stage. */
  progress: number;
}

export interface OcrResult {
  text: string;
  /** Tesseract's mean word confidence, 0–100. */
  confidence: number;
}

export type OcrErrorKind = 'load' | 'recognise' | 'aborted';
export class OcrError extends Error {
  constructor(readonly kind: OcrErrorKind) {
    super(kind);
  }
}

/** URLs of the engine files, relative to the page (works under a sub-path). */
export function ocrAssetUrls(base: string): {
  workerPath: string;
  corePath: string;
  langPath: string;
} {
  return {
    workerPath: new URL('ocr/worker.min.js', base).href,
    corePath: new URL('ocr/core', base).href,
    langPath: new URL('ocr/lang', base).href,
  };
}

/** Longest side recognition works on: large photos are scaled down, small scans scaled up. */
export const OCR_MAX_SIDE = 3000;
export const OCR_UPSCALE_BELOW = 1000;

/** Scale factor for a picture before recognition. */
export function ocrScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (longest <= 0) return 1;
  if (longest > OCR_MAX_SIDE) return OCR_MAX_SIDE / longest;
  if (longest < OCR_UPSCALE_BELOW) return Math.min(2, OCR_MAX_SIDE / longest);
  return 1;
}

const STAGES: Record<string, OcrStage> = {
  'loading tesseract core': 'engine',
  'initializing tesseract': 'engine',
  'loading language traineddata': 'language',
  'initializing api': 'language',
  'recognizing text': 'recognising',
};

/** Recognise the text in a picture. Rejects with OcrError; `signal` stops the worker at once. */
export async function recognise(
  image: HTMLCanvasElement,
  language: OcrLanguage,
  onProgress: (p: OcrProgress) => void,
  signal: AbortSignal,
): Promise<OcrResult> {
  if (signal.aborted) throw new OcrError('aborted');
  let tesseract;
  try {
    tesseract = (await import('tesseract.js/dist/tesseract.esm.min.js')).default;
  } catch {
    throw new OcrError('load');
  }
  let stage: 'load' | 'recognise' = 'load';
  let worker: Awaited<ReturnType<typeof tesseract.createWorker>> | null = null;
  const stop = (): void => void worker?.terminate();
  signal.addEventListener('abort', stop);
  try {
    worker = await tesseract.createWorker(language, tesseract.OEM.LSTM_ONLY, {
      ...ocrAssetUrls(document.baseURI),
      workerBlobURL: false,
      cacheMethod: 'none',
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        const s = STAGES[m.status];
        if (s) onProgress({ stage: s, progress: m.progress });
      },
    });
    if (signal.aborted) throw new OcrError('aborted');
    stage = 'recognise';
    const { data } = await worker.recognize(image);
    if (signal.aborted) throw new OcrError('aborted');
    return { text: data.text.replace(/\s+$/u, ''), confidence: data.confidence };
  } catch (e) {
    if (signal.aborted) throw new OcrError('aborted');
    if (e instanceof OcrError) throw e;
    throw new OcrError(stage);
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) void worker.terminate().catch(() => undefined);
  }
}
