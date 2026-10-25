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
  'latency-test': latencyTest,
  'qr-code-generator': qrCodeGenerator,
  'qr-scanner': qrScanner,
  'lorem-ipsum': loremIpsum,
  'time-card-calculator': timeCardCalculator,
  'bin-checker': binChecker,
  'credit-card-checker': creditCardChecker,
  'reverse-image-search': reverseImageSearch,
  'username-checker': usernameChecker,
  'notepad-online': notepadOnline,
  'small-text-generator': smallTextGenerator,
  'domain-name-search': domainNameSearch,
  'rot13-decoder': rot13Tool,
  'morse-translator': morseTranslator,
  'bimi-checker': bimiChecker,
  'image-to-text': imageToText,
  'runic-translator': runicTranslator,
  'invisible-character': invisibleCharacter,
  'internet-speed-test': internetSpeedTest,
  'wifi-qr-scanner': wifiQrScanner,
};

export type { ToolContext, ToolView } from './kit';
