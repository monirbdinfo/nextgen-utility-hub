import { parseTargetKB, searchQuality, usesQuality } from '../../calc/compress';
import { toBanglaDigits } from '../../calc/digits';
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
import { bindMemo, field, notes, resultPanel, textInput, type ToolView } from './kit';

const S = defineStrings({
  en: {
    controls: 'Output settings',
    sizeHint:
      'Enter the exact size the application asks for, in pixels (px). Check the official notice: requirements differ between recruiters and change over time.',
    width: 'Width (px)',
    height: 'Height (px)',
    fit: 'When the proportions differ',
    fitCrop: 'Crop to fill (centred; edges are cut off)',
    fitPad: 'Fit the whole image (white space is added)',
    limit: 'Maximum file size (KB, optional)',
    limitHint:
      'Leave empty for no limit. For JPEG and WebP the highest quality that fits is used (at most 8 attempts). 1 KB = 1,024 bytes.',
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
    't-invalid': 'Enter a size in KB, for example 100 or 60, or leave it empty.',
    't-too-small': 'The limit must be at least 1 KB.',
    't-too-large': 'The limit can be at most 25,600 KB (25 MB).',
    'err-format': 'This browser cannot save {f} images. Choose another format.',
    notesTitle: 'Privacy, sizes and limits',
    n1: 'Your photo and signature never leave this device. They are processed by your browser; nothing is uploaded, sent to any service or saved.',
    n2: 'This tool has no ready-made sizes for specific recruiters or passports. Rules differ and change, so enter the exact pixel size, file-size limit and format from the official notice you are applying to.',
    n3: 'Sizes are in pixels. Print size in centimetres or inches depends on DPI, which this tool does not set. The image is never stretched: it is either cropped (centred) or fitted with white space. To choose which part to keep, crop it first with the Image Cropper.',
    n4: 'The saved file has no metadata (camera details, GPS location). Limits: input up to 25 MB and 50 megapixels; output up to 8,192 pixels per side and 16.7 megapixels. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    controls: 'ফলাফলের সেটিংস',
    sizeHint:
      'আবেদনে যে মাপ চাওয়া হয়েছে তা পিক্সেলে (px) লিখুন। অফিশিয়াল বিজ্ঞপ্তি দেখে নিন: নিয়ম প্রতিষ্ঠানভেদে আলাদা এবং সময়ের সাথে বদলায়।',
    width: 'প্রস্থ (px)',
    height: 'উচ্চতা (px)',
    fit: 'অনুপাত না মিললে',
    fitCrop: 'কেটে পূর্ণ করুন (মাঝখান থেকে; কিনারা বাদ যায়)',
    fitPad: 'পুরো ছবি রাখুন (সাদা জায়গা যোগ হয়)',
    limit: 'সর্বোচ্চ ফাইল সাইজ (KB, ঐচ্ছিক)',
    limitHint:
      'কোনো সীমা না চাইলে খালি রাখুন। JPEG ও WebP-এ সীমার মধ্যে থাকা সর্বোচ্চ মান ব্যবহার হয় (সর্বোচ্চ ৮ বার চেষ্টা)। ১ KB = ১,০২৪ বাইট।',
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
    't-invalid': 'KB-তে একটি সাইজ লিখুন, যেমন ১০০ বা ৬০, অথবা খালি রাখুন।',
    't-too-small': 'সীমা কমপক্ষে ১ KB হতে হবে।',
    't-too-large': 'সীমা সর্বোচ্চ ২৫,৬০০ KB (২৫ MB) হতে পারে।',
    'err-format': 'এই ব্রাউজার {f} ছবি সংরক্ষণ করতে পারে না। অন্য ফরম্যাট বেছে নিন।',
    notesTitle: 'গোপনীয়তা, মাপ ও সীমা',
    n1: 'আপনার ছবি ও স্বাক্ষর এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই প্রসেস হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'এই টুলে নির্দিষ্ট কোনো প্রতিষ্ঠান বা পাসপোর্টের তৈরি মাপ নেই। নিয়ম আলাদা ও পরিবর্তনশীল, তাই যে অফিশিয়াল বিজ্ঞপ্তিতে আবেদন করছেন সেখান থেকে সঠিক পিক্সেল মাপ, ফাইল সাইজের সীমা ও ফরম্যাট লিখুন।',
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

export const photoResizer: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, bytes: bytesText, dims } = imageFormatters(ctx);
  const digits = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
  const pct = (n: number): string => digits(n.toFixed(1));

  let outputUrl: string | null = null;
  let busy = false;

  // ---------- Input ----------
  const input = imageInput(ctx, {
    id: 'photo',
    preview: true,
    showName: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      form.hidden = false;
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      for (const k of ['width', 'height', 'fit', 'format', 'limit']) delete ctx.memo[k];
      width.control.value = height.control.value = limit.control.value = '';
      formatSelect.control.value = 'jpeg';
      for (const r of fitRadios) r.checked = r.value === 'crop';
      for (const f of [width, height, limit]) f.setError(null);
      update();
      form.hidden = true;
    },
  });
  const loaded = (): LoadedImage | null => input.current();

  // ---------- Controls ----------
  const sizeHint = h('p', { class: 'field-hint', id: 'photo-size-hint' }, L('sizeHint'));
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
    { class: 'radio-group' },
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

  const formatSelect = formatField(ctx, 'photo-format', ['jpeg', 'png', 'webp'], {
    includeSame: false,
  });
  bindMemo(formatSelect.control, ctx.memo, 'format', 'jpeg');
  if (formatSelect.control.selectedOptions[0]?.disabled) formatSelect.control.value = 'jpeg';

  const limit = field(L('limit'), textInput({ id: 'photo-limit', inputmode: 'decimal' }), {
    hint: L('limitHint'),
  });
  bindMemo(limit.control, ctx.memo, 'limit');

  const plan = h('p', { class: 'photo-plan', id: 'photo-plan', 'aria-live': 'polite' });
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const submit = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'photo-submit' },
    L('prepare'),
  );
  const form = h(
    'form',
    {
      class: 'tool-form image-controls photo-controls',
      'aria-labelledby': 'photo-controls-title',
      hidden: '',
    },
    h('h2', { id: 'photo-controls-title', class: 'result-title' }, L('controls')),
    sizeHint,
    h('div', { class: 'field-grid' }, width.el, height.el),
    fitGroup,
    h('div', { class: 'field-grid' }, formatSelect.el, limit.el),
    plan,
    warnings,
    h('div', { class: 'form-actions' }, submit),
  );
  form.noValidate = true;

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('resultAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary', id: 'photo-download' },
    icon('download', 18),
    L('download'),
  );
  const outputHead = h(
    'div',
    { class: 'image-output', hidden: '' },
    h('div', { class: 'image-frame' }, outputImg),
    h('div', { class: 'form-actions' }, downloadLink),
  );
  const panel = resultPanel(ctx, L('prepare'), { prepend: outputHead });
  panel.el.hidden = true;

  // ---------- Helpers ----------
  const format = (): ImageFormat => formatSelect.control.value as ImageFormat;
  const where = (axis: 'sides' | 'top-bottom'): string =>
    L(axis === 'sides' ? 'sides' : 'topBottom');

  /** Explain what will happen with the current settings (never changes them). */
  function update(): void {
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
    panel.el.hidden = true;
    panel.clear();
    ctx.session.delete('result');
  }

  function setBusy(on: boolean): void {
    busy = on;
    submit.disabled = on;
    for (const el of [width.control, height.control, formatSelect.control, limit.control])
      el.disabled = on;
    for (const r of fitRadios) r.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = outputFilename(image.file.name, r.size, r.format);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outputHead.hidden = false;
    panel.el.hidden = false;
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
  for (const c of [width.control, height.control]) c.addEventListener('input', update);
  limit.control.addEventListener('input', () => {
    limit.setError(null);
    update();
  });
  formatSelect.control.addEventListener('change', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void prepare();
  });

  async function prepare(): Promise<void> {
    const source = loaded();
    if (busy || !source) return;
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
      const parsed = parseTargetKB(limit.control.value);
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

  update();
  // Restore after a language switch (the File stays in memory, never in storage).
  input.restore();

  return h(
    'div',
    { class: 'tool-layout tool-layout-stacked image-tool' },
    input.el,
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};

/** The browser produced a different format than requested. */
class FormatMismatch extends Error {}
