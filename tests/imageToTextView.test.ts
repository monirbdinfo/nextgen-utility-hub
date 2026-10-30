import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real engine runs in the Playwright tests; here recognise() is replaced so the view's
// states can be checked quickly and without a worker.
const recognise = vi.fn();
vi.mock('../src/lib/ocr', async (orig) => ({
  ...(await orig<typeof import('../src/lib/ocr')>()),
  recognise: (...args: unknown[]) => recognise(...args),
}));
vi.mock('../src/lib/imageCanvas', async (orig) => ({
  ...(await orig<typeof import('../src/lib/imageCanvas')>()),
  decodeImage: async () => ({ image: new Image(), url: 'blob:x', width: 800, height: 400 }),
  releaseDecoded: () => undefined,
}));

const { mountApp, LANG_KEY } = await import('../src/ui/app');
const { OcrError } = await import('../src/lib/ocr');

let dispose: (() => void) | null = null;

function open(): HTMLElement {
  history.replaceState(null, '', '/#/tool/image-to-text');
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}
const $ = <T extends Element>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
/** A tiny valid PNG header is enough: decoding is mocked. */
function choose(root: ParentNode): void {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const file = new File([png], 'scan.png', { type: 'image/png' });
  const input = $<HTMLInputElement>(root, '#ocr-file');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}
const start = (root: ParentNode): void =>
  $<HTMLFormElement>(root, 'form.image-controls').requestSubmit();

beforeEach(() => {
  localStorage.clear();
  recognise.mockReset();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect() {},
    drawImage() {},
    fillStyle: '',
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  URL.createObjectURL = vi.fn(() => 'blob:text');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.restoreAllMocks();
});

describe('Image to Text', () => {
  it('says the picture is not uploaded and shows controls only after a picture', async () => {
    const root = open();
    expect($<HTMLElement>(root, '.net-notice').textContent).toContain('never uploaded');
    expect($<HTMLElement>(root, 'form.image-controls').hidden).toBe(true);
    choose(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, 'form.image-controls').hidden).toBe(false));
  });

  it('recognises at double size for a small picture and shows editable text', async () => {
    recognise.mockImplementation(async (canvas: HTMLCanvasElement, lang, onProgress) => {
      onProgress({ stage: 'recognising', progress: 0.5 });
      expect([canvas.width, canvas.height, lang]).toEqual([1600, 800, 'eng']);
      return { text: 'Hello world', confidence: 91.4 };
    });
    const root = open();
    choose(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, 'form.image-controls').hidden).toBe(false));
    start(root);
    await vi.waitFor(() =>
      expect($<HTMLTextAreaElement>(root, '#ocr-text').value).toBe('Hello world'),
    );
    expect($<HTMLElement>(root, '#ocr-meta').textContent).toBe('Average confidence: 91%');
    expect($<HTMLElement>(root, '.ocr-warning').hidden).toBe(true);
    expect($<HTMLElement>(root, '.net-status').textContent).toBe('Done. 11 characters found.');
    expect($<HTMLAnchorElement>(root, '#ocr-download').getAttribute('href')).toBe('blob:text');
  });

  it('warns about low confidence', async () => {
    recognise.mockResolvedValue({ text: 'H3ll0', confidence: 31 });
    const root = open();
    choose(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, 'form.image-controls').hidden).toBe(false));
    start(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, '.ocr-warning').hidden).toBe(false));
  });

  it('explains no text, a failed engine load and a stop', async () => {
    const root = open();
    choose(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, 'form.image-controls').hidden).toBe(false));
    const alert = (): string =>
      $<HTMLElement>(root, 'form.image-controls .net-error').textContent ?? '';

    recognise.mockResolvedValueOnce({ text: '  \n', confidence: 0 });
    start(root);
    await vi.waitFor(() => expect(alert()).toContain('No text was found'));

    recognise.mockRejectedValueOnce(new OcrError('load'));
    start(root);
    await vi.waitFor(() => expect(alert()).toContain('could not be loaded'));

    recognise.mockImplementationOnce(
      (_c: unknown, _l: unknown, _p: unknown, signal: AbortSignal) =>
        new Promise((_r, reject) =>
          signal.addEventListener('abort', () => reject(new OcrError('aborted'))),
        ),
    );
    start(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, '#ocr-stop').hidden).toBe(false));
    $<HTMLButtonElement>(root, '#ocr-stop').click();
    await vi.waitFor(() =>
      expect($<HTMLElement>(root, '.net-status').textContent).toBe('Stopped.'),
    );
    expect($<HTMLButtonElement>(root, '#ocr-start').disabled).toBe(false);
  });

  it('defaults to Bangla in the Bangla interface', async () => {
    localStorage.setItem(LANG_KEY, 'bn');
    const root = open();
    expect($<HTMLSelectElement>(root, '#ocr-language').value).toBe('ben');
    expect(root.querySelector('h1')?.textContent).toBe('ছবি থেকে টেক্সট');
  });
});
