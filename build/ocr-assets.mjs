// Vite plugin for the Image to Text tool. Plain JavaScript (typed by ocr-assets.d.mts) so the
// project needs no Node.js type definitions.
import { readFileSync } from 'node:fs';

/**
 * Files the OCR tool loads at run time, served from this site's own `ocr/` folder so that OCR
 * never contacts a CDN. They are copied from node_modules into the build (and served from there
 * by the dev and preview servers); none of them is committed to the repository.
 */
export const OCR_ASSETS = {
  'ocr/worker.min.js': 'node_modules/tesseract.js/dist/worker.min.js',
  // LSTM-only engine builds; the worker picks the one the browser supports.
  'ocr/core/tesseract-core-lstm.wasm.js':
    'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'ocr/core/tesseract-core-simd-lstm.wasm.js':
    'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js':
    'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'ocr/lang/eng.traineddata.gz':
    'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  'ocr/lang/ben.traineddata.gz':
    'node_modules/@tesseract.js-data/ben/4.0.0_best_int/ben.traineddata.gz',
};

export function ocrAssets() {
  return {
    name: 'ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0].replace(/^\//, '');
        const source = OCR_ASSETS[path];
        if (!source) return next();
        res.setHeader(
          'content-type',
          path.endsWith('.js') ? 'text/javascript' : 'application/gzip',
        );
        res.end(readFileSync(source));
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(OCR_ASSETS))
        this.emitFile({ type: 'asset', fileName, source: readFileSync(source) });
    },
  };
}
