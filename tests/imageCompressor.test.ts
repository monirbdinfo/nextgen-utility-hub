/**
 * View tests for the Image Compressor. jsdom has no canvas, so the browser pipeline
 * (src/lib/imageCanvas) is mocked with an encoder whose output sizes the tests choose.
 * Real encoding is covered by e2e/compress.spec.ts in Chromium.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pipeline = vi.hoisted(() => {
  class ImageProcessingError extends Error {
    constructor(readonly code: 'decode' | 'canvas' | 'encode') {
      super(code);
    }
  }
  return {
    ImageProcessingError,
    decodeImage: vi.fn(),
    releaseDecoded: vi.fn(),
    resizeImage: vi.fn(),
    cropImage: vi.fn(),
    openEncoder: vi.fn(),
    canEncode: vi.fn<(format: string) => boolean>(() => true),
  };
});

vi.mock('../src/lib/imageCanvas', () => ({ ...pipeline, ENCODE_QUALITY: 0.92 }));

import { mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;
let urlCount = 0;
const created: string[] = [];
const revoked: string[] = [];

const PNG_HEADER = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
/** A file of exactly `bytes` bytes starting with `header`. */
const file = (name: string, header: number[], type: string, bytes: number): File =>
  new File([new Uint8Array([...header, ...new Array(bytes - header.length).fill(0)])], name, {
    type,
  });

const decodedFor = (width: number, height: number) => ({
  image: document.createElement('img'),
  url: `blob:decoded-${width}x${height}`,
  width,
  height,
});

/**
 * Mock encoder: `sizeAt(qualityPercent)` decides the output size; the output type is
 * the requested format unless `produce` overrides it.
 */
function mockEncoder(
  sizeAt: (q: number) => number,
  opts: { filled?: boolean; produce?: string } = {},
) {
  const encode = vi.fn(async (quality: number) => {
    const q = Math.round(quality * 100);
    const format = opts.produce ?? lastFormat;
    const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
    return { blob: new Blob([new Uint8Array(sizeAt(q))], { type: mime }), format };
  });
  const close = vi.fn();
  let lastFormat = 'jpeg';
  pipeline.openEncoder.mockImplementationOnce((_s, _from, _size, format: string) => {
    lastFormat = format;
    return { filledTransparency: opts.filled ?? false, encode, close };
  });
  return { encode, close };
}

function open(): HTMLElement {
  history.replaceState(null, '', '/#/tool/image-compressor');
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  dispose = mountApp(root);
  return root;
}

const $ = <T extends Element = HTMLInputElement>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

function pick(root: ParentNode, f: File): void {
  const input = $(root, '#compress-file');
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.dispatchEvent(new Event('change'));
}

async function load(
  root: HTMLElement,
  f = file('holiday photo.png', PNG_HEADER, 'image/png', 10_000),
  width = 400,
  height = 300,
): Promise<void> {
  pipeline.decodeImage.mockResolvedValueOnce(decodedFor(width, height));
  pick(root, f);
  await vi.waitFor(() => expect($(root, '.image-status').textContent).toContain('Image opened'));
}

function choose(root: ParentNode, sel: string, value: string): void {
  const el = $<HTMLSelectElement | HTMLInputElement>(root, sel);
  el.value = value;
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
}

function setMode(root: ParentNode, mode: 'quality' | 'target'): void {
  const r = $(root, `#compress-mode-${mode}`);
  r.checked = true;
  r.dispatchEvent(new Event('change'));
}

const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, '.compress-controls').requestSubmit();
const status = (root: ParentNode): string => $(root, '.image-status').textContent ?? '';
const alertText = (root: ParentNode): string =>
  $<HTMLElement>(root, '.image-alert').textContent ?? '';
const resultText = (root: ParentNode): string => $(root, '.result').textContent ?? '';
const done = (root: ParentNode) => vi.waitFor(() => expect(status(root)).toMatch(/^Done/));
const released = (): string[] =>
  pipeline.releaseDecoded.mock.calls.flatMap((c) => (c[0] ? [(c[0] as { url: string }).url] : []));

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  urlCount = 0;
  created.length = 0;
  revoked.length = 0;
  URL.createObjectURL = vi.fn(() => {
    const u = `blob:out-${++urlCount}`;
    created.push(u);
    return u;
  });
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  for (const fn of [pipeline.decodeImage, pipeline.releaseDecoded, pipeline.openEncoder])
    fn.mockReset();
  pipeline.canEncode.mockImplementation(() => true);
});

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe('Image Compressor view', () => {
  it('renders the drop zone and hides the settings until an image is opened', () => {
    const root = open();
    expect($(root, 'h1').textContent).toBe('Image Compressor');
    expect($(root, '#compress-file').accept).toBe('image/jpeg,image/png,image/webp');
    expect($<HTMLElement>(root, '.compress-controls').hidden).toBe(true);
  });

  it('shows the file name, format, dimensions and size, and a labelled quality slider', async () => {
    const root = open();
    await load(root);
    const meta = $(root, '.image-meta').textContent ?? '';
    for (const text of ['holiday photo.png', '400 × 300 px', '9.8 KB', 'PNG'])
      expect(meta).toContain(text);
    const range = $(root, '#compress-quality');
    expect([range.type, range.min, range.max, range.step, range.value]).toEqual([
      'range',
      '10',
      '100',
      '1',
      '80',
    ]);
    expect(range.labels?.[0]?.textContent).toBe('Quality');
    expect(range.getAttribute('aria-valuetext')).toBe('80%');
    choose(root, '#compress-quality', '55');
    expect(range.getAttribute('aria-valuetext')).toBe('55%');
    expect($(root, '.quality-value').textContent).toBe('55%');
    expect(range.getAttribute('aria-describedby')).toBe('compress-quality-hint');
    expect($(root, '#compress-quality-hint').textContent).toContain(
      'does not guarantee any particular file size',
    );
  });

  it('rejects unsupported and damaged files with the shared validation', async () => {
    const root = open();
    pick(root, new File(['hello'], 'notes.jpg', { type: 'image/jpeg' }));
    await vi.waitFor(() =>
      expect(alertText(root)).toBe('This file is not a JPEG, PNG or WebP image.'),
    );
    pipeline.decodeImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('decode'));
    pick(root, file('broken.png', PNG_HEADER, 'image/png', 200));
    await vi.waitFor(() => expect(alertText(root)).toMatch(/^The image could not be opened/));
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
  });

  it('compresses to JPEG at the chosen quality and reports real savings', async () => {
    const root = open();
    await load(root, file('holiday photo.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    choose(root, '#compress-quality', '60');
    const enc = mockEncoder(() => 4_000);
    submit(root);
    await done(root);
    expect(status(root)).toBe('Done. The compressed image is ready to download.');
    const [source, from, size, format, mayBeTransparent] = pipeline.openEncoder.mock.calls[0]!;
    expect(source).toBeInstanceOf(HTMLImageElement);
    expect([from, size, format, mayBeTransparent]).toEqual([
      null,
      { width: 400, height: 300 },
      'jpeg',
      false,
    ]);
    expect(enc.encode).toHaveBeenCalledWith(0.6);
    expect(enc.close).toHaveBeenCalledTimes(1);
    const text = resultText(root);
    expect(text).toContain('Compressed size3.9 KB');
    expect(text).toContain('Original size9.8 KB');
    expect(text).toContain('5.9 KB smaller (60.0%)');
    expect(text).toContain('2.50 : 1');
    expect(text).toContain('400 × 300 px');
    expect(text).toContain('Quality used60%');
    const link = $<HTMLAnchorElement>(root, '#compress-download');
    expect(link.download).toBe('holiday photo-compressed-q60.jpg');
    expect(link.getAttribute('href')).toBe('blob:out-1');
    expect($<HTMLImageElement>(root, '.image-output img').getAttribute('src')).toBe('blob:out-1');
  });

  it('says so honestly when the output is the same size or larger', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    mockEncoder(() => 10_000);
    submit(root);
    await done(root);
    expect(resultText(root)).toContain('No change in size');
    expect(resultText(root)).toContain('1.00 : 1');
    expect(status(root)).toMatch(/not smaller than the original/);

    mockEncoder(() => 12_500);
    submit(root);
    await vi.waitFor(() => expect(resultText(root)).toContain('2.4 KB larger (25.0%) — no saving'));
    expect(resultText(root)).not.toMatch(/smaller \(/);
    expect(resultText(root)).toContain('0.80 : 1');
    expect(status(root)).toMatch(/not smaller than the original/);
  });

  it('explains PNG instead of offering a quality it cannot use', async () => {
    const root = open();
    await load(root); // PNG source, "Same as original"
    expect($<HTMLElement>(root, '#compress-png-note').hidden).toBe(false);
    expect($(root, '#compress-quality').closest<HTMLElement>('.field')!.hidden).toBe(true);
    const enc = mockEncoder(() => 11_000);
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    expect(enc.encode).toHaveBeenCalledWith(1);
    expect(resultText(root)).toContain('Not used (PNG is lossless)');
    expect($<HTMLAnchorElement>(root, '#compress-download').download).toBe(
      'holiday photo-compressed.png',
    );
    choose(root, '#compress-format', 'webp');
    expect($<HTMLElement>(root, '#compress-png-note').hidden).toBe(true);
    expect($(root, '#compress-quality').closest<HTMLElement>('.field')!.hidden).toBe(false);
  });

  it('warns before turning transparency white in JPEG and notes when it happened', async () => {
    const root = open();
    await load(root);
    choose(root, '#compress-format', 'jpeg');
    expect($(root, '.image-warnings').textContent).toContain('JPEG cannot store transparency');
    mockEncoder(() => 3_000, { filled: true });
    submit(root);
    await done(root);
    expect(pipeline.openEncoder.mock.calls[0]?.[4]).toBe(true); // source may be transparent
    expect(resultText(root)).toContain('Transparent areas were filled with white');
  });

  it('finds the highest quality that meets a target size', async () => {
    const root = open();
    await load(root, file('big.jpg', JPEG_HEADER, 'image/jpeg', 20_000));
    setMode(root, 'target');
    expect($(root, '#compress-target').closest<HTMLElement>('.field')!.hidden).toBe(false);
    expect($(root, '#compress-quality').closest<HTMLElement>('.field')!.hidden).toBe(true);
    choose(root, '#compress-target', '5');
    const enc = mockEncoder((q) => q * 100); // 5 KB = 5,120 bytes → quality 51
    submit(root);
    await done(root);
    expect(enc.encode.mock.calls.length).toBeLessThanOrEqual(8);
    expect(enc.close).toHaveBeenCalledTimes(1);
    expect(resultText(root)).toContain('Target of 5.0 KB reached at quality 51%.');
    expect(resultText(root)).toContain('Compressed size5.0 KB');
    expect($<HTMLAnchorElement>(root, '#compress-download').download).toBe(
      'big-compressed-q51.jpg',
    );
    expect(alertText(root)).toBe('');
  });

  it('reports a target that cannot be reached and shows the smallest result', async () => {
    const root = open();
    await load(root, file('big.jpg', JPEG_HEADER, 'image/jpeg', 20_000));
    setMode(root, 'target');
    choose(root, '#compress-target', '2');
    const enc = mockEncoder((q) => 3_072 + q); // 3,082 bytes = 3.0 KB at quality 10
    submit(root);
    await done(root);
    expect(enc.encode).toHaveBeenCalledTimes(1); // the lowest quality already misses
    expect(alertText(root)).toBe(
      'The target of 2.0 KB could not be reached. The smallest result, at the lowest quality (10%), is 3.0 KB and is shown below. Try WebP, or make the image smaller with the Image Resizer.',
    );
    expect(resultText(root)).toContain('Quality used10%');
  });

  it('validates the target and refuses a target for PNG output', async () => {
    const root = open();
    await load(root);
    setMode(root, 'target');
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'A target file size needs JPEG or WebP output, because PNG has no quality setting.',
      ),
    );
    choose(root, '#compress-format', 'webp');
    choose(root, '#compress-target', 'abc');
    submit(root);
    const t = $(root, '#compress-target');
    await vi.waitFor(() => expect(t.getAttribute('aria-invalid')).toBe('true'));
    expect($(root, '#compress-target-error').textContent).toBe(
      'Enter a size in KB, for example 200 or 150.5.',
    );
    expect(document.activeElement).toBe(t);
    choose(root, '#compress-target', '0.5');
    submit(root);
    await vi.waitFor(() =>
      expect($(root, '#compress-target-error').textContent).toBe(
        'The target must be at least 1 KB.',
      ),
    );
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
  });

  it('refuses formats the browser cannot encode and never mislabels the output', async () => {
    pipeline.canEncode.mockImplementation((f: string) => f !== 'webp');
    const root = open();
    const webp = $<HTMLSelectElement>(root, '#compress-format').querySelector(
      'option[value="webp"]',
    ) as HTMLOptionElement;
    expect(webp.disabled).toBe(true);
    await load(root, file('p.webp', WEBP_HEADER, 'image/webp', 5_000));
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'This browser cannot save WebP images. Choose another format in “Save as”.',
      ),
    );
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
    choose(root, '#compress-format', 'jpeg');
    mockEncoder(() => 1_000, { produce: 'png' }); // the browser silently returns PNG
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'This browser cannot save JPEG images. Choose another format in “Save as”.',
      ),
    );
    expect(created).toEqual([]);
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
  });

  it('reports canvas, encoder and size-limit errors without crashing', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    pipeline.openEncoder.mockImplementationOnce(() => {
      throw new pipeline.ImageProcessingError('canvas');
    });
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'Your browser could not create an image this large. Try smaller dimensions.',
      ),
    );
    const enc = mockEncoder(() => 1);
    enc.encode.mockRejectedValueOnce(new pipeline.ImageProcessingError('encode'));
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'Your browser could not save the image in this format. Try another format.',
      ),
    );
    expect(enc.close).toHaveBeenCalledTimes(1); // released even after an error
    expect($<HTMLButtonElement>(root, '#compress-submit').disabled).toBe(false);

    await load(root, file('huge.jpg', JPEG_HEADER, 'image/jpeg', 10_000), 9_000, 2_000);
    pipeline.openEncoder.mockClear();
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toMatch(/^This image is too large to re-encode/),
    );
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
  });

  it('ignores repeated submits while working and disables the controls', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    let finish: () => void = () => {};
    const gate = new Promise<void>((r) => (finish = r));
    const enc = mockEncoder(() => 5_000);
    const original = enc.encode.getMockImplementation()!;
    enc.encode.mockImplementationOnce(async (q: number) => {
      await gate;
      return original(q);
    });
    submit(root);
    submit(root);
    submit(root);
    expect(pipeline.openEncoder).toHaveBeenCalledTimes(1);
    expect($<HTMLButtonElement>(root, '#compress-submit').disabled).toBe(true);
    expect($(root, '#compress-quality').disabled).toBe(true);
    finish();
    await done(root);
    expect($(root, '#compress-quality').disabled).toBe(false);
  });

  it('replaces and resets, releasing images and output URLs', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    choose(root, '#compress-quality', '40');
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    await load(root, file('b.jpg', JPEG_HEADER, 'image/jpeg', 8_000), 200, 100);
    expect(released()).toEqual(['blob:decoded-400x300']);
    expect(revoked).toContain('blob:out-1');
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
    expect($(root, '.image-meta').textContent).toContain('b.jpg');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reset')!.click();
    expect(released()).toEqual(['blob:decoded-400x300', 'blob:decoded-200x100']);
    expect($<HTMLElement>(root, '#compress-dropzone').hidden).toBe(false);
    expect($<HTMLElement>(root, '.compress-controls').hidden).toBe(true);
    expect($(root, '#compress-quality').value).toBe('80');
    expect(document.activeElement).toBe($(root, '#compress-file'));
  });

  it('forgets everything when leaving the tool', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(released()).toEqual(['blob:decoded-400x300']);
    expect(revoked).toContain('blob:out-1');
    history.replaceState(null, '', '/#/tool/image-compressor');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect($<HTMLElement>(root, '#compress-dropzone').hidden).toBe(false);
  });

  it('keeps the image, settings and result across a language switch, in memory only', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    choose(root, '#compress-quality', '70');
    mockEncoder(() => 4_000);
    submit(root);
    await done(root);
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(400, 300));
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    await vi.waitFor(() => expect($(root, 'h1').textContent).toBe('ছবি কম্প্রেসার'));
    await vi.waitFor(() => expect($<HTMLElement>(root, '.image-output').hidden).toBe(false));
    expect($(root, '#compress-quality').value).toBe('70');
    expect($(root, '.quality-value').textContent).toBe('৭০%');
    expect(resultText(root)).toContain('৫.৯ KB ছোট (৬০.০%)');
    expect(resultText(root)).toContain('২.৫০ : ১');
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
    expect(sessionStorage.length).toBe(0);
  });
});
