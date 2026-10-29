import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_KEY, mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

function open(hash: string): HTMLElement {
  history.replaceState(null, '', `/${hash}`);
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
function set(root: ParentNode, sel: string, value: string): void {
  const el = $<HTMLInputElement | HTMLSelectElement>(root, sel);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, 'form.tool-form').requestSubmit();
const row = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;
const text = (root: ParentNode, sel: string): string => $<HTMLElement>(root, sel).textContent ?? '';

/** A test-service answer with exactly `bytes` bytes, delivered as one chunk. */
function body(bytes: number): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        if (bytes) c.enqueue(new Uint8Array(bytes));
        c.close();
      },
    }),
  );
}
const bytesOf = (url: string): number => Number(new URL(url).searchParams.get('bytes'));

/** Make performance.now() advance by `step` ms on every call, so timings are deterministic. */
function fakeClock(step: number): void {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (now += step));
}

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  fetchMock = vi.fn(async (url: string) => body(bytesOf(url)));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Internet Speed Test', () => {
  it('downloads nothing on load and says what it will download, and from whom', () => {
    const root = open('#/tool/internet-speed-test');
    const notice = text(root, '.net-notice');
    expect(notice).toContain('https://speed.cloudflare.com/__down');
    expect(notice).toContain('about 4.2 MB');
    expect(notice).toContain('up to 34.2 MB');
    expect(notice).toContain('Nothing is downloaded until you press the button.');
    expect(text(root, '.tool-badges')).toContain('Uses the internet when you ask');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(text(root, '.tool-notes')).toContain('Upload speed is not measured.');
  });

  it('times round trips, then downloads the quick plan, without cookies or referrer', async () => {
    fakeClock(20);
    const root = open('#/tool/internet-speed-test');
    submit(root);
    expect($<HTMLButtonElement>(root, '#speed-stop').hidden).toBe(false);
    await vi.waitFor(() => expect(text(root, '.net-status')).toBe('Done.'), { timeout: 4000 });
    const sizes = fetchMock.mock.calls.map((c) => bytesOf(c[0] as string));
    // One warm-up and five timed round trips, then 2 × 100 kB and 4 × 1 MB.
    expect(sizes).toEqual([0, 0, 0, 0, 0, 0, 1e5, 1e5, 1e6, 1e6, 1e6, 1e6]);
    for (const [url, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      expect(new URL(url).origin).toBe('https://speed.cloudflare.com');
      expect(init).toMatchObject({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
    }
    expect(row(root, 'Download speed')).toMatch(/^\d+(\.\d+)? Mbps$/);
    expect(row(root, 'Round trip (median)')).toBe('20 ms');
    expect(row(root, 'Downloads timed')).toBe('6');
    expect(row(root, 'Data downloaded')).toBe('4.2 MB');
    expect(row(root, 'Test service')).toBe('speed.cloudflare.com');
    expect($<HTMLButtonElement>(root, '#speed-stop').hidden).toBe(true);
  });

  it('does not move on to larger files when downloads are slow', async () => {
    fakeClock(2500); // each download takes 5 s from request to last byte
    const root = open('#/tool/internet-speed-test');
    set(root, '#speed-plan', 'standard');
    submit(root);
    await vi.waitFor(() => expect(text(root, '.net-status')).toBe('Done.'), { timeout: 4000 });
    const sizes = fetchMock.mock.calls.map((c) => bytesOf(c[0] as string));
    expect(sizes.filter((s) => s > 0)).toEqual([1e5, 1e5]);
    expect(row(root, 'Data downloaded')).toBe('0.2 MB');
  });

  it('explains a blocked request and shows no result', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const root = open('#/tool/internet-speed-test');
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '[role="alert"]')).toContain('could not reach Cloudflare'),
    );
    expect(root.querySelector('.result-list')).toBeNull();
    expect($<HTMLButtonElement>(root, 'button[type="submit"]').disabled).toBe(false);
  });

  it('can be stopped, and keeps the downloads completed so far', async () => {
    let call = 0;
    fetchMock.mockImplementation(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          call++;
          if (call <= 8) return resolve(body(bytesOf(url)));
          init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );
    fakeClock(20);
    const root = open('#/tool/internet-speed-test');
    submit(root);
    await vi.waitFor(() => expect(call).toBe(9), { timeout: 4000 });
    $<HTMLButtonElement>(root, '#speed-stop').click();
    await vi.waitFor(() =>
      expect(text(root, '.net-status')).toBe(
        'Stopped. Results show the downloads completed so far.',
      ),
    );
    expect(row(root, 'Downloads timed')).toBe('2');
    expect($<HTMLButtonElement>(root, 'button[type="submit"]').disabled).toBe(false);
  });

  it('works in Bangla with Bangla digits', async () => {
    fakeClock(20);
    localStorage.setItem(LANG_KEY, 'bn');
    const root = open('#/tool/internet-speed-test');
    expect(text(root, '.net-notice')).toContain('৪.২ MB');
    submit(root);
    await vi.waitFor(() => expect(text(root, '.net-status')).toBe('সম্পন্ন।'), { timeout: 4000 });
    expect(row(root, 'ডাউনলোড হওয়া ডেটা')).toBe('৪.২ MB');
  });
});

describe('Reverse Image Search', () => {
  it('makes provider links for a public picture address and sends nothing itself', () => {
    const root = open('#/tool/reverse-image-search');
    set(root, '#ris-url', 'https://example.com/photo.jpg');
    submit(root);
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.result .link-list a')];
    expect(links.map((a) => a.textContent)).toEqual([
      'Search with Google Lens (opens in a new tab)',
      'Search with Bing Visual Search (opens in a new tab)',
      'Search with TinEye (opens in a new tab)',
      'Search with Yandex Images (opens in a new tab)',
    ]);
    for (const a of links) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toBe('noopener noreferrer');
      expect(a.href).toContain(encodeURIComponent('https://example.com/photo.jpg'));
    }
    expect(row(root, 'Picture address')).toBe('https://example.com/photo.jpg');
    expect(text(root, '.result-notes')).toContain('This site sends nothing itself.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses addresses providers cannot reach, with the reason', () => {
    const root = open('#/tool/reverse-image-search');
    for (const [value, message] of [
      ['', 'Enter the address of a picture.'],
      ['photo.jpg', 'Enter a full web address'],
      ['data:image/png;base64,AA', 'Only http:// and https://'],
      ['http://192.168.0.5/cam.jpg', 'private network'],
    ] as const) {
      set(root, '#ris-url', value);
      submit(root);
      expect(text(root, '#ris-url-error')).toContain(message);
      expect(root.querySelector('.result .link-list')).toBeNull();
    }
  });

  it('points to each provider’s own upload page for pictures on the device', () => {
    const root = open('#/tool/reverse-image-search');
    const section = $<HTMLElement>(root, '[aria-labelledby="ris-device-title"]');
    expect(section.textContent).toContain('this site never uploads files');
    expect(
      [...section.querySelectorAll<HTMLAnchorElement>('a')].map((a) => new URL(a.href).host),
    ).toEqual(['lens.google.com', 'www.bing.com', 'tineye.com', 'yandex.com']);
    expect(root.querySelector('input[type="file"]')).toBeNull();
  });
});
