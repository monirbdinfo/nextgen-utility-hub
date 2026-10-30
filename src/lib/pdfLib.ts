// pdf-lib is large (most of the PDF tools' weight), so it is loaded only when a PDF action runs.
// Importing it through this module gives the chunk a recognisable name (pdfLib-*.js).
export { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
