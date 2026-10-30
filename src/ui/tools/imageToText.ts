import { toBanglaDigits } from '../../calc/digits';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  OCR_LANGUAGES,
  OCR_MAX_SIDE,
  OcrError,
  ocrScale,
  recognise,
  type OcrLanguage,
  type OcrProgress,
} from '../../lib/ocr';
import { icon } from '../icons';
import { imageInput, type LoadedImage } from './imageInput';
import { bindMemo, copyText, field, notes, select, type ToolView } from './kit';

const S = defineStrings({
  en: {
    noticeTitle: 'How this works',
    notice1:
      'Text is recognised in your browser with Tesseract, an open-source OCR engine. Your picture is never uploaded.',
    notice2:
      'The first time you start, your browser downloads the engine (about 4 MB) and the language data (English about 3 MB, Bangla about 1.4 MB) from this site, not from a third party. Your browser may keep them in its normal cache.',
    controls: 'Recognition',
    language: 'Language of the text',
    lang_eng: 'English',
    lang_ben: 'Bangla',
    'lang_eng+ben': 'English and Bangla (slower)',
    start: 'Extract text',
    stop: 'Stop',
    stage_engine: 'Loading the OCR engine… {p}%',
    stage_language: 'Loading the language data… {p}%',
    stage_recognising: 'Reading the text… {p}%',
    progressLabel: 'Progress',
    done: 'Done. {n} characters found.',
    stopped: 'Stopped.',
    resultTitle: 'Extracted text',
    textLabel: 'Extracted text (you can edit it)',
    confidence: 'Average confidence: {c}%',
    lowConfidence:
      'Confidence is low; check the text carefully. A sharper, straighter picture with more contrast usually helps.',
    copy: 'Copy text',
    copied: 'Copied.',
    copyFailed: 'Copy failed. Select the text and copy it yourself.',
    download: 'Download .txt',
    err_load:
      'The OCR engine could not be loaded. Check your connection and try again; on very old browsers it may not work at all.',
    err_recognise: 'The picture could not be read. Try another picture or another format.',
    err_canvas: 'This browser could not prepare the picture for recognition.',
    noText:
      'No text was found. Check the language setting, and try a sharper picture where the text is large and straight.',
    notesTitle: 'About text recognition',
    n1: 'Works best on clear, printed text: scans, screenshots and straight photos of documents. Handwriting, decorative fonts, low light and tilted photos give poor results.',
    n2: 'Choose the language of the text. “English and Bangla” reads both but is slower and can be less accurate on single-language text.',
    n3: 'Large photos are scaled down to {max} pixels on the longest side and small pictures are enlarged, which helps recognition. The original file is not changed.',
    n4: 'Always check the result. OCR makes mistakes, especially with Bangla conjuncts and with numbers that look alike (0 and O, 1 and l).',
  },
  bn: {
    noticeTitle: 'এটি যেভাবে কাজ করে',
    notice1:
      'Tesseract নামের একটি ওপেন-সোর্স OCR ইঞ্জিন দিয়ে আপনার ব্রাউজারেই লেখা শনাক্ত হয়। আপনার ছবি কখনো আপলোড হয় না।',
    notice2:
      'প্রথমবার শুরু করলে আপনার ব্রাউজার এই সাইট থেকেই (কোনো তৃতীয় পক্ষ থেকে নয়) ইঞ্জিন (প্রায় ৪ MB) ও ভাষার ডেটা (ইংরেজি প্রায় ৩ MB, বাংলা প্রায় ১.৪ MB) ডাউনলোড করে। ব্রাউজার এগুলো তার সাধারণ ক্যাশে রাখতে পারে।',
    controls: 'শনাক্তকরণ',
    language: 'লেখার ভাষা',
    lang_eng: 'ইংরেজি',
    lang_ben: 'বাংলা',
    'lang_eng+ben': 'ইংরেজি ও বাংলা (ধীর)',
    start: 'লেখা বের করুন',
    stop: 'থামান',
    stage_engine: 'OCR ইঞ্জিন লোড হচ্ছে… {p}%',
    stage_language: 'ভাষার ডেটা লোড হচ্ছে… {p}%',
    stage_recognising: 'লেখা পড়া হচ্ছে… {p}%',
    progressLabel: 'অগ্রগতি',
    done: 'সম্পন্ন। {n}টি অক্ষর পাওয়া গেছে।',
    stopped: 'থামানো হয়েছে।',
    resultTitle: 'বের করা লেখা',
    textLabel: 'বের করা লেখা (সম্পাদনা করা যায়)',
    confidence: 'গড় নির্ভরযোগ্যতা: {c}%',
    lowConfidence:
      'নির্ভরযোগ্যতা কম; লেখাটি ভালো করে মিলিয়ে নিন। আরও স্পষ্ট, সোজা ও বেশি কনট্রাস্টের ছবি সাধারণত সাহায্য করে।',
    copy: 'লেখা কপি করুন',
    copied: 'কপি হয়েছে।',
    copyFailed: 'কপি করা যায়নি। লেখাটি নির্বাচন করে নিজে কপি করুন।',
    download: '.txt ডাউনলোড',
    err_load:
      'OCR ইঞ্জিন লোড করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন; খুব পুরোনো ব্রাউজারে এটি একেবারেই কাজ নাও করতে পারে।',
    err_recognise: 'ছবিটি পড়া যায়নি। অন্য ছবি বা অন্য ফরম্যাট চেষ্টা করুন।',
    err_canvas: 'এই ব্রাউজার শনাক্তকরণের জন্য ছবিটি প্রস্তুত করতে পারেনি।',
    noText:
      'কোনো লেখা পাওয়া যায়নি। ভাষার সেটিং দেখুন, এবং বড় ও সোজা লেখাসহ আরও স্পষ্ট ছবি চেষ্টা করুন।',
    notesTitle: 'লেখা শনাক্তকরণ সম্পর্কে',
    n1: 'স্পষ্ট ছাপা লেখায় সবচেয়ে ভালো কাজ করে: স্ক্যান, স্ক্রিনশট ও ডকুমেন্টের সোজা ছবি। হাতের লেখা, নকশা করা ফন্ট, কম আলো ও বাঁকা ছবিতে ফলাফল খারাপ হয়।',
    n2: 'লেখার ভাষা বেছে নিন। “ইংরেজি ও বাংলা” দুটোই পড়ে, কিন্তু ধীর এবং এক ভাষার লেখায় কম নির্ভুল হতে পারে।',
    n3: 'শনাক্তকরণে সাহায্য করতে বড় ছবিকে লম্বা দিকে {max} পিক্সেলে ছোট করা হয় এবং ছোট ছবি বড় করা হয়। মূল ফাইল বদলায় না।',
    n4: 'সবসময় ফলাফল মিলিয়ে নিন। OCR ভুল করে, বিশেষ করে বাংলা যুক্তাক্ষরে এবং দেখতে একই রকম সংখ্যায় (0 ও O, 1 ও l)।',
  },
});

/** Mean confidence under this is flagged as low. */
const LOW_CONFIDENCE = 60;

interface StoredResult {
  text: string;
  confidence: number;
}

/** Draw the decoded picture (with its EXIF orientation applied) at the recognition scale. */
function toCanvas(image: LoadedImage): HTMLCanvasElement | null {
  const { width, height, image: img } = image.decoded;
  const scale = ocrScale(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#fff'; // transparent areas read as paper, not black
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export const imageToText: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const num = (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n));
  let controller: AbortController | null = null;
  let downloadUrl: string | null = null;
  ctx.onCleanup(() => {
    controller?.abort();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  });

  const input = imageInput(ctx, {
    id: 'ocr',
    preview: true,
    showName: true,
    isBusy: () => controller !== null,
    onLoad(_image, restoring) {
      form.hidden = false;
      if (!restoring) clearResult();
      else {
        const stored = ctx.session.get('result') as StoredResult | undefined;
        if (stored) showResult(stored);
      }
    },
    onReset() {
      controller?.abort();
      clearResult();
      form.hidden = true;
    },
  });

  // ---------- Controls ----------
  const language = field(
    L('language'),
    select(
      OCR_LANGUAGES.map((l) => [l, L(`lang_${l}`)]),
      { id: 'ocr-language' },
    ),
  );
  bindMemo(language.control, ctx.memo, 'language', ctx.lang === 'bn' ? 'ben' : 'eng');
  const startBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary', id: 'ocr-start' },
    L('start'),
  );
  const stopBtn = h(
    'button',
    { type: 'button', class: 'btn', id: 'ocr-stop', hidden: '' },
    L('stop'),
  );
  const progress = h('progress', {
    class: 'ocr-progress',
    max: '100',
    value: '0',
    hidden: '',
    'aria-label': L('progressLabel'),
  });
  const status = h('p', { class: 'net-status', role: 'status' });
  const alertBox = h('p', { class: 'net-error', role: 'alert', hidden: '' });
  const form = h(
    'form',
    { class: 'tool-form image-controls', 'aria-labelledby': 'ocr-controls-title', hidden: '' },
    h('h2', { id: 'ocr-controls-title', class: 'result-title' }, L('controls')),
    h('div', { class: 'field-grid' }, language.el),
    h('div', { class: 'form-actions' }, startBtn, stopBtn),
    progress,
    status,
    alertBox,
  );
  form.noValidate = true;

  // ---------- Result ----------
  const textarea = h('textarea', {
    id: 'ocr-text',
    class: 'input textarea ocr-text',
    rows: '12',
    spellcheck: 'false',
  });
  const meta = h('p', { class: 'field-hint', id: 'ocr-meta' });
  const warning = h('p', { class: 'field-hint ocr-warning', hidden: '' }, L('lowConfidence'));
  const copyBtn = h('button', { type: 'button', class: 'btn' }, icon('copy', 18), L('copy'));
  const downloadLink = h(
    'a',
    { class: 'btn', id: 'ocr-download', download: 'extracted-text.txt' },
    icon('download', 18),
    L('download'),
  );
  const copyStatus = h('p', { class: 'copy-status', role: 'status' });
  const resultSection = h(
    'section',
    { class: 'result', 'aria-labelledby': 'ocr-result-title', hidden: '' },
    h('h2', { id: 'ocr-result-title', class: 'result-title' }, L('resultTitle')),
    h('label', { for: textarea.id, class: 'field-label' }, L('textLabel')),
    textarea,
    meta,
    warning,
    h('div', { class: 'form-actions' }, copyBtn, downloadLink),
    copyStatus,
  );

  const refreshDownload = (): void => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(
      new Blob([textarea.value], { type: 'text/plain;charset=utf-8' }),
    );
    downloadLink.href = downloadUrl;
  };

  function showResult(r: StoredResult): void {
    textarea.value = r.text;
    meta.textContent = L('confidence', { c: num(Math.round(r.confidence)) });
    warning.hidden = r.confidence >= LOW_CONFIDENCE;
    copyStatus.textContent = '';
    resultSection.hidden = false;
    refreshDownload();
  }

  function clearResult(): void {
    resultSection.hidden = true;
    textarea.value = '';
    copyStatus.textContent = '';
    status.textContent = '';
    alertBox.hidden = true;
    progress.hidden = true;
    ctx.session.delete('result');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    downloadLink.removeAttribute('href');
  }

  const showError = (text: string): void => {
    status.textContent = '';
    alertBox.textContent = text;
    alertBox.hidden = false;
  };

  function setBusy(on: boolean): void {
    startBtn.disabled = on;
    stopBtn.hidden = !on;
    language.control.disabled = on;
    progress.hidden = !on;
    input.setBusy(on);
    form.setAttribute('aria-busy', String(on));
  }

  const onProgress = ({ stage, progress: p }: OcrProgress): void => {
    const pct = Math.round(p * 100);
    progress.value = pct;
    status.textContent = L(`stage_${stage}`, { p: num(pct) });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const image = input.current();
    if (!image || controller) return;
    alertBox.hidden = true;
    const canvas = toCanvas(image);
    if (!canvas) return showError(L('err_canvas'));
    const lang = language.control.value as OcrLanguage;
    const ctrl = new AbortController();
    controller = ctrl;
    setBusy(true);
    stopBtn.focus();
    try {
      const r = await recognise(canvas, lang, onProgress, ctrl.signal);
      if (!r.text.trim()) {
        clearResult();
        showError(L('noText'));
      } else {
        ctx.session.set('result', r);
        showResult(r);
        status.textContent = L('done', { n: num([...r.text].length) });
      }
    } catch (err) {
      if (input.disposed()) return;
      const kind = err instanceof OcrError ? err.kind : 'recognise';
      if (kind === 'aborted') status.textContent = L('stopped');
      else showError(L(`err_${kind}`));
    } finally {
      if (controller === ctrl) controller = null;
      if (!input.disposed()) {
        setBusy(false);
        startBtn.focus();
      }
    }
  });
  stopBtn.addEventListener('click', () => controller?.abort());
  textarea.addEventListener('input', refreshDownload);
  copyBtn.addEventListener('click', async () => {
    copyStatus.textContent = (await copyText(textarea.value)) ? L('copied') : L('copyFailed');
  });

  const view = h(
    'div',
    { class: 'tool-stack' },
    h(
      'aside',
      { class: 'net-notice', 'aria-labelledby': 'ocr-notice-title' },
      h('h2', { id: 'ocr-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
      h('p', {}, L('notice1')),
      h('p', {}, L('notice2')),
    ),
    h(
      'div',
      { class: 'tool-layout' },
      h('div', { class: 'tool-stack-inner' }, input.el, form),
      resultSection,
    ),
    notes(ctx, [L('n1'), L('n2'), L('n3', { max: num(OCR_MAX_SIDE) }), L('n4')], L('notesTitle')),
  );
  input.restore();
  return view;
};
