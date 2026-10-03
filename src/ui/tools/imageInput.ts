/**
 * Shared pieces of the image tools: the drop zone and file picker, the validated
 * loading pipeline (size, magic bytes, decode, pixel limit), the original-image card
 * with Replace/Reset, the "Save as" format list and shared strings.
 *
 * Privacy: the picked File is kept only in memory (`ctx.session`) so it survives a
 * language switch. It is never written to storage, logged or sent anywhere.
 */
import { toBanglaDigits } from '../../calc/digits';
import { formatInteger } from '../../calc/format';
import {
  checkDecodedSize,
  checkImageFile,
  FORMATS,
  formatBytes,
  type ImageFormat,
  type Size,
} from '../../calc/image';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { canEncode, decodeImage, releaseDecoded, type DecodedImage } from '../../lib/imageCanvas';
import { icon } from '../icons';
import { field, select, type Field, type ToolContext } from './kit';

export const IMG = defineStrings({
  en: {
    choose: 'Choose an image',
    drop: 'or drag and drop it here',
    dropHint: 'JPEG, PNG or WebP, up to 25 MB.',
    dropActive: 'Drop the image to open it',
    original: 'Original image',
    fileName: 'File name',
    originalAlt: 'Preview of the original image',
    dimensions: 'Dimensions',
    dimensionsValue: '{w} × {h} px',
    fileSize: 'File size',
    format: 'Format',
    replace: 'Replace image',
    reset: 'Reset',
    reading: 'Opening image…',
    loaded: 'Image opened: {w} × {h} pixels.',
    outputFormat: 'Save as',
    sameFormat: 'Same as original ({f})',
    unsupportedFormat: '{f} (not supported by this browser)',
    transparencyWarning:
      'JPEG cannot store transparency. Any transparent areas will become white. Choose PNG or WebP to keep them.',
    filledNote: 'Transparent areas were filled with white because JPEG has no transparency.',
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
    keptPrevious: 'Your current image is still open.',
  },
  bn: {
    choose: 'একটি ছবি বেছে নিন',
    drop: 'অথবা এখানে টেনে এনে ছেড়ে দিন',
    dropHint: 'JPEG, PNG বা WebP, সর্বোচ্চ ২৫ MB।',
    dropActive: 'ছবিটি খুলতে এখানে ছেড়ে দিন',
    original: 'মূল ছবি',
    fileName: 'ফাইলের নাম',
    originalAlt: 'মূল ছবির প্রিভিউ',
    dimensions: 'মাপ',
    dimensionsValue: '{w} × {h} পিক্সেল',
    fileSize: 'ফাইলের আকার',
    format: 'ফরম্যাট',
    replace: 'ছবি বদলান',
    reset: 'রিসেট',
    reading: 'ছবি খোলা হচ্ছে…',
    loaded: 'ছবি খোলা হয়েছে: {w} × {h} পিক্সেল।',
    outputFormat: 'যে ফরম্যাটে সংরক্ষণ',
    sameFormat: 'মূলের মতো ({f})',
    unsupportedFormat: '{f} (এই ব্রাউজারে সমর্থিত নয়)',
    transparencyWarning:
      'JPEG স্বচ্ছতা (transparency) রাখতে পারে না। স্বচ্ছ অংশগুলো সাদা হয়ে যাবে। সেগুলো রাখতে PNG বা WebP বেছে নিন।',
    filledNote: 'JPEG-এ স্বচ্ছতা নেই, তাই স্বচ্ছ অংশগুলো সাদা দিয়ে পূরণ করা হয়েছে।',
    'err-empty': 'ফাইলটি খালি।',
    'err-too-large': 'ফাইলটি ২৫ MB-এর বেশি। ছোট কোনো ছবি বেছে নিন।',
    'err-unsupported': 'ফাইলটি JPEG, PNG বা WebP ছবি নয়।',
    'err-read': 'ফাইলটি পড়া যায়নি।',
    'err-decode': 'ছবিটি খোলা যায়নি। এটি নষ্ট হতে পারে, অথবা এই ব্রাউজার ফাইলটি পড়তে পারে না।',
    'err-too-many-pixels':
      'ছবিটি ৫০ মেগাপিক্সেলের বেশি, যা ব্রাউজারে নিরাপদে প্রসেস করার জন্য খুব বড়।',
    'err-canvas': 'আপনার ব্রাউজার এত বড় ছবি তৈরি করতে পারেনি। ছোট মাপ চেষ্টা করুন।',
    'err-encode': 'আপনার ব্রাউজার এই ফরম্যাটে ছবি সংরক্ষণ করতে পারেনি। অন্য ফরম্যাট চেষ্টা করুন।',
    keptPrevious: 'আপনার আগের ছবিটি খোলা আছে।',
  },
});

type FileErrorKey =
  | 'err-empty'
  | 'err-too-large'
  | 'err-unsupported'
  | 'err-read'
  | 'err-decode'
  | 'err-too-many-pixels';

export interface LoadedImage {
  file: File;
  format: ImageFormat;
  decoded: DecodedImage;
}

/** Number formatting helpers in the UI language. */
export function imageFormatters(ctx: ToolContext) {
  const L = IMG(ctx.lang);
  const num = (n: number): string => formatInteger(n, ctx.lang);
  return {
    num,
    /** Field values: digits in the UI language, without thousands separators. */
    plain: (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n)),
    bytes: (n: number): string =>
      ctx.lang === 'bn' ? toBanglaDigits(formatBytes(n)) : formatBytes(n),
    dims: (s: Size): string => L('dimensionsValue', { w: num(s.width), h: num(s.height) }),
  };
}

/** Reads a small blob; falls back to FileReader where Blob.arrayBuffer is missing. */
export function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('read'));
    reader.readAsArrayBuffer(blob);
  });
}

export function metaRow(label: string, value: string, wrap = false): HTMLElement {
  return h(
    'div',
    { class: 'result-row' },
    h('dt', {}, label),
    h(
      'dd',
      {},
      h('span', { class: wrap ? 'result-value image-file-name' : 'result-value' }, value),
    ),
  );
}

/**
 * "Save as" list: "same as original" plus the given formats in order. Formats this
 * browser's canvas cannot encode are disabled and labelled.
 */
export function formatField(
  ctx: ToolContext,
  id: string,
  order: readonly ImageFormat[],
): Field<HTMLSelectElement> & { setSource(format: ImageFormat): void } {
  const L = IMG(ctx.lang);
  const options: Array<[string, string]> = [['same', '']];
  for (const f of order) options.push([f, FORMATS[f].label]);
  const f = field(L('outputFormat'), select(options, { id }));
  for (const opt of f.control.querySelectorAll('option')) {
    const v = opt.value as ImageFormat | 'same';
    if (v !== 'same' && !canEncode(v)) {
      opt.disabled = true;
      opt.textContent = L('unsupportedFormat', { f: FORMATS[v].label });
    }
  }
  return {
    ...f,
    setSource(format) {
      const same = f.control.querySelector<HTMLOptionElement>('option[value="same"]');
      if (same) same.textContent = L('sameFormat', { f: FORMATS[format].label });
    },
  };
}

export interface ImageInputOptions {
  /** Prefix for element ids, e.g. `resize` → `#resize-file`, `#resize-dropzone`. */
  id: string;
  /** Show the original image inside the card (the cropper shows it in its editor instead). */
  preview: boolean;
  /** Also show the file name in the original-image details. */
  showName?: boolean;
  isBusy(): boolean;
  /** A new image was opened (the previous one is already released). */
  onLoad(image: LoadedImage, restoring: boolean): void;
  /** The image was closed with Reset; the tool clears its own state. */
  onReset(): void;
}

export interface ImageInput {
  /** Drop zone, status, alert and original-image card. */
  el: HTMLElement;
  fileInput: HTMLInputElement;
  current(): LoadedImage | null;
  say(text: string): void;
  showError(text: string | null): void;
  /** Disable Replace/Reset/file input while the tool is working. */
  setBusy(on: boolean): void;
  disposed(): boolean;
  /** Reopen the in-memory file after a language switch. Call once the view is built. */
  restore(): void;
}

export function imageInput(ctx: ToolContext, opts: ImageInputOptions): ImageInput {
  const L = IMG(ctx.lang);
  const fmt = imageFormatters(ctx);
  let loaded: LoadedImage | null = null;
  let isDisposed = false;
  let loadToken = 0;

  const status = h('p', { class: 'image-status', role: 'status', 'aria-live': 'polite' });
  const alertBox = h('p', { class: 'image-alert', role: 'alert', hidden: '' });
  const say = (text: string): void => void (status.textContent = text);
  const showError = (text: string | null): void => {
    alertBox.textContent = text ?? '';
    alertBox.hidden = !text;
  };

  const fileInput = h('input', {
    type: 'file',
    id: `${opts.id}-file`,
    class: 'file-input',
    accept: Object.values(FORMATS)
      .map((f) => f.mime)
      .join(','),
    'aria-describedby': `${opts.id}-drop-hint`,
  });
  const dropLabel = h('span', { class: 'drop-text' }, L('drop'));
  const dropzone = h(
    'div',
    { class: 'dropzone', id: `${opts.id}-dropzone` },
    h('span', { class: 'dropzone-icon', 'aria-hidden': 'true' }, icon('upload', 28)),
    fileInput,
    h('label', { for: fileInput.id, class: 'btn btn-primary' }, L('choose')),
    dropLabel,
    h('p', { id: `${opts.id}-drop-hint`, class: 'field-hint' }, L('dropHint')),
  );

  const originalImg = opts.preview
    ? h('img', { class: 'image-preview', alt: L('originalAlt') })
    : null;
  const originalMeta = h('dl', { class: 'result-list image-meta' });
  const replaceBtn = h(
    'button',
    { type: 'button', class: 'btn' },
    icon('upload', 18),
    L('replace'),
  );
  const resetBtn = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), L('reset'));
  const card = h(
    'section',
    { class: 'image-card', 'aria-labelledby': `${opts.id}-original-title`, hidden: '' },
    h('h2', { id: `${opts.id}-original-title`, class: 'result-title' }, L('original')),
    originalImg ? h('div', { class: 'image-frame' }, originalImg) : null,
    originalMeta,
    h('div', { class: 'form-actions' }, replaceBtn, resetBtn),
  );

  async function openFile(file: File, restoring = false): Promise<void> {
    const token = ++loadToken;
    showError(null);
    say(L('reading'));
    const fail = (key: FileErrorKey): void => {
      if (token !== loadToken || isDisposed) return;
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
    if (token !== loadToken || isDisposed) {
      releaseDecoded(decoded);
      return;
    }
    const sizeCheck = checkDecodedSize(decoded.width, decoded.height);
    if (!sizeCheck.ok) {
      releaseDecoded(decoded);
      return fail(sizeCheck.error === 'too-many-pixels' ? 'err-too-many-pixels' : 'err-decode');
    }
    releaseDecoded(loaded?.decoded);
    loaded = { file, format: check.value, decoded };
    ctx.session.set('file', file);
    if (originalImg) originalImg.src = decoded.url;
    originalMeta.replaceChildren(
      ...(opts.showName ? [metaRow(L('fileName'), file.name, true)] : []),
      metaRow(L('dimensions'), fmt.dims(decoded)),
      metaRow(L('fileSize'), fmt.bytes(file.size)),
      metaRow(L('format'), FORMATS[check.value].label),
    );
    dropzone.hidden = true;
    card.hidden = false;
    opts.onLoad(loaded, restoring);
    say(L('loaded', { w: fmt.num(decoded.width), h: fmt.num(decoded.height) }));
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // allow choosing the same file again
    if (file) void openFile(file);
  });
  replaceBtn.addEventListener('click', () => fileInput.click());
  resetBtn.addEventListener('click', () => {
    loadToken++;
    releaseDecoded(loaded?.decoded);
    loaded = null;
    originalImg?.removeAttribute('src');
    ctx.session.delete('file');
    showError(null);
    say('');
    card.hidden = true;
    dropzone.hidden = false;
    opts.onReset();
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
    if (file && !opts.isBusy()) void openFile(file);
  });

  ctx.onCleanup(() => {
    isDisposed = true;
    loadToken++;
    releaseDecoded(loaded?.decoded);
    loaded = null;
  });

  return {
    el: h('div', { class: 'tool-form image-input' }, dropzone, status, alertBox, card),
    fileInput,
    current: () => loaded,
    say,
    showError,
    setBusy(on) {
      replaceBtn.disabled = resetBtn.disabled = fileInput.disabled = on;
    },
    disposed: () => isDisposed,
    restore() {
      const file = ctx.session.get('file');
      if (file instanceof File) void openFile(file, true);
    },
  };
}
