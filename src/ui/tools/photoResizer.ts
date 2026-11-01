import { parseTargetKB, searchQuality, usesQuality } from '../../calc/compress';
import { toBanglaDigits, toEnglishDigits } from '../../calc/digits';
import {
  FORMATS,
  IMAGE_LIMITS,
  outputFilename,
  parseDimension,
  transparencyRisk,
  validateDimensions,
  type ImageFormat,
  type Size,
} from '../../calc/image';
import { describeFit, placeImage, withinLimit, type FitMode } from '../../calc/photoFit';
import { defineStrings } from '../../i18n';
import { h, prefersReducedMotion } from '../../lib/dom';
import {
  canEncode,
  ENCODE_QUALITY,
  ImageProcessingError,
  openPlacedEncoder,
  type EncodedImage,
} from '../../lib/imageCanvas';
import { icon } from '../icons';
import { IMG, formatField, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import {
  bindMemo,
  copyText,
  field,
  notes,
  resultPanel,
  select,
  textInput,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    uploadTitle: 'Upload & Preview',
    controls: 'Output Settings',
    sizeHint:
      'Enter the exact size in pixels (px) from the official notice and choose the other options. Requirements differ between recruiters and change over time.',
    keepRatio: 'Maintain aspect ratio',
    keepRatioHint: 'Keep the original proportion',
    increase: 'Increase {f}',
    decrease: 'Decrease {f}',
    widthWord: 'width',
    heightWord: 'height',
    unit: 'Size unit',
    jpegOption: 'JPEG (smaller files)',
    pngOption: 'PNG (lossless)',
    formatInfo:
      'PNG keeps every detail but makes larger files. JPEG and WebP make smaller files and can be fitted to a size limit.',
    needImage: 'Choose an image first.',
    presetsTitle: 'Quick presets',
    presetsSub: 'Choose a common size with one click.',
    presetsNote:
      'Common sizes, not official requirements. Always check the notice you are applying to.',
    tabPhoto: 'Photo (ID)',
    tabSignature: 'Signature',
    presetPhoto3545: '35 × 45 mm photo (300 DPI)',
    presetSquare: 'Square',
    presetPortrait: 'Portrait 3:4',
    presetSquareLarge: 'Square, large',
    presetSigStrip: 'Signature strip',
    presetSig31: 'Signature 3:1',
    presetSig31Large: 'Signature 3:1, large',
    presetCustom: 'Custom size',
    presetPx: '{w} × {h} px',
    resultTitle: 'Result (after resize)',
    resultEmpty: 'Choose an image and select Prepare image to see the result here.',
    sizeTile: 'Size',
    copyDetails: 'Copy details',
    usesTitle: 'Common use cases',
    use1: 'Prepare photos for job applications.',
    use2: 'Resize photos for ID cards, passports or visas.',
    use3: 'Make your signature the required size.',
    use4: 'Reduce file size to meet upload limits.',
    use5: 'Use in online forms and registrations.',
    tipsTitle: 'Tips for best results',
    tip1: 'Use a clear, well-lit photo with a plain background.',
    tip2: 'Keep your face centred, filling most of the frame.',
    tip3: 'For signatures, use a clean, dark signature on a light background.',
    tip4: 'Try PNG for sharp quality or JPEG for a smaller file size.',
    f1Title: 'High quality',
    f1Text: 'Keep your image clear and sharp; it is never stretched.',
    f2Title: 'Exact size',
    f2Text: 'Set the exact width and height in pixels.',
    f3Title: 'Small file size',
    f3Text: 'Reduce size to meet upload requirements.',
    f4Title: '100% private',
    f4Text: 'Everything happens in your browser.',
    width: 'Width (px)',
    height: 'Height (px)',
    fit: 'When the proportions differ',
    fitCrop: 'Crop to fill (centred; edges are cut off)',
    fitPad: 'Fit the whole image (white space is added)',
    limit: 'Maximum file size (optional)',
    limitHint:
      'Leave empty for no limit (e.g. 200 KB or 1 MB). For JPEG and WebP the highest quality that fits is used (at most 8 attempts). 1 KB = 1,024 bytes.',
    planSame: 'Output: {w} × {h} px {f}. The proportions match, so nothing is cut off or added.',
    planCrop: 'Output: {w} × {h} px {f}. About {p}% of the image will be cut off at the {where}.',
    planPad:
      'Output: {w} × {h} px {f}. White space (about {p}% of the output) will be added at the {where}.',
    sides: 'left and right',
    topBottom: 'top and bottom',
    enlargeNote:
      'The image will be enlarged. Enlarging cannot add detail, so it may look soft or blurry.',
    pngLimitNote:
      'PNG has no quality setting, so a file-size limit cannot be met by lowering quality. Choose JPEG for photos.',
    prepare: 'Prepare image',
    preparing: 'Preparing…',
    searching: 'Trying qualities to fit the size limit…',
    done: 'Done. The image is ready to download.',
    doneOver: 'Done, but the file is larger than the limit you set.',
    resultAlt: 'Preview of the prepared image',
    download: 'Download image',
    downloadAria: 'Download image ({name})',
    fileSize: 'File size',
    limitRow: 'Size limit',
    limitNone: 'No limit set',
    limitOk: 'Within the limit ({t})',
    limitOver: 'Over the limit ({t})',
    quality: 'Quality used',
    qualityValue: '{n}%',
    qualityNotUsed: 'Not used (PNG is lossless)',
    fitRow: 'Fit',
    fitNone: 'Proportions matched; nothing cut off or added',
    fitCropped: 'Cropped: about {p}% cut off at the {where}',
    fitPadded: 'Padded: white space added at the {where} (about {p}% of the output)',
    overLimitLossy:
      'The {t} limit could not be met even at the lowest quality ({q}%). The smallest result is {s}. Try smaller dimensions or check whether the notice allows another format.',
    overLimitPng:
      'The PNG file is {s}, over the {t} limit. PNG cannot be made smaller with a quality setting; choose JPEG or smaller dimensions.',
    lossyNote:
      'JPEG and WebP are lossy: resizing and saving lose some detail, more at lower quality.',
    pngNote: 'PNG is lossless, but its files are usually much larger than JPEG for photos.',
    padNote: 'Empty space and any transparent areas were filled with white.',
    'dim-invalid': 'Enter a whole number of pixels.',
    'dim-too-small': 'Must be at least 1 pixel.',
    'dim-side-too-large': 'Each side can be at most 8,192 pixels.',
    'dim-area-too-large':
      'The output can have at most 16.7 megapixels (for example 4,096 × 4,096 pixels).',
    't-invalid': 'Enter a size in KB or MB, for example 100 or 60, or leave it empty.',
    't-too-small': 'The limit must be at least 1 KB.',
    't-too-large': 'The limit can be at most 25,600 KB (25 MB).',
    'err-format': 'This browser cannot save {f} images. Choose another format.',
    notesTitle: 'Privacy, sizes and limits',
    n1: 'Your photo and signature never leave this device. They are processed by your browser; nothing is uploaded, sent to any service or saved.',
    n2: 'The quick presets are common sizes, not the rules of any recruiter, passport or visa office. Rules differ and change, so check the exact pixel size, file-size limit and format in the official notice you are applying to.',
    n3: 'Sizes are in pixels. Print size in centimetres or inches depends on DPI, which this tool does not set. The image is never stretched: it is either cropped (centred) or fitted with white space. To choose which part to keep, crop it first with the Image Cropper.',
    n4: 'The saved file has no metadata (camera details, GPS location). Limits: input up to 25 MB and 50 megapixels; output up to 8,192 pixels per side and 16.7 megapixels. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    uploadTitle: 'আপলোড ও প্রিভিউ',
    controls: 'ফলাফলের সেটিংস',
    sizeHint:
      'অফিশিয়াল বিজ্ঞপ্তি দেখে সঠিক মাপ পিক্সেলে (px) লিখুন এবং অন্য অপশন বেছে নিন। নিয়ম প্রতিষ্ঠানভেদে আলাদা এবং সময়ের সাথে বদলায়।',
    keepRatio: 'অনুপাত ঠিক রাখুন',
    keepRatioHint: 'মূল ছবির অনুপাত বজায় থাকবে',
    increase: '{f} বাড়ান',
    decrease: '{f} কমান',
    widthWord: 'প্রস্থ',
    heightWord: 'উচ্চতা',
    unit: 'সাইজের একক',
    jpegOption: 'JPEG (ছোট ফাইল)',
    pngOption: 'PNG (লসলেস)',
    formatInfo:
      'PNG সব খুঁটিনাটি রাখে কিন্তু ফাইল বড় হয়। JPEG ও WebP-এ ফাইল ছোট হয় এবং সাইজের সীমায় আনা যায়।',
    needImage: 'আগে একটি ছবি বেছে নিন।',
    presetsTitle: 'দ্রুত প্রিসেট',
    presetsSub: 'এক ক্লিকে প্রচলিত একটি মাপ বেছে নিন।',
    presetsNote:
      'এগুলো প্রচলিত মাপ, অফিশিয়াল নিয়ম নয়। যে বিজ্ঞপ্তিতে আবেদন করছেন তা অবশ্যই দেখে নিন।',
    tabPhoto: 'ছবি (আইডি)',
    tabSignature: 'স্বাক্ষর',
    presetPhoto3545: '৩৫ × ৪৫ মিমি ছবি (৩০০ DPI)',
    presetSquare: 'বর্গাকার',
    presetPortrait: 'লম্বালম্বি ৩:৪',
    presetSquareLarge: 'বর্গাকার, বড়',
    presetSigStrip: 'স্বাক্ষরের ফালি',
    presetSig31: 'স্বাক্ষর ৩:১',
    presetSig31Large: 'স্বাক্ষর ৩:১, বড়',
    presetCustom: 'নিজের মাপ',
    presetPx: '{w} × {h} পিক্সেল',
    resultTitle: 'ফলাফল (রিসাইজের পরে)',
    resultEmpty: 'একটি ছবি বেছে “ছবি তৈরি করুন” চাপলে ফলাফল এখানে দেখা যাবে।',
    sizeTile: 'মাপ',
    copyDetails: 'বিস্তারিত কপি করুন',
    usesTitle: 'সাধারণ ব্যবহার',
    use1: 'চাকরির আবেদনের ছবি তৈরি।',
    use2: 'আইডি কার্ড, পাসপোর্ট বা ভিসার জন্য ছবি রিসাইজ।',
    use3: 'স্বাক্ষর প্রয়োজনীয় মাপে আনা।',
    use4: 'আপলোডের সীমায় আনতে ফাইল সাইজ কমানো।',
    use5: 'অনলাইন ফর্ম ও নিবন্ধনে ব্যবহার।',
    tipsTitle: 'ভালো ফলাফলের টিপস',
    tip1: 'সাদামাটা পটভূমিতে পরিষ্কার, ভালো আলোর ছবি ব্যবহার করুন।',
    tip2: 'মুখ মাঝখানে রাখুন, যাতে ফ্রেমের বেশির ভাগ জুড়ে থাকে।',
    tip3: 'স্বাক্ষরের জন্য হালকা পটভূমিতে পরিষ্কার, গাঢ় স্বাক্ষর ব্যবহার করুন।',
    tip4: 'ঝকঝকে মানের জন্য PNG, ছোট ফাইলের জন্য JPEG চেষ্টা করুন।',
    f1Title: 'উচ্চ মান',
    f1Text: 'ছবি পরিষ্কার থাকে; কখনো টেনে লম্বা করা হয় না।',
    f2Title: 'সঠিক মাপ',
    f2Text: 'পিক্সেলে সঠিক প্রস্থ ও উচ্চতা দিন।',
    f3Title: 'ছোট ফাইল',
    f3Text: 'আপলোডের শর্ত মানতে সাইজ কমান।',
    f4Title: '১০০% গোপনীয়',
    f4Text: 'সবকিছু আপনার ব্রাউজারেই হয়।',
    width: 'প্রস্থ (px)',
    height: 'উচ্চতা (px)',
    fit: 'অনুপাত না মিললে',
    fitCrop: 'কেটে পূর্ণ করুন (মাঝখান থেকে; কিনারা বাদ যায়)',
    fitPad: 'পুরো ছবি রাখুন (সাদা জায়গা যোগ হয়)',
    limit: 'সর্বোচ্চ ফাইল সাইজ (ঐচ্ছিক)',
    limitHint:
      'কোনো সীমা না চাইলে খালি রাখুন (যেমন ২০০ KB বা ১ MB)। JPEG ও WebP-এ সীমার মধ্যে থাকা সর্বোচ্চ মান ব্যবহার হয় (সর্বোচ্চ ৮ বার চেষ্টা)। ১ KB = ১,০২৪ বাইট।',
    planSame: 'ফলাফল: {w} × {h} px {f}। অনুপাত মিলে গেছে, তাই কিছু কাটা বা যোগ হবে না।',
    planCrop: 'ফলাফল: {w} × {h} px {f}। ছবির প্রায় {p}% {where} থেকে কাটা যাবে।',
    planPad: 'ফলাফল: {w} × {h} px {f}। {where} সাদা জায়গা (ফলাফলের প্রায় {p}%) যোগ হবে।',
    sides: 'বাম ও ডান দিকে',
    topBottom: 'উপরে ও নিচে',
    enlargeNote: 'ছবিটি বড় করা হবে। বড় করলে নতুন খুঁটিনাটি যোগ হয় না, তাই ঝাপসা দেখাতে পারে।',
    pngLimitNote:
      'PNG-এর কোনো মান সেটিং নেই, তাই মান কমিয়ে ফাইল সাইজের সীমা পূরণ করা যায় না। ছবির জন্য JPEG বেছে নিন।',
    prepare: 'ছবি তৈরি করুন',
    preparing: 'তৈরি হচ্ছে…',
    searching: 'সাইজের সীমায় আনতে বিভিন্ন মান চেষ্টা করা হচ্ছে…',
    done: 'সম্পন্ন। ছবি ডাউনলোডের জন্য প্রস্তুত।',
    doneOver: 'সম্পন্ন, তবে ফাইলটি আপনার দেওয়া সীমার চেয়ে বড়।',
    resultAlt: 'তৈরি করা ছবির প্রিভিউ',
    download: 'ছবি ডাউনলোড করুন',
    downloadAria: 'ছবি ডাউনলোড করুন ({name})',
    fileSize: 'ফাইল সাইজ',
    limitRow: 'সাইজের সীমা',
    limitNone: 'কোনো সীমা দেওয়া হয়নি',
    limitOk: 'সীমার মধ্যে ({t})',
    limitOver: 'সীমার বেশি ({t})',
    quality: 'ব্যবহৃত মান',
    qualityValue: '{n}%',
    qualityNotUsed: 'ব্যবহৃত হয়নি (PNG লসলেস)',
    fitRow: 'মানানো',
    fitNone: 'অনুপাত মিলেছে; কিছু কাটা বা যোগ হয়নি',
    fitCropped: 'কাটা হয়েছে: {where} থেকে প্রায় {p}%',
    fitPadded: 'সাদা জায়গা যোগ হয়েছে: {where} (ফলাফলের প্রায় {p}%)',
    overLimitLossy:
      'সর্বনিম্ন মানেও ({q}%) {t} সীমা পূরণ করা যায়নি। সবচেয়ে ছোট ফলাফল {s}। ছোট মাপ চেষ্টা করুন, অথবা বিজ্ঞপ্তিতে অন্য ফরম্যাট গ্রহণযোগ্য কি না দেখুন।',
    overLimitPng:
      'PNG ফাইলটি {s}, যা {t} সীমার বেশি। মান সেটিং দিয়ে PNG ছোট করা যায় না; JPEG বা ছোট মাপ বেছে নিন।',
    lossyNote: 'JPEG ও WebP লসি: রিসাইজ ও সংরক্ষণে কিছু খুঁটিনাটি হারায়, মান কম হলে বেশি।',
    pngNote: 'PNG লসলেস, তবে ছবির ক্ষেত্রে এর ফাইল সাধারণত JPEG-এর চেয়ে অনেক বড়।',
    padNote: 'ফাঁকা জায়গা ও স্বচ্ছ অংশ সাদা দিয়ে পূরণ করা হয়েছে।',
    'dim-invalid': 'পিক্সেলের একটি পূর্ণসংখ্যা লিখুন।',
    'dim-too-small': 'কমপক্ষে ১ পিক্সেল হতে হবে।',
    'dim-side-too-large': 'প্রতিটি দিক সর্বোচ্চ ৮,১৯২ পিক্সেল হতে পারে।',
    'dim-area-too-large': 'ফলাফল সর্বোচ্চ ১৬.৭ মেগাপিক্সেল হতে পারে (যেমন ৪,০৯৬ × ৪,০৯৬ পিক্সেল)।',
    't-invalid': 'KB বা MB-তে একটি সাইজ লিখুন, যেমন ১০০ বা ৬০, অথবা খালি রাখুন।',
    't-too-small': 'সীমা কমপক্ষে ১ KB হতে হবে।',
    't-too-large': 'সীমা সর্বোচ্চ ২৫,৬০০ KB (২৫ MB) হতে পারে।',
    'err-format': 'এই ব্রাউজার {f} ছবি সংরক্ষণ করতে পারে না। অন্য ফরম্যাট বেছে নিন।',
    notesTitle: 'গোপনীয়তা, মাপ ও সীমা',
    n1: 'আপনার ছবি ও স্বাক্ষর এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই প্রসেস হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'দ্রুত প্রিসেটগুলো প্রচলিত মাপ, কোনো নিয়োগকারী, পাসপোর্ট বা ভিসা অফিসের নিয়ম নয়। নিয়ম আলাদা ও পরিবর্তনশীল, তাই যে অফিশিয়াল বিজ্ঞপ্তিতে আবেদন করছেন সেখানে সঠিক পিক্সেল মাপ, ফাইল সাইজের সীমা ও ফরম্যাট দেখে নিন।',
    n3: 'মাপ পিক্সেলে। সেন্টিমিটার বা ইঞ্চিতে প্রিন্টের মাপ DPI-এর উপর নির্ভর করে, যা এই টুল নির্ধারণ করে না। ছবি কখনো টেনে লম্বা বা চাপা করা হয় না: হয় মাঝখান থেকে কাটা হয়, নয়তো সাদা জায়গা যোগ করে মানানো হয়। কোন অংশ রাখবেন তা বেছে নিতে আগে ছবি ক্রপার দিয়ে ক্রপ করুন।',
    n4: 'সংরক্ষিত ফাইলে কোনো মেটাডেটা (ক্যামেরার তথ্য, GPS অবস্থান) থাকে না। সীমা: ইনপুট সর্বোচ্চ ২৫ MB ও ৫০ মেগাপিক্সেল; ফলাফল প্রতি দিকে সর্বোচ্চ ৮,১৯২ পিক্সেল ও ১৬.৭ মেগাপিক্সেল। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

interface StoredResult extends EncodedImage {
  size: Size;
  fit: FitMode;
  /** Quality used (percent), or null for PNG. */
  quality: number | null;
  limitBytes: number | null;
  filledTransparency: boolean;
}

const FIT_MODES = ['crop', 'pad'] as const;

type Key = Parameters<ReturnType<typeof S>>[0];

/**
 * Quick presets: common pixel sizes named by their shape, never by an organisation (no
 * recruiter, passport or visa rule is claimed; see docs/TOOLS.md). 413 × 531 px is
 * 35 × 45 mm at 300 DPI.
 */
const PRESETS: Record<
  'photo' | 'signature',
  Array<{ id: string; label: Key; w: number; h: number }>
> = {
  photo: [
    { id: 'photo-35x45', label: 'presetPhoto3545', w: 413, h: 531 },
    { id: 'square-300', label: 'presetSquare', w: 300, h: 300 },
    { id: 'portrait-300x400', label: 'presetPortrait', w: 300, h: 400 },
    { id: 'square-600', label: 'presetSquareLarge', w: 600, h: 600 },
  ],
  signature: [
    { id: 'sig-300x80', label: 'presetSigStrip', w: 300, h: 80 },
    { id: 'sig-300x100', label: 'presetSig31', w: 300, h: 100 },
    { id: 'sig-600x200', label: 'presetSig31Large', w: 600, h: 200 },
  ],
};
const TABS = ['photo', 'signature'] as const;
type Tab = (typeof TABS)[number];

/** Parse a limit in MB (Bangla or English digits, up to 2 decimals) into a KB string. */
function mbToKbText(text: string): string {
  const t = toEnglishDigits(text.trim());
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return 'x';
  return String(Math.round(Number(t) * 1024 * 10) / 10);
}

export const photoResizer: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, plain, bytes: bytesText, dims } = imageFormatters(ctx);
  const digits = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
  const pct = (n: number): string => digits(n.toFixed(1));

  let outputUrl: string | null = null;
  let busy = false;

  // ---------- Input ----------
  const input = imageInput(ctx, {
    id: 'photo',
    preview: true,
    showName: true,
    showcase: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      if (keep.checked) syncRatio('width');
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      for (const k of ['width', 'height', 'fit', 'format', 'limit', 'unit', 'keep', 'tab'])
        delete ctx.memo[k];
      width.control.value = height.control.value = limit.control.value = '';
      formatSelect.control.value = 'jpeg';
      unitSelect.value = 'kb';
      keep.checked = false;
      for (const r of fitRadios) r.checked = r.value === 'crop';
      for (const f of [width, height, limit]) f.setError(null);
      selectTab('photo');
      update();
    },
  });
  const loaded = (): LoadedImage | null => input.current();

  // ---------- Size fields with steppers ----------
  const sizeHint = h('p', { class: 'pr-card-sub', id: 'photo-size-hint' }, L('sizeHint'));
  const width = field(
    L('width'),
    textInput({ id: 'photo-width', inputmode: 'numeric', required: '' }),
  );
  const height = field(
    L('height'),
    textInput({ id: 'photo-height', inputmode: 'numeric', required: '' }),
  );
  for (const f of [width, height]) {
    f.control.setAttribute(
      'aria-describedby',
      `photo-size-hint ${f.control.getAttribute('aria-describedby') ?? ''}`.trim(),
    );
  }
  bindMemo(width.control, ctx.memo, 'width');
  bindMemo(height.control, ctx.memo, 'height');

  const steppers: HTMLButtonElement[] = [];
  /** Add 1 px up/down buttons (the arrow keys do the same inside the field). */
  function stepper(f: typeof width, word: 'widthWord' | 'heightWord'): void {
    const step = (delta: number): void => {
      const current = parseDimension(f.control.value) ?? 0;
      const next = Math.min(IMAGE_LIMITS.maxSide, Math.max(1, current + delta));
      f.control.value = plain(next);
      f.control.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const btn = (dir: 1 | -1): HTMLButtonElement => {
      const b = h(
        'button',
        {
          type: 'button',
          class: 'pr-step',
          tabindex: '-1',
          'aria-hidden': 'true',
          title: L(dir > 0 ? 'increase' : 'decrease', { f: L(word) }),
        },
        h('span', { class: dir > 0 ? 'pr-step-up' : 'pr-step-down' }),
      );
      b.addEventListener('click', () => step(dir));
      steppers.push(b);
      return b;
    };
    f.control.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        step(e.key === 'ArrowUp' ? 1 : -1);
      }
    });
    const wrap = h('div', { class: 'pr-num' });
    f.control.replaceWith(wrap);
    wrap.append(f.control, h('div', { class: 'pr-steps' }, btn(1), btn(-1)));
  }
  stepper(width, 'widthWord');
  stepper(height, 'heightWord');

  // ---------- Maintain aspect ratio ----------
  const keep = h('input', {
    type: 'checkbox',
    role: 'switch',
    id: 'photo-keep-ratio',
    class: 'pr-switch-input',
    'aria-describedby': 'photo-keep-ratio-hint',
  });
  bindMemo(keep, ctx.memo, 'keep', '0');
  const lockMark = h('span', { class: 'pr-lock', 'aria-hidden': 'true' }, icon('lock', 18));
  const keepEl = h(
    'div',
    { class: 'pr-switch' },
    keep,
    h(
      'label',
      { for: keep.id },
      h('span', { class: 'pr-switch-track', 'aria-hidden': 'true' }),
      h(
        'span',
        { class: 'pr-switch-text' },
        h('strong', {}, L('keepRatio')),
        h('span', { id: 'photo-keep-ratio-hint' }, L('keepRatioHint')),
      ),
    ),
  );
  /** With the ratio kept, the other side follows the original image's proportions. */
  function syncRatio(from: 'width' | 'height'): void {
    const image = loaded();
    if (!keep.checked || !image) return;
    const { width: sw, height: sh } = image.decoded;
    const src = from === 'width' ? width : height;
    const dst = from === 'width' ? height : width;
    const v = parseDimension(src.control.value);
    if (v === null) return;
    const other = Math.max(1, Math.round(from === 'width' ? (v * sh) / sw : (v * sw) / sh));
    dst.control.value = plain(other);
    ctx.memo[from === 'width' ? 'height' : 'width'] = dst.control.value;
  }

  // ---------- Fit ----------
  const savedFit: FitMode = ctx.memo.fit === 'pad' ? 'pad' : 'crop';
  const fitRadios = FIT_MODES.map((value) => {
    const r = h('input', {
      type: 'radio',
      name: 'photo-fit',
      id: `photo-fit-${value}`,
      value,
      class: 'check-input',
    });
    r.checked = savedFit === value;
    r.addEventListener('change', () => {
      ctx.memo.fit = value;
      update();
    });
    return r;
  });
  const fitGroup = h(
    'fieldset',
    { class: 'radio-group pr-fit' },
    h('legend', { class: 'field-label' }, L('fit')),
    ...fitRadios.map((r) =>
      h(
        'div',
        { class: 'check' },
        r,
        h('label', { for: r.id }, L(r.value === 'crop' ? 'fitCrop' : 'fitPad')),
      ),
    ),
  );
  const fit = (): FitMode => (fitRadios[1]?.checked ? 'pad' : 'crop');

  // ---------- Format and limit ----------
  const formatSelect = formatField(ctx, 'photo-format', ['jpeg', 'png', 'webp'], {
    includeSame: false,
  });
  for (const opt of formatSelect.control.querySelectorAll('option')) {
    if (opt.disabled) continue;
    if (opt.value === 'jpeg') opt.textContent = L('jpegOption');
    if (opt.value === 'png') opt.textContent = L('pngOption');
  }
  bindMemo(formatSelect.control, ctx.memo, 'format', 'jpeg');
  if (formatSelect.control.selectedOptions[0]?.disabled) formatSelect.control.value = 'jpeg';

  const limit = field(L('limit'), textInput({ id: 'photo-limit', inputmode: 'decimal' }), {
    hint: L('limitHint'),
  });
  bindMemo(limit.control, ctx.memo, 'limit');
  const unitSelect = select(
    [
      ['kb', 'KB'],
      ['mb', 'MB'],
    ],
    { id: 'photo-limit-unit', class: 'input pr-unit', 'aria-label': L('unit') },
  );
  bindMemo(unitSelect, ctx.memo, 'unit', 'kb');
  const limitWrap = h('div', { class: 'pr-limit' });
  limit.control.replaceWith(limitWrap);
  limitWrap.append(limit.control, unitSelect);

  const plan = h('p', { class: 'photo-plan', id: 'photo-plan', 'aria-live': 'polite' });
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const submit = h(
    'button',
    { type: 'submit', class: 'btn btn-primary pr-prepare', id: 'photo-submit' },
    icon('image', 20),
    L('prepare'),
    icon('arrow-right', 18),
  );
  const form = h(
    'form',
    {
      class: 'tool-form image-controls photo-controls pr-card pr-settings',
      'aria-labelledby': 'photo-controls-title',
    },
    stepHead('2', 'photo-controls-title', L('controls'), sizeHint),
    h('div', { class: 'pr-size-row' }, width.el, lockMark, height.el, keepEl),
    h('div', { class: 'pr-options' }, fitGroup, formatSelect.el, limit.el),
    plan,
    warnings,
    h('p', { class: 'pr-info' }, icon('info', 18), h('span', {}, L('formatInfo'))),
    h('div', { class: 'form-actions' }, submit),
  );
  form.noValidate = true;

  // ---------- Quick presets ----------
  let tab: Tab = ctx.memo.tab === 'signature' ? 'signature' : 'photo';
  const presetRadios: HTMLInputElement[] = [];
  const presetRow = (id: string, label: string, size: string | null): HTMLElement => {
    const r = h('input', {
      type: 'radio',
      name: 'photo-preset',
      id: `photo-preset-${id}`,
      value: id,
      class: 'pr-preset-input',
    });
    presetRadios.push(r);
    r.addEventListener('change', () => applyPreset(id));
    return h(
      'li',
      {},
      r,
      h(
        'label',
        { for: r.id, class: 'pr-preset' },
        h('span', { class: 'pr-preset-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'pr-preset-name' }, label),
        size
          ? h('span', { class: 'pr-preset-size' }, size)
          : h('span', { class: 'pr-preset-edit', 'aria-hidden': 'true' }, icon('pen', 16)),
      ),
    );
  };
  const tabButtons = new Map<Tab, HTMLButtonElement>();
  const tabPanels = new Map<Tab, HTMLElement>();
  for (const t of TABS) {
    const b = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `photo-tab-${t}`,
        class: 'pr-tab',
        'aria-controls': `photo-tabpanel-${t}`,
      },
      icon(t === 'photo' ? 'portrait' : 'pen', 18),
      L(t === 'photo' ? 'tabPhoto' : 'tabSignature'),
    );
    b.addEventListener('click', () => selectTab(t, true));
    b.addEventListener('keydown', (e) => {
      const i = TABS.indexOf(t);
      const next =
        e.key === 'ArrowRight' || e.key === 'ArrowLeft'
          ? TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]!
          : e.key === 'Home'
            ? TABS[0]
            : e.key === 'End'
              ? TABS[TABS.length - 1]!
              : null;
      if (!next) return;
      e.preventDefault();
      selectTab(next, true);
      tabButtons.get(next)?.focus();
    });
    tabButtons.set(t, b);
    tabPanels.set(
      t,
      h(
        'div',
        {
          role: 'tabpanel',
          id: `photo-tabpanel-${t}`,
          class: 'pr-tabpanel',
          'aria-labelledby': b.id,
        },
        h(
          'fieldset',
          { class: 'pr-preset-group' },
          h('legend', { class: 'sr-only' }, L(t === 'photo' ? 'tabPhoto' : 'tabSignature')),
          h(
            'ul',
            { class: 'pr-preset-list', role: 'list' },
            ...PRESETS[t].map((p) =>
              presetRow(p.id, L(p.label), L('presetPx', { w: num(p.w), h: num(p.h) })),
            ),
            presetRow(`custom-${t}`, L('presetCustom'), null),
          ),
        ),
      ),
    );
  }
  function selectTab(t: Tab, remember = false): void {
    tab = t;
    if (remember) ctx.memo.tab = t;
    for (const [k, b] of tabButtons) {
      const on = k === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      tabPanels.get(k)!.hidden = !on;
    }
  }
  function applyPreset(id: string): void {
    if (id.startsWith('custom-')) {
      width.control.focus();
      return;
    }
    const p = PRESETS[tab].find((x) => x.id === id);
    if (!p) return;
    width.control.value = plain(p.w);
    height.control.value = plain(p.h);
    ctx.memo.width = width.control.value;
    ctx.memo.height = height.control.value;
    for (const f of [width, height]) f.setError(null);
    update();
  }
  /** Mark the preset that matches the typed size (or Custom size). */
  function syncPreset(): void {
    const w = parseDimension(width.control.value);
    const hgt = parseDimension(height.control.value);
    let match: string | null = null;
    let matchTab: Tab = tab;
    if (w !== null && hgt !== null) {
      for (const t of [tab, ...TABS.filter((x) => x !== tab)]) {
        const p = PRESETS[t].find((x) => x.w === w && x.h === hgt);
        if (p) {
          match = p.id;
          matchTab = t;
          break;
        }
      }
      match ??= `custom-${tab}`;
    }
    if (matchTab !== tab) selectTab(matchTab);
    for (const r of presetRadios) r.checked = r.value === match;
  }
  const presets = h(
    'section',
    { class: 'pr-card pr-presets', 'aria-labelledby': 'photo-presets-title' },
    h(
      'div',
      { class: 'pr-card-head' },
      h('span', { class: 'pr-head-icon pr-tone-amber', 'aria-hidden': 'true' }, icon('bolt', 22)),
      h(
        'div',
        {},
        h('h2', { id: 'photo-presets-title', class: 'pr-card-title' }, L('presetsTitle')),
        h('p', { class: 'pr-card-sub' }, L('presetsSub')),
      ),
    ),
    h(
      'div',
      { class: 'pr-tabs', role: 'tablist', 'aria-label': L('presetsTitle') },
      ...tabButtons.values(),
    ),
    ...tabPanels.values(),
    h('p', { class: 'pr-presets-note' }, L('presetsNote')),
  );
  selectTab(tab);

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('resultAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary pr-download', id: 'photo-download' },
    icon('download', 18),
    L('download'),
  );
  const copyBtn = h(
    'button',
    { type: 'button', class: 'btn pr-copy' },
    icon('copy', 18),
    L('copyDetails'),
  );
  const tiles = h('dl', { class: 'pr-tiles' });
  const outputHead = h(
    'div',
    { class: 'image-output pr-output', hidden: '' },
    h('div', { class: 'pr-output-main' }, h('div', { class: 'image-frame' }, outputImg), tiles),
    h('div', { class: 'form-actions' }, downloadLink, copyBtn),
  );
  const panel = resultPanel(ctx, L('prepare'), { prepend: outputHead });
  panel.el.classList.add('pr-card', 'pr-result');
  panel.el
    .querySelector('.result-title')
    ?.replaceWith(
      h(
        'div',
        { class: 'pr-result-head' },
        h(
          'span',
          { class: 'pr-head-icon pr-head-check', 'aria-hidden': 'true' },
          icon('check', 20),
        ),
        h('h2', { class: 'pr-card-title', id: 'photo-result-title' }, L('resultTitle')),
      ),
    );
  panel.el.removeAttribute('aria-label');
  panel.el.setAttribute('aria-labelledby', 'photo-result-title');
  const emptyResult = (): void => {
    panel.clear();
    panel.el.querySelector('.result-empty')?.replaceChildren(L('resultEmpty'));
  };
  copyBtn.addEventListener('click', async () => {
    const status = panel.el.querySelector('.copy-status');
    const ok = await copyText(panel.text());
    if (status) status.textContent = ctx.t(ok ? 'copied' : 'copyFailed');
  });

  // ---------- Helpers ----------
  const format = (): ImageFormat => formatSelect.control.value as ImageFormat;
  const where = (axis: 'sides' | 'top-bottom'): string =>
    L(axis === 'sides' ? 'sides' : 'topBottom');

  /** Explain what will happen with the current settings (never changes them). */
  function update(): void {
    lockMark.classList.toggle('is-on', keep.checked);
    syncPreset();
    plan.textContent = '';
    warnings.replaceChildren();
    const image = loaded();
    if (!image) return;
    const items: string[] = [];
    const out = format();
    if (transparencyRisk(image.format, out)) items.push(I('transparencyWarning'));
    if (!usesQuality(out) && limit.control.value.trim()) items.push(L('pngLimitNote'));
    const w = parseDimension(width.control.value);
    const hgt = parseDimension(height.control.value);
    if (w && hgt && validateDimensions(w, hgt).ok) {
      const target = { width: w, height: hgt };
      const d = describeFit(image.decoded, target, fit());
      const vars = { w: num(w), h: num(hgt), f: FORMATS[out].label, p: pct(d.percent) };
      plan.textContent =
        d.axis === 'none'
          ? L('planSame', vars)
          : L(fit() === 'crop' ? 'planCrop' : 'planPad', { ...vars, where: where(d.axis) });
      if (d.enlarged) items.push(L('enlargeNote'));
    }
    for (const text of items) warnings.append(h('li', {}, icon('alert', 16), text));
  }

  function clearOutput(): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    outputImg.removeAttribute('src');
    downloadLink.removeAttribute('href');
    outputHead.hidden = true;
    emptyResult();
    ctx.session.delete('result');
  }

  function setBusy(on: boolean): void {
    busy = on;
    submit.disabled = on;
    for (const el of [
      width.control,
      height.control,
      formatSelect.control,
      limit.control,
      unitSelect,
      keep,
      ...fitRadios,
      ...presetRadios,
      ...steppers,
    ])
      el.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function tile(iconName: 'expand' | 'database' | 'image', label: string, value: string) {
    return h(
      'div',
      { class: 'pr-tile' },
      h('span', { class: 'pr-tile-icon', 'aria-hidden': 'true' }, icon(iconName, 20)),
      h('dt', {}, label),
      h('dd', {}, value),
    );
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = outputFilename(image.file.name, r.size, r.format);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    tiles.replaceChildren(
      tile('expand', L('sizeTile'), dims(r.size)),
      tile('database', L('fileSize'), bytesText(r.blob.size)),
      tile('image', I('format'), FORMATS[r.format].label),
    );
    outputHead.hidden = false;
    const d = describeFit(image.decoded, r.size, r.fit);
    const fitText =
      d.axis === 'none'
        ? L('fitNone')
        : L(r.fit === 'crop' ? 'fitCropped' : 'fitPadded', {
            p: pct(d.percent),
            where: where(d.axis),
          });
    const t = r.limitBytes === null ? '' : bytesText(r.limitBytes);
    const extra: string[] = [];
    if (r.filledTransparency) extra.push(I('filledNote'));
    if (r.fit === 'pad') extra.push(L('padNote'));
    if (d.enlarged) extra.push(L('enlargeNote'));
    extra.push(usesQuality(r.format) ? L('lossyNote') : L('pngNote'));
    panel.show(
      [
        { label: I('dimensions'), value: dims(r.size), primary: true },
        { label: I('format'), value: FORMATS[r.format].label },
        { label: L('fileSize'), value: bytesText(r.blob.size) },
        {
          label: L('limitRow'),
          value:
            r.limitBytes === null
              ? L('limitNone')
              : withinLimit(r.blob.size, r.limitBytes)
                ? L('limitOk', { t })
                : L('limitOver', { t }),
        },
        {
          label: L('quality'),
          value:
            r.quality === null ? L('qualityNotUsed') : L('qualityValue', { n: num(r.quality) }),
        },
        { label: L('fitRow'), value: fitText },
      ],
      extra,
    );
  }

  // ---------- Events ----------
  width.control.addEventListener('input', () => {
    syncRatio('width');
    update();
  });
  height.control.addEventListener('input', () => {
    syncRatio('height');
    update();
  });
  keep.addEventListener('change', () => {
    syncRatio(parseDimension(width.control.value) !== null ? 'width' : 'height');
    update();
  });
  for (const c of [limit.control, unitSelect])
    c.addEventListener(c === unitSelect ? 'change' : 'input', () => {
      limit.setError(null);
      update();
    });
  formatSelect.control.addEventListener('change', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void prepare();
  });

  async function prepare(): Promise<void> {
    if (busy) return;
    const source = loaded();
    if (!source) {
      input.showError(L('needImage'));
      input.fileInput.focus();
      return;
    }
    input.showError(null);
    for (const f of [width, height, limit]) f.setError(null);

    const w = parseDimension(width.control.value);
    const hgt = parseDimension(height.control.value);
    if (w === null || hgt === null) {
      if (w === null) width.setError(L('dim-invalid'));
      if (hgt === null) height.setError(L('dim-invalid'));
      (w === null ? width : height).control.focus();
      return;
    }
    const valid = validateDimensions(w, hgt);
    if (!valid.ok) {
      // Show the error on the side that breaks the rule (the area rule concerns both).
      const heightBad =
        (valid.error === 'too-small' && w >= 1) ||
        (valid.error === 'side-too-large' && w <= IMAGE_LIMITS.maxSide);
      const bad = heightBad ? height : width;
      bad.setError(L(`dim-${valid.error}`));
      bad.control.focus();
      return;
    }
    let limitBytes: number | null = null;
    if (limit.control.value.trim()) {
      const text =
        unitSelect.value === 'mb' ? mbToKbText(limit.control.value) : limit.control.value;
      const parsed = parseTargetKB(text);
      if (!parsed.ok) {
        limit.setError(L(`t-${parsed.error}`));
        limit.control.focus();
        return;
      }
      limitBytes = parsed.bytes;
    }
    const requested = format();
    if (!canEncode(requested)) {
      input.showError(L('err-format', { f: FORMATS[requested].label }));
      return;
    }

    const size = valid.value;
    const mode = fit();
    const lossy = usesQuality(requested);
    setBusy(true);
    input.say(L(limitBytes !== null && lossy ? 'searching' : 'preparing'));
    let encoder: ReturnType<typeof openPlacedEncoder> | null = null;
    try {
      encoder = openPlacedEncoder(
        source.decoded.image,
        placeImage(source.decoded, size, mode),
        size,
        requested,
        FORMATS[source.format].alpha,
        mode === 'pad' ? { background: '#ffffff' } : {},
      );
      const enc = encoder;
      const encodeAt = async (q: number): Promise<EncodedImage> => {
        const out = await enc.encode(q / 100);
        // Never offer a file whose real format differs from the one chosen.
        if (out.format !== requested) throw new FormatMismatch();
        return out;
      };
      let out: EncodedImage;
      let quality: number | null;
      if (lossy && limitBytes !== null) {
        const found = await searchQuality(async (q) => {
          const o = await encodeAt(q);
          return { bytes: o.blob.size, value: o };
        }, limitBytes);
        const pick = found.ok ? found.best : found.smallest;
        out = pick.value;
        quality = pick.quality;
      } else {
        quality = lossy ? Math.round(ENCODE_QUALITY * 100) : null;
        out = await encodeAt(quality ?? 100);
      }
      if (input.disposed() || source !== loaded()) return;
      const stored: StoredResult = {
        ...out,
        size,
        fit: mode,
        quality,
        limitBytes,
        filledTransparency: enc.filledTransparency,
      };
      ctx.session.set('result', stored);
      showResult(source, stored);
      const over = !withinLimit(out.blob.size, limitBytes);
      input.say(L(over ? 'doneOver' : 'done'));
      if (over && limitBytes !== null) {
        const vars = {
          t: bytesText(limitBytes),
          s: bytesText(out.blob.size),
          q: num(quality ?? 0),
        };
        input.showError(L(lossy ? 'overLimitLossy' : 'overLimitPng', vars));
      }
      revealOutput();
    } catch (error) {
      if (input.disposed()) return;
      input.say('');
      if (error instanceof FormatMismatch) {
        input.showError(L('err-format', { f: FORMATS[requested].label }));
      } else {
        const code = error instanceof ImageProcessingError ? error.code : 'canvas';
        input.showError(I(`err-${code}`));
      }
    } finally {
      encoder?.close();
      if (!input.disposed()) setBusy(false);
    }
  }

  function revealOutput(): void {
    const box = panel.el.getBoundingClientRect();
    if (box.bottom > window.innerHeight && box.top > window.innerHeight * 0.25) {
      panel.el.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }

  ctx.onCleanup(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
  });

  emptyResult();
  update();
  // Restore after a language switch (the File stays in memory, never in storage).
  input.restore();

  const upload = h(
    'section',
    { class: 'pr-card pr-upload', 'aria-labelledby': 'photo-upload-title' },
    stepHead('1', 'photo-upload-title', L('uploadTitle')),
    input.el,
  );
  const listCard = (cls: string, emoji: string, titleKey: Key, keys: Key[]): HTMLElement =>
    h(
      'section',
      { class: `pr-card pr-list-card ${cls}`, 'aria-labelledby': `photo-${cls}-title` },
      h(
        'div',
        { class: 'pr-card-head' },
        h('span', { class: 'pr-emoji', 'aria-hidden': 'true' }, emoji),
        h('h2', { class: 'pr-card-title', id: `photo-${cls}-title` }, L(titleKey)),
      ),
      h(
        'ul',
        { class: 'pr-checks', role: 'list' },
        ...keys.map((k) => h('li', {}, icon('check', 18), h('span', {}, L(k)))),
      ),
    );
  const features = h(
    'ul',
    { class: 'pr-features', role: 'list' },
    ...(
      [
        ['pr-tone-green', 'image', 'f1Title', 'f1Text'],
        ['pr-tone-blue', 'bolt', 'f2Title', 'f2Text'],
        ['pr-tone-violet', 'gear', 'f3Title', 'f3Text'],
        ['pr-tone-amber', 'shield', 'f4Title', 'f4Text'],
      ] as const
    ).map(([tone, ic, title, text]) =>
      h(
        'li',
        { class: 'pr-feature' },
        h('span', { class: `pr-feature-icon ${tone}`, 'aria-hidden': 'true' }, icon(ic, 26)),
        h('div', {}, h('h3', {}, L(title)), h('p', {}, L(text))),
      ),
    ),
  );

  return h(
    'div',
    { class: 'pr-page image-tool' },
    h(
      'div',
      { class: 'pr-main' },
      h('div', { class: 'pr-col pr-col-main' }, upload, form),
      h(
        'div',
        { class: 'pr-col pr-col-side' },
        presets,
        panel.el,
        listCard('pr-uses', '🎯', 'usesTitle', ['use1', 'use2', 'use3', 'use4', 'use5']),
        listCard('pr-tips', '💡', 'tipsTitle', ['tip1', 'tip2', 'tip3', 'tip4']),
      ),
    ),
    features,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};

/** Numbered step heading of the two main cards. */
function stepHead(n: string, id: string, title: string, sub?: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'pr-card-head' },
    h('span', { class: 'pr-step-num', 'aria-hidden': 'true' }, n),
    h('div', {}, h('h2', { id, class: 'pr-card-title' }, title), sub ?? null),
  );
}

/** The browser produced a different format than requested. */
class FormatMismatch extends Error {}
