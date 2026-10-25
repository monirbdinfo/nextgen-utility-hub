import {
  bimiChecker,
  binChecker,
  creditCardChecker,
  domainNameSearch,
  imageToText,
  internetSpeedTest,
  invisibleCharacter,
  loremIpsum,
  morseTranslator,
  notepadOnline,
  qrCodeGenerator,
  qrScanner,
  reverseImageSearch,
  rot13Tool,
  runicTranslator,
  smallTextGenerator,
  timeCardCalculator,
  usernameChecker,
  wifiQrScanner,
} from './productivityTools';
import { ageCalculator } from './ageCalculator';
import { dateDifferenceTool } from './dateDifference';
import { bandwidthCalculator } from './bandwidthCalculator';
import { unitConverter } from './unitConverter';
import { dateFormatter } from './dateFormatter';
import { digitConverter } from './digitConverter';
import { emiCalculator } from './emiCalculator';
import { imageCompressor } from './imageCompressor';
import { imageConverter } from './imageConverter';
import { imageCropper } from './imageCropper';
import { imageResizer } from './imageResizer';
import { applicationChecklist, coverLetterTemplates, cvTemplates } from './jobApplication';
import type { ToolView } from './kit';
import { cidrCalculator, subnetCalculator } from './networkCalculators';
import { dnsLookup, ipLookup, latencyTest } from './networkOnline';
import { numberToWordsTool } from './numberToWords';
import { photoResizer } from './photoResizer';
import { pdfCreate, pdfMergeSplit, pdfPageTools, pdfReduceSize } from './pdfTools';
import { takaInWords } from './takaInWords';
import { textCounter } from './textCounter';
import { unicodeCleaner } from './unicodeCleaner';

/** View for every `available` tool, keyed by registry id (checked in tests/registry.test.ts). */
export const toolViews: Readonly<Record<string, ToolView>> = {
  'age-calculator': ageCalculator,
  'date-difference': dateDifferenceTool,
  'emi-calculator': emiCalculator,
  'text-counter': textCounter,
  'bandwidth-calculator': bandwidthCalculator,
  'unit-converter': unitConverter,
  'digit-converter': digitConverter,
  'number-to-words-bn': numberToWordsTool,
  'taka-in-words': takaInWords,
  'date-formatter': dateFormatter,
  'unicode-cleaner': unicodeCleaner,
  'image-resizer': imageResizer,
  'image-cropper': imageCropper,
  'image-compressor': imageCompressor,
  'image-converter': imageConverter,
  'job-photo-resizer': photoResizer,
  'pdf-create': pdfCreate,
  'pdf-merge': pdfMergeSplit,
  'pdf-tools': pdfPageTools,
  'pdf-compress': pdfReduceSize,
  'cv-templates': cvTemplates,
  'cover-letter-templates': coverLetterTemplates,
  'cv-checklist': applicationChecklist,
  'subnet-calculator': subnetCalculator,
  'cidr-calculator': cidrCalculator,
  'my-ip-info': ipLookup,
  'dns-lookup': dnsLookup,
  'latency-test': latencyTest,\n  'qr-code-generator': qrCodeGenerator,\n  'qr-scanner': qrScanner,\n  'lorem-ipsum': loremIpsum,\n  'time-card-calculator': timeCardCalculator,\n  'bin-checker': binChecker,\n  'credit-card-checker': creditCardChecker,\n  'reverse-image-search': reverseImageSearch,\n  'username-checker': usernameChecker,\n  'notepad-online': notepadOnline,\n  'small-text-generator': smallTextGenerator,\n  'domain-name-search': domainNameSearch,\n  'rot13-decoder': rot13Tool,\n  'morse-translator': morseTranslator,\n  'bimi-checker': bimiChecker,\n  'image-to-text': imageToText,\n  'runic-translator': runicTranslator,\n  'invisible-character': invisibleCharacter,\n  'internet-speed-test': internetSpeedTest,\n  'wifi-qr-scanner': wifiQrScanner,
};

export type { ToolContext, ToolView } from './kit';
