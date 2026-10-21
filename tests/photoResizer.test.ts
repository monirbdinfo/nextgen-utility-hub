/**
 * View tests for the Photo & Signature Resizer. jsdom has no canvas, so the browser
 * pipeline (src/lib/imageCanvas) is mocked; the tests check what the view asks the
 * encoder to draw (placement, size, format, background) and what it reports.
 * Real pixels are covered by e2e/photo.spec.ts in Chromium (and cross-browser).
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
    openPlacedEncoder: vi.fn(),
    canEncode: vi.fn<(format: string) => boolean>(() => true),
  };
});

vi.mock('../src/lib/imageCanvas', () => ({ ...pipeline, ENCODE_QUALITY: 0.92 }));

import { mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;
let urlCount = 0;
const revoked: string[] = [];

const PNG_HEADER = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1];
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

/** Mock encoder: `sizeAt(qualityPercent)` decides the output size. */
function mockEncoder(
  sizeAt: (q: number) => number,
  opts: { filled?: boolean; produce?: string } = {},
) {
  let lastFormat = 'jpeg';
  const encode = vi.fn(async (quality: number) => {
    const q = Math.round(quality * 100);
    const format = opts.produce ?? lastFormat;
    return { blob: new Blob([new Uint8Array(sizeAt(q))], { type: `image/${format}` }), format };
  });
  const close = vi.fn();
  pipeline.openPlacedEncoder.mockImplementationOnce((_s, _place, _size, format: string) => {
    lastFormat = format;
    return { filledTransparency: opts.filled ?? false, encode, close };
  });
  return { encode, close };
}

function open(): HTMLElement {
  history.replaceState(null, '', '/#/tool/job-photo-resizer');
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

async function load(
  root: HTMLElement,
  f = file('my photo.jpg', JPEG_HEADER, 'image/jpeg', 50_000),
  width = 400,
  height = 300,
): Promise<void> {
  pipeline.decodeImage.mockResolvedValueOnce(decodedFor(width, height));
  const input = $(root, '#photo-file');
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect($(root, '.image-status').textContent).toContain('Image opened'));
}

function type(root: ParentNode, sel: string, value: string): void {
  const el = $<HTMLSelectElement | HTMLInputElement>(root, sel);
  el.value = value;
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
}
function setFit(root: ParentNode, fit: 'crop' | 'pad'): void {
  const r = $(root, `#photo-fit-${fit}`);
  r.checked = true;
  r.dispatchEvent(new Event('change'));
}
function setSize(root: ParentNode, w: string, hgt: string): void {
  type(root, '#photo-width', w);
  type(root, '#photo-height', hgt);
}

const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, '.photo-controls').requestSubmit();
const status = (root: ParentNode): string => $(root, '.image-status').textContent ?? '';
const alertText = (root: ParentNode): string =>
  $<HTMLElement>(root, '.image-alert').textContent ?? '';
const resultText = (root: ParentNode): string => $(root, '.result').textContent ?? '';
const plan = (root: ParentNode): string => $(root, '#photo-plan').textContent ?? '';
const warningsText = (root: ParentNode): string => $(root, '.image-warnings').textContent ?? '';
const done = (root: ParentNode) => vi.waitFor(() => expect(status(root)).toMatch(/^Done/));
const lastDraw = () => pipeline.openPlacedEncoder.mock.calls.at(-1)!;

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
  revoked.length = 0;
  URL.createObjectURL = vi.fn(() => `blob:out-${++urlCount}`);
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  for (const fn of [pipeline.decodeImage, pipeline.releaseDecoded, pipeline.openPlacedEncoder])
    fn.mockReset();
  pipeline.canEncode.mockImplementation(() => true);
});

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe('Photo & Signature Resizer view', () => {
  it('opens from its route with empty size fields and no recruiter presets', async () => {
    const root = open();
    expect($(root, 'h1').textContent).toBe('Photo & Signature Resizer');
    expect($<HTMLElement>(root, '.photo-controls').hidden).toBe(true);
    await load(root);
    expect($<HTMLElement>(root, '.photo-controls').hidden).toBe(false);
    expect($(root, '#photo-width').value).toBe('');
    expect($(root, '#photo-height').value).toBe('');
    expect($<HTMLSelectElement>(root, '#photo-format').value).toBe('jpeg');
    expect([...$<HTMLSelectElement>(root, '#photo-format').options].map((o) => o.value)).toEqual([
      'jpeg',
      'png',
      'webp',
    ]);
    expect($(root, '#photo-fit-crop').checked).toBe(true);
    // No preset buttons and no recruiter names anywhere in the tool.
    expect(root.querySelector('.preset-group')).toBeNull();
    expect(root.textContent).not.toMatch(/teletalk|bpsc|passport size|visa/i);
    expect($(root, '#photo-size-hint').textContent).toContain('official notice');
    expect($(root, '.tool-notes').textContent).toContain('no ready-made sizes');
  });

  it('explains a crop or padding before saving, and warns about enlarging', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    expect(plan(root)).toBe(
      'Output: 300 × 300 px JPEG. About 25.0% of the image will be cut off at the left and right.',
    );
    setFit(root, 'pad');
    expect(plan(root)).toBe(
      'Output: 300 × 300 px JPEG. White space (about 25.0% of the output) will be added at the top and bottom.',
    );
    setSize(root, '800', '600');
    expect(plan(root)).toContain('The proportions match');
    expect(warningsText(root)).toContain('enlarged');
    type(root, '#photo-width', 'abc');
    expect(plan(root)).toBe('');
  });

  it('crops to an exact size at quality 92 without a limit, and reports the result', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    const enc = mockEncoder(() => 30_000);
    submit(root);
    await done(root);
    const [, place, size, format, alpha, opts] = lastDraw();
    expect(place).toEqual({ x: -50, y: 0, width: 400, height: 300 });
    expect(size).toEqual({ width: 300, height: 300 });
    expect([format, alpha, opts]).toEqual(['jpeg', false, {}]);
    expect(enc.encode).toHaveBeenCalledTimes(1);
    expect(enc.encode).toHaveBeenCalledWith(0.92);
    expect(enc.close).toHaveBeenCalled();
    const text = resultText(root);
    for (const s of [
      '300 × 300 px',
      'JPEG',
      '29.3 KB',
      'No limit set',
      '92%',
      'Cropped: about 25.0% cut off at the left and right',
    ])
      expect(text).toContain(s);
    const link = $<HTMLAnchorElement>(root, '#photo-download');
    expect(link.download).toBe('my photo-300x300.jpg');
    expect(link.getAttribute('aria-label')).toBe('Download image (my photo-300x300.jpg)');
  });

  it('pads with a white background in every format', async () => {
    const root = open();
    await load(root, file('sig.png', PNG_HEADER, 'image/png', 20_000), 600, 200);
    setSize(root, '300', '80');
    setFit(root, 'pad');
    type(root, '#photo-format', 'png');
    mockEncoder(() => 9_000);
    submit(root);
    await done(root);
    const [, place, , format, alpha, opts] = lastDraw();
    expect(place).toEqual({ x: 30, y: 0, width: 240, height: 80 });
    expect([format, alpha, opts]).toEqual(['png', true, { background: '#ffffff' }]);
    expect(resultText(root)).toContain('Not used (PNG is lossless)');
    expect(resultText(root)).toContain(
      'Empty space and any transparent areas were filled with white.',
    );
    expect($<HTMLAnchorElement>(root, '#photo-download').download).toBe('sig-300x80.png');
  });

  it('finds the highest JPEG quality within a size limit', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    type(root, '#photo-limit', '100');
    // Size grows with quality; 100 KB is met up to quality 60.
    const enc = mockEncoder((q) => q * 1700);
    submit(root);
    await done(root);
    expect(enc.encode.mock.calls.length).toBeLessThanOrEqual(8);
    expect(resultText(root)).toContain('Within the limit (100.0 KB)');
    expect(resultText(root)).toContain('60%');
    expect(alertText(root)).toBe('');
  });

  it('reports honestly when a limit cannot be met', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    type(root, '#photo-limit', '10');
    mockEncoder(() => 20_000);
    submit(root);
    await vi.waitFor(() => expect(status(root)).toMatch(/larger than the limit/));
    expect(resultText(root)).toContain('Over the limit (10.0 KB)');
    expect(alertText(root)).toContain('could not be met even at the lowest quality (10%)');
    expect(alertText(root)).toContain('19.5 KB');

    // PNG cannot use quality: one encode, and an explanation.
    type(root, '#photo-format', 'png');
    expect(warningsText(root)).toContain('PNG has no quality setting');
    const enc = mockEncoder(() => 20_000);
    submit(root);
    await vi.waitFor(() => expect(alertText(root)).toContain('The PNG file is 19.5 KB'));
    expect(enc.encode).toHaveBeenCalledTimes(1);
  });

  it('validates the size and limit fields before processing', async () => {
    const root = open();
    await load(root);
    submit(root);
    expect($(root, '#photo-width-error').textContent).toBe('Enter a whole number of pixels.');
    expect(document.activeElement).toBe($(root, '#photo-width'));
    setSize(root, '9000', '10');
    submit(root);
    expect($(root, '#photo-width-error').textContent).toBe(
      'Each side can be at most 8,192 pixels.',
    );
    setSize(root, '10', '9000');
    submit(root);
    expect($(root, '#photo-height-error').textContent).toBe(
      'Each side can be at most 8,192 pixels.',
    );
    expect($<HTMLElement>(root, '#photo-width-error').hidden).toBe(true);
    setSize(root, '300', '0');
    submit(root);
    expect($(root, '#photo-height-error').textContent).toBe('Must be at least 1 pixel.');
    expect(document.activeElement).toBe($(root, '#photo-height'));
    setSize(root, '5000', '5000');
    submit(root);
    expect($(root, '#photo-width-error').textContent).toContain('16.7 megapixels');
    setSize(root, '300', '300');
    type(root, '#photo-limit', '0.5');
    submit(root);
    expect($(root, '#photo-limit-error').textContent).toBe('The limit must be at least 1 KB.');
    type(root, '#photo-limit', 'x');
    submit(root);
    expect($(root, '#photo-limit-error').textContent).toContain('Enter a size in KB');
    expect(pipeline.openPlacedEncoder).not.toHaveBeenCalled();
  });

  it('accepts Bangla digits in the fields', async () => {
    const root = open();
    await load(root);
    setSize(root, '৩০০', '৮০');
    type(root, '#photo-limit', '৬০');
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    expect(lastDraw()[2]).toEqual({ width: 300, height: 80 });
  });

  it('warns before JPEG fills transparency and notes it afterwards', async () => {
    const root = open();
    await load(root, file('logo.png', PNG_HEADER, 'image/png', 20_000), 300, 300);
    setSize(root, '300', '300');
    expect(warningsText(root)).toContain('JPEG cannot store transparency');
    mockEncoder(() => 5_000, { filled: true });
    submit(root);
    await done(root);
    expect(resultText(root)).toContain('Transparent areas were filled with white');
  });

  it('refuses unsupported or mismatched formats and canvas failures without crashing', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    type(root, '#photo-format', 'webp');
    pipeline.canEncode.mockImplementation((f) => f !== 'webp');
    submit(root);
    expect(alertText(root)).toBe('This browser cannot save WebP images. Choose another format.');
    pipeline.canEncode.mockImplementation(() => true);
    mockEncoder(() => 5_000, { produce: 'png' });
    submit(root);
    await vi.waitFor(() => expect(alertText(root)).toContain('cannot save WebP'));
    expect($<HTMLElement>(root, '.image-output').hidden).toBe(true);
    pipeline.openPlacedEncoder.mockImplementationOnce(() => {
      throw new pipeline.ImageProcessingError('canvas');
    });
    submit(root);
    await vi.waitFor(() => expect(alertText(root)).toContain('could not create an image'));
    expect($<HTMLButtonElement>(root, '#photo-submit').disabled).toBe(false);
  });

  it('resets, revokes the output URL and forgets the settings', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    type(root, '#photo-limit', '100');
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reset')!.click();
    expect(revoked).toContain('blob:out-1');
    expect($<HTMLElement>(root, '.photo-controls').hidden).toBe(true);
    await load(root);
    expect($(root, '#photo-width').value).toBe('');
    expect($(root, '#photo-limit').value).toBe('');
  });

  it('keeps the image, settings and result across a language switch, in memory only', async () => {
    const root = open();
    await load(root);
    setSize(root, '300', '300');
    setFit(root, 'pad');
    mockEncoder(() => 5_000);
    submit(root);
    await done(root);
    pipeline.decodeImage.mockResolvedValueOnce(decodedFor(400, 300));
    $<HTMLButtonElement>(root, '[aria-label="Switch language to Bangla"]').click();
    await vi.waitFor(() => expect($(root, 'h1').textContent).toBe('ছবি ও স্বাক্ষর রিসাইজার'));
    await vi.waitFor(() => expect($<HTMLElement>(root, '.image-output').hidden).toBe(false));
    expect($(root, '#photo-width').value).toBe('300');
    expect($(root, '#photo-fit-pad').checked).toBe(true);
    expect(resultText(root)).toContain('৩০০ × ৩০০ পিক্সেল');
    expect(resultText(root)).toContain('উপরে ও নিচে');
    expect(Object.keys(localStorage)).toEqual(['nguh.lang']);
    expect(sessionStorage.length).toBe(0);
  });
});
