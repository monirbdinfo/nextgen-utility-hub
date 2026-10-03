import {
  arrowDelta,
  aspectRatio,
  ASPECTS,
  applyRatio,
  displayToSource,
  HANDLES,
  initialRect,
  isAspectId,
  keyStep,
  largestSize,
  moveRect,
  rectFromFields,
  rectsEqual,
  rectToPercent,
  resizeRect,
  type AspectId,
  type CropField,
  type Handle,
  type Rect,
} from '../../calc/crop';
import {
  croppedFilename,
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
  cropImage,
  ENCODE_QUALITY,
  ImageProcessingError,
  type ResizeResult,
} from '../../lib/imageCanvas';
import { icon } from '../icons';
import { IMG, formatField, imageFormatters, imageInput, type LoadedImage } from './imageInput';
import {
  bindMemo,
  field,
  notes,
  resultPanel,
  select,
  textInput,
  type Field,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    editor: 'Crop area',
    editorAlt: 'Image being cropped',
    selectionLabel: 'Crop selection. Arrow keys move it.',
    resizeLabel: 'Bottom-right corner of the crop selection. Arrow keys resize it.',
    keysHint:
      'Drag the box to move it and drag its handles to resize it. With a keyboard, focus the box and use the arrow keys to move it, or focus its bottom-right corner and use the arrow keys to resize it. Hold Shift for 10-pixel steps.',
    announce: 'Crop area {w} × {h} pixels at X {x}, Y {y}.',
    controls: 'Crop settings',
    aspect: 'Aspect ratio',
    aspectHint:
      'Passport-style is only a 35:45 shape, not an official photo size. Check the rules for your document.',
    'a-free': 'Freeform',
    'a-1:1': 'Square (1:1)',
    'a-4:3': '4:3',
    'a-3:2': '3:2',
    'a-16:9': '16:9 (wide)',
    'a-3:4': 'Portrait 3:4',
    'a-2:3': 'Portrait 2:3',
    'a-passport': 'Passport-style 35:45 (shape only)',
    x: 'X — from left (pixels)',
    y: 'Y — from top (pixels)',
    width: 'Width (pixels)',
    height: 'Height (pixels)',
    pixelsHint:
      'All values are pixels of the original image, measured from its top-left corner. Changes apply when you leave a field or press Enter.',
    selectAll: 'Select whole image',
    crop: 'Crop image',
    cropping: 'Cropping…',
    done: 'Done. The cropped image is ready to download.',
    croppedAlt: 'Preview of the cropped image',
    download: 'Download cropped image',
    downloadAria: 'Download cropped image ({name})',
    position: 'Position in original',
    positionValue: 'X {x}, Y {y}',
    exactNote: 'PNG keeps the selected pixels exactly; nothing is resized.',
    lossyNote:
      'Nothing is resized, but {f} re-encodes the image with lossy compression (quality {q}%), so some quality is lost. Choose PNG to keep the pixels exactly.',
    'err-format': 'This browser cannot save {f} images. Choose another format in “Save as”.',
    'err-size':
      'The crop is too large to save in a browser: at most 8,192 pixels per side and 16.7 megapixels in total. Make the selection smaller.',
    'f-invalid': 'Enter a whole number of pixels.',
    'f-too-small': 'Must be at least 1 pixel.',
    'f-past-right': 'The crop goes past the right edge. X + width can be at most {n} pixels.',
    'f-past-bottom': 'The crop goes past the bottom edge. Y + height can be at most {n} pixels.',
    'f-ratio-no-fit':
      'At {ratio}, this size does not fit inside the image from the current position. Enter a smaller value or move the crop first.',
    notesTitle: 'Privacy, coordinates and limits',
    n1: 'Your image never leaves this device. It is opened and cropped by your browser; it is not uploaded, sent to any service or saved.',
    n2: 'Cropping copies the selected pixels at their original size. Coordinates are pixels of the original image, measured from its top-left corner after the photo’s orientation tag is applied.',
    n3: 'The cropped file does not include the original’s metadata, such as camera details or GPS location.',
    n4: 'Limits: files up to 25 MB and 50 megapixels; a crop can be at most 8,192 pixels per side and 16.7 megapixels. JPEG and WebP are saved at quality 92%. Whether WebP can be saved depends on the browser (Safari cannot).',
  },
  bn: {
    editor: 'ক্রপের জায়গা',
    editorAlt: 'যে ছবিটি ক্রপ করা হচ্ছে',
    selectionLabel: 'ক্রপ নির্বাচন। অ্যারো কী দিয়ে সরান।',
    resizeLabel: 'ক্রপ নির্বাচনের নিচের ডান কোণ। অ্যারো কী দিয়ে আকার বদলান।',
    keysHint:
      'বাক্সটি টেনে সরান, আর কোণ বা পাশের হ্যান্ডেল টেনে আকার বদলান। কিবোর্ডে বাক্সে ফোকাস করে অ্যারো কী দিয়ে সরান, অথবা নিচের ডান কোণে ফোকাস করে অ্যারো কী দিয়ে আকার বদলান। Shift চেপে রাখলে ১০ পিক্সেল করে বদলায়।',
    announce: 'ক্রপের জায়গা {w} × {h} পিক্সেল, X {x}, Y {y}।',
    controls: 'ক্রপের সেটিংস',
    aspect: 'অনুপাত',
    aspectHint:
      'পাসপোর্ট ধাঁচ শুধু ৩৫:৪৫ আকৃতি, কোনো অফিসিয়াল ছবির মাপ নয়। আপনার কাগজের নিয়ম যাচাই করে নিন।',
    'a-free': 'মুক্ত (যেকোনো অনুপাত)',
    'a-1:1': 'বর্গ (১:১)',
    'a-4:3': '৪:৩',
    'a-3:2': '৩:২',
    'a-16:9': '১৬:৯ (চওড়া)',
    'a-3:4': 'খাড়া ৩:৪',
    'a-2:3': 'খাড়া ২:৩',
    'a-passport': 'পাসপোর্ট ধাঁচ ৩৫:৪৫ (শুধু আকৃতি)',
    x: 'X — বাম থেকে (পিক্সেল)',
    y: 'Y — উপর থেকে (পিক্সেল)',
    width: 'প্রস্থ (পিক্সেল)',
    height: 'উচ্চতা (পিক্সেল)',
    pixelsHint:
      'সব মান মূল ছবির পিক্সেলে, উপরের বাম কোণ থেকে মাপা। ঘর ছেড়ে গেলে বা Enter চাপলে পরিবর্তন কার্যকর হয়।',
    selectAll: 'পুরো ছবি নির্বাচন',
    crop: 'ছবি ক্রপ করুন',
    cropping: 'ক্রপ হচ্ছে…',
    done: 'সম্পন্ন। ক্রপ করা ছবি ডাউনলোডের জন্য প্রস্তুত।',
    croppedAlt: 'ক্রপ করা ছবির প্রিভিউ',
    download: 'ক্রপ করা ছবি ডাউনলোড করুন',
    downloadAria: 'ক্রপ করা ছবি ডাউনলোড করুন ({name})',
    position: 'মূল ছবিতে অবস্থান',
    positionValue: 'X {x}, Y {y}',
    exactNote: 'PNG নির্বাচিত পিক্সেল হুবহু রাখে; কিছুই রিসাইজ হয় না।',
    lossyNote:
      'কিছুই রিসাইজ হয় না, তবে {f} লসি কম্প্রেশনে (মান {q}%) ছবি নতুন করে এনকোড করে, তাই কিছুটা মান কমে। পিক্সেল হুবহু রাখতে PNG বেছে নিন।',
    'err-format':
      'এই ব্রাউজার {f} ছবি সংরক্ষণ করতে পারে না। “যে ফরম্যাটে সংরক্ষণ” থেকে অন্য ফরম্যাট বেছে নিন।',
    'err-size':
      'ক্রপটি ব্রাউজারে সংরক্ষণের জন্য খুব বড়: প্রতি দিকে সর্বোচ্চ ৮,১৯২ পিক্সেল ও মোট ১৬.৭ মেগাপিক্সেল। নির্বাচন ছোট করুন।',
    'f-invalid': 'পিক্সেলের একটি পূর্ণসংখ্যা লিখুন।',
    'f-too-small': 'কমপক্ষে ১ পিক্সেল হতে হবে।',
    'f-past-right': 'ক্রপটি ডান কিনারা পেরিয়ে যাচ্ছে। X + প্রস্থ সর্বোচ্চ {n} পিক্সেল হতে পারে।',
    'f-past-bottom':
      'ক্রপটি নিচের কিনারা পেরিয়ে যাচ্ছে। Y + উচ্চতা সর্বোচ্চ {n} পিক্সেল হতে পারে।',
    'f-ratio-no-fit':
      '{ratio} অনুপাতে এই মাপ বর্তমান অবস্থান থেকে ছবির ভেতরে আঁটে না। ছোট মান দিন অথবা আগে ক্রপটি সরান।',
    notesTitle: 'গোপনীয়তা, স্থানাঙ্ক ও সীমা',
    n1: 'আপনার ছবি এই ডিভাইসের বাইরে যায় না। ব্রাউজারেই খোলা ও ক্রপ করা হয়; কোথাও আপলোড, পাঠানো বা সংরক্ষণ করা হয় না।',
    n2: 'ক্রপ করলে নির্বাচিত পিক্সেল মূল মাপেই কপি হয়। স্থানাঙ্কগুলো মূল ছবির পিক্সেলে, ছবির ওরিয়েন্টেশন ট্যাগ প্রয়োগের পর উপরের বাম কোণ থেকে মাপা।',
    n3: 'ক্রপ করা ফাইলে মূল ছবির মেটাডেটা (যেমন ক্যামেরার তথ্য বা GPS অবস্থান) থাকে না।',
    n4: 'সীমা: ফাইল সর্বোচ্চ ২৫ MB ও ৫০ মেগাপিক্সেল; ক্রপ প্রতি দিকে সর্বোচ্চ ৮,১৯২ পিক্সেল ও ১৬.৭ মেগাপিক্সেল। JPEG ও WebP মান ৯২%-এ সংরক্ষিত হয়। WebP সংরক্ষণ করা যাবে কি না তা ব্রাউজারের উপর নির্ভর করে (Safari পারে না)।',
  },
});

interface StoredResult extends ResizeResult {
  rect: Rect;
}

/** Smallest selection the pointer handles produce, in CSS pixels (keeps handles grabbable). */
const MIN_DRAG_CSS = 24;
const FIELDS: readonly CropField[] = ['x', 'y', 'width', 'height'];

export const imageCropper: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const I = IMG(ctx.lang);
  const { num, plain, bytes: bytesText, dims } = imageFormatters(ctx);

  /** The selection, in source pixels. */
  let rect: Rect | null = null;
  let outputUrl: string | null = null;
  let busy = false;
  let lastEdited: CropField = 'x';

  // ---------- Input (drop zone, file details, Replace/Reset) ----------
  const input = imageInput(ctx, {
    id: 'crop',
    preview: false,
    isBusy: () => busy,
    onLoad(image, restoring) {
      if (!restoring) clearOutput();
      const bounds = sizeOf(image);
      const saved = ctx.session.get('rect') as Rect | undefined;
      const fits =
        saved && saved.x + saved.width <= bounds.width && saved.y + saved.height <= bounds.height;
      rect = restoring && saved && fits ? saved : initialRect(bounds, ratio());
      ctx.session.set('rect', rect);
      stageImg.src = image.decoded.url;
      formatSelect.setSource(image.format);
      editor.hidden = false;
      form.hidden = false;
      render();
      writeFields();
      const stored = ctx.session.get('result') as StoredResult | undefined;
      if (restoring && stored && rectsEqual(stored.rect, rect)) showResult(image, stored);
    },
    onReset() {
      clearOutput();
      rect = null;
      ctx.session.delete('rect');
      stageImg.removeAttribute('src');
      for (const k of ['aspect', 'format']) delete ctx.memo[k];
      aspect.control.value = 'free';
      formatSelect.control.value = 'same';
      for (const f of FIELDS) {
        fields[f].control.value = '';
        fields[f].setError(null);
      }
      warnings.replaceChildren();
      live.textContent = '';
      editor.hidden = true;
      form.hidden = true;
    },
  });
  const loaded = (): LoadedImage | null => input.current();
  const sizeOf = (image: LoadedImage): Size => ({
    width: image.decoded.width,
    height: image.decoded.height,
  });

  // ---------- Editor ----------
  const stageImg = h('img', { class: 'crop-image', alt: L('editorAlt'), draggable: 'false' });
  const handles = HANDLES.map((hd) =>
    h('span', { class: `crop-handle crop-handle-${hd}`, 'data-handle': hd, 'aria-hidden': 'true' }),
  );
  const cornerHandle = handles[HANDLES.indexOf('se')] as HTMLElement;
  cornerHandle.removeAttribute('aria-hidden');
  cornerHandle.setAttribute('tabindex', '0');
  cornerHandle.setAttribute('role', 'application');
  cornerHandle.setAttribute('aria-label', L('resizeLabel'));
  cornerHandle.setAttribute('aria-describedby', 'crop-keys');
  const selection = h(
    'div',
    {
      class: 'crop-selection',
      id: 'crop-selection',
      tabindex: '0',
      role: 'application',
      'aria-label': L('selectionLabel'),
      'aria-describedby': 'crop-keys',
    },
    ...handles,
  );
  const hole = h('div', { class: 'crop-hole' });
  const stage = h(
    'div',
    { class: 'crop-stage' },
    stageImg,
    h('div', { class: 'crop-dim', 'aria-hidden': 'true' }, hole),
    selection,
  );
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const editor = h(
    'section',
    { class: 'tool-form crop-editor', 'aria-labelledby': 'crop-editor-title', hidden: '' },
    h('h2', { id: 'crop-editor-title', class: 'result-title' }, L('editor')),
    h('div', { class: 'image-frame crop-frame' }, stage),
    h('p', { id: 'crop-keys', class: 'field-hint' }, L('keysHint')),
    live,
  );

  // ---------- Controls ----------
  const aspect = field(
    L('aspect'),
    select(
      ASPECTS.map((a) => [a.id, L(`a-${a.id}`)]),
      { id: 'crop-aspect' },
    ),
    { hint: L('aspectHint') },
  );
  bindMemo(aspect.control, ctx.memo, 'aspect', 'free');
  const ratio = () =>
    aspectRatio(isAspectId(aspect.control.value) ? (aspect.control.value as AspectId) : 'free');

  const fields = {} as Record<CropField, Field<HTMLInputElement>>;
  for (const f of FIELDS) {
    fields[f] = field(L(f), textInput({ id: `crop-${f}`, inputmode: 'numeric', required: '' }));
  }
  const selectAllBtn = h('button', { type: 'button', class: 'btn btn-small' }, L('selectAll'));
  const formatSelect = formatField(ctx, 'crop-format', ['png', 'webp', 'jpeg']);
  bindMemo(formatSelect.control, ctx.memo, 'format', 'same');
  const warnings = h('ul', { class: 'image-warnings', role: 'list' });
  const cropBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'crop-submit' },
    L('crop'),
  );
  const form = h(
    'form',
    { class: 'tool-form image-controls', 'aria-labelledby': 'crop-controls-title', hidden: '' },
    h('h2', { id: 'crop-controls-title', class: 'result-title' }, L('controls')),
    h('div', { class: 'field-grid' }, aspect.el),
    h('div', { class: 'field-grid crop-fields' }, ...FIELDS.map((f) => fields[f].el)),
    h('p', { class: 'field-hint' }, L('pixelsHint')),
    h('div', { class: 'crop-tools' }, selectAllBtn),
    h('div', { class: 'field-grid' }, formatSelect.el),
    warnings,
    h('div', { class: 'form-actions' }, cropBtn),
  );
  form.noValidate = true;

  // ---------- Output ----------
  const outputImg = h('img', { class: 'image-preview', alt: L('croppedAlt') });
  const downloadLink = h(
    'a',
    { class: 'btn btn-primary', id: 'crop-download' },
    icon('download', 18),
    L('download'),
  );
  const outputHead = h(
    'div',
    { class: 'image-output', hidden: '' },
    h('div', { class: 'image-frame' }, outputImg),
    h('div', { class: 'form-actions' }, downloadLink),
  );
  const panel = resultPanel(ctx, L('crop'), { prepend: outputHead });
  panel.el.hidden = true;

  // ---------- State ----------
  const requestedFormat = (image: LoadedImage): ImageFormat =>
    resolveOutputFormat(formatSelect.control.value as FormatChoice, image.format);

  /** Apply a new selection; `from` says which input produced it. */
  function setRect(next: Rect, from: 'pointer' | 'key' | 'fields' | 'aspect' | 'all'): void {
    if (rect && rectsEqual(rect, next)) {
      if (from === 'fields') writeFields(); // show the normalized values
      return;
    }
    rect = next;
    ctx.session.set('rect', rect);
    clearOutput();
    render();
    writeFields();
    if (from === 'key') announce();
  }

  function render(): void {
    const image = loaded();
    if (!rect || !image) return;
    const p = rectToPercent(rect, sizeOf(image));
    for (const el of [selection, hole]) {
      el.style.left = `${p.left}%`;
      el.style.top = `${p.top}%`;
      el.style.width = `${p.width}%`;
      el.style.height = `${p.height}%`;
    }
    updateWarnings();
  }

  function writeFields(): void {
    if (!rect) return;
    for (const f of FIELDS) {
      fields[f].control.value = plain(rect[f]);
      fields[f].setError(null);
    }
  }

  function announce(): void {
    if (!rect) return;
    live.textContent = L('announce', {
      w: num(rect.width),
      h: num(rect.height),
      x: num(rect.x),
      y: num(rect.y),
    });
  }

  function updateWarnings(): void {
    warnings.replaceChildren();
    const image = loaded();
    if (!image || !rect) return;
    const items: string[] = [];
    if (transparencyRisk(image.format, requestedFormat(image)))
      items.push(I('transparencyWarning'));
    if (!validateDimensions(rect.width, rect.height).ok) items.push(L('err-size'));
    for (const text of items) warnings.append(h('li', {}, icon('alert', 16), text));
  }

  /** Read the four fields; on success move the selection, otherwise show the error. */
  function applyFields(changed: CropField): boolean {
    const image = loaded();
    if (!image) return false;
    const bounds = sizeOf(image);
    const values = {} as Record<CropField, string>;
    for (const f of FIELDS) values[f] = fields[f].control.value;
    const result = rectFromFields(values, changed, bounds, ratio());
    for (const f of FIELDS) fields[f].setError(null);
    if (!result.ok) {
      const { field: f, error } = result.error;
      const n = error === 'past-right' ? bounds.width : error === 'past-bottom' ? bounds.height : 0;
      fields[f].setError(
        L(`f-${error}`, {
          n: num(n),
          ratio: L(`a-${aspect.control.value as AspectId}`),
        }),
      );
      return false;
    }
    setRect(result.value, 'fields');
    return true;
  }

  function fieldsMatchRect(): boolean {
    return !!rect && FIELDS.every((f) => fields[f].control.value === plain(rect![f]));
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
    cropBtn.disabled = selectAllBtn.disabled = on;
    input.setBusy(on);
    panel.el.setAttribute('aria-busy', String(on));
  }

  function showResult(image: LoadedImage, r: StoredResult): void {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(r.blob);
    const name = croppedFilename(image.file.name, r.format);
    outputImg.src = outputUrl;
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    downloadLink.setAttribute('aria-label', L('downloadAria', { name }));
    outputHead.hidden = false;
    panel.el.hidden = false;
    const extra: string[] = [];
    if (r.filledTransparency) extra.push(I('filledNote'));
    extra.push(
      r.format === 'png'
        ? L('exactNote')
        : L('lossyNote', {
            f: FORMATS[r.format].label,
            q: num(Math.round(ENCODE_QUALITY * 100)),
          }),
    );
    panel.show(
      [
        { label: I('dimensions'), value: dims(r.size), primary: true },
        { label: L('position'), value: L('positionValue', { x: num(r.rect.x), y: num(r.rect.y) }) },
        { label: I('fileSize'), value: bytesText(r.blob.size) },
        { label: I('format'), value: FORMATS[r.format].label },
      ],
      extra,
    );
  }

  // ---------- Pointer: drag to move, drag handles to resize ----------
  let drag: {
    id: number;
    mode: 'move' | Handle;
    start: Rect;
    x0: number;
    y0: number;
    display: Size;
  } | null = null;

  selection.addEventListener('pointerdown', (e) => {
    const image = loaded();
    if (!rect || !image || busy || drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]');
    const box = stageImg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    drag = {
      id: e.pointerId,
      mode: handle ? (handle.dataset.handle as Handle) : 'move',
      start: rect,
      x0: e.clientX,
      y0: e.clientY,
      display: { width: box.width, height: box.height },
    };
    e.preventDefault();
    (handle === cornerHandle ? cornerHandle : selection).focus({ preventScroll: true });
    try {
      selection.setPointerCapture(e.pointerId);
    } catch {
      /* capture is an enhancement; moves still arrive while over the selection */
    }
    selection.classList.add('crop-dragging');
  });

  selection.addEventListener('pointermove', (e) => {
    const image = loaded();
    if (!drag || e.pointerId !== drag.id || !image) return;
    const natural = sizeOf(image);
    const d = displayToSource(
      { x: e.clientX - drag.x0, y: e.clientY - drag.y0 },
      drag.display,
      natural,
    );
    let next: Rect;
    if (drag.mode === 'move') {
      next = moveRect(drag.start, d.x, d.y, natural);
    } else {
      const min = displayToSource({ x: MIN_DRAG_CSS, y: MIN_DRAG_CSS }, drag.display, natural);
      next = resizeRect(drag.start, drag.mode, d.x, d.y, natural, ratio(), {
        width: Math.ceil(min.x),
        height: Math.ceil(min.y),
      });
    }
    setRect(next, 'pointer');
  });

  const endDrag = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = rect && !rectsEqual(drag.start, rect);
    drag = null;
    selection.classList.remove('crop-dragging');
    if (moved) announce();
  };
  selection.addEventListener('pointerup', endDrag);
  selection.addEventListener('pointercancel', endDrag);
  selection.addEventListener('lostpointercapture', endDrag);

  // ---------- Keyboard: arrows move the box, or resize from the corner ----------
  selection.addEventListener('keydown', (e) => {
    const image = loaded();
    const dir = arrowDelta(e.key);
    if (!dir || !rect || !image || busy || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const step = keyStep(e.shiftKey);
    const bounds = sizeOf(image);
    const onCorner = e.target === cornerHandle;
    setRect(
      onCorner
        ? resizeRect(rect, 'se', dir.x * step, dir.y * step, bounds, ratio())
        : moveRect(rect, dir.x * step, dir.y * step, bounds),
      'key',
    );
  });

  // ---------- Fields and options ----------
  for (const f of FIELDS) {
    fields[f].control.addEventListener('input', () => (lastEdited = f));
    fields[f].control.addEventListener('change', () => {
      lastEdited = f;
      applyFields(f);
    });
  }
  aspect.control.addEventListener('change', () => {
    const image = loaded();
    if (!rect || !image) return;
    setRect(applyRatio(rect, ratio(), sizeOf(image)), 'aspect');
  });
  selectAllBtn.addEventListener('click', () => {
    const image = loaded();
    if (!image) return;
    const bounds = sizeOf(image);
    const size = largestSize(bounds, ratio());
    setRect(
      {
        x: Math.round((bounds.width - size.width) / 2),
        y: Math.round((bounds.height - size.height) / 2),
        ...size,
      },
      'all',
    );
  });
  formatSelect.control.addEventListener('change', updateWarnings);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void crop();
  });

  async function crop(): Promise<void> {
    const source = loaded();
    if (busy || !source || !rect) return;
    input.showError(null);
    // Typed values not yet applied (Enter pressed in a field) are applied first.
    if (!fieldsMatchRect() && !applyFields(lastEdited)) {
      fields[
        FIELDS.find((f) => fields[f].control.hasAttribute('aria-invalid')) ?? lastEdited
      ].control.focus();
      return;
    }
    const area = rect;
    if (!validateDimensions(area.width, area.height).ok) {
      input.showError(L('err-size'));
      return;
    }
    const requested = requestedFormat(source);
    if (!canEncode(requested)) {
      input.showError(L('err-format', { f: FORMATS[requested].label }));
      return;
    }
    setBusy(true);
    input.say(L('cropping'));
    try {
      const result = await cropImage(
        source.decoded.image,
        area,
        requested,
        FORMATS[source.format].alpha,
      );
      if (input.disposed()) return;
      if (source !== loaded() || rect !== area) {
        input.say(''); // the selection changed while cropping; the result is outdated
        return;
      }
      if (result.format !== requested) {
        // Never offer a file whose real format differs from the one chosen.
        input.say('');
        input.showError(L('err-format', { f: FORMATS[requested].label }));
        return;
      }
      const stored: StoredResult = { ...result, rect: area };
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
    stageImg.removeAttribute('src');
  });

  // Restore after a language switch (the File stays in memory, never in storage).
  input.restore();

  return h(
    'div',
    { class: 'tool-layout tool-layout-stacked image-tool' },
    input.el,
    editor,
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};
