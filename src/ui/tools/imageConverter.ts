import { clampQuality, compareSizes, QUALITY, usesQuality } from '../../calc/compress';
import { CONVERT_FORMATS, convertedFilename, defaultTargetFormat } from '../../calc/convert';
import { toBanglaDigits } from '../../calc/digits';
import {
  FORMATS,
  transparencyRisk,
  validateDimensions,
  type ImageFormat,
  type Size,
} from '../../calc/image';
import { defineStrings } from '../../i18n';
import { h, prefersReducedMotion } from '../../lib/dom';
import {
  canEncode,
  ENCODE_QUALITY,
  ImageProcessingError,
  openEncoder,
  type EncodedImage,
} from '../../lib/imageCanvas';
import { icon } from '../icons';
import { IMG, formatField, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import { field, notes, resultPanel, type ToolView } from './kit';

const S = defineStrings({
  en: {
    controls: 'Conversion settings',
    convertTo: 'Convert to',
    quality: 'Quality',
    qualityValue: '{n}%',
    qualityHint:
      'Applies to JPEG and WebP, which are lossy. Lower quality gives smaller files with more visible artefacts; no quality setting guarantees a particular file size.',
    pngNote:
      'PNG is lossless and keeps transparency. There is no quality setting for it, and PNG files are often larger than JPEG or WebP.',
    sameFormatNote:
      'This is the same format as the original, so the image is only re-encoded. Re-encoding a JPEG or WebP loses some detail.',
    convert: 'Convert image',
    converting: 'Converting…',
    done: 'Done. The converted image is ready to download.',
    convertedAlt: 'Preview of the converted image',
    download: 'Download converted image',
    downloadAria: 'Download converted image ({name})',
    outputFormat: 'Output format',
    originalFormat: 'Original format',
    outputSize: 'Output size',
    originalSize: 'Original size',
    change: 'Size difference',
    smaller: '{b} smaller ({p}%)',
    noChange: 'No change in size',
    larger: '{b} larger ({p}%)',
    usedQuality: 'Quality used',
    qualityNotUsed: 'Not used (PNG is lossless)',
    largerNote:
      'The converted file is larger than the original. That is normal when converting to PNG or from a strongly compressed image.',
    lossyNote:
      'JPEG and WebP are lossy: converting to them loses some detail, even at high quality.',
    'err-format': 'This browser cannot save {f} images. Choose another format in “Convert to”.',
    'err-none': 'This browser cannot save JPEG, PNG or WebP images, so nothing can be converted.',
    'err-size':
      'This image is too large to convert safely in a browser (more than 8,192 pixels per side or 16.7 megapixels). Make it smaller with the Image Resizer first.',
    notesTitle: 'Privacy, quality and limits',
    n1: 'Your image never leaves this device. It is converted by your browser; it is not uploaded, sent to any service or saved.',
    n2: 'Converting changes how the image is stored, not its pixel dimensions. It can reduce quality (JPEG, WebP) or increase the file size (often PNG). Sizes are shown honestly after converting.',
    n3: 'JPEG cannot store transparency: transparent areas become white. PNG and WebP keep transparency. Animated images are converted as a single still frame.',
    n4: 'The converted file does not include the original’s metadata, such as camera details or GPS location; photos are turned the right way up. Limits: files up to 25 MB; images up to 8,192 pixels per side and 16.7 megapixels. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    controls: 'রূপান্তরের সেটিংস',
    convertTo: 'যে ফরম্যাটে রূপান্তর',
    quality: 'মান (কোয়ালিটি)',
    qualityValue: '{n}%',
    qualityHint:
      'JPEG ও WebP-তে প্রযোজ্য, যেগুলো লসি। মান কমালে ফাইল ছোট হয়, তবে খুঁত বেশি দেখা যায়; কোনো মান নির্দিষ্ট ফাইল সাইজের নিশ্চয়তা দেয় না।',
    pngNote:
      'PNG লসলেস এবং স্বচ্ছতা রাখে। এর কোনো মান সেটিং নেই, আর PNG ফাইল প্রায়ই JPEG বা WebP-এর চেয়ে বড় হয়।',
    sameFormatNote:
      'এটি মূল ছবির একই ফরম্যাট, তাই ছবিটি শুধু নতুন করে এনকোড হবে। JPEG বা WebP নতুন করে এনকোড করলে কিছু খুঁটিনাটি হারায়।',
    convert: 'ছবি রূপান্তর করুন',
    converting: 'রূপান্তর হচ্ছে…',
    done: 'সম্পন্ন। রূপান্তরিত ছবি ডাউনলোডের জন্য প্রস্তুত।',
    convertedAlt: 'রূপান্তরিত ছবির প্রিভিউ',
    download: 'রূপান্তরিত ছবি ডাউনলোড করুন',
    downloadAria: 'রূপান্তরিত ছবি ডাউনলোড করুন ({name})',
    outputFormat: 'নতুন ফরম্যাট',
    originalFormat: 'মূল ফরম্যাট',
    outputSize: 'নতুন সাইজ',
    originalSize: 'মূল সাইজ',
    change: 'সাইজের পার্থক্য',
    smaller: '{b} ছোট ({p}%)',
    noChange: 'সাইজে কোনো পরিবর্তন নেই',
    larger: '{b} বড় ({p}%)',
    usedQuality: 'ব্যবহৃত মান',
    qualityNotUsed: 'ব্যবহৃত হয়নি (PNG লসলেস)',
    largerNote:
      'রূপান্তরিত ফাইলটি মূল ফাইলের চেয়ে বড়। PNG-তে রূপান্তর করলে বা খুব বেশি কম্প্রেস করা ছবি থেকে রূপান্তর করলে এমন হওয়া স্বাভাবিক।',
    lossyNote: 'JPEG ও WebP লসি: উচ্চ মানেও এগুলোতে রূপান্তর করলে কিছু খুঁটিনাটি হারায়।',
    'err-format':
      'এই ব্রাউজার {f} ছবি সংরক্ষণ করতে পারে না। “যে ফরম্যাটে রূপান্তর” থেকে অন্য ফরম্যাট বেছে নিন।',
    'err-none':
      'এই ব্রাউজার JPEG, PNG বা WebP ছবি সংরক্ষণ করতে পারে না, তাই কিছু রূপান্তর করা যাবে না।',
    'err-size':
      'ছবিটি ব্রাউজারে নিরাপদে রূপান্তরের জন্য খুব বড় (প্রতি দিকে ৮,১৯২ পিক্সেল বা ১৬.৭ মেগাপিক্সেলের বেশি)। আগে ছবি রিসাইজার দিয়ে ছোট করুন।',
    notesTitle: 'গোপনীয়তা, মান ও সীমা',
    n1: 'আপনার ছবি এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই রূপান্তর করা হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'রূপান্তরে ছবি কীভাবে সংরক্ষিত হয় তা বদলায়, পিক্সেলের মাপ নয়। এতে মান কমতে পারে (JPEG, WebP) বা ফাইল বড় হতে পারে (প্রায়ই PNG)। রূপান্তরের পর আসল সাইজ দেখানো হয়।',
    n3: 'JPEG স্বচ্ছতা রাখতে পারে না: স্বচ্ছ অংশ সাদা হয়ে যায়। PNG ও WebP স্বচ্ছতা রাখে। অ্যানিমেটেড ছবি একটি স্থির ফ্রেম হিসেবে রূপান্তরিত হয়।',
    n4: 'রূপান্তরিত ফাইলে মূল ছবির মেটাডেটা (যেমন ক্যামেরার তথ্য বা GPS অবস্থান) থাকে না; ছবি সোজা করে নেওয়া হয়। সীমা: ফাইল সর্বোচ্চ ২৫ MB; প্রতি দিকে ৮,১৯২ পিক্সেল ও ১৬.৭ মেগাপিক্সেল পর্যন্ত। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

interface StoredResult extends EncodedImage {
  size: Size;
  source: ImageFormat;
  /** Quality used (percent), or null for PNG. */
  quality: number | null;
  filledTransparency: boolean;
}

/** Default quality: the same 92 % the resizer and cropper use. */
const DEFAULT_QUALITY = Math.round(ENCODE_QUALITY * 100);

export const imageConverter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, bytes: bytesText, dims } = imageFormatters(ctx);
  const pct = (n: number): string => {
    const s = Math.abs(n).toFixed(1);
    return ctx.lang === 'bn' ? toBanglaDigits(s) : s;
  };

  let outputUrl: string | null = null;
  let busy = false;

  // ---------- Input (drop zone, file details, Replace/Reset) ----------
  const input = imageInput(ctx, {
    id: 'convert',
    preview: true,
    showName: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      // Suggest a format different from the source, but never override a choice the
      // user made (including across Replace image and a language switch).
      if (ctx.memo.formatChosen !== '1') {
        const suggested = defaultTargetFormat(image.format, canEncode);
        if (suggested) formatSelect.control.value = suggested;
      }
      form.hidden = false;
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      for (const k of ['format', 'formatChosen', 'quality']) delete ctx.memo[k];
      range.value = String(DEFAULT_QUALITY);
      update();
      form.hidden = true;
    },
  });
  const loaded = (): LoadedImage | null => input.current();

  // ---------- Controls ----------
  const formatSelect = formatField(ctx, 'convert-format', CONVERT_FORMATS, {
    includeSame: false,
    label: L('convertTo'),
  });
  const firstEncodable = CONVERT_FORMATS.find((f) => canEncode(f));
  const memoFormat = ctx.memo.format as ImageFormat | undefined;
  if (memoFormat && CONVERT_FORMATS.includes(memoFormat) && canEncode(memoFormat)) {
    formatSelect.control.value = memoFormat;
  } else if (firstEncodable) {
    formatSelect.control.value = firstEncodable;
  }

  const range = h('input', {
    type: 'range',
    id: 'convert-quality',
    class: 'quality-range',
    min: String(QUALITY.min),
    max: String(QUALITY.max),
    step: '1',
  });
  range.value = String(clampQuality(Number(ctx.memo.quality ?? DEFAULT_QUALITY)));
  const quality = field(L('quality'), range, { hint: L('qualityHint') });
  const qualityValue = h('output', {
    class: 'quality-value',
    for: range.id,
    'aria-hidden': 'true',
  });
  // Put the live percentage next to the slider, inside the labelled field.
  const rangeRow = h('div', { class: 'quality-field' });
  range.parentNode?.replaceChild(rangeRow, range);
  rangeRow.append(range, qualityValue);

  const pngNote = h('p', { class: 'field-hint', id: 'convert-png-note', hidden: '' }, L('pngNote'));
  const sameNote = h(
    'p',
    { class: 'field-hint', id: 'convert-same-note', hidden: '' },
    L('sameFormatNote'),
  );
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const convertBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'convert-submit' },
    L('convert'),
  );
  const form = h(
    'form',
    {
      class: 'tool-form image-controls compress-controls',
      'aria-labelledby': 'convert-controls-title',
      hidden: '',
    },
    h('h2', { id: 'convert-controls-title', class: 'result-title' }, L('controls')),
    h('div', { class: 'field-grid' }, formatSelect.el),
    h('div', { class: 'field-grid' }, quality.el),
    sameNote,
    pngNote,
    warnings,
    h('div', { class: 'form-actions' }, convertBtn),
  );
  form.noValidate = true;

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('convertedAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary', id: 'convert-download' },
    icon('download', 18),
    L('download'),
  );
  const outputHead = h(
    'div',
    { class: 'image-output', hidden: '' },
    h('div', { class: 'image-frame' }, outputImg),
    h('div', { class: 'form-actions' }, downloadLink),
  );
  const panel = resultPanel(ctx, L('convert'), { prepend: outputHead });
  panel.el.hidden = true;

  // ---------- Helpers ----------
  const selectedFormat = (): ImageFormat | null => {
    const v = formatSelect.control.value as ImageFormat;
    return CONVERT_FORMATS.includes(v) ? v : null;
  };

  /** Reflect the current settings: which controls apply, labels and warnings. */
  function update(): void {
    const q = clampQuality(Number(range.value));
    const label = L('qualityValue', { n: num(q) });
    qualityValue.textContent = label;
    range.setAttribute('aria-valuetext', label);
    ctx.memo.quality = String(q);
    const out = selectedFormat();
    if (out) ctx.memo.format = out;
    const lossy = out ? usesQuality(out) : true;
    // Hidden controls are skipped by keyboard and screen readers.
    quality.el.hidden = !lossy;
    pngNote.hidden = lossy;
    const image = loaded();
    sameNote.hidden = !(image && out && image.format === out);
    warnings.replaceChildren();
    if (image && out && transparencyRisk(image.format, out)) {
      warnings.append(h('li', {}, icon('alert', 16), I('transparencyWarning')));
    }
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
    convertBtn.disabled = on;
    formatSelect.control.disabled = range.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = convertedFilename(image.file.name, r.format);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outputHead.hidden = false;
    panel.el.hidden = false;
    const cmp = compareSizes(image.file.size, r.blob.size);
    const change =
      cmp.change === 'smaller'
        ? L('smaller', { b: bytesText(cmp.savedBytes), p: pct(cmp.savedPercent) })
        : cmp.change === 'larger'
          ? L('larger', { b: bytesText(-cmp.savedBytes), p: pct(cmp.savedPercent) })
          : L('noChange');
    const extra: string[] = [];
    if (r.filledTransparency) extra.push(I('filledNote'));
    if (cmp.change === 'larger') extra.push(L('largerNote'));
    extra.push(usesQuality(r.format) ? L('lossyNote') : L('pngNote'));
    panel.show(
      [
        { label: L('outputFormat'), value: FORMATS[r.format].label, primary: true },
        { label: L('originalFormat'), value: FORMATS[r.source].label },
        { label: I('dimensions'), value: dims(r.size) },
        { label: L('outputSize'), value: bytesText(r.blob.size) },
        { label: L('originalSize'), value: bytesText(image.file.size) },
        { label: L('change'), value: change },
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
  formatSelect.control.addEventListener('change', () => {
    ctx.memo.formatChosen = '1';
    update();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void convert();
  });

  async function convert(): Promise<void> {
    const source = loaded();
    if (busy || !source) return;
    input.showError(null);
    const requested = selectedFormat();
    if (!requested) {
      input.showError(L('err-none'));
      return;
    }
    const size: Size = { width: source.decoded.width, height: source.decoded.height };
    if (!validateDimensions(size.width, size.height).ok) {
      input.showError(L('err-size'));
      return;
    }
    if (!canEncode(requested)) {
      input.showError(L('err-format', { f: FORMATS[requested].label }));
      formatSelect.control.focus();
      return;
    }
    const lossy = usesQuality(requested);
    const q = clampQuality(Number(range.value));
    setBusy(true);
    input.say(L('converting'));
    let encoder: ReturnType<typeof openEncoder> | null = null;
    try {
      encoder = openEncoder(
        source.decoded.image,
        null,
        size,
        requested,
        FORMATS[source.format].alpha,
      );
      const out = await encoder.encode(lossy ? q / 100 : 1);
      // Never offer a file whose real format differs from the one chosen.
      if (out.format !== requested) throw new FormatMismatch();
      if (input.disposed() || source !== loaded()) return;
      const stored: StoredResult = {
        ...out,
        size,
        source: source.format,
        quality: lossy ? q : null,
        filledTransparency: encoder.filledTransparency,
      };
      ctx.session.set('result', stored);
      showResult(source, stored);
      input.say(L('done'));
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

  if (!firstEncodable) input.showError(L('err-none'));
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
