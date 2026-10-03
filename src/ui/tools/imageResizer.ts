import {
  FORMATS,
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
  ENCODE_QUALITY,
  ImageProcessingError,
  resizeImage,
  type ResizeResult,
} from '../../lib/imageCanvas';
import { icon } from '../icons';
import { IMG, formatField, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import { bindMemo, checkbox, field, notes, resultPanel, textInput, type ToolView } from './kit';

const S = defineStrings({
  en: {
    resizedAlt: 'Preview of the resized image',
    change: 'Change in file size',
    smaller: '{n}% smaller',
    larger: '{n}% larger',
    same: 'About the same',
    newSize: 'New size',
    width: 'Width (pixels)',
    height: 'Height (pixels)',
    lock: 'Keep aspect ratio',
    presets: 'Quick sizes',
    presetLabel: '{n}%',
    presetAria: 'Set size to {n}% of the original',
    resize: 'Resize image',
    resizing: 'Resizing…',
    done: 'Done. The resized image is ready to download.',
    download: 'Download resized image',
    downloadAria: 'Download resized image ({name})',
    stretchWarning:
      'These proportions differ from the original, so the image will be stretched or squashed.',
    enlargeNote: 'Enlarging an image cannot add detail; it may look soft or blurry.',
    fallbackNote:
      'This browser cannot save {requested} images, so the result was saved as {actual}.',
    largerNote: 'The resized file is larger than the original file.',
    lossyNote:
      'Resizing re-encodes the image. JPEG and WebP use lossy compression (quality {q}%), so some quality is lost; PNG is lossless but usually larger.',
    'dim-invalid': 'Enter a whole number of pixels.',
    'dim-too-small': 'Must be at least 1 pixel.',
    'dim-side-too-large': 'Each side can be at most 8,192 pixels.',
    'dim-area-too-large':
      'The resized image can have at most 16.7 megapixels (for example 4,096 × 4,096 pixels).',
    notesTitle: 'Privacy, limits and quality',
    n1: 'Your image never leaves this device. It is opened and resized by your browser; it is not uploaded, sent to any service or saved.',
    n2: 'The resized file does not include the original’s metadata, such as camera details or GPS location. Photos are shown and resized the right way up, following their orientation tag.',
    n3: 'Limits: files up to 25 MB and 50 megapixels; output up to 8,192 pixels per side and 16.7 megapixels in total, so it also works on phones.',
    n4: 'Resizing is not lossless. JPEG and WebP are saved at quality 92%. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    resizedAlt: 'রিসাইজ করা ছবির প্রিভিউ',
    change: 'ফাইলের আকারে পরিবর্তন',
    smaller: '{n}% ছোট',
    larger: '{n}% বড়',
    same: 'প্রায় একই',
    newSize: 'নতুন মাপ',
    width: 'প্রস্থ (পিক্সেল)',
    height: 'উচ্চতা (পিক্সেল)',
    lock: 'অনুপাত ঠিক রাখুন',
    presets: 'দ্রুত মাপ',
    presetLabel: '{n}%',
    presetAria: 'মূল মাপের {n}% করুন',
    resize: 'ছবি রিসাইজ করুন',
    resizing: 'রিসাইজ হচ্ছে…',
    done: 'সম্পন্ন। রিসাইজ করা ছবি ডাউনলোডের জন্য প্রস্তুত।',
    download: 'রিসাইজ করা ছবি ডাউনলোড করুন',
    downloadAria: 'রিসাইজ করা ছবি ডাউনলোড করুন ({name})',
    stretchWarning: 'এই অনুপাত মূল ছবির থেকে আলাদা, তাই ছবিটি টানা বা চাপা দেখাবে।',
    enlargeNote: 'ছবি বড় করলে নতুন খুঁটিনাটি যোগ হয় না; ছবি কিছুটা ঝাপসা দেখাতে পারে।',
    fallbackNote:
      'এই ব্রাউজার {requested} ছবি সংরক্ষণ করতে পারে না, তাই ফলাফল {actual} হিসেবে সংরক্ষিত হয়েছে।',
    largerNote: 'রিসাইজ করা ফাইলটি মূল ফাইলের চেয়ে বড়।',
    lossyNote:
      'রিসাইজ করলে ছবি নতুন করে এনকোড হয়। JPEG ও WebP লসি কম্প্রেশন ব্যবহার করে (মান {q}%), তাই কিছুটা মান কমে; PNG লসলেস তবে সাধারণত বড়।',
    'dim-invalid': 'পিক্সেলের একটি পূর্ণসংখ্যা লিখুন।',
    'dim-too-small': 'কমপক্ষে ১ পিক্সেল হতে হবে।',
    'dim-side-too-large': 'প্রতিটি দিক সর্বোচ্চ ৮,১৯২ পিক্সেল হতে পারে।',
    'dim-area-too-large':
      'রিসাইজ করা ছবি সর্বোচ্চ ১৬.৭ মেগাপিক্সেল হতে পারে (যেমন ৪,০৯৬ × ৪,০৯৬ পিক্সেল)।',
    notesTitle: 'গোপনীয়তা, সীমা ও মান',
    n1: 'আপনার ছবি এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই খোলা ও রিসাইজ করা হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'রিসাইজ করা ফাইলে মূল ছবির মেটাডেটা (যেমন ক্যামেরার তথ্য বা GPS অবস্থান) থাকে না। ছবির ওরিয়েন্টেশন ট্যাগ অনুযায়ী সোজা করে দেখানো ও রিসাইজ করা হয়।',
    n3: 'সীমা: ফাইল সর্বোচ্চ ২৫ MB ও ৫০ মেগাপিক্সেল; ফলাফল প্রতি দিকে সর্বোচ্চ ৮,১৯২ পিক্সেল ও মোট ১৬.৭ মেগাপিক্সেল, যাতে ফোনেও কাজ করে।',
    n4: 'রিসাইজ লসলেস নয়। JPEG ও WebP মান ৯২%-এ সংরক্ষিত হয়। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

interface StoredResult extends ResizeResult {
  requested: ImageFormat;
}

const PRESETS = [25, 50, 75, 100] as const;

export const imageResizer: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, plain, bytes: bytesText, dims } = imageFormatters(ctx);

  let outputUrl: string | null = null;
  let busy = false;

  // ---------- Input (drop zone, original image, Replace/Reset) ----------
  const input = imageInput(ctx, {
    id: 'resize',
    preview: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      if (
        !restoring ||
        !parseDimension(width.control.value) ||
        !parseDimension(height.control.value)
      ) {
        setFields(image.decoded);
      }
      formatSelect.setSource(image.format);
      form.hidden = false;
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      for (const k of ['width', 'height', 'format', 'lock']) delete ctx.memo[k];
      width.control.value = height.control.value = '';
      lock.input.checked = true;
      formatSelect.control.value = 'same';
      [width, height].forEach((f) => f.setError(null));
      warnings.replaceChildren();
      form.hidden = true;
    },
  });
  const loaded = (): LoadedImage | null => input.current();

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
      const image = loaded();
      if (!image) return;
      setFields(scaleByPercent(image.decoded, p));
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

  const formatSelect = formatField(ctx, 'resize-format', ['jpeg', 'png', 'webp']);
  bindMemo(formatSelect.control, ctx.memo, 'format', 'same');

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
  const currentFormat = (): ImageFormat | null => {
    const image = loaded();
    return image
      ? resolveOutputFormat(formatSelect.control.value as FormatChoice, image.format)
      : null;
  };

  function setFields(s: Size): void {
    width.control.value = plain(s.width);
    height.control.value = plain(s.height);
    ctx.memo.width = width.control.value;
    ctx.memo.height = height.control.value;
  }

  /** Recompute warnings for the current inputs (never changes the fields). */
  function update(): void {
    warnings.replaceChildren();
    const image = loaded();
    if (!image) return;
    const out = currentFormat();
    const items: string[] = [];
    if (out && transparencyRisk(image.format, out)) items.push(I('transparencyWarning'));
    const w = parseDimension(width.control.value);
    const hgt = parseDimension(height.control.value);
    if (w && hgt) {
      const o = image.decoded;
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
    for (const b of [resizeBtn, ...presetButtons]) b.disabled = on;
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
    const pct = percentChange(image.file.size, r.blob.size);
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
    if (r.filledTransparency) extra.push(I('filledNote'));
    if (r.blob.size > image.file.size) extra.push(L('largerNote'));
    extra.push(L('lossyNote', { q: num(Math.round(ENCODE_QUALITY * 100)) }));
    panel.show(
      [
        { label: I('dimensions'), value: dims(r.size), primary: true },
        {
          label: I('fileSize'),
          value: `${bytesText(image.file.size)} → ${bytesText(r.blob.size)}`,
        },
        { label: L('change'), value: change },
        { label: I('format'), value: FORMATS[r.format].label },
      ],
      extra,
    );
  }

  // ---------- Events ----------
  width.control.addEventListener('input', () => {
    const w = parseDimension(width.control.value);
    const image = loaded();
    if (image && lock.input.checked && w) {
      height.control.value = plain(heightForWidth(image.decoded, w));
      ctx.memo.height = height.control.value;
    }
    update();
  });
  height.control.addEventListener('input', () => {
    const hgt = parseDimension(height.control.value);
    const image = loaded();
    if (image && lock.input.checked && hgt) {
      width.control.value = plain(widthForHeight(image.decoded, hgt));
      ctx.memo.width = width.control.value;
    }
    update();
  });
  lock.input.addEventListener('change', () => {
    const w = parseDimension(width.control.value);
    const image = loaded();
    if (image && lock.input.checked && w) {
      height.control.value = plain(heightForWidth(image.decoded, w));
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
    const source = loaded();
    if (busy || !source) return;
    input.showError(null);
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
    setBusy(true);
    input.say(L('resizing'));
    try {
      const result = await resizeImage(
        source.decoded.image,
        valid.value,
        requested,
        FORMATS[source.format].alpha,
      );
      if (input.disposed() || source !== loaded()) return;
      const stored: StoredResult = { ...result, requested };
      ctx.session.set('result', stored);
      showResult(source, stored);
      input.say(L('done'));
      revealOutput();
    } catch (error) {
      if (input.disposed()) return;
      const code = error instanceof ImageProcessingError ? error.code : 'canvas';
      input.say('');
      input.showError(I(`err-${code}`));
    } finally {
      if (!input.disposed()) setBusy(false);
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
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
  });

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
