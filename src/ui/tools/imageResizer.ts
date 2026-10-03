import { toBanglaDigits } from '../../calc/digits';
import { formatInteger } from '../../calc/format';
import {
  checkDecodedSize,
  checkImageFile,
  FORMATS,
  formatBytes,
  heightForWidth,
  IMAGE_LIMITS,
  outputFilename,
  parseDimension,
  percentChange,
  resolveOutputFormat,
  scaleByPercent,
  transparencyRisk,
  validateDimensions,
  widthForHeight,
  type FormatChoice,
  type ImageFormat,
  type Size,
} from '../../calc/image';
import { defineStrings } from '../../i18n';
import { h, prefersReducedMotion } from '../../lib/dom';
import {
  canEncode,
  decodeImage,
  ENCODE_QUALITY,
  ImageProcessingError,
  releaseDecoded,
  resizeImage,
  type DecodedImage,
  type ResizeResult,
} from '../../lib/imageCanvas';
import { icon } from '../icons';
import {
  bindMemo,
  checkbox,
  field,
  notes,
  resultPanel,
  select,
  textInput,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    choose: 'Choose an image',
    drop: 'or drag and drop it here',
    dropHint: 'JPEG, PNG or WebP, up to 25 MB.',
    dropActive: 'Drop the image to open it',
    original: 'Original image',
    originalAlt: 'Preview of the original image',
    resizedAlt: 'Preview of the resized image',
    dimensions: 'Dimensions',
    dimensionsValue: '{w} × {h} px',
    fileSize: 'File size',
    format: 'Format',
    change: 'Change in file size',
    smaller: '{n}% smaller',
    larger: '{n}% larger',
    same: 'About the same',
    replace: 'Replace image',
    reset: 'Reset',
    newSize: 'New size',
    width: 'Width (pixels)',
    height: 'Height (pixels)',
    lock: 'Keep aspect ratio',
    presets: 'Quick sizes',
    presetLabel: '{n}%',
    presetAria: 'Set size to {n}% of the original',
    outputFormat: 'Save as',
    sameFormat: 'Same as original ({f})',
    unsupportedFormat: '{f} (not supported by this browser)',
    resize: 'Resize image',
    resizing: 'Resizing…',
    reading: 'Opening image…',
    loaded: 'Image opened: {w} × {h} pixels.',
    done: 'Done. The resized image is ready to download.',
    download: 'Download resized image',
    downloadAria: 'Download resized image ({name})',
    transparencyWarning:
      'JPEG cannot store transparency. Any transparent areas will become white. Choose PNG or WebP to keep them.',
    stretchWarning:
      'These proportions differ from the original, so the image will be stretched or squashed.',
    enlargeNote: 'Enlarging an image cannot add detail; it may look soft or blurry.',
    filledNote: 'Transparent areas were filled with white because JPEG has no transparency.',
    fallbackNote:
      'This browser cannot save {requested} images, so the result was saved as {actual}.',
    largerNote: 'The resized file is larger than the original file.',
    lossyNote:
      'Resizing re-encodes the image. JPEG and WebP use lossy compression (quality {q}%), so some quality is lost; PNG is lossless but usually larger.',
    'err-empty': 'This file is empty.',
    'err-too-large': 'This file is larger than 25 MB. Choose a smaller image.',
    'err-unsupported': 'This file is not a JPEG, PNG or WebP image.',
    'err-read': 'The file could not be read.',
    'err-decode':
      'The image could not be opened. It may be damaged, or this browser cannot read this file.',
    'err-too-many-pixels':
      'This image has more than 50 megapixels, which is too large to process safely in a browser.',
    'err-canvas': 'Your browser could not create an image this large. Try smaller dimensions.',
    'err-encode': 'Your browser could not save the image in this format. Try another format.',
    'dim-invalid': 'Enter a whole number of pixels.',
    'dim-too-small': 'Must be at least 1 pixel.',
    'dim-side-too-large': 'Each side can be at most 8,192 pixels.',
    'dim-area-too-large':
      'The resized image can have at most 16.7 megapixels (for example 4,096 × 4,096 pixels).',
    keptPrevious: 'Your current image is still open.',
    notesTitle: 'Privacy, limits and quality',
    n1: 'Your image never leaves this device. It is opened and resized by your browser; it is not uploaded, sent to any service or saved.',
    n2: 'The resized file does not include the original’s metadata, such as camera details or GPS location. Photos are shown and resized the right way up, following their orientation tag.',
    n3: 'Limits: files up to 25 MB and 50 megapixels; output up to 8,192 pixels per side and 16.7 megapixels in total, so it also works on phones.',
    n4: 'Resizing is not lossless. JPEG and WebP are saved at quality 92%. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    choose: 'একটি ছবি বেছে নিন',
    drop: 'অথবা এখানে টেনে এনে ছেড়ে দিন',
    dropHint: 'JPEG, PNG বা WebP, সর্বোচ্চ ২৫ MB।',
    dropActive: 'ছবিটি খুলতে এখানে ছেড়ে দিন',
    original: 'মূল ছবি',
    originalAlt: 'মূল ছবির প্রিভিউ',
    resizedAlt: 'রিসাইজ করা ছবির প্রিভিউ',
    dimensions: 'মাপ',
    dimensionsValue: '{w} × {h} পিক্সেল',
    fileSize: 'ফাইলের আকার',
    format: 'ফরম্যাট',
    change: 'ফাইলের আকারে পরিবর্তন',
    smaller: '{n}% ছোট',
    larger: '{n}% বড়',
    same: 'প্রায় একই',
    replace: 'ছবি বদলান',
    reset: 'রিসেট',
    newSize: 'নতুন মাপ',
    width: 'প্রস্থ (পিক্সেল)',
    height: 'উচ্চতা (পিক্সেল)',
    lock: 'অনুপাত ঠিক রাখুন',
    presets: 'দ্রুত মাপ',
    presetLabel: '{n}%',
    presetAria: 'মূল মাপের {n}% করুন',
    outputFormat: 'যে ফরম্যাটে সংরক্ষণ',
    sameFormat: 'মূলের মতো ({f})',
    unsupportedFormat: '{f} (এই ব্রাউজারে সমর্থিত নয়)',
    resize: 'ছবি রিসাইজ করুন',
    resizing: 'রিসাইজ হচ্ছে…',
    reading: 'ছবি খোলা হচ্ছে…',
    loaded: 'ছবি খোলা হয়েছে: {w} × {h} পিক্সেল।',
    done: 'সম্পন্ন। রিসাইজ করা ছবি ডাউনলোডের জন্য প্রস্তুত।',
    download: 'রিসাইজ করা ছবি ডাউনলোড করুন',
    downloadAria: 'রিসাইজ করা ছবি ডাউনলোড করুন ({name})',
    transparencyWarning:
      'JPEG স্বচ্ছতা (transparency) রাখতে পারে না। স্বচ্ছ অংশগুলো সাদা হয়ে যাবে। সেগুলো রাখতে PNG বা WebP বেছে নিন।',
    stretchWarning: 'এই অনুপাত মূল ছবির থেকে আলাদা, তাই ছবিটি টানা বা চাপা দেখাবে।',
    enlargeNote: 'ছবি বড় করলে নতুন খুঁটিনাটি যোগ হয় না; ছবি কিছুটা ঝাপসা দেখাতে পারে।',
    filledNote: 'JPEG-এ স্বচ্ছতা নেই, তাই স্বচ্ছ অংশগুলো সাদা দিয়ে পূরণ করা হয়েছে।',
    fallbackNote:
      'এই ব্রাউজার {requested} ছবি সংরক্ষণ করতে পারে না, তাই ফলাফল {actual} হিসেবে সংরক্ষিত হয়েছে।',
    largerNote: 'রিসাইজ করা ফাইলটি মূল ফাইলের চেয়ে বড়।',
    lossyNote:
      'রিসাইজ করলে ছবি নতুন করে এনকোড হয়। JPEG ও WebP লসি কম্প্রেশন ব্যবহার করে (মান {q}%), তাই কিছুটা মান কমে; PNG লসলেস তবে সাধারণত বড়।',
    'err-empty': 'ফাইলটি খালি।',
    'err-too-large': 'ফাইলটি ২৫ MB-এর বেশি। ছোট কোনো ছবি বেছে নিন।',
    'err-unsupported': 'ফাইলটি JPEG, PNG বা WebP ছবি নয়।',
    'err-read': 'ফাইলটি পড়া যায়নি।',
    'err-decode': 'ছবিটি খোলা যায়নি। এটি নষ্ট হতে পারে, অথবা এই ব্রাউজার ফাইলটি পড়তে পারে না।',
    'err-too-many-pixels':
      'ছবিটি ৫০ মেগাপিক্সেলের বেশি, যা ব্রাউজারে নিরাপদে প্রসেস করার জন্য খুব বড়।',
    'err-canvas': 'আপনার ব্রাউজার এত বড় ছবি তৈরি করতে পারেনি। ছোট মাপ চেষ্টা করুন।',
    'err-encode': 'আপনার ব্রাউজার এই ফরম্যাটে ছবি সংরক্ষণ করতে পারেনি। অন্য ফরম্যাট চেষ্টা করুন।',
    'dim-invalid': 'পিক্সেলের একটি পূর্ণসংখ্যা লিখুন।',
    'dim-too-small': 'কমপক্ষে ১ পিক্সেল হতে হবে।',
    'dim-side-too-large': 'প্রতিটি দিক সর্বোচ্চ ৮,১৯২ পিক্সেল হতে পারে।',
    'dim-area-too-large':
      'রিসাইজ করা ছবি সর্বোচ্চ ১৬.৭ মেগাপিক্সেল হতে পারে (যেমন ৪,০৯৬ × ৪,০৯৬ পিক্সেল)।',
    keptPrevious: 'আপনার আগের ছবিটি খোলা আছে।',
    notesTitle: 'গোপনীয়তা, সীমা ও মান',
    n1: 'আপনার ছবি এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই খোলা ও রিসাইজ করা হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'রিসাইজ করা ফাইলে মূল ছবির মেটাডেটা (যেমন ক্যামেরার তথ্য বা GPS অবস্থান) থাকে না। ছবির ওরিয়েন্টেশন ট্যাগ অনুযায়ী সোজা করে দেখানো ও রিসাইজ করা হয়।',
    n3: 'সীমা: ফাইল সর্বোচ্চ ২৫ MB ও ৫০ মেগাপিক্সেল; ফলাফল প্রতি দিকে সর্বোচ্চ ৮,১৯২ পিক্সেল ও মোট ১৬.৭ মেগাপিক্সেল, যাতে ফোনেও কাজ করে।',
    n4: 'রিসাইজ লসলেস নয়। JPEG ও WebP মান ৯২%-এ সংরক্ষিত হয়। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

type FileErrorKey =
  | 'err-empty'
  | 'err-too-large'
  | 'err-unsupported'
  | 'err-read'
  | 'err-decode'
  | 'err-too-many-pixels';

interface Loaded {
  file: File;
  format: ImageFormat;
  decoded: DecodedImage;
}

interface StoredResult extends ResizeResult {
  requested: ImageFormat;
}

const PRESETS = [25, 50, 75, 100] as const;

/** Reads a small blob; falls back to FileReader where Blob.arrayBuffer is missing. */
function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('read'));
    reader.readAsArrayBuffer(blob);
  });
}
export const imageResizer: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const num = (n: number): string => formatInteger(n, ctx.lang);
  /** Field values: digits in the UI language, without thousands separators (parseDimension rejects them). */
  const plain = (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n));
  const bytesText = (n: number): string =>
    ctx.lang === 'bn' ? toBanglaDigits(formatBytes(n)) : formatBytes(n);
  const dims = (s: Size): string => L('dimensionsValue', { w: num(s.width), h: num(s.height) });

  let loaded: Loaded | null = null;
  let outputUrl: string | null = null;
  let busy = false;
  let disposed = false;
  let loadToken = 0;

  // ---------- Status and errors ----------
  const status = h('p', { class: 'image-status', role: 'status', 'aria-live': 'polite' });
  const alertBox = h('p', { class: 'image-alert', role: 'alert', hidden: '' });
  const say = (text: string): void => void (status.textContent = text);
  const showError = (text: string | null): void => {
    alertBox.textContent = text ?? '';
    alertBox.hidden = !text;
  };

  // ---------- Drop zone ----------
  const fileInput = h('input', {
    type: 'file',
    id: 'resize-file',
    class: 'file-input',
    accept: Object.values(FORMATS)
      .map((f) => f.mime)
      .join(','),
    'aria-describedby': 'resize-drop-hint',
  });
  const dropLabel = h('span', { class: 'drop-text' }, L('drop'));
  const dropzone = h(
    'div',
    { class: 'dropzone', id: 'resize-dropzone' },
    h('span', { class: 'dropzone-icon', 'aria-hidden': 'true' }, icon('upload', 28)),
    fileInput,
    h('label', { for: 'resize-file', class: 'btn btn-primary' }, L('choose')),
    dropLabel,
    h('p', { id: 'resize-drop-hint', class: 'field-hint' }, L('dropHint')),
  );

  // ---------- Original image ----------
  const originalImg = h('img', { class: 'image-preview', alt: L('originalAlt') });
  const originalMeta = h('dl', { class: 'result-list image-meta' });
  const replaceBtn = h(
    'button',
    { type: 'button', class: 'btn' },
    icon('upload', 18),
    L('replace'),
  );
  const resetBtn = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), L('reset'));
  const originalSection = h(
    'section',
    { class: 'image-card', 'aria-labelledby': 'resize-original-title', hidden: '' },
    h('h2', { id: 'resize-original-title', class: 'result-title' }, L('original')),
    h('div', { class: 'image-frame' }, originalImg),
    originalMeta,
    h('div', { class: 'form-actions' }, replaceBtn, resetBtn),
  );

  // ---------- Controls ----------
  const width = field(
    L('width'),
    textInput({ id: 'resize-width', inputmode: 'numeric', required: '' }),
  );
  const height = field(
    L('height'),
    textInput({ id: 'resize-height', inputmode: 'numeric', required: '' }),
  );
  bindMemo(width.control, ctx.memo, 'width');
  bindMemo(height.control, ctx.memo, 'height');
  const lock = checkbox(L('lock'), { id: 'resize-lock' });
  bindMemo(lock.input, ctx.memo, 'lock', '1');

  const presetButtons = PRESETS.map((p) => {
    const b = h(
      'button',
      { type: 'button', class: 'btn btn-small', 'aria-label': L('presetAria', { n: num(p) }) },
      L('presetLabel', { n: num(p) }),
    );
    b.addEventListener('click', () => {
      if (!loaded) return;
      const s = scaleByPercent(loaded.decoded, p);
      setFields(s);
      update();
    });
    return b;
  });
  const presetGroup = h(
    'fieldset',
    { class: 'preset-group' },
    h('legend', { class: 'field-label' }, L('presets')),
    h('div', { class: 'preset-buttons' }, ...presetButtons),
  );

  const formatOptions: Array<[string, string]> = [['same', '']];
  for (const f of ['jpeg', 'png', 'webp'] as const) formatOptions.push([f, FORMATS[f].label]);
  const formatSelect = field(L('outputFormat'), select(formatOptions, { id: 'resize-format' }));
  bindMemo(formatSelect.control, ctx.memo, 'format', 'same');
  for (const opt of formatSelect.control.querySelectorAll('option')) {
    const f = opt.value as FormatChoice;
    if (f !== 'same' && !canEncode(f)) {
      opt.disabled = true;
      opt.textContent = L('unsupportedFormat', { f: FORMATS[f].label });
    }
  }

  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const resizeBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'resize-submit' },
    L('resize'),
  );
  const form = h(
    'form',
    { class: 'tool-form image-controls', 'aria-labelledby': 'resize-controls-title', hidden: '' },
    h('h2', { id: 'resize-controls-title', class: 'result-title' }, L('newSize')),
    h('div', { class: 'field-grid' }, width.el, height.el),
    lock.el,
    presetGroup,
    h('div', { class: 'field-grid' }, formatSelect.el),
    warnings,
    h('div', { class: 'form-actions' }, resizeBtn),
  );
  form.noValidate = true;

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('resizedAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary', id: 'resize-download' },
    icon('download', 18),
    L('download'),
  );
  const outputHead = h(
    'div',
    { class: 'image-output', hidden: '' },
    h('div', { class: 'image-frame' }, outputImg),
    h('div', { class: 'form-actions' }, downloadLink),
  );
  const panel = resultPanel(ctx, L('resize'), { prepend: outputHead });
  panel.el.hidden = true;

  // ---------- Helpers ----------
  const currentFormat = (): ImageFormat | null =>
    loaded ? resolveOutputFormat(formatSelect.control.value as FormatChoice, loaded.format) : null;

  function setFields(s: Size): void {
    width.control.value = plain(s.width);
    height.control.value = plain(s.height);
    ctx.memo.width = width.control.value;
    ctx.memo.height = height.control.value;
  }

  /** Recompute warnings for the current inputs (never changes the fields). */
  function update(): void {
    warnings.replaceChildren();
    if (!loaded) return;
    const out = currentFormat();
    const items: string[] = [];
    if (out && transparencyRisk(loaded.format, out)) items.push(L('transparencyWarning'));
    const w = parseDimension(width.control.value);
    const hgt = parseDimension(height.control.value);
    if (w && hgt) {
      const o = loaded.decoded;
      if (Math.abs(w / hgt - o.width / o.height) > (o.width / o.height) * 0.01)
        items.push(L('stretchWarning'));
      if (w > o.width || hgt > o.height) items.push(L('enlargeNote'));
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
    for (const b of [resizeBtn, replaceBtn, resetBtn, ...presetButtons]) b.disabled = on;
    fileInput.disabled = on;
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showOriginal(l: Loaded): void {
    originalImg.src = l.decoded.url;
    originalMeta.replaceChildren(
      metaRow(L('dimensions'), dims(l.decoded)),
      metaRow(L('fileSize'), bytesText(l.file.size)),
      metaRow(L('format'), FORMATS[l.format].label),
    );
    const sameOpt = formatSelect.control.querySelector<HTMLOptionElement>('option[value="same"]');
    if (sameOpt) sameOpt.textContent = L('sameFormat', { f: FORMATS[l.format].label });
    dropzone.hidden = true;
    originalSection.hidden = false;
    form.hidden = false;
  }

  function showResult(r: StoredResult): void {
    if (!loaded) return;
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = outputFilename(loaded.file.name, r.size, r.format);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outputHead.hidden = false;
    panel.el.hidden = false;
    const pct = percentChange(loaded.file.size, r.blob.size);
    const change =
      pct < 0 ? L('smaller', { n: num(-pct) }) : pct > 0 ? L('larger', { n: num(pct) }) : L('same');
    const extra: string[] = [];
    if (r.format !== r.requested) {
      extra.push(
        L('fallbackNote', {
          requested: FORMATS[r.requested].label,
          actual: FORMATS[r.format].label,
        }),
      );
    }
    if (r.filledTransparency) extra.push(L('filledNote'));
    if (r.blob.size > loaded.file.size) extra.push(L('largerNote'));
    extra.push(L('lossyNote', { q: num(Math.round(ENCODE_QUALITY * 100)) }));
    panel.show(
      [
        { label: L('dimensions'), value: dims(r.size), primary: true },
        {
          label: L('fileSize'),
          value: `${bytesText(loaded.file.size)} → ${bytesText(r.blob.size)}`,
        },
        { label: L('change'), value: change },
        { label: L('format'), value: FORMATS[r.format].label },
      ],
      extra,
    );
  }

  function forgetImage(): void {
    loadToken++;
    releaseDecoded(loaded?.decoded);
    loaded = null;
    clearOutput();
    originalImg.removeAttribute('src');
    ctx.session.delete('file');
  }

  async function openFile(file: File, restoring = false): Promise<void> {
    const token = ++loadToken;
    showError(null);
    say(L('reading'));
    const fail = (key: FileErrorKey): void => {
      if (token !== loadToken || disposed) return;
      say('');
      showError(loaded ? `${L(key)} ${L('keptPrevious')}` : L(key));
    };
    let header: Uint8Array;
    try {
      header = new Uint8Array(await readBytes(file.slice(0, 16)));
    } catch {
      return fail('err-read');
    }
    const check = checkImageFile(file.size, header);
    if (!check.ok) return fail(`err-${check.error}`);
    let decoded: DecodedImage;
    try {
      decoded = await decodeImage(file);
    } catch {
      return fail('err-decode');
    }
    if (token !== loadToken || disposed) {
      releaseDecoded(decoded);
      return;
    }
    const sizeCheck = checkDecodedSize(decoded.width, decoded.height);
    if (!sizeCheck.ok) {
      releaseDecoded(decoded);
      return fail(sizeCheck.error === 'too-many-pixels' ? 'err-too-many-pixels' : 'err-decode');
    }
    const previous = loaded;
    releaseDecoded(previous?.decoded);
    if (!restoring) clearOutput();
    loaded = { file, format: check.value, decoded };
    ctx.session.set('file', file);
    if (
      !restoring ||
      !parseDimension(width.control.value) ||
      !parseDimension(height.control.value)
    ) {
      setFields(decoded);
    }
    showOriginal(loaded);
    update();
    say(L('loaded', { w: num(decoded.width), h: num(decoded.height) }));
    const stored = ctx.session.get('result') as StoredResult | undefined;
    if (restoring && stored) showResult(stored);
  }

  // ---------- Events ----------
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // allow choosing the same file again
    if (file) void openFile(file);
  });
  replaceBtn.addEventListener('click', () => fileInput.click());
  resetBtn.addEventListener('click', () => {
    forgetImage();
    for (const k of ['width', 'height', 'format', 'lock']) delete ctx.memo[k];
    width.control.value = height.control.value = '';
    lock.input.checked = true;
    formatSelect.control.value = 'same';
    [width, height].forEach((f) => f.setError(null));
    showError(null);
    say('');
    warnings.replaceChildren();
    originalSection.hidden = true;
    form.hidden = true;
    dropzone.hidden = false;
    fileInput.focus();
  });

  for (const type of ['dragenter', 'dragover'] as const) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add('dropzone-active');
      dropLabel.textContent = L('dropActive');
    });
  }
  for (const type of ['dragleave', 'drop'] as const) {
    dropzone.addEventListener(type, () => {
      dropzone.classList.remove('dropzone-active');
      dropLabel.textContent = L('drop');
    });
  }
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && !busy) void openFile(file);
  });

  width.control.addEventListener('input', () => {
    const w = parseDimension(width.control.value);
    if (loaded && lock.input.checked && w) {
      height.control.value = plain(heightForWidth(loaded.decoded, w));
      ctx.memo.height = height.control.value;
    }
    update();
  });
  height.control.addEventListener('input', () => {
    const hgt = parseDimension(height.control.value);
    if (loaded && lock.input.checked && hgt) {
      width.control.value = plain(widthForHeight(loaded.decoded, hgt));
      ctx.memo.width = width.control.value;
    }
    update();
  });
  lock.input.addEventListener('change', () => {
    const w = parseDimension(width.control.value);
    if (loaded && lock.input.checked && w) {
      height.control.value = plain(heightForWidth(loaded.decoded, w));
      ctx.memo.height = height.control.value;
    }
    update();
  });
  formatSelect.control.addEventListener('change', update);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void resize();
  });

  async function resize(): Promise<void> {
    if (busy || !loaded) return;
    showError(null);
    [width, height].forEach((f) => f.setError(null));
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
      const target = valid.error === 'side-too-large' && w <= IMAGE_LIMITS.maxSide ? height : width;
      target.setError(L(`dim-${valid.error}`));
      target.control.focus();
      return;
    }
    const requested = currentFormat() as ImageFormat;
    const source = loaded;
    setBusy(true);
    say(L('resizing'));
    try {
      const result = await resizeImage(
        source.decoded.image,
        valid.value,
        requested,
        FORMATS[source.format].alpha,
      );
      if (disposed || source !== loaded) return;
      const stored: StoredResult = { ...result, requested };
      ctx.session.set('result', stored);
      showResult(stored);
      say(L('done'));
      revealOutput();
    } catch (error) {
      if (disposed) return;
      const code = error instanceof ImageProcessingError ? error.code : 'canvas';
      say('');
      showError(L(`err-${code}`));
    } finally {
      if (!disposed) setBusy(false);
    }
  }

  function revealOutput(): void {
    const rect = panel.el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight && rect.top > window.innerHeight * 0.25) {
      panel.el.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }

  ctx.onCleanup(() => {
    disposed = true;
    loadToken++;
    releaseDecoded(loaded?.decoded);
    loaded = null;
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
  });

  // Restore after a language switch (the File stays in memory, never in storage).
  const restored = ctx.session.get('file');
  if (restored instanceof File) void openFile(restored, true);

  return h(
    'div',
    { class: 'tool-layout tool-layout-stacked image-tool' },
    h('div', { class: 'tool-form image-input' }, dropzone, status, alertBox, originalSection),
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};

function metaRow(label: string, value: string): HTMLElement {
  return h(
    'div',
    { class: 'result-row' },
    h('dt', {}, label),
    h('dd', {}, h('span', { class: 'result-value' }, value)),
  );
}
