// The prebuilt ES module of tesseract.js has no type file of its own; it is the same API.
declare module 'tesseract.js/dist/tesseract.esm.min.js' {
  import type Tesseract from 'tesseract.js';
  const tesseract: typeof Tesseract;
  export default tesseract;
}
