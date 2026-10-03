/**
 * View tests for the Image Converter. jsdom has no canvas, so the browser pipeline
 * (src/lib/imageCanvas) is mocked with an encoder whose output sizes the tests choose.
 * These are simulated encoders; real conversions are covered by e2e/convert.spec.ts.
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
  history.replaceState(null, '', '/#/tool/image-converter');
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
  const input = $(root, '#convert-file');
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

const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, '.image-controls').requestSubmit();
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

describe('Image Converter view', () => {
  it('renders a format list without "same as original" and hides settings until loaded', () => {
    const root = open();
    expect($(root, 'h1').textContent).toBe('Image Converter');
    const select = $<HTMLSelectElement>(root, '#convert-format');
    expect([...select.options].map((o) => o.value)).toEqual(['jpeg', 'png', 'webp']);
    expect(select.labels?.[0]?.textContent).toBe('Convert to');
    expect($<HTMLElement>(root, '.image-controls').hidden).toBe(true);
  });

  it('suggests a different format and shows the file details', async () => {
    const root = open();
    await load(root, file('holiday photo.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    const meta = $(root, '.image-meta').textContent ?? '';
    for (const text of ['holiday photo.jpg', '400 × 300 px', '9.8 KB', 'JPEG'])
      expect(meta).toContain(text);
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('png');
    // PNG: no misleading quality slider.
    expect($(root, '#convert-quality').closest<HTMLElement>('.field')!.hidden).toBe(true);
    expect($<HTMLElement>(root, '#convert-png-note').hidden).toBe(false);

    await load(root, file('logo.png', PNG_HEADER, 'image/png', 5_000));
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('jpeg');
    const range = $(root, '#convert-quality');
    expect(range.closest<HTMLElement>('.field')!.hidden).toBe(false);
    expect([range.type, range.min, range.max, range.value]).toEqual(['range', '10', '100', '92']);
    expect(range.getAttribute('aria-valuetext')).toBe('92%');
    expect($(root, '#convert-quality-hint').textContent).toContain(
      'no quality setting guarantees a particular file size',
    );
    expect($(root, '.image-warnings').textContent).toContain('JPEG cannot store transparency');
  });

  it('converts JPEG to PNG at the original dimensions and reports the larger size', async () => {
    const root = open();
    await load(root, file('photo.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    const enc = mockEncoder(() => 25_000);
    submit(root);
    await done(root);
    const [source, from, size, format, mayBeTransparent] = pipeline.openEncoder.mock.calls[0]!;
    expect(source).toBeInstanceOf(HTMLImageElement);
    expect([from, size, format, mayBeTransparent]).toEqual([
      null,
      { width: 400, height: 300 },
      'png',
      false,
    ]);
    expect(enc.encode).toHaveBeenCalledWith(1);
    expect(enc.close).toHaveBeenCalledTimes(1);
    const text = resultText(root);
    for (const t of [
      'Output formatPNG',
      'Original formatJPEG',
      '400 × 300 px',
      'Output size24.4 KB',
      'Original size9.8 KB',
      '14.6 KB larger (150.0%)',
      'Not used (PNG is lossless)',
      'The converted file is larger than the original.',
    ])
      expect(text).toContain(t);
    expect(text).not.toContain('smaller (');
    const link = $<HTMLAnchorElement>(root, '#convert-download');
    expect(link.download).toBe('photo-converted.png');
    expect(link.getAttribute('href')).toBe('blob:out-1');
  });

  it('reports smaller and unchanged sizes honestly', async () => {
    const root = open();
    await load(root, file('a.png', PNG_HEADER, 'image/png', 10_000));
    choose(root, '#convert-quality', '70');
    const enc = mockEncoder(() => 4_000);
    submit(root);
    await done(root);
    expect(enc.encode).toHaveBeenCalledWith(0.7);
    expect(resultText(root)).toContain('5.9 KB smaller (60.0%)');
    expect(resultText(root)).toContain('Quality used70%');
    expect($<HTMLAnchorElement>(root, '#convert-download').download).toBe('a-converted.jpg');

    mockEncoder(() => 10_000);
    submit(root);
    await vi.waitFor(() => expect(resultText(root)).toContain('No change in size'));
    expect(resultText(root)).not.toContain('larger (');
  });

  it('fills transparency with white for JPEG and keeps it for WebP', async () => {
    const root = open();
    await load(root, file('logo.png', PNG_HEADER, 'image/png', 10_000));
    mockEncoder(() => 3_000, { filled: true });
    submit(root);
    await done(root);
    expect(pipeline.openEncoder.mock.calls[0]?.[4]).toBe(true);
    expect(resultText(root)).toContain('Transparent areas were filled with white');
    choose(root, '#convert-format', 'webp');
    expect($(root, '.image-warnings').textContent).toBe('');
  });

  it('explains a same-format conversion', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    expect($<HTMLElement>(root, '#convert-same-note').hidden).toBe(true);
    choose(root, '#convert-format', 'jpeg');
    expect($<HTMLElement>(root, '#convert-same-note').hidden).toBe(false);
  });

  it('never overrides a format the user chose, until Reset', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    choose(root, '#convert-format', 'webp');
    await load(root, file('b.png', PNG_HEADER, 'image/png', 10_000));
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('webp');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reset')!.click();
    await load(root, file('c.png', PNG_HEADER, 'image/png', 10_000));
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('jpeg');
  });

  it('disables formats the browser cannot encode and rejects a mislabelled result', async () => {
    pipeline.canEncode.mockImplementation((f: string) => f !== 'webp');
    const root = open();
    const webp = $<HTMLSelectElement>(root, '#convert-format').querySelector(
      'option[value="webp"]',
    ) as HTMLOptionElement;
    expect(webp.disabled).toBe(true);
    expect(webp.textContent).toBe('WebP (not supported by this browser)');
    await load(root, file('p.webp', WEBP_HEADER, 'image/webp', 5_000));
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('png');
    mockEncoder(() => 1_000, { produce: 'jpeg' }); // asked for PNG, got JPEG
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'This browser cannot save PNG images. Choose another format in “Convert to”.',
      ),
    );
    expect(created).toEqual([]);
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
  });

  it('explains when the browser can encode nothing', () => {
    pipeline.canEncode.mockImplementation(() => false);
    const root = open();
    expect(alertText(root)).toBe(
      'This browser cannot save JPEG, PNG or WebP images, so nothing can be converted.',
    );
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
    expect(enc.close).toHaveBeenCalledTimes(1);
    expect($<HTMLButtonElement>(root, '#convert-submit').disabled).toBe(false);

    await load(root, file('huge.jpg', JPEG_HEADER, 'image/jpeg', 10_000), 9_000, 2_000);
    pipeline.openEncoder.mockClear();
    submit(root);
    await vi.waitFor(() => expect(alertText(root)).toMatch(/^This image is too large to convert/));
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
  });

  it('rejects invalid, oversized and damaged files with the shared validation', async () => {
    const root = open();
    pick(root, new File(['hello'], 'notes.jpg', { type: 'image/jpeg' }));
    await vi.waitFor(() =>
      expect(alertText(root)).toBe('This file is not a JPEG, PNG or WebP image.'),
    );
    const big = [new Uint8Array(PNG_HEADER), new Uint8Array(26 * 1024 * 1024)];
    pick(root, new File(big, 'big.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(alertText(root)).toMatch(/larger than 25 MB/));
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(8_000, 7_000)); // 56 MP
    pick(root, file('wide.png', PNG_HEADER, 'image/png', 200));
    await vi.waitFor(() => expect(alertText(root)).toMatch(/more than 50 megapixels/));
    pipeline.decodeImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('decode'));
    pick(root, file('broken.png', PNG_HEADER, 'image/png', 200));
    await vi.waitFor(() => expect(alertText(root)).toMatch(/^The image could not be opened/));
    expect(pipeline.openEncoder).not.toHaveBeenCalled();
  });

  it('ignores repeated submits while converting', async () => {
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
    expect(pipeline.openEncoder).toHaveBeenCalledTimes(1);
    expect($<HTMLSelectElement>(root, '#convert-format').disabled).toBe(true);
    finish();
    await done(root);
    expect($<HTMLSelectElement>(root, '#convert-format').disabled).toBe(false);
  });

  it('replaces, resets and leaves the tool, releasing images and output URLs', async () => {
    const root = open();
    await load(root, file('a.jpg', JPEG_HEADER, 'image/jpeg', 10_000));
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    await load(root, file('b.jpg', JPEG_HEADER, 'image/jpeg', 8_000), 200, 100);
    expect(released()).toEqual(['blob:decoded-400x300']);
    expect(revoked).toContain('blob:out-1');
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reset')!.click();
    expect(released()).toEqual(['blob:decoded-400x300', 'blob:decoded-200x100']);
    expect($<HTMLElement>(root, '#convert-dropzone').hidden).toBe(false);
    expect(document.activeElement).toBe($(root, '#convert-file'));

    await load(root, file('c.jpg', JPEG_HEADER, 'image/jpeg', 8_000));
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(revoked).toContain('blob:out-2');
    expect(released()).toHaveLength(3);
  });

  it('keeps the image, settings and result across a language switch, in memory only', async () => {
    const root = open();
    await load(root, file('ছবি ১.png', PNG_HEADER, 'image/png', 10_000));
    choose(root, '#convert-quality', '75');
    mockEncoder(() => 4_000);
    submit(root);
    await done(root);
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(400, 300));
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    await vi.waitFor(() => expect($(root, 'h1').textContent).toBe('ছবি কনভার্টার'));
    await vi.waitFor(() => expect($<HTMLElement>(root, '.image-output').hidden).toBe(false));
    expect($<HTMLSelectElement>(root, '#convert-format').value).toBe('jpeg');
    expect($(root, '#convert-quality').value).toBe('75');
    expect($(root, '.quality-value').textContent).toBe('৭৫%');
    expect($(root, '.image-meta').textContent).toContain('ছবি ১.png');
    expect(resultText(root)).toContain('৫.৯ KB ছোট (৬০.০%)');
    expect($<HTMLAnchorElement>(root, '#convert-download').download).toBe('ছবি ১-converted.jpg');
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
    expect(sessionStorage.length).toBe(0);
  });
});
