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
import { dnsLookup, domainToIp, ipLookup, ipToHostname, latencyTest } from './networkOnline';
import {
  ipSubnetCalculator,
  ipToDecimal,
  ipv4ToIpv6,
  ipv6CidrRange,
  ipv6Compression,
  ipv6Expand,
  ipv6RangeCidr,
  ipv6ToIpv4,
  localIpv6Generator,
} from './networkIpv6';
import { emailHeaderAnalyzer } from './emailHeaders';
import { imageToText } from './imageToText';
import { creditCardChecker, notepadOnline, timeCardCalculator } from './productivityMisc';
import { qrCodeGenerator } from './qrGenerator';
import { qrScanner, wifiQrScanner } from './qrScanner';
import { reverseImageSearch } from './reverseImage';
import { internetSpeedTest } from './speedTest';
import {
  invisibleCharacter,
  loremGenerator,
  morseTranslator,
  rot13Tool,
  runicTranslator,
  smallTextGenerator,
} from './productivityText';
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
  'ip-to-decimal': ipToDecimal,
  'ipv4-to-ipv6': ipv4ToIpv6,
  'ipv6-to-ipv4': ipv6ToIpv4,
  'ipv6-compression': ipv6Compression,
  'ipv6-expand': ipv6Expand,
  'ipv6-cidr-range': ipv6CidrRange,
  'ipv6-range-cidr': ipv6RangeCidr,
  'ip-subnet-calculator': ipSubnetCalculator,
  'local-ipv6-generator': localIpv6Generator,
  'email-header-analyzer': emailHeaderAnalyzer,
  'ip-to-hostname': ipToHostname,
  'domain-to-ip': domainToIp,
  'lorem-ipsum': loremGenerator,
  'time-card-calculator': timeCardCalculator,
  'credit-card-checker': creditCardChecker,
  'rot13-decoder': rot13Tool,
  'morse-translator': morseTranslator,
  'small-text-generator': smallTextGenerator,
  'runic-translator': runicTranslator,
  'invisible-character': invisibleCharacter,
  'notepad-online': notepadOnline,
  'qr-code-generator': qrCodeGenerator,
  'qr-scanner': qrScanner,
  'wifi-qr-scanner': wifiQrScanner,
  'reverse-image-search': reverseImageSearch,
  'internet-speed-test': internetSpeedTest,
  'image-to-text': imageToText,
};

export type { ToolContext, ToolView } from './kit';
