import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../src/ui/app';

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
  const el = $<HTMLInputElement>(root, sel);
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

const CORS = { 'access-control-allow-origin': '*' };

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('IP to Hostname', () => {
  it('sends nothing until the button is pressed and then asks for the reverse name', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          Status: 0,
          Answer: [{ name: '8.8.8.8.in-addr.arpa.', type: 12, TTL: 300, data: 'dns.google.' }],
        },
        { headers: CORS },
      ),
    );
    const root = open('#/tool/ip-to-hostname');
    expect(text(root, '.net-notice')).toContain('cloudflare-dns.com');
    expect(fetchMock).not.toHaveBeenCalled();
    set(root, '#rdns-ip', '8.8.8.8');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Hostname (PTR)')).toBe('dns.google'));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://cloudflare-dns.com/dns-query?name=8.8.8.8.in-addr.arpa&type=PTR',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  });

  it('refuses an invalid address without sending anything', () => {
    const root = open('#/tool/ip-to-hostname');
    set(root, '#rdns-ip', '999.1.1.1');
    submit(root);
    expect($<HTMLElement>(root, '#rdns-ip-error').textContent).toBe(
      'Each number in an IPv4 address must be 0 to 255.',
    );
    expect(document.activeElement?.id).toBe('rdns-ip');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says when no name is published', async () => {
    fetchMock.mockResolvedValue(Response.json({ Status: 3 }, { headers: CORS }));
    const root = open('#/tool/ip-to-hostname');
    set(root, '#rdns-ip', '192.0.2.99');
    submit(root);
    await vi.waitFor(() =>
      expect(row(root, 'Hostname (PTR)')).toBe('No hostname is published for this address.'),
    );
    expect(row(root, 'Response')).toBe('NXDOMAIN');
  });
});

describe('Domain to IP', () => {
  it('asks for A and AAAA records and shows both lists', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('type=AAAA')
        ? Response.json(
            {
              Status: 0,
              Answer: [{ name: 'example.com.', type: 28, TTL: 60, data: '2001:db8::5' }],
            },
            { headers: CORS },
          )
        : Response.json(
            {
              Status: 0,
              Answer: [
                { name: 'example.com.', type: 1, TTL: 60, data: '192.0.2.10' },
                { name: 'example.com.', type: 1, TTL: 60, data: '192.0.2.11' },
              ],
            },
            { headers: CORS },
          ),
    );
    const root = open('#/tool/domain-to-ip');
    set(root, '#d2i-domain', 'https://Example.com/path');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'IPv6 addresses (AAAA)')).toBe('2001:db8::5'));
    expect(row(root, 'IPv4 addresses (A)')).toBe('192.0.2.10\n192.0.2.11');
    expect(row(root, 'Domain queried')).toBe('example.com');
    const urls = fetchMock.mock.calls.map((c) => c[0] as string).sort();
    expect(urls).toEqual([
      'https://cloudflare-dns.com/dns-query?name=example.com&type=A',
      'https://cloudflare-dns.com/dns-query?name=example.com&type=AAAA',
    ]);
  });

  it('says when a name has no addresses', async () => {
    fetchMock.mockImplementation(async () => Response.json({ Status: 0 }, { headers: CORS }));
    const root = open('#/tool/domain-to-ip');
    set(root, '#d2i-domain', 'empty.example');
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '.result-notes')).toContain(
        'No A or AAAA addresses were returned for this name.',
      ),
    );
  });

  it('refuses an IP address typed into the domain field', () => {
    const root = open('#/tool/domain-to-ip');
    set(root, '#d2i-domain', '8.8.8.8');
    submit(root);
    expect($<HTMLElement>(root, '#d2i-domain-error').textContent).toBe(
      'Enter a domain name, not an IP address.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function text(root: ParentNode, sel: string): string {
  return $<HTMLElement>(root, sel).textContent ?? '';
}
