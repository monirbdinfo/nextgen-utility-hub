import {
  clampQuality,
  compareSizes,
  compressedFilename,
  formatRatio,
  parseTargetKB,
  QUALITY,
  searchQuality,
  usesQuality,
} from '../../calc/compress';
import { toBanglaDigits } from '../../calc/digits';
import {
  FORMATS,
  resolveOutputFormat,
  transparencyRisk,
  validateDimensions,
  type FormatChoice,
  type ImageFormat,
  type Size,
} from '../../calc/image';
import { defineStrings } from '../../i18n';
import { h, prefersReducedMotion } from '../../lib/dom';
import {
  canEncode,
  ImageProcessingError,
  openEncoder,
  type EncodedImage,
} from '../../lib/imageCanvas';
import { getTool } from '../../registry';
import { toHash } from '../../router/router';
import { icon, type UiIcon } from '../icons';
import { IMG, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import { bindMemo, field, notes, resultPanel, textInput, type ToolView } from './kit';

const S = defineStrings({
  en: {
    controls: 'Compression settings',
    mode: 'Compress by',
    modeQuality: 'Quality',
    modeTarget: 'Target size',
    outputFormat: 'Output format',
    outputFormatInfo: 'Same as original keeps the file type you opened.',
    sameAsOriginal: 'Same as original',
    notSupported: '{f} (not supported)',
    advanced: 'Advanced options',
    needImage: 'Choose an image first.',
    originalLabel: 'Original',
    compressedLabel: 'Compressed',
    compressedPending: 'The compressed image will appear here.',
    originalAlt: 'The original image',
    resultTitle: 'Compression result',
    resultEmpty: 'Choose an image and select “Compress image” to see the result.',
    sizeReduced: 'Size reduced',
    sizeIncreased: 'Size increased',
    compare: 'Compare',
    compareOff: 'Side by side',
    compareSlider: 'Compare: drag to reveal the original',
    downloadOriginal: 'Download original',
    resetAll: 'Reset',
    f1Title: 'Smaller file size',
    f1Text: 'Large photos often become much smaller, with little visible change.',
    f2Title: 'High quality',
    f2Text: 'Keep your images sharp and clear with adjustable quality.',
    f3Title: 'Multiple formats',
    f3Text: 'Supports JPEG, PNG and WebP with flexible output options.',
    f4Title: '100% private',
    f4Text: 'All processing happens in your browser. Your files never leave your device.',
    howTitle: 'How it works?',
    howText:
      'The tool re-encodes your image in your browser at the quality you choose. You can set the quality yourself, or set a target file size and the tool finds the highest quality that fits.',
    usesTitle: 'Common use cases',
    use1: 'Shrink images for websites and blogs',
    use2: 'Reduce file size for email attachments',
    use3: 'Optimize images for online forms',
    use4: 'Save storage space on your device',
    use5: 'Prepare images for social media (faster upload)',
    tipsTitle: 'Useful tips',
    tip1: 'Start with 70–80% quality for a good balance.',
    tip2: 'Use WebP for smaller files in modern browsers.',
    tip3: 'For photos of documents, check that the text is still readable.',
    tip4: 'Use “Target size” if you need a specific file size.',
    relatedTitle: 'Related Tools',
    relatedSub: 'You may also find these tools useful.',
    'rel-image-converter': 'Convert between image formats',
    'rel-image-resizer': 'Resize images to any dimension',
    'rel-image-cropper': 'Crop and get the perfect area',
    'rel-job-photo-resizer': 'Resize photos for forms',
    'rel-pdf-create': 'Create PDF from images',
    quality: 'Quality',
    qualityValue: '{n}%',
    qualityHint:
      'Lower quality gives smaller files with more visible artefacts. A quality setting does not guarantee any particular file size.',
    target: 'Target size (KB)',
    targetHint:
      'Tries qualities from 10% to 100% (at most 8 attempts) and keeps the highest quality that fits. 1 KB = 1,024 bytes. The target cannot always be reached.',
    pngNote:
      'PNG is lossless. Browsers offer no quality or compression-level setting for it, so re-saving a PNG often makes the file larger. Choose JPEG or WebP to reduce the size.',
    compress: 'Compress image',
    compressing: 'Compressing…',
    searching: 'Trying qualities to reach the target…',
    done: 'Done. The compressed image is ready to download.',
    doneLarger:
      'Done, but the result is not smaller than the original. Keeping the original file may be better.',
    compressedAlt: 'Preview of the compressed image',
    download: 'Download compressed image',
    downloadAria: 'Download compressed image ({name})',
    originalSize: 'Original size',
    compressedSize: 'Compressed size',
    change: 'Saving',
    saved: '{b} smaller ({p}%)',
    noChange: 'No change in size',
    larger: '{b} larger ({p}%) — no saving',
    ratio: 'Compression ratio',
    usedQuality: 'Quality used',
    qualityNotUsed: 'Not used (PNG is lossless)',
    targetReached: 'Target of {t} reached at quality {q}%.',
    targetMissed:
      'The target of {t} could not be reached. The smallest result, at the lowest quality ({q}%), is {s} and is shown below. Try WebP, or make the image smaller with the Image Resizer.',
    lossyNote: 'JPEG and WebP are lossy: every re-save loses some detail, even at high quality.',
    'err-format': 'This browser cannot save {f} images. Choose another format in “Save as”.',
    'err-target-png':
      'A target file size needs JPEG or WebP output, because PNG has no quality setting.',
    'err-size':
      'This image is too large to re-encode safely in a browser (more than 8,192 pixels per side or 16.7 megapixels). Make it smaller with the Image Resizer first.',
    't-invalid': 'Enter a size in KB, for example 200 or 150.5.',
    't-too-small': 'The target must be at least 1 KB.',
    't-too-large': 'The target can be at most 25,600 KB (25 MB).',
    notesTitle: 'Privacy, quality and limits',
    n1: 'Your image never leaves this device. It is compressed by your browser; it is not uploaded, sent to any service or saved.',
    n2: 'Quality is not a size guarantee: the same setting gives different sizes for different images. The size shown is the real size of the file you download.',
    n3: 'PNG output is lossless and cannot be made smaller with a quality setting. Re-encoded files do not include the original’s metadata, such as camera details or GPS location.',
    n4: 'Limits: files up to 25 MB; images up to 8,192 pixels per side and 16.7 megapixels can be re-encoded. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    controls: 'কম্প্রেশনের সেটিংস',
    mode: 'কীভাবে কম্প্রেস করবেন',
    modeQuality: 'মান (কোয়ালিটি)',
    modeTarget: 'লক্ষ্য সাইজ',
    outputFormat: 'ফলাফলের ফরম্যাট',
    outputFormatInfo: '“মূলের মতো” বেছে নিলে খোলা ফাইলের ধরনই থাকে।',
    sameAsOriginal: 'মূলের মতো',
    notSupported: '{f} (সমর্থিত নয়)',
    advanced: 'আরও অপশন',
    needImage: 'আগে একটি ছবি বেছে নিন।',
    originalLabel: 'মূল',
    compressedLabel: 'কম্প্রেস করা',
    compressedPending: 'কম্প্রেস করা ছবি এখানে দেখা যাবে।',
    originalAlt: 'মূল ছবি',
    resultTitle: 'কম্প্রেশনের ফলাফল',
    resultEmpty: 'একটি ছবি বেছে “ছবি কম্প্রেস করুন” চাপলে ফলাফল দেখা যাবে।',
    sizeReduced: 'সাইজ কমেছে',
    sizeIncreased: 'সাইজ বেড়েছে',
    compare: 'তুলনা',
    compareOff: 'পাশাপাশি',
    compareSlider: 'তুলনা: মূল ছবি দেখতে টানুন',
    downloadOriginal: 'মূল ছবি ডাউনলোড',
    resetAll: 'রিসেট',
    f1Title: 'ছোট ফাইল',
    f1Text: 'বড় ছবি প্রায়ই অনেক ছোট হয়, চোখে তেমন পার্থক্য বোঝা যায় না।',
    f2Title: 'উচ্চ মান',
    f2Text: 'মান ঠিক করে ছবি পরিষ্কার ও ঝকঝকে রাখুন।',
    f3Title: 'একাধিক ফরম্যাট',
    f3Text: 'JPEG, PNG ও WebP সমর্থিত, ফলাফলের ফরম্যাট বেছে নেওয়া যায়।',
    f4Title: '১০০% গোপনীয়',
    f4Text: 'সব কাজ আপনার ব্রাউজারেই হয়। আপনার ফাইল ডিভাইসের বাইরে যায় না।',
    howTitle: 'কীভাবে কাজ করে?',
    howText:
      'টুলটি আপনার বেছে নেওয়া মানে ব্রাউজারেই ছবিটি নতুন করে এনকোড করে। মান নিজে ঠিক করতে পারেন, অথবা লক্ষ্য ফাইল সাইজ দিলে টুলটি তার মধ্যে থাকা সর্বোচ্চ মান খুঁজে নেয়।',
    usesTitle: 'সাধারণ ব্যবহার',
    use1: 'ওয়েবসাইট ও ব্লগের জন্য ছবি ছোট করা',
    use2: 'ইমেইল সংযুক্তির ফাইল সাইজ কমানো',
    use3: 'অনলাইন ফর্মের জন্য ছবি উপযোগী করা',
    use4: 'ডিভাইসে জায়গা বাঁচানো',
    use5: 'সোশ্যাল মিডিয়ার জন্য ছবি তৈরি (দ্রুত আপলোড)',
    tipsTitle: 'কাজের টিপস',
    tip1: 'ভারসাম্যের জন্য ৭০–৮০% মান দিয়ে শুরু করুন।',
    tip2: 'আধুনিক ব্রাউজারে আরও ছোট ফাইলের জন্য WebP ব্যবহার করুন।',
    tip3: 'কাগজপত্রের ছবিতে লেখা পড়া যাচ্ছে কি না দেখে নিন।',
    tip4: 'নির্দিষ্ট ফাইল সাইজ লাগলে “লক্ষ্য সাইজ” ব্যবহার করুন।',
    relatedTitle: 'সম্পর্কিত টুল',
    relatedSub: 'এই টুলগুলোও কাজে লাগতে পারে।',
    'rel-image-converter': 'ছবির ফরম্যাট বদলান',
    'rel-image-resizer': 'যেকোনো মাপে ছবি রিসাইজ',
    'rel-image-cropper': 'ছবির দরকারি অংশ কাটুন',
    'rel-job-photo-resizer': 'ফর্মের জন্য ছবি রিসাইজ',
    'rel-pdf-create': 'ছবি থেকে PDF তৈরি',
    quality: 'মান (কোয়ালিটি)',
    qualityValue: '{n}%',
    qualityHint:
      'মান কমালে ফাইল ছোট হয়, তবে ছবিতে খুঁত বেশি দেখা যায়। কোনো মান নির্দিষ্ট ফাইল সাইজের নিশ্চয়তা দেয় না।',
    target: 'লক্ষ্য সাইজ (KB)',
    targetHint:
      '১০% থেকে ১০০% পর্যন্ত মান চেষ্টা করে (সর্বোচ্চ ৮ বার) এবং লক্ষ্যের মধ্যে থাকা সর্বোচ্চ মান রাখে। ১ KB = ১,০২৪ বাইট। লক্ষ্য সবসময় পূরণ করা যায় না।',
    pngNote:
      'PNG লসলেস। ব্রাউজারে এর কোনো মান বা কম্প্রেশন-লেভেল সেটিং নেই, তাই PNG আবার সংরক্ষণ করলে ফাইল প্রায়ই বড় হয়। সাইজ কমাতে JPEG বা WebP বেছে নিন।',
    compress: 'ছবি কম্প্রেস করুন',
    compressing: 'কম্প্রেস হচ্ছে…',
    searching: 'লক্ষ্যে পৌঁছাতে বিভিন্ন মান চেষ্টা করা হচ্ছে…',
    done: 'সম্পন্ন। কম্প্রেস করা ছবি ডাউনলোডের জন্য প্রস্তুত।',
    doneLarger: 'সম্পন্ন, তবে ফলাফল মূল ফাইলের চেয়ে ছোট নয়। মূল ফাইলটি রাখাই ভালো হতে পারে।',
    compressedAlt: 'কম্প্রেস করা ছবির প্রিভিউ',
    download: 'কম্প্রেস করা ছবি ডাউনলোড করুন',
    downloadAria: 'কম্প্রেস করা ছবি ডাউনলোড করুন ({name})',
    originalSize: 'মূল সাইজ',
    compressedSize: 'কম্প্রেস করা সাইজ',
    change: 'সাশ্রয়',
    saved: '{b} ছোট ({p}%)',
    noChange: 'সাইজে কোনো পরিবর্তন নেই',
    larger: '{b} বড় ({p}%) — কোনো সাশ্রয় নেই',
    ratio: 'কম্প্রেশন অনুপাত',
    usedQuality: 'ব্যবহৃত মান',
    qualityNotUsed: 'ব্যবহৃত হয়নি (PNG লসলেস)',
    targetReached: '{t} লক্ষ্য পূরণ হয়েছে, মান {q}%।',
    targetMissed:
      '{t} লক্ষ্য পূরণ করা যায়নি। সর্বনিম্ন মানে ({q}%) সবচেয়ে ছোট ফলাফল {s}, যা নিচে দেখানো হলো। WebP চেষ্টা করুন, অথবা ছবি রিসাইজার দিয়ে ছবি ছোট করুন।',
    lossyNote: 'JPEG ও WebP লসি: উচ্চ মানেও প্রতিবার সংরক্ষণে কিছু খুঁটিনাটি হারায়।',
    'err-format':
      'এই ব্রাউজার {f} ছবি সংরক্ষণ করতে পারে না। “যে ফরম্যাটে সংরক্ষণ” থেকে অন্য ফরম্যাট বেছে নিন।',
    'err-target-png': 'লক্ষ্য ফাইল সাইজের জন্য JPEG বা WebP লাগবে, কারণ PNG-এর কোনো মান সেটিং নেই।',
    'err-size':
      'ছবিটি ব্রাউজারে নিরাপদে আবার এনকোড করার জন্য খুব বড় (প্রতি দিকে ৮,১৯২ পিক্সেল বা ১৬.৭ মেগাপিক্সেলের বেশি)। আগে ছবি রিসাইজার দিয়ে ছোট করুন।',
    't-invalid': 'KB-তে একটি সাইজ লিখুন, যেমন ২০০ বা ১৫০.৫।',
    't-too-small': 'লক্ষ্য কমপক্ষে ১ KB হতে হবে।',
    't-too-large': 'লক্ষ্য সর্বোচ্চ ২৫,৬০০ KB (২৫ MB) হতে পারে।',
    notesTitle: 'গোপনীয়তা, মান ও সীমা',
    n1: 'আপনার ছবি এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই কম্প্রেস করা হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'মান সাইজের নিশ্চয়তা নয়: একই সেটিং ভিন্ন ছবিতে ভিন্ন সাইজ দেয়। দেখানো সাইজটি ডাউনলোড করা ফাইলের আসল সাইজ।',
    n3: 'PNG ফলাফল লসলেস এবং মান সেটিং দিয়ে ছোট করা যায় না। নতুন করে এনকোড করা ফাইলে মূল ছবির মেটাডেটা (যেমন ক্যামেরার তথ্য বা GPS অবস্থান) থাকে না।',
    n4: 'সীমা: ফাইল সর্বোচ্চ ২৫ MB; প্রতি দিকে ৮,১৯২ পিক্সেল ও ১৬.৭ মেগাপিক্সেল পর্যন্ত ছবি আবার এনকোড করা যায়। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

type Key = Parameters<ReturnType<typeof S>>[0];

type Mode = 'quality' | 'target';

interface StoredResult extends EncodedImage {
  size: Size;
  /** Quality actually used (percent), or null for PNG. */
  quality: number | null;
  filledTransparency: boolean;
  target: { bytes: number; reached: boolean } | null;
}

const FORMAT_CHOICES = ['same', 'jpeg', 'png', 'webp'] as const;
const RELATED = [
  'image-converter',
  'image-resizer',
  'image-cropper',
  'job-photo-resizer',
  'pdf-create',
] as const;
const RELATED_ICON: Record<(typeof RELATED)[number], UiIcon> = {
  'image-converter': 'convert',
  'image-resizer': 'expand',
  'image-cropper': 'crop',
  'job-photo-resizer': 'portrait',
  'pdf-create': 'file-plus',
};

export const imageCompressor: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, bytes: bytesText, dims } = imageFormatters(ctx);
  const digits = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
  const pct = (n: number): string => digits(Math.abs(n).toFixed(1));

  let outputUrl: string | null = null;
  let busy = false;

  // ---------- Input (drop zone, file details, Replace/Reset) ----------
  const input = imageInput(ctx, {
    id: 'compress',
    preview: false,
    showName: true,
    showcase: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      setOriginal(image);
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      setOriginal(null);
      for (const k of ['format', 'quality', 'mode', 'target']) delete ctx.memo[k];
      for (const r of formatRadios) r.checked = r.value === 'same';
      range.value = String(QUALITY.default);
      for (const r of modeRadios) r.checked = r.value === 'quality';
      target.control.value = '';
      target.setError(null);
      update();
    },
  });
  const loaded = (): LoadedImage | null => input.current();

  // ---------- Mode: Quality | Target size (a radio group drawn as a segmented control) ----------
  const savedMode: Mode = ctx.memo.mode === 'target' ? 'target' : 'quality';
  const modeRadios = (['quality', 'target'] as const).map((value) => {
    const r = h('input', {
      type: 'radio',
      name: 'compress-mode',
      id: `compress-mode-${value}`,
      value,
      class: 'ic-seg-input',
    });
    r.checked = savedMode === value;
    r.addEventListener('change', () => {
      ctx.memo.mode = value;
      update();
    });
    return r;
  });
  const modeGroup = h(
    'fieldset',
    { class: 'ic-seg' },
    h('legend', { class: 'sr-only' }, L('mode')),
    ...modeRadios.flatMap((r) => [
      r,
      h(
        'label',
        { for: r.id, class: 'ic-seg-label' },
        icon(r.value === 'quality' ? 'image' : 'lock', 18),
        L(r.value === 'quality' ? 'modeQuality' : 'modeTarget'),
      ),
    ]),
  );
  const mode = (): Mode => (modeRadios[1]?.checked ? 'target' : 'quality');

  // ---------- Quality slider ----------
  const range = h('input', {
    type: 'range',
    id: 'compress-quality',
    class: 'quality-range ic-range',
    min: String(QUALITY.min),
    max: String(QUALITY.max),
    step: '1',
  });
  range.value = String(clampQuality(Number(ctx.memo.quality ?? QUALITY.default)));
  const quality = field(L('quality'), range, { hint: L('qualityHint') });
  const labelValue = h('span', { class: 'ic-label-value', 'aria-hidden': 'true' });
  quality.el.querySelector('label')?.append(labelValue);
  const qualityValue = h('output', {
    class: 'quality-value ic-quality-box',
    for: range.id,
    'aria-hidden': 'true',
  });
  // Put the live percentage next to the slider, inside the labelled field.
  const rangeRow = h('div', { class: 'quality-field ic-range-row' });
  range.parentNode?.replaceChild(rangeRow, range);
  rangeRow.append(range, qualityValue);

  const target = field(L('target'), textInput({ id: 'compress-target', inputmode: 'decimal' }), {
    hint: L('targetHint'),
  });
  bindMemo(target.control, ctx.memo, 'target');

  // ---------- Output format (radio pills) ----------
  const savedFormat = (FORMAT_CHOICES as readonly string[]).includes(ctx.memo.format ?? '')
    ? (ctx.memo.format as FormatChoice)
    : 'same';
  const formatRadios = FORMAT_CHOICES.map((value) => {
    const r = h('input', {
      type: 'radio',
      name: 'compress-format',
      id: `compress-format-${value}`,
      value,
      class: 'ic-pill-input',
    });
    r.checked = value === savedFormat;
    if (value !== 'same' && !canEncode(value)) r.disabled = true;
    r.addEventListener('change', () => {
      ctx.memo.format = value;
      update();
    });
    return r;
  });
  if (formatRadios.find((r) => r.checked)?.disabled) formatRadios[0]!.checked = true;
  const formatGroup = h(
    'fieldset',
    { class: 'ic-format', 'aria-describedby': 'compress-format-info' },
    h(
      'legend',
      { class: 'field-label' },
      L('outputFormat'),
      h(
        'span',
        { class: 'ic-info-dot', 'aria-hidden': 'true', title: L('outputFormatInfo') },
        icon('info', 14),
      ),
    ),
    h(
      'div',
      { class: 'ic-pills' },
      ...formatRadios.map((r) =>
        h(
          'div',
          { class: 'ic-pill' },
          r,
          h(
            'label',
            { for: r.id },
            h('span', { class: 'ic-pill-dot', 'aria-hidden': 'true' }),
            r.value === 'same'
              ? L('sameAsOriginal')
              : r.disabled
                ? L('notSupported', { f: FORMATS[r.value as ImageFormat].label })
                : FORMATS[r.value as ImageFormat].label,
          ),
        ),
      ),
    ),
    h('p', { class: 'sr-only', id: 'compress-format-info' }, L('outputFormatInfo')),
  );
  const formatChoice = (): FormatChoice =>
    (formatRadios.find((r) => r.checked)?.value ?? 'same') as FormatChoice;

  const pngNote = h(
    'p',
    { class: 'field-hint', id: 'compress-png-note', hidden: '' },
    L('pngNote'),
  );
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const compressBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary ic-submit', id: 'compress-submit' },
    icon('compress', 20),
    L('compress'),
  );
  const advanced = h(
    'details',
    { class: 'ic-advanced' },
    h('summary', {}, icon('gear', 18), L('advanced')),
    h(
      'div',
      { class: 'ic-advanced-body' },
      h('p', {}, L('n2')),
      h('p', {}, L('lossyNote')),
      h('p', {}, L('n3')),
    ),
  );
  const form = h(
    'form',
    {
      class: 'tool-form image-controls compress-controls ic-card ic-settings',
      'aria-labelledby': 'compress-controls-title',
    },
    h(
      'div',
      { class: 'ic-card-head' },
      h('span', { class: 'ic-head-icon', 'aria-hidden': 'true' }, icon('gear', 20)),
      h('h2', { id: 'compress-controls-title', class: 'ic-card-title' }, L('controls')),
    ),
    modeGroup,
    quality.el,
    target.el,
    pngNote,
    formatGroup,
    advanced,
    warnings,
    h('div', { class: 'form-actions' }, compressBtn),
  );
  form.noValidate = true;

  // ---------- Original → Compressed comparison ----------
  const origImg = h('img', { class: 'ic-cmp-img', alt: L('originalAlt') });
  const outputImg = h('img', { class: 'image-preview ic-cmp-img', alt: L('compressedAlt') });
  const origMeta = h('div', { class: 'ic-cmp-meta' });
  const outMeta = h('div', { class: 'ic-cmp-meta' });
  const pending = h('p', { class: 'ic-cmp-pending' }, L('compressedPending'));
  const origCard = h(
    'figure',
    { class: 'ic-cmp-card' },
    h('span', { class: 'ic-chip ic-chip-dark' }, L('originalLabel')),
    origImg,
    origMeta,
  );
  const outputHead = h(
    'figure',
    { class: 'image-output ic-cmp-card', hidden: '' },
    h('span', { class: 'ic-chip ic-chip-green' }, L('compressedLabel')),
    outputImg,
    outMeta,
  );
  const outSlot = h('div', { class: 'ic-cmp-slot' }, pending, outputHead);
  const sideBySide = h(
    'div',
    { class: 'ic-cmp-row' },
    origCard,
    h('span', { class: 'ic-cmp-arrow', 'aria-hidden': 'true' }, icon('arrow-right', 22)),
    outSlot,
  );
  // Swipe comparison: the compressed image over the original, clipped by a slider.
  const swipeOrig = h('img', { class: 'ic-swipe-img', alt: '' });
  const swipeOut = h('img', { class: 'ic-swipe-img ic-swipe-top', alt: '' });
  const swipeRange = h('input', {
    type: 'range',
    class: 'ic-swipe-range',
    id: 'compress-compare',
    min: '0',
    max: '100',
    value: '50',
    'aria-label': L('compareSlider'),
  });
  const setSwipe = (): void => {
    swipeOut.style.clipPath = `inset(0 0 0 ${swipeRange.value}%)`;
  };
  swipeRange.addEventListener('input', setSwipe);
  setSwipe();
  const swipe = h(
    'div',
    { class: 'ic-swipe', hidden: '' },
    h('div', { class: 'ic-swipe-stage' }, swipeOrig, swipeOut),
    swipeRange,
  );
  const comparison = h(
    'section',
    { class: 'ic-card ic-compare', 'aria-label': L('compare'), hidden: '' },
    sideBySide,
    swipe,
  );

  function setOriginal(image: LoadedImage | null): void {
    if (!image) {
      origImg.removeAttribute('src');
      swipeOrig.removeAttribute('src');
      comparison.hidden = true;
      return;
    }
    origImg.src = swipeOrig.src = image.decoded.url;
    origMeta.replaceChildren(
      h('span', {}, icon('file', 16), bytesText(image.file.size)),
      h('span', {}, dims(image.decoded)),
    );
    comparison.hidden = false;
  }

  // ---------- Result card ----------
  const tile = (cls: string, ic: UiIcon, label: string, value: string): HTMLElement =>
    h(
      'div',
      { class: `ic-tile ${cls}` },
      h('span', { class: 'ic-tile-icon', 'aria-hidden': 'true' }, icon(ic, 22)),
      h('dt', {}, label),
      h('dd', {}, value),
    );
  const tiles = h('dl', { class: 'ic-tiles' });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary ic-download', id: 'compress-download' },
    icon('download', 18),
    L('download'),
  );
  const compareBtn = h(
    'button',
    { type: 'button', class: 'btn', 'aria-pressed': 'false', id: 'compress-compare-btn' },
    icon('layers', 18),
    L('compare'),
  );
  const originalLink = h(
    'button',
    { type: 'button', class: 'btn', id: 'compress-download-original' },
    icon('download', 18),
    L('downloadOriginal'),
  );
  originalLink.addEventListener('click', () => {
    const image = loaded();
    if (!image) return;
    // A short-lived link to the file already in memory (nothing is uploaded).
    const url = URL.createObjectURL(image.file);
    const a = h('a', { href: url, download: image.file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const resetBtn = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), L('resetAll'));
  const resultActions = h(
    'div',
    { class: 'form-actions ic-result-actions', hidden: '' },
    downloadLink,
    compareBtn,
    originalLink,
    resetBtn,
  );
  const panel = resultPanel(ctx, L('compress'), {
    prepend: h('div', {}, tiles, resultActions),
  });
  panel.el.classList.add('ic-card', 'ic-result');
  panel.el
    .querySelector('.result-title')
    ?.replaceWith(
      h(
        'div',
        { class: 'ic-result-head' },
        h('span', { class: 'ic-check', 'aria-hidden': 'true' }, icon('check', 18)),
        h('h2', { class: 'ic-card-title', id: 'compress-result-title' }, L('resultTitle')),
      ),
    );
  panel.el.removeAttribute('aria-label');
  panel.el.setAttribute('aria-labelledby', 'compress-result-title');
  const emptyResult = (): void => {
    panel.clear();
    panel.el.querySelector('.result-empty')?.replaceChildren(L('resultEmpty'));
  };

  function setCompare(on: boolean): void {
    compareBtn.setAttribute('aria-pressed', String(on));
    compareBtn.lastChild!.textContent = L(on ? 'compareOff' : 'compare');
    swipe.hidden = !on;
    sideBySide.hidden = on;
  }
  compareBtn.addEventListener('click', () => {
    setCompare(compareBtn.getAttribute('aria-pressed') !== 'true');
    if (!swipe.hidden) swipeRange.focus();
  });
  resetBtn.addEventListener('click', () => input.reset());

  // ---------- Helpers ----------
  const requestedFormat = (image: LoadedImage): ImageFormat =>
    resolveOutputFormat(formatChoice(), image.format);

  /** Reflect the current settings: which controls apply, labels and warnings. */
  function update(): void {
    const q = clampQuality(Number(range.value));
    const label = L('qualityValue', { n: num(q) });
    qualityValue.textContent = label;
    labelValue.textContent = `: ${label}`;
    range.setAttribute('aria-valuetext', label);
    range.style.setProperty(
      '--fill',
      `${((q - QUALITY.min) / (QUALITY.max - QUALITY.min)) * 100}%`,
    );
    ctx.memo.quality = String(q);
    const sameLabel = formatRadios[0]?.nextElementSibling;
    const image = loaded();
    if (sameLabel)
      sameLabel.lastChild!.textContent = image
        ? I('sameFormat', { f: FORMATS[image.format].label })
        : L('sameAsOriginal');
    const out = image ? requestedFormat(image) : null;
    const lossy = out ? usesQuality(out) : true;
    const byTarget = mode() === 'target';
    // Hidden controls are skipped by keyboard and screen readers.
    quality.el.hidden = byTarget || !lossy;
    target.el.hidden = !byTarget;
    pngNote.hidden = lossy;
    warnings.replaceChildren();
    if (image && out && transparencyRisk(image.format, out)) {
      warnings.append(h('li', {}, icon('alert', 16), I('transparencyWarning')));
    }
  }

  function clearOutput(): void {
    clearOutputView();
    ctx.session.delete('result');
  }

  /** Empty the comparison and result card (keeps any stored result for a language switch). */
  function clearOutputView(): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    outputImg.removeAttribute('src');
    swipeOut.removeAttribute('src');
    downloadLink.removeAttribute('href');
    outputHead.hidden = true;
    pending.hidden = false;
    resultActions.hidden = true;
    compareBtn.disabled = true;
    setCompare(false);
    tiles.replaceChildren();
    emptyResult();
  }

  function setBusy(on: boolean): void {
    busy = on;
    compressBtn.disabled = on;
    for (const el of [range, target.control, ...modeRadios]) el.disabled = on;
    for (const r of formatRadios)
      if (on || r.value === 'same' || canEncode(r.value as ImageFormat)) r.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = compressedFilename(image.file.name, r.format, r.quality);
    outputImg.src = swipeOut.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outMeta.replaceChildren(
      h('span', {}, icon('file', 16), bytesText(r.blob.size)),
      h('span', {}, dims(r.size)),
    );
    outputHead.hidden = false;
    pending.hidden = true;
    resultActions.hidden = false;
    compareBtn.disabled = false;
    const cmp = compareSizes(image.file.size, r.blob.size);
    tiles.replaceChildren(
      tile('ic-tile-blue', 'database', L('originalSize'), bytesText(image.file.size)),
      tile('ic-tile-violet', 'database', L('compressedSize'), bytesText(r.blob.size)),
      cmp.change === 'larger'
        ? tile('ic-tile-red', 'alert', L('sizeIncreased'), `+${pct(cmp.savedPercent)}%`)
        : tile('ic-tile-green', 'arrow-down', L('sizeReduced'), `${pct(cmp.savedPercent)}%`),
    );
    const change =
      cmp.change === 'smaller'
        ? L('saved', { b: bytesText(cmp.savedBytes), p: pct(cmp.savedPercent) })
        : cmp.change === 'larger'
          ? L('larger', { b: bytesText(-cmp.savedBytes), p: pct(cmp.savedPercent) })
          : L('noChange');
    const extra: string[] = [];
    if (r.target) {
      const t = bytesText(r.target.bytes);
      extra.push(
        r.target.reached
          ? L('targetReached', { t, q: num(r.quality ?? 0) })
          : L('targetMissed', { t, q: num(r.quality ?? 0), s: bytesText(r.blob.size) }),
      );
    }
    if (r.filledTransparency) extra.push(I('filledNote'));
    extra.push(usesQuality(r.format) ? L('lossyNote') : L('pngNote'));
    panel.show(
      [
        { label: L('compressedSize'), value: bytesText(r.blob.size), primary: true },
        { label: L('originalSize'), value: bytesText(image.file.size) },
        { label: L('change'), value: change },
        { label: L('ratio'), value: digits(formatRatio(cmp.ratio)) },
        { label: I('dimensions'), value: dims(r.size) },
        { label: I('format'), value: FORMATS[r.format].label },
        {
          label: L('usedQuality'),
          value:
            r.quality === null ? L('qualityNotUsed') : L('qualityValue', { n: num(r.quality) }),
        },
      ],
      extra,
    );
  }

  // ---------- Events ----------
  range.addEventListener('input', update);
  target.control.addEventListener('input', () => target.setError(null));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void compress();
  });

  async function compress(): Promise<void> {
    if (busy) return;
    const source = loaded();
    if (!source) {
      input.showError(L('needImage'));
      input.fileInput.focus();
      return;
    }
    input.showError(null);
    target.setError(null);
    const size: Size = { width: source.decoded.width, height: source.decoded.height };
    const requested = requestedFormat(source);
    const lossy = usesQuality(requested);
    const byTarget = mode() === 'target';

    let targetBytes = 0;
    if (byTarget) {
      if (!lossy) {
        input.showError(L('err-target-png'));
        (formatRadios.find((r) => r.checked) ?? formatRadios[0])!.focus();
        return;
      }
      const t = parseTargetKB(target.control.value);
      if (!t.ok) {
        target.setError(L(`t-${t.error}`));
        target.control.focus();
        return;
      }
      targetBytes = t.bytes;
    }
    if (!validateDimensions(size.width, size.height).ok) {
      input.showError(L('err-size'));
      return;
    }
    if (!canEncode(requested)) {
      input.showError(L('err-format', { f: FORMATS[requested].label }));
      return;
    }

    setBusy(true);
    input.say(L(byTarget ? 'searching' : 'compressing'));
    let encoder: ReturnType<typeof openEncoder> | null = null;
    try {
      encoder = openEncoder(
        source.decoded.image,
        null,
        size,
        requested,
        FORMATS[source.format].alpha,
      );
      const enc = encoder;
      const encodeAt = async (q: number): Promise<EncodedImage> => {
        const out = await enc.encode(q / 100);
        // Never offer a file whose real format differs from the one chosen.
        if (out.format !== requested) throw new FormatMismatch();
        return out;
      };
      let stored: StoredResult;
      if (byTarget) {
        const found = await searchQuality(async (q) => {
          const out = await encodeAt(q);
          return { bytes: out.blob.size, value: out };
        }, targetBytes);
        const pick = found.ok ? found.best : found.smallest;
        stored = {
          ...pick.value,
          size,
          quality: pick.quality,
          filledTransparency: enc.filledTransparency,
          target: { bytes: targetBytes, reached: found.ok },
        };
      } else {
        const q = clampQuality(Number(range.value));
        const out = await encodeAt(lossy ? q : 100);
        stored = {
          ...out,
          size,
          quality: lossy ? q : null,
          filledTransparency: enc.filledTransparency,
          target: null,
        };
      }
      if (input.disposed() || source !== loaded()) return;
      ctx.session.set('result', stored);
      showResult(source, stored);
      const notSmaller = stored.blob.size >= source.file.size;
      input.say(L(notSmaller ? 'doneLarger' : 'done'));
      if (stored.target && !stored.target.reached) {
        input.showError(
          L('targetMissed', {
            t: bytesText(targetBytes),
            q: num(stored.quality ?? 0),
            s: bytesText(stored.blob.size),
          }),
        );
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

  // ---------- Information sections ----------
  const features = h(
    'ul',
    { class: 'ic-features', role: 'list' },
    ...(
      [
        ['ic-tone-amber', 'bolt', 'f1Title', 'f1Text'],
        ['ic-tone-blue', 'shield', 'f2Title', 'f2Text'],
        ['ic-tone-violet', 'layers', 'f3Title', 'f3Text'],
        ['ic-tone-gold', 'lock', 'f4Title', 'f4Text'],
      ] as const
    ).map(([tone, ic, title, body]) =>
      h(
        'li',
        { class: 'ic-feature' },
        h('span', { class: `ic-feature-icon ${tone}`, 'aria-hidden': 'true' }, icon(ic, 24)),
        h('div', {}, h('h3', {}, L(title)), h('p', {}, L(body))),
      ),
    ),
  );
  const checks = (keys: Key[]): HTMLElement =>
    h(
      'ul',
      { class: 'ic-checks', role: 'list' },
      ...keys.map((k) => h('li', {}, icon('check', 16), h('span', {}, L(k)))),
    );
  const infoCard = (cls: string, ic: UiIcon, title: Key, body: HTMLElement): HTMLElement =>
    h(
      'section',
      { class: `ic-info-card ${cls}`, 'aria-labelledby': `compress-${cls}-title` },
      h('span', { class: 'ic-round-icon', 'aria-hidden': 'true' }, icon(ic, 22)),
      h('div', {}, h('h2', { id: `compress-${cls}-title` }, L(title)), body),
    );
  const info = h(
    'div',
    { class: 'ic-info' },
    infoCard('ic-how', 'info', 'howTitle', h('p', {}, L('howText'))),
    infoCard('ic-uses', 'check', 'usesTitle', checks(['use1', 'use2', 'use3', 'use4', 'use5'])),
    infoCard('ic-tips', 'sparkle', 'tipsTitle', checks(['tip1', 'tip2', 'tip3', 'tip4'])),
  );
  const relatedTools = RELATED.map((id) => getTool(id)).filter(
    (t): t is NonNullable<typeof t> => !!t && t.status === 'available',
  );
  const related = relatedTools.length
    ? h(
        'nav',
        { class: 'ic-related', 'aria-labelledby': 'compress-related-title' },
        h(
          'div',
          { class: 'ic-related-head' },
          icon('grid', 20),
          h('h2', { id: 'compress-related-title' }, L('relatedTitle')),
          h('p', {}, L('relatedSub')),
        ),
        h(
          'ul',
          { class: 'ic-related-list', role: 'list' },
          ...relatedTools.map((t) =>
            h(
              'li',
              {},
              h(
                'a',
                { href: toHash({ name: 'tool', id: t.id }), class: 'ic-related-link' },
                h(
                  'span',
                  { class: `ic-related-icon ic-rel-${t.id}`, 'aria-hidden': 'true' },
                  icon(RELATED_ICON[t.id as (typeof RELATED)[number]], 20),
                ),
                h(
                  'span',
                  { class: 'ic-related-text' },
                  h('strong', {}, t.name[ctx.lang]),
                  h('span', {}, L(`rel-${t.id}` as Key)),
                ),
                icon('arrow-right', 16),
              ),
            ),
          ),
        ),
      )
    : null;

  const upload = h('section', { class: 'ic-card ic-upload', 'aria-label': I('choose') }, input.el);

  clearOutputView();
  update();
  // Restore after a language switch (the File stays in memory, never in storage).
  input.restore();

  return h(
    'div',
    { class: 'ic-page image-tool', 'data-own-related': related ? 'true' : 'false' },
    h(
      'div',
      { class: 'ic-main' },
      h('div', { class: 'ic-col' }, upload, comparison),
      h('div', { class: 'ic-col' }, form, panel.el),
    ),
    features,
    info,
    related,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};

/** The browser produced a different format than requested. */
class FormatMismatch extends Error {}
