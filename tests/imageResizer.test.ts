/**
 * View tests for the Image Resizer. jsdom has no canvas or image decoding, so the
 * browser pipeline (src/lib/imageCanvas) is replaced with a controllable mock;
 * real decoding/encoding is covered by e2e/image.spec.ts in Chromium.
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
    canEncode: vi.fn(() => true),
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
const file = (name: string, header: number[], type: string, extra = 100): File =>
  new File([new Uint8Array([...header, ...new Array(extra).fill(0)])], name, { type });

function decodedFor(width: number, height: number) {
  return {
    image: document.createElement('img'),
    url: `blob:decoded-${width}x${height}`,
    width,
    height,
  };
}

function open(): HTMLElement {
  history.replaceState(null, '', '/#/tool/image-resizer');
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
  const input = $(root, '#resize-file');
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.dispatchEvent(new Event('change'));
}

function type(root: ParentNode, sel: string, value: string): void {
  const el = $(root, sel);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function loadPng(root: HTMLElement, width = 4000, height = 3000): Promise<void> {
  pipeline.decodeImage.mockResolvedValueOnce(decodedFor(width, height));
  pick(root, file('holiday photo.png', PNG_HEADER, 'image/png'));
  await vi.waitFor(() => expect($(root, '.image-status').textContent).toContain('Image opened'));
}

const alertText = (root: ParentNode): string =>
  $<HTMLElement>(root, '.image-alert').textContent ?? '';
const button = (root: ParentNode, text: string): HTMLButtonElement =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === text,
  )!;

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
  for (const fn of [pipeline.decodeImage, pipeline.releaseDecoded, pipeline.resizeImage])
    fn.mockReset();
});

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe('Image Resizer view', () => {
  it('renders an accessible drop zone with a file input', () => {
    const root = open();
    expect($(root, 'h1').textContent).toBe('Image Resizer');
    const input = $(root, '#resize-file');
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(input.getAttribute('aria-describedby')).toBe('resize-drop-hint');
    expect($(root, 'label[for="resize-file"]').textContent).toBe('Choose an image');
    expect($<HTMLElement>(root, '.image-controls').hidden).toBe(true);
  });

  it('opens a valid image and shows its details', async () => {
    const root = open();
    await loadPng(root);
    const meta = [...root.querySelectorAll('.image-meta .result-row')].map((r) => r.textContent);
    expect(meta).toEqual(['Dimensions4,000 × 3,000 px', 'File size116 B', 'FormatPNG']);
    expect($(root, '#resize-width').value).toBe('4000');
    expect($(root, '#resize-height').value).toBe('3000');
    expect($<HTMLImageElement>(root, '.image-card img').getAttribute('src')).toBe(
      'blob:decoded-4000x3000',
    );
    expect($<HTMLElement>(root, '#resize-dropzone').hidden).toBe(true);
  });

  it('rejects files that are not JPEG, PNG or WebP without decoding them', async () => {
    const root = open();
    pick(root, new File(['hello, I am text'], 'notes.png', { type: 'image/png' }));
    await vi.waitFor(() =>
      expect(alertText(root)).toBe('This file is not a JPEG, PNG or WebP image.'),
    );
    expect(pipeline.decodeImage).not.toHaveBeenCalled();
    expect($<HTMLElement>(root, '#resize-dropzone').hidden).toBe(false);
  });

  it('rejects empty and oversized files', async () => {
    const root = open();
    pick(root, new File([], 'empty.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(alertText(root)).toBe('This file is empty.'));
    const big = file('big.png', PNG_HEADER, 'image/png');
    Object.defineProperty(big, 'size', { value: 25 * 1024 * 1024 + 1 });
    pick(root, big);
    await vi.waitFor(() => expect(alertText(root)).toContain('larger than 25 MB'));
    expect(pipeline.decodeImage).not.toHaveBeenCalled();
  });

  it('reports images the browser cannot decode', async () => {
    const root = open();
    pipeline.decodeImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('decode'));
    pick(root, file('broken.png', PNG_HEADER, 'image/png'));
    await vi.waitFor(() => expect(alertText(root)).toContain('could not be opened'));
  });

  it('rejects images above 50 megapixels and releases them', async () => {
    const root = open();
    const huge = decodedFor(10_000, 6_000);
    pipeline.decodeImage.mockResolvedValueOnce(huge);
    pick(root, file('huge.png', PNG_HEADER, 'image/png'));
    await vi.waitFor(() => expect(alertText(root)).toContain('more than 50 megapixels'));
    expect(pipeline.releaseDecoded).toHaveBeenCalledWith(huge);
  });

  it('keeps the aspect ratio while locked and warns when unlocked proportions differ', async () => {
    const root = open();
    await loadPng(root);
    type(root, '#resize-width', '800');
    expect($(root, '#resize-height').value).toBe('600');
    type(root, '#resize-height', '৩০০'); // Bangla digits are accepted
    expect($(root, '#resize-width').value).toBe('400');
    $(root, '#resize-lock').click(); // unlock
    type(root, '#resize-width', '1000');
    expect($(root, '#resize-height').value).toBe('৩০০'); // unchanged when unlocked
    expect($<HTMLElement>(root, '.image-warnings').textContent).toContain('stretched or squashed');
    $(root, '#resize-lock').click(); // lock again: height follows width
    expect($(root, '#resize-height').value).toBe('750');
    expect($<HTMLElement>(root, '.image-warnings').textContent).not.toContain('stretched');
  });

  it('applies percentage presets', async () => {
    const root = open();
    await loadPng(root);
    $<HTMLButtonElement>(root, 'button[aria-label="Set size to 25% of the original"]').click();
    expect([$(root, '#resize-width').value, $(root, '#resize-height').value]).toEqual([
      '1000',
      '750',
    ]);
    $<HTMLButtonElement>(root, 'button[aria-label="Set size to 75% of the original"]').click();
    expect([$(root, '#resize-width').value, $(root, '#resize-height').value]).toEqual([
      '3000',
      '2250',
    ]);
  });

  it('validates dimensions before resizing', async () => {
    const root = open();
    await loadPng(root);
    $(root, '#resize-lock').click();
    type(root, '#resize-width', '0');
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    expect($(root, '#resize-width-error').textContent).toBe('Must be at least 1 pixel.');
    type(root, '#resize-width', 'abc');
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    expect($(root, '#resize-width-error').textContent).toBe('Enter a whole number of pixels.');
    type(root, '#resize-width', '9000');
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    expect($(root, '#resize-width-error').textContent).toContain('8,192 pixels');
    type(root, '#resize-width', '8000');
    type(root, '#resize-height', '8000');
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    expect($(root, '#resize-width-error').textContent).toContain('16.7 megapixels');
    expect(pipeline.resizeImage).not.toHaveBeenCalled();
  });

  it('warns before converting a PNG to JPEG and resizes with the chosen settings', async () => {
    const root = open();
    await loadPng(root);
    const select = $<HTMLSelectElement>(root, '#resize-format');
    select.value = 'jpeg';
    select.dispatchEvent(new Event('change'));
    expect($<HTMLElement>(root, '.image-warnings').textContent).toContain(
      'JPEG cannot store transparency',
    );
    type(root, '#resize-width', '800');
    const blob = new Blob([new Uint8Array(50)], { type: 'image/jpeg' });
    pipeline.resizeImage.mockResolvedValueOnce({
      blob,
      format: 'jpeg',
      size: { width: 800, height: 600 },
      filledTransparency: true,
    });
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() =>
      expect($(root, '.image-status').textContent).toContain('ready to download'),
    );
    expect(pipeline.resizeImage).toHaveBeenCalledWith(
      expect.anything(),
      { width: 800, height: 600 },
      'jpeg',
      true,
    );
    const link = $<HTMLAnchorElement>(root, '#resize-download');
    expect(link.getAttribute('href')).toBe('blob:out-1');
    expect(link.download).toBe('holiday photo-800x600.jpg');
    const body = $<HTMLElement>(root, '.result-body').textContent ?? '';
    expect(body).toContain('800 × 600 px');
    expect(body).toContain('116 B → 50 B');
    expect(body).toContain('57% smaller');
    expect(body).toContain('filled with white');
  });

  it('reports when the browser saved a different format than requested', async () => {
    const root = open();
    await loadPng(root);
    const select = $<HTMLSelectElement>(root, '#resize-format');
    select.value = 'webp';
    select.dispatchEvent(new Event('change'));
    pipeline.resizeImage.mockResolvedValueOnce({
      blob: new Blob([new Uint8Array(10)], { type: 'image/png' }),
      format: 'png',
      size: { width: 4000, height: 3000 },
      filledTransparency: false,
    });
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() =>
      expect($<HTMLElement>(root, '.result-body').textContent).toContain(
        'cannot save WebP images, so the result was saved as PNG',
      ),
    );
    expect($<HTMLAnchorElement>(root, '#resize-download').download).toBe(
      'holiday photo-4000x3000.png',
    );
  });

  it('ignores repeated submits while resizing', async () => {
    const root = open();
    await loadPng(root);
    let finish: (v: unknown) => void = () => {};
    pipeline.resizeImage.mockReturnValueOnce(new Promise((r) => (finish = r)));
    const form = $<HTMLFormElement>(root, '.image-controls');
    form.requestSubmit();
    form.requestSubmit();
    form.requestSubmit();
    expect(pipeline.resizeImage).toHaveBeenCalledTimes(1);
    expect($<HTMLButtonElement>(root, '#resize-submit').disabled).toBe(true);
    expect($(root, '.image-status').textContent).toBe('Resizing…');
    finish({
      blob: new Blob([new Uint8Array(5)], { type: 'image/png' }),
      format: 'png',
      size: { width: 4000, height: 3000 },
      filledTransparency: false,
    });
    await vi.waitFor(() =>
      expect($<HTMLButtonElement>(root, '#resize-submit').disabled).toBe(false),
    );
  });

  it('shows canvas errors without crashing', async () => {
    const root = open();
    await loadPng(root);
    pipeline.resizeImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('canvas'));
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() =>
      expect(alertText(root)).toContain('could not create an image this large'),
    );
    expect($<HTMLButtonElement>(root, '#resize-submit').disabled).toBe(false);
  });

  it('keeps the current image when a replacement is invalid', async () => {
    const root = open();
    await loadPng(root);
    pick(root, new File(['nope'], 'x.txt', { type: 'text/plain' }));
    await vi.waitFor(() => expect(alertText(root)).toContain('Your current image is still open.'));
    expect($<HTMLImageElement>(root, '.image-card img').getAttribute('src')).toBe(
      'blob:decoded-4000x3000',
    );
  });

  it('replaces the image and releases the previous one and its output', async () => {
    const root = open();
    await loadPng(root);
    const first = pipeline.decodeImage.mock.results[0]?.value;
    pipeline.resizeImage.mockResolvedValueOnce({
      blob: new Blob([new Uint8Array(5)], { type: 'image/png' }),
      format: 'png',
      size: { width: 4000, height: 3000 },
      filledTransparency: false,
    });
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(640, 480));
    pick(root, file('second.jpg', JPEG_HEADER, 'image/jpeg'));
    await vi.waitFor(() => expect($(root, '#resize-width').value).toBe('640'));
    expect(pipeline.releaseDecoded).toHaveBeenCalledWith(await first);
    expect(revoked).toContain('blob:out-1');
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
  });

  it('resets everything and releases resources', async () => {
    const root = open();
    await loadPng(root);
    button(root, 'Reset').click();
    expect(pipeline.releaseDecoded).toHaveBeenCalled();
    expect($<HTMLElement>(root, '#resize-dropzone').hidden).toBe(false);
    expect($<HTMLElement>(root, '.image-controls').hidden).toBe(true);
    expect(document.activeElement?.id).toBe('resize-file');
  });

  it('releases resources and forgets the image when leaving the tool', async () => {
    const root = open();
    await loadPng(root);
    pipeline.resizeImage.mockResolvedValueOnce({
      blob: new Blob([new Uint8Array(5)], { type: 'image/png' }),
      format: 'png',
      size: { width: 4000, height: 3000 },
      filledTransparency: false,
    });
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(pipeline.releaseDecoded).toHaveBeenCalled();
    expect(revoked).toContain('blob:out-1');
    history.replaceState(null, '', '/#/tool/image-resizer');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect($<HTMLElement>(root, '#resize-dropzone').hidden).toBe(false); // nothing restored
  });

  it('keeps the image and result across a language switch, in memory only', async () => {
    const root = open();
    await loadPng(root);
    pipeline.resizeImage.mockResolvedValueOnce({
      blob: new Blob([new Uint8Array(5)], { type: 'image/png' }),
      format: 'png',
      size: { width: 2000, height: 1500 },
      filledTransparency: false,
    });
    type(root, '#resize-width', '2000');
    $<HTMLFormElement>(root, '.image-controls').requestSubmit();
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(4000, 3000));
    $<HTMLButtonElement>(root, '#lang-btn').click();
    expect(revoked).toContain('blob:out-1'); // old view cleaned up
    await vi.waitFor(() => expect($(root, 'h1').textContent).toBe('ছবি রিসাইজার'));
    await vi.waitFor(() =>
      expect($<HTMLElement>(root, '.result-body').textContent).toContain('২,০০০ × ১,৫০০ পিক্সেল'),
    );
    expect($(root, '#resize-width').value).toBe('2000');
    expect(pipeline.decodeImage).toHaveBeenCalledTimes(2); // same File re-opened, nothing persisted
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
  });
});
