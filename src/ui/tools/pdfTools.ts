import { h } from '../../lib/dom';
import type { ToolContext, ToolView } from './kit';

type Mode = 'create' | 'merge' | 'pages' | 'reduce';
const copy = {
  en: {
    createTitle: 'Create PDF from text and images',
    mergeTitle: 'Merge or split PDF files',
    pagesTitle: 'Reorder, rotate or remove pages',
    reduceTitle: 'Reduce PDF file size',
    files: 'Choose PDF or image files',
    text: 'Text to include in the PDF',
    create: 'Create PDF',
    merge: 'Merge selected PDFs',
    split:
      'Split selected PDF into one-page files (downloads a ZIP is not supported; first page will be downloaded)',
    operation: 'Action',
    mergeAction: 'Merge all PDFs',
    splitAction: 'Extract page range',
    range: 'Page range (e.g. 1-3,5)',
    order: 'New page order (e.g. 3,1,2)',
    rotate: 'Rotate all pages',
    remove: 'Remove page range (e.g. 2,4-5)',
    process: 'Process PDF',
    reduce: 'Optimize and download PDF',
    working: 'Processing locally…',
    done: 'Your PDF is ready to download.',
    noFile: 'Choose at least one file first.',
    invalidRange: 'Enter a valid page range within the document.',
    error: 'Could not process this file. It may be encrypted, damaged, or unsupported.',
    privacy: 'Privacy: files are processed in this browser only. Nothing is uploaded.',
    sizeBefore: 'Original size',
    sizeAfter: 'Output size',
    reduction: 'Size change',
    limit:
      'Note: pdf-lib can rewrite PDF structure, but cannot reliably recompress embedded images. The output may not be smaller.',
    download: 'Download PDF',
  },
  bn: {
    createTitle: 'টেক্সট ও ছবি থেকে PDF তৈরি',
    mergeTitle: 'PDF মার্জ বা স্প্লিট',
    pagesTitle: 'পেজ সাজান, ঘোরান বা মুছুন',
    reduceTitle: 'PDF ফাইলের সাইজ কমান',
    files: 'PDF বা ছবির ফাইল বাছাই করুন',
    text: 'PDF-এ যোগ করার টেক্সট',
    create: 'PDF তৈরি করুন',
    merge: 'নির্বাচিত PDF মার্জ করুন',
    split: 'নির্বাচিত PDF-এর এক পৃষ্ঠার ফাইল তৈরি (ZIP সমর্থিত নয়; প্রথম পৃষ্ঠা ডাউনলোড হবে)',
    operation: 'কাজ',
    mergeAction: 'সব PDF একত্র করুন',
    splitAction: 'পেজ রেঞ্জ বের করুন',
    range: 'পেজ রেঞ্জ (যেমন 1-3,5)',
    order: 'নতুন পেজ ক্রম (যেমন 3,1,2)',
    rotate: 'সব পেজ ঘোরান',
    remove: 'যে পেজ মুছবেন (যেমন 2,4-5)',
    process: 'PDF প্রসেস করুন',
    reduce: 'অপ্টিমাইজ করে PDF ডাউনলোড',
    working: 'ব্রাউজারেই প্রসেস হচ্ছে…',
    done: 'আপনার PDF ডাউনলোডের জন্য প্রস্তুত।',
    noFile: 'প্রথমে অন্তত একটি ফাইল বাছাই করুন।',
    invalidRange: 'ডকুমেন্টের মধ্যে সঠিক পেজ রেঞ্জ দিন।',
    error: 'ফাইল প্রসেস করা যায়নি। ফাইলটি এনক্রিপ্টেড, ক্ষতিগ্রস্ত বা অসমর্থিত হতে পারে।',
    privacy: 'গোপনীয়তা: ফাইল শুধু এই ব্রাউজারেই প্রসেস হয়। কোথাও আপলোড হয় না।',
    sizeBefore: 'মূল সাইজ',
    sizeAfter: 'আউটপুট সাইজ',
    reduction: 'সাইজ পরিবর্তন',
    limit:
      'দ্রষ্টব্য: pdf-lib PDF কাঠামো নতুন করে লিখতে পারে, তবে এমবেড করা ছবি নির্ভরযোগ্যভাবে পুনরায় কমপ্রেস করতে পারে না। আউটপুট ছোট নাও হতে পারে।',
    download: 'PDF ডাউনলোড',
  },
} as const;

const bytes = (n: number): string =>
  n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`;

function parsePages(value: string, total: number): number[] {
  const pages = new Set<number>();
  for (const part of value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) throw new Error('range');
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > total) throw new Error('range');
    for (let n = start; n <= end; n++) pages.add(n - 1);
  }
  if (!pages.size) throw new Error('range');
  return [...pages].sort((a, b) => a - b);
}

function savePdf(bytesData: Uint8Array, name: string): void {
  const blob = new Blob([bytesData.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tool(ctx: ToolContext, mode: Mode): HTMLElement {
  const s = copy[ctx.lang];
  const title =
    mode === 'create'
      ? s.createTitle
      : mode === 'merge'
        ? s.mergeTitle
        : mode === 'pages'
          ? s.pagesTitle
          : s.reduceTitle;
  const root = h('section', { class: 'tool-workspace pdf-tool' });
  const heading = h('h2', {}, title);
  const privacy = h('p', { class: 'field-hint', role: 'note' }, s.privacy);
  const fileInput = h('input', {
    class: 'input',
    type: 'file',
    accept: mode === 'create' ? 'image/*,.txt,.md' : 'application/pdf,.pdf',
    ...(mode === 'create' || mode === 'merge' ? { multiple: '' } : {}),
  }) as HTMLInputElement;
  const fileField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.files),
    fileInput,
  );
  const textArea = h('textarea', {
    class: 'input',
    rows: '8',
    placeholder: s.text,
  }) as HTMLTextAreaElement;
  const textField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.text),
    textArea,
  );
  const actionSelect = h(
    'select',
    { class: 'input' },
    h('option', { value: 'merge' }, s.mergeAction),
    h('option', { value: 'split' }, s.splitAction),
  ) as HTMLSelectElement;
  const actionField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.operation),
    actionSelect,
  );
  const rangeInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: s.range,
  }) as HTMLInputElement;
  const rangeField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.range),
    rangeInput,
  );
  const orderInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: s.order,
  }) as HTMLInputElement;
  const orderField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.order),
    orderInput,
  );
  const rotateSelect = h(
    'select',
    { class: 'input' },
    h('option', { value: '90' }, '90°'),
    h('option', { value: '180' }, '180°'),
    h('option', { value: '270' }, '270°'),
  ) as HTMLSelectElement;
  const rotateField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.rotate),
    rotateSelect,
  );
  const removeInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: s.remove,
  }) as HTMLInputElement;
  const removeField = h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label' }, s.remove),
    removeInput,
  );
  const button = h(
    'button',
    { class: 'button button-primary', type: 'button' },
    mode === 'create'
      ? s.create
      : mode === 'merge'
        ? s.merge
        : mode === 'pages'
          ? s.process
          : s.reduce,
  ) as HTMLButtonElement;
  const status = h('p', { class: 'result-message', role: 'status', 'aria-live': 'polite' });
  const results = h('div', { class: 'result-panel', hidden: '' });
  const sizeBefore = h('p', {});
  const sizeAfter = h('p', {});
  const sizeChange = h('p', {});
  results.append(sizeBefore, sizeAfter, sizeChange);
  if (mode === 'create') root.append(heading, fileField, textField, privacy, button, status);
  if (mode === 'merge')
    root.append(heading, fileField, actionField, rangeField, privacy, button, status);
  if (mode === 'pages')
    root.append(heading, fileField, orderField, rotateField, removeField, privacy, button, status);
  if (mode === 'reduce')
    root.append(
      heading,
      fileField,
      privacy,
      h('p', { class: 'field-hint' }, s.limit),
      button,
      status,
      results,
    );
  if (mode === 'merge')
    actionSelect.addEventListener('change', () => {
      rangeField.hidden = actionSelect.value !== 'split';
    });
  if (mode === 'pages') {
    orderField.hidden = false;
    rotateField.hidden = false;
    removeField.hidden = false;
  }
  let busy = false;
  button.addEventListener('click', async () => {
    if (busy) return;
    const files = [...(fileInput.files ?? [])];
    if (mode !== 'create' && files.length === 0) {
      status.textContent = s.noFile;
      return;
    }
    busy = true;
    button.disabled = true;
    status.textContent = s.working;
    results.hidden = true;
    try {
      // Loaded on first use only; a failed load is reported like any other failure below.
      const { PDFDocument, StandardFonts, degrees, rgb } = await import('../../lib/pdfLib');
      let output: Uint8Array;
      let filename = 'nextgen-document.pdf';
      if (mode === 'create') {
        const pdf = await PDFDocument.create();
        if (textArea.value.trim()) {
          const font = await pdf.embedFont(StandardFonts.Helvetica);
          const page = pdf.addPage();
          const lines = textArea.value.split(/\r?\n/);
          let y = page.getHeight() - 52;
          for (const line of lines) {
            page.drawText(line.slice(0, 160), {
              x: 48,
              y,
              size: 11,
              font,
              color: rgb(0.12, 0.16, 0.22),
              maxWidth: page.getWidth() - 96,
            });
            y -= 16;
            if (y < 48) {
              y = page.getHeight() - 52;
              pdf.addPage();
            }
          }
        }
        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          const data = new Uint8Array(await file.arrayBuffer());
          let image;
          if (file.type === 'image/png') image = await pdf.embedPng(data);
          else if (file.type === 'image/jpeg' || file.type === 'image/jpg')
            image = await pdf.embedJpg(data);
          else {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
            bitmap.close();
            const png = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/png'),
            );
            image = await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));
          }
          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        if (!textArea.value.trim() && !files.some((f) => f.type.startsWith('image/')))
          throw new Error('empty');
        output = await pdf.save();
        filename = 'nextgen-created.pdf';
      } else if (mode === 'merge') {
        const selected = files.filter(
          (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
        );
        if (!selected.length) throw new Error('empty');
        if (actionSelect.value === 'merge') {
          const dest = await PDFDocument.create();
          for (const file of selected) {
            const src = await PDFDocument.load(await file.arrayBuffer());
            const pages = await dest.copyPages(src, src.getPageIndices());
            pages.forEach((p) => dest.addPage(p));
          }
          output = await dest.save();
          filename = 'merged.pdf';
        } else {
          const src = await PDFDocument.load(await selected[0]!.arrayBuffer());
          const indices = parsePages(rangeInput.value, src.getPageCount());
          const dest = await PDFDocument.create();
          (await dest.copyPages(src, indices)).forEach((p) => dest.addPage(p));
          output = await dest.save();
          filename = 'split-pages.pdf';
        }
      } else {
        const file = files.find(
          (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
        );
        if (!file) throw new Error('empty');
        const src = await PDFDocument.load(await file.arrayBuffer());
        if (mode === 'pages') {
          const pages = src.getPages();
          const order = orderInput.value.trim();
          if (order) {
            const nums = order.split(',').map((n) => Number(n.trim()));
            if (
              nums.length !== pages.length ||
              nums.some((n) => !Number.isInteger(n) || n < 1 || n > pages.length) ||
              new Set(nums).size !== pages.length
            )
              throw new Error('range');
            const copyDoc = await PDFDocument.create();
            (
              await copyDoc.copyPages(
                src,
                nums.map((n) => n - 1),
              )
            ).forEach((p) => copyDoc.addPage(p));
            output = await copyDoc.save();
            filename = 'reordered.pdf';
          } else {
            const angle = Number(rotateSelect.value);
            pages.forEach((p) => p.setRotation(degrees((p.getRotation().angle + angle) % 360)));
            const remove = removeInput.value.trim();
            if (remove) {
              const indices = parsePages(remove, src.getPageCount());
              indices
                .sort((a, b) => b - a)
                .forEach((i) => {
                  if (src.getPageCount() > 1) src.removePage(i);
                });
            }
            output = await src.save();
            filename = 'edited-pages.pdf';
          }
        } else {
          output = await src.save({ useObjectStreams: true, addDefaultPage: false });
          filename = 'optimized.pdf';
          sizeBefore.textContent = `${s.sizeBefore}: ${bytes(file.size)}`;
          sizeAfter.textContent = `${s.sizeAfter}: ${bytes(output.byteLength)}`;
          const delta = output.byteLength - file.size;
          sizeChange.textContent = `${s.reduction}: ${delta <= 0 ? '−' : '+'}${bytes(Math.abs(delta))} (${Math.round((Math.abs(delta) / Math.max(file.size, 1)) * 100)}%)`;
          results.hidden = false;
        }
      }
      savePdf(output, filename);
      status.textContent = s.done;
    } catch (error) {
      status.textContent =
        error instanceof Error && error.message === 'range' ? s.invalidRange : s.error;
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
  return root;
}

export const pdfCreate: ToolView = (ctx) => tool(ctx, 'create');
export const pdfMergeSplit: ToolView = (ctx) => tool(ctx, 'merge');
export const pdfPageTools: ToolView = (ctx) => tool(ctx, 'pages');
export const pdfReduceSize: ToolView = (ctx) => tool(ctx, 'reduce');
