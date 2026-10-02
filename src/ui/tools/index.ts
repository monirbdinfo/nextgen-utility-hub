import { ageCalculator } from './ageCalculator';
import { dateDifferenceTool } from './dateDifference';
import { dateFormatter } from './dateFormatter';
import { digitConverter } from './digitConverter';
import { emiCalculator } from './emiCalculator';
import type { ToolView } from './kit';
import { numberToWordsTool } from './numberToWords';
import { takaInWords } from './takaInWords';
import { unicodeCleaner } from './unicodeCleaner';

/** View for every `available` tool, keyed by registry id (checked in tests/registry.test.ts). */
export const toolViews: Readonly<Record<string, ToolView>> = {
  'age-calculator': ageCalculator,
  'date-difference': dateDifferenceTool,
  'emi-calculator': emiCalculator,
  'digit-converter': digitConverter,
  'number-to-words-bn': numberToWordsTool,
  'taka-in-words': takaInWords,
  'date-formatter': dateFormatter,
  'unicode-cleaner': unicodeCleaner,
};

export type { ToolContext, ToolView } from './kit';
