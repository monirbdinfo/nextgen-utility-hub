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
import { icon } from '../icons';
import { IMG, formatField, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import { bindMemo, field, notes, resultPanel, textInput, type ToolView } from './kit';

const S = defineStrings({
  en: {
    controls: 'Compression settings',
    mode: 'Compress by',
    modeQuality: 'Quality',
    modeTarget: 'Target file size',
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
    modeTarget: 'লক্ষ্য ফাইল সাইজ',
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

type Mode = 'quality' | 'target';

interface StoredResult extends EncodedImage {
  size: Size;
  /** Quality actually used (percent), or null for PNG. */
  quality: number | null;
  filledTransparency: boolean;
  target: { bytes: number; reached: boolean } | null;
}

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
    preview: true,
    showName: true,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      formatSelect.setSource(image.format);
      form.hidden = false;
      update();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      for (const k of ['format', 'quality', 'mode', 'target']) delete ctx.memo[k];
      formatSelect.control.value = 'same';
      quality.control.value = String(QUALITY.default);
      for (const r of modeRadios) r.checked = r.value === 'quality';
      target.control.value = '';
      target.setError(null);
      update();
      form.hidden = true;
    },
  });
  const loaded = (): LoadedImage | null => input.current();

  // ---------- Controls ----------
  const formatSelect = formatField(ctx, 'compress-format', ['jpeg', 'webp', 'png']);
  bindMemo(formatSelect.control, ctx.memo, 'format', 'same');

  const savedMode: Mode = ctx.memo.mode === 'target' ? 'target' : 'quality';
  const modeRadios = (['quality', 'target'] as const).map((value) => {
    const r = h('input', {
      type: 'radio',
      name: 'compress-mode',
      id: `compress-mode-${value}`,
      value,
      class: 'check-input',
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
    { class: 'radio-group' },
    h('legend', { class: 'field-label' }, L('mode')),
    ...modeRadios.map((r) =>
      h(
        'div',
        { class: 'check' },
        r,
        h('label', { for: r.id }, L(r.value === 'quality' ? 'modeQuality' : 'modeTarget')),
      ),
    ),
  );
  const mode = (): Mode => (modeRadios[1]?.checked ? 'target' : 'quality');

  const range = h('input', {
    type: 'range',
    id: 'compress-quality',
    class: 'quality-range',
    min: String(QUALITY.min),
    max: String(QUALITY.max),
    step: '1',
  });
  range.value = String(clampQuality(Number(ctx.memo.quality ?? QUALITY.default)));
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

  const target = field(L('target'), textInput({ id: 'compress-target', inputmode: 'decimal' }), {
    hint: L('targetHint'),
  });
  bindMemo(target.control, ctx.memo, 'target');

  const pngNote = h(
    'p',
    { class: 'field-hint', id: 'compress-png-note', hidden: '' },
    L('pngNote'),
  );
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const compressBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'compress-submit' },
    L('compress'),
  );
  const form = h(
    'form',
    {
      class: 'tool-form image-controls compress-controls',
      'aria-labelledby': 'compress-controls-title',
      hidden: '',
    },
    h('h2', { id: 'compress-controls-title', class: 'result-title' }, L('controls')),
    h('div', { class: 'field-grid' }, formatSelect.el),
    modeGroup,
    h('div', { class: 'field-grid' }, quality.el, target.el),
    pngNote,
    warnings,
    h('div', { class: 'form-actions' }, compressBtn),
  );
  form.noValidate = true;

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('compressedAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary', id: 'compress-download' },
    icon('download', 18),
    L('download'),
  );
  const outputHead = h(
    'div',
    { class: 'image-output', hidden: '' },
    h('div', { class: 'image-frame' }, outputImg),
    h('div', { class: 'form-actions' }, downloadLink),
  );
  const panel = resultPanel(ctx, L('compress'), { prepend: outputHead });
  panel.el.hidden = true;

  // ---------- Helpers ----------
  const requestedFormat = (image: LoadedImage): ImageFormat =>
    resolveOutputFormat(formatSelect.control.value as FormatChoice, image.format);

  /** Reflect the current settings: which controls apply, labels and warnings. */
  function update(): void {
    const q = clampQuality(Number(range.value));
    const label = L('qualityValue', { n: num(q) });
    qualityValue.textContent = label;
    range.setAttribute('aria-valuetext', label);
    ctx.memo.quality = String(q);
    const image = loaded();
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
    compressBtn.disabled = on;
    for (const el of [formatSelect.control, range, target.control, ...modeRadios]) el.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = compressedFilename(image.file.name, r.format, r.quality);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outputHead.hidden = false;
    panel.el.hidden = false;
    const cmp = compareSizes(image.file.size, r.blob.size);
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
  formatSelect.control.addEventListener('change', update);
  target.control.addEventListener('input', () => target.setError(null));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void compress();
  });

  async function compress(): Promise<void> {
    const source = loaded();
    if (busy || !source) return;
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
        formatSelect.control.focus();
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
