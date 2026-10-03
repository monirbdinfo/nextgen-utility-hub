/**
 * View tests for the Image Cropper. jsdom has no canvas, image decoding or layout, so
 * the browser pipeline (src/lib/imageCanvas) is mocked and the preview's on-screen
 * size is stubbed. Real decoding, dragging and encoding are covered by e2e/crop.spec.ts.
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
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const file = (name: string, header: number[], type: string): File =>
  new File([new Uint8Array([...header, ...new Array(100).fill(0)])], name, { type });

const decodedFor = (width: number, height: number) => ({
  image: document.createElement('img'),
  url: `blob:decoded-${width}x${height}`,
  width,
  height,
});

function open(): HTMLElement {
  history.replaceState(null, '', '/#/tool/image-cropper');
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
  const input = $(root, '#crop-file');
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.dispatchEvent(new Event('change'));
}

/** Open a non-square 400 × 300 image (or another size). */
async function load(
  root: HTMLElement,
  width = 400,
  height = 300,
  f = file('holiday photo.png', PNG_HEADER, 'image/png'),
): Promise<void> {
  pipeline.decodeImage.mockResolvedValueOnce(decodedFor(width, height));
  pick(root, f);
  await vi.waitFor(() => expect($(root, '.image-status').textContent).toContain('Image opened'));
}

const values = (root: ParentNode): string[] =>
  ['x', 'y', 'width', 'height'].map((f) => $(root, `#crop-${f}`).value);
const selectionStyle = (root: ParentNode): string[] => {
  const s = $<HTMLElement>(root, '#crop-selection').style;
  return [s.left, s.top, s.width, s.height];
};
const alertText = (root: ParentNode): string =>
  $<HTMLElement>(root, '.image-alert').textContent ?? '';

function setField(root: ParentNode, f: string, value: string): void {
  const el = $(root, `#crop-${f}`);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function key(el: Element, k: string, shiftKey = false): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
}

function pointer(el: Element, type: string, x: number, y: number): void {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  Object.defineProperty(e, 'pointerType', { value: 'mouse' });
  el.dispatchEvent(e);
}

/** Show the 400 × 300 preview at 200 × 150 CSS pixels: 1 CSS px = 2 source px. */
function halfSizePreview(root: ParentNode): void {
  $<HTMLElement>(root, '.crop-image').getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, width: 200, height: 150, right: 200, bottom: 150 }) as DOMRect;
}

function cropResult(type: string, format: string, width: number, height: number, filled = false) {
  return {
    blob: new Blob([new Uint8Array(50)], { type }),
    format,
    size: { width, height },
    filledTransparency: filled,
  };
}

/** Decoded images actually released (calls with no image are no-ops). */
const released = (): string[] =>
  pipeline.releaseDecoded.mock.calls.flatMap((c) => (c[0] ? [(c[0] as { url: string }).url] : []));

const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, '.image-controls').requestSubmit();

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
  for (const fn of [pipeline.decodeImage, pipeline.releaseDecoded, pipeline.cropImage])
    fn.mockReset();
  pipeline.canEncode.mockImplementation(() => true);
});

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe('Image Cropper view', () => {
  it('renders the drop zone and hides the editor until an image is opened', () => {
    const root = open();
    expect($(root, 'h1').textContent).toBe('Image Cropper');
    expect($(root, '#crop-file').accept).toBe('image/jpeg,image/png,image/webp');
    expect($<HTMLElement>(root, '.crop-editor').hidden).toBe(true);
    expect($<HTMLElement>(root, '.image-controls').hidden).toBe(true);
    const aspect = $<HTMLSelectElement>(root, '#crop-aspect');
    expect([...aspect.options].map((o) => o.textContent)).toEqual([
      'Freeform',
      'Square (1:1)',
      '4:3',
      '3:2',
      '16:9 (wide)',
      'Portrait 3:4',
      'Portrait 2:3',
      'Passport-style 35:45 (shape only)',
    ]);
    expect(aspect.getAttribute('aria-describedby')).toBe('crop-aspect-hint');
  });

  it('opens an image with a centred selection in source pixels', async () => {
    const root = open();
    await load(root);
    expect($<HTMLElement>(root, '.crop-editor').hidden).toBe(false);
    expect($<HTMLImageElement>(root, '.crop-image').getAttribute('src')).toBe(
      'blob:decoded-400x300',
    );
    expect($(root, '.image-meta').textContent).toContain('400 × 300 px');
    expect(values(root)).toEqual(['40', '30', '320', '240']);
    expect(selectionStyle(root)).toEqual(['10%', '10%', '80%', '80%']);
    const sel = $<HTMLElement>(root, '#crop-selection');
    expect(sel.tabIndex).toBe(0);
    expect(sel.getAttribute('aria-describedby')).toBe('crop-keys');
  });

  it('rejects unsupported and damaged files using the shared validation', async () => {
    const root = open();
    pick(root, new File(['hello'], 'notes.png', { type: 'image/png' }));
    await vi.waitFor(() =>
      expect(alertText(root)).toBe('This file is not a JPEG, PNG or WebP image.'),
    );
    expect(pipeline.decodeImage).not.toHaveBeenCalled();
    pipeline.decodeImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('decode'));
    pick(root, file('broken.png', PNG_HEADER, 'image/png'));
    await vi.waitFor(() => expect(alertText(root)).toMatch(/^The image could not be opened/));
    expect($<HTMLElement>(root, '.crop-editor').hidden).toBe(true);
  });

  it('moves the selection with the arrow keys and resizes it from the corner', async () => {
    const root = open();
    await load(root);
    const sel = $<HTMLElement>(root, '#crop-selection');
    expect(key(sel, 'ArrowRight').defaultPrevented).toBe(true);
    expect(values(root)).toEqual(['41', '30', '320', '240']);
    key(sel, 'ArrowDown', true);
    expect(values(root)).toEqual(['41', '40', '320', '240']);
    for (let i = 0; i < 10; i++) key(sel, 'ArrowLeft', true);
    expect(values(root)).toEqual(['0', '40', '320', '240']); // stops at the left edge
    expect($(root, '.crop-editor .sr-only').textContent).toBe(
      'Crop area 320 × 240 pixels at X 0, Y 40.',
    );
    const corner = $<HTMLElement>(root, '.crop-handle-se');
    expect(corner.tabIndex).toBe(0);
    key(corner, 'ArrowLeft');
    expect(values(root)).toEqual(['0', '40', '319', '240']);
    key(corner, 'ArrowUp', true);
    expect(values(root)).toEqual(['0', '40', '319', '230']);
    // Other keys and modified arrows are left alone.
    expect(key(sel, 'Enter').defaultPrevented).toBe(false);
    const fieldEvent = key($(root, '#crop-x'), 'ArrowRight');
    expect(fieldEvent.defaultPrevented).toBe(false);
    expect(values(root)).toEqual(['0', '40', '319', '230']);
  });

  it('converts pointer drags from display pixels to source pixels', async () => {
    const root = open();
    await load(root);
    halfSizePreview(root);
    const sel = $<HTMLElement>(root, '#crop-selection');
    pointer(sel, 'pointerdown', 100, 75);
    pointer(sel, 'pointermove', 110, 80); // +10, +5 CSS px = +20, +10 source px
    pointer(sel, 'pointerup', 110, 80);
    expect(values(root)).toEqual(['60', '40', '320', '240']);
    pointer(sel, 'pointerdown', 50, 50);
    pointer(sel, 'pointermove', 500, 500); // far outside: stops at the edges
    pointer(sel, 'pointerup', 500, 500);
    expect(values(root)).toEqual(['80', '60', '320', '240']);
    expect(selectionStyle(root)).toEqual(['20%', '20%', '80%', '80%']);
    // Moves after release are ignored.
    pointer(sel, 'pointermove', 0, 0);
    expect(values(root)).toEqual(['80', '60', '320', '240']);
  });

  it('resizes with handles and keeps a usable minimum size', async () => {
    const root = open();
    await load(root);
    halfSizePreview(root);
    const sel = $<HTMLElement>(root, '#crop-selection');
    const nw = $<HTMLElement>(root, '.crop-handle-nw');
    pointer(nw, 'pointerdown', 20, 15);
    pointer(sel, 'pointermove', 30, 20); // +20, +10 source px
    pointer(sel, 'pointerup', 30, 20);
    expect(values(root)).toEqual(['60', '40', '300', '230']);
    const se = $<HTMLElement>(root, '.crop-handle-se');
    pointer(se, 'pointerdown', 180, 135);
    pointer(sel, 'pointermove', -500, -500);
    pointer(sel, 'pointerup', -500, -500);
    // 24 CSS px minimum = 48 source px at this scale.
    expect(values(root)).toEqual(['60', '40', '48', '48']);
  });

  it('applies aspect-ratio presets and keeps them while resizing', async () => {
    const root = open();
    await load(root);
    halfSizePreview(root);
    const aspect = $<HTMLSelectElement>(root, '#crop-aspect');
    aspect.value = '1:1';
    aspect.dispatchEvent(new Event('change'));
    expect(values(root)).toEqual(['62', '12', '277', '277']);
    const sel = $<HTMLElement>(root, '#crop-selection');
    pointer($<HTMLElement>(root, '.crop-handle-se'), 'pointerdown', 0, 0);
    pointer(sel, 'pointermove', -20, -5); // corner follows the larger movement
    pointer(sel, 'pointerup', -20, -5);
    expect(values(root)).toEqual(['62', '12', '237', '237']);
    // Moving keeps the size.
    key(sel, 'ArrowRight', true);
    expect(values(root)).toEqual(['72', '12', '237', '237']);
    aspect.value = '16:9';
    aspect.dispatchEvent(new Event('change'));
    const [, , w, h] = values(root).map(Number);
    expect(Math.abs((w as number) / (h as number) - 16 / 9)).toBeLessThan(0.01);
    // "Select whole image" respects the ratio.
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent === 'Select whole image')!
      .click();
    expect(values(root)).toEqual(['0', '38', '400', '225']);
  });

  it('applies typed values and reports values that do not fit, without clamping', async () => {
    const root = open();
    await load(root);
    setField(root, 'x', '200');
    const x = $(root, '#crop-x');
    expect(x.getAttribute('aria-invalid')).toBe('true');
    expect($(root, '#crop-x-error').textContent).toBe(
      'The crop goes past the right edge. X + width can be at most 400 pixels.',
    );
    expect(selectionStyle(root)).toEqual(['10%', '10%', '80%', '80%']); // unchanged
    setField(root, 'width', '১০০'); // Bangla digits
    expect(x.hasAttribute('aria-invalid')).toBe(false);
    expect(values(root)).toEqual(['200', '30', '100', '240']);
    expect(selectionStyle(root)).toEqual(['50%', '10%', '25%', '80%']);
    setField(root, 'height', '0');
    expect($(root, '#crop-height-error').textContent).toBe('Must be at least 1 pixel.');
    setField(root, 'height', '12.5');
    expect($(root, '#crop-height-error').textContent).toBe('Enter a whole number of pixels.');
    // With a ratio, the other side follows, and an impossible size is explained.
    setField(root, 'height', '240');
    const aspect = $<HTMLSelectElement>(root, '#crop-aspect');
    aspect.value = '1:1';
    aspect.dispatchEvent(new Event('change'));
    setField(root, 'width', '50');
    expect(values(root).slice(2)).toEqual(['50', '50']);
    setField(root, 'width', '350');
    expect($(root, '#crop-width-error').textContent).toBe(
      'At Square (1:1), this size does not fit inside the image from the current position. Enter a smaller value or move the crop first.',
    );
  });

  it('moves with X and Y at a fixed ratio without changing the size', async () => {
    const root = open();
    await load(root);
    const aspect = $<HTMLSelectElement>(root, '#crop-aspect');
    aspect.value = 'passport';
    aspect.dispatchEvent(new Event('change'));
    setField(root, 'y', '0');
    setField(root, 'height', '299'); // 35:45 → 233 × 299
    expect(values(root).slice(2)).toEqual(['233', '299']);
    setField(root, 'x', '10');
    setField(root, 'y', '1');
    expect(values(root)).toEqual(['10', '1', '233', '299']);
    setField(root, 'y', '2');
    expect($(root, '#crop-y-error').textContent).toBe(
      'The crop goes past the bottom edge. Y + height can be at most 300 pixels.',
    );
    expect(values(root).slice(2)).toEqual(['233', '299']);
  });

  it('applies a typed value when Enter submits before the field changes', async () => {
    const root = open();
    await load(root);
    const x = $(root, '#crop-x');
    x.value = '10';
    x.dispatchEvent(new Event('input', { bubbles: true }));
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(pipeline.cropImage).toHaveBeenCalledTimes(1));
    expect(pipeline.cropImage.mock.calls[0]?.[1]).toEqual({
      x: 10,
      y: 30,
      width: 320,
      height: 240,
    });
  });

  it('crops a PNG to JPEG with a transparency warning and an accurate download', async () => {
    const root = open();
    await load(root);
    const format = $<HTMLSelectElement>(root, '#crop-format');
    expect([...format.options].map((o) => o.value)).toEqual(['same', 'png', 'webp', 'jpeg']);
    expect(format.options[0]?.textContent).toBe('Same as original (PNG)');
    format.value = 'jpeg';
    format.dispatchEvent(new Event('change'));
    expect($(root, '.image-warnings').textContent).toContain('JPEG cannot store transparency');
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/jpeg', 'jpeg', 320, 240, true));
    submit(root);
    await vi.waitFor(() =>
      expect($(root, '.image-status').textContent).toBe(
        'Done. The cropped image is ready to download.',
      ),
    );
    const [source, rect, fmt, mayBeTransparent] = pipeline.cropImage.mock.calls[0] ?? [];
    expect(source).toBeInstanceOf(HTMLImageElement);
    expect(rect).toEqual({ x: 40, y: 30, width: 320, height: 240 });
    expect(fmt).toBe('jpeg');
    expect(mayBeTransparent).toBe(true);
    const link = $<HTMLAnchorElement>(root, '#crop-download');
    expect(link.download).toBe('holiday photo-cropped.jpg');
    expect(link.getAttribute('href')).toBe('blob:out-1');
    const result = $(root, '.result').textContent ?? '';
    expect(result).toContain('320 × 240 px');
    expect(result).toContain('X 40, Y 30');
    expect(result).toContain('50 B');
    expect(result).toContain('Transparent areas were filled with white');
    expect(result).toContain('lossy compression (quality 92%)');
  });

  it('keeps PNG pixels exact and says so', async () => {
    const root = open();
    await load(root);
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    expect($<HTMLAnchorElement>(root, '#crop-download').download).toBe('holiday photo-cropped.png');
    expect($(root, '.result').textContent).toContain('PNG keeps the selected pixels exactly');
  });

  it('refuses formats the browser cannot encode instead of mislabelling the file', async () => {
    pipeline.canEncode.mockImplementation((f: string) => f !== 'webp');
    const root = open();
    const webpOption = $<HTMLSelectElement>(root, '#crop-format').querySelector(
      'option[value="webp"]',
    ) as HTMLOptionElement;
    expect(webpOption.disabled).toBe(true);
    expect(webpOption.textContent).toBe('WebP (not supported by this browser)');
    await load(root, 400, 300, file('photo.webp', WEBP_HEADER, 'image/webp'));
    submit(root); // "Same as original" = WebP
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'This browser cannot save WebP images. Choose another format in “Save as”.',
      ),
    );
    expect(pipeline.cropImage).not.toHaveBeenCalled();
    // An encoder that silently returns another type is rejected too.
    const format = $<HTMLSelectElement>(root, '#crop-format');
    format.value = 'jpeg';
    format.dispatchEvent(new Event('change'));
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'This browser cannot save JPEG images. Choose another format in “Save as”.',
      ),
    );
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
    expect(created).toEqual([]);
  });

  it('blocks crops larger than the browser-safe output limits', async () => {
    const root = open();
    await load(root, 8000, 6000); // 48 MP: allowed in, but 80 % is 30.7 MP
    expect($(root, '.image-warnings').textContent).toContain('The crop is too large');
    submit(root);
    await vi.waitFor(() => expect(alertText(root)).toMatch(/^The crop is too large/));
    expect(pipeline.cropImage).not.toHaveBeenCalled();
    setField(root, 'width', '4000');
    setField(root, 'height', '4000');
    expect($(root, '.image-warnings').textContent).not.toContain('The crop is too large');
  });

  it('shows canvas errors without crashing and ignores repeated submits', async () => {
    const root = open();
    await load(root);
    let finish: (v: unknown) => void = () => {};
    pipeline.cropImage.mockReturnValueOnce(new Promise((r) => (finish = r)));
    submit(root);
    submit(root);
    submit(root);
    expect(pipeline.cropImage).toHaveBeenCalledTimes(1);
    expect($<HTMLButtonElement>(root, '#crop-submit').disabled).toBe(true);
    finish(cropResult('image/png', 'png', 320, 240));
    await vi.waitFor(() => expect($<HTMLButtonElement>(root, '#crop-submit').disabled).toBe(false));
    pipeline.cropImage.mockRejectedValueOnce(new pipeline.ImageProcessingError('canvas'));
    submit(root);
    await vi.waitFor(() =>
      expect(alertText(root)).toBe(
        'Your browser could not create an image this large. Try smaller dimensions.',
      ),
    );
  });

  it('clears an outdated result when the selection changes', async () => {
    const root = open();
    await load(root);
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    key($<HTMLElement>(root, '#crop-selection'), 'ArrowRight');
    expect(revoked).toContain('blob:out-1');
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
  });

  it('replaces and resets, releasing images and output URLs', async () => {
    const root = open();
    await load(root);
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    await load(root, 200, 100, file('second.png', PNG_HEADER, 'image/png'));
    expect(released()).toEqual(['blob:decoded-400x300']);
    expect(revoked).toContain('blob:out-1');
    expect(values(root)).toEqual(['20', '10', '160', '80']);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reset')!.click();
    expect(released()).toEqual(['blob:decoded-400x300', 'blob:decoded-200x100']);
    expect($<HTMLElement>(root, '#crop-dropzone').hidden).toBe(false);
    expect($<HTMLElement>(root, '.crop-editor').hidden).toBe(true);
    expect($<HTMLImageElement>(root, '.crop-image').hasAttribute('src')).toBe(false);
    expect(document.activeElement).toBe($(root, '#crop-file'));
  });

  it('forgets everything when leaving the tool', async () => {
    const root = open();
    await load(root);
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    history.replaceState(null, '', '/#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(pipeline.releaseDecoded).toHaveBeenCalled();
    expect(revoked).toContain('blob:out-1');
    history.replaceState(null, '', '/#/tool/image-cropper');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect($<HTMLElement>(root, '#crop-dropzone').hidden).toBe(false);
  });

  it('keeps the image, selection and result across a language switch, in memory only', async () => {
    const root = open();
    await load(root);
    key($<HTMLElement>(root, '#crop-selection'), 'ArrowRight');
    pipeline.cropImage.mockResolvedValueOnce(cropResult('image/png', 'png', 320, 240));
    submit(root);
    await vi.waitFor(() => expect(created).toEqual(['blob:out-1']));
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(400, 300));
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    await vi.waitFor(() => expect(values(root)).toEqual(['৪১', '৩০', '৩২০', '২৪০']));
    expect($(root, 'h1').textContent).toBe('ছবি ক্রপার');
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(false);
    expect($(root, '.result').textContent).toContain('৩২০ × ২৪০ পিক্সেল');
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
    expect(sessionStorage.length).toBe(0);
  });
});
