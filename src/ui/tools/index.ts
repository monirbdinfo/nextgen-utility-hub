import { ageCalculator } from './ageCalculator';
import { dateDifferenceTool } from './dateDifference';
import { dateFormatter } from './dateFormatter';
import { digitConverter } from './digitConverter';
import { emiCalculator } from './emiCalculator';
import { imageCompressor } from './imageCompressor';
import { imageConverter } from './imageConverter';
import { imageCropper } from './imageCropper';
import { imageResizer } from './imageResizer';
import type { ToolView } from './kit';
import { numberToWordsTool } from './numberToWords';
import { takaInWords } from './takaInWords';
import { textCounter } from './textCounter';
import { unicodeCleaner } from './unicodeCleaner';

/** View for every `available` tool, keyed by registry id (checked in tests/registry.test.ts). */
export const toolViews: Readonly<Record<string, ToolView>> = {
  'age-calculator': ageCalculator,
  'date-difference': dateDifferenceTool,
  'emi-calculator': emiCalculator,
  'text-counter': textCounter,
  'digit-converter': digitConverter,
  'number-to-words-bn': numberToWordsTool,
  'taka-in-words': takaInWords,
  'date-formatter': dateFormatter,
  'unicode-cleaner': unicodeCleaner,
  'image-resizer': imageResizer,
  'image-cropper': imageCropper,
  'image-compressor': imageCompressor,
  'image-converter': imageConverter,
};

export type { ToolContext, ToolView } from './kit';
