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
  const el = $<HTMLInputElement>(root, sel);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const submit = (root: ParentNode, n: number): void =>
  root.querySelectorAll<HTMLFormElement>('form.tool-form')[n]!.requestSubmit();
const row = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;
const text = (root: ParentNode, sel: string): string => $<HTMLElement>(root, sel).textContent ?? '';

const LOGO = 'https://example.com/logo.svg';
const VMC = 'https://example.com/vmc.pem';

/** Cloudflare DoH JSON answer with TXT records for a name. */
const answer = (name: string, txts: string[], status = 0) =>
  Response.json({
    Status: status,
    AD: false,
    Answer: txts.map((t) => ({ name: `${name}.`, type: 16, TTL: 300, data: `"${t}"` })),
  });

function mockDns(records: Record<string, string[]>): void {
  fetchMock.mockImplementation(async (url: string) => {
    const name = new URL(url).searchParams.get('name')!;
    const txts = records[name];
    return txts ? answer(name, txts) : Response.json({ Status: 3 });
  });
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
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BIMI Checker', () => {
  it('sends nothing on load and says what will be asked, and of whom', () => {
    const root = open('#/tool/bimi-checker');
    const notice = text(root, '.net-notice');
    expect(notice).toContain('https://cloudflare-dns.com/dns-query');
    expect(notice).toContain('<selector>._bimi.<domain>');
    expect(notice).toContain('_dmarc.<domain>');
    expect(text(root, '.tool-badges')).toContain('Uses the internet when you ask');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks Cloudflare for the BIMI and DMARC TXT records and shows a valid setup', async () => {
    mockDns({
      'default._bimi.example.com': [`v=BIMI1; l=${LOGO}; a=${VMC};`],
      '_dmarc.example.com': ['v=DMARC1; p=reject; rua=mailto:d@example.com'],
    });
    const root = open('#/tool/bimi-checker');
    set(root, '#bimi-domain', 'https://Example.com/path');
    submit(root, 0);
    await vi.waitFor(() => expect(row(root, 'BIMI record')).toBe('Found and valid'));
    const asked = fetchMock.mock.calls.map((c) => new URL(c[0] as string));
    expect(
      asked.map((u) => [
        u.origin + u.pathname,
        u.searchParams.get('name'),
        u.searchParams.get('type'),
      ]),
    ).toEqual([
      ['https://cloudflare-dns.com/dns-query', 'default._bimi.example.com', 'TXT'],
      ['https://cloudflare-dns.com/dns-query', '_dmarc.example.com', 'TXT'],
    ]);
    expect(row(root, 'Logo (l=)')).toBe(LOGO);
    expect(row(root, 'Mark certificate (a=)')).toBe(VMC);
    expect(row(root, 'DMARC policy')).toBe('p=reject, pct=100');
    expect(row(root, 'DMARC strong enough for BIMI')).toBe('Yes');
  });

  it('explains a missing record, a weak DMARC policy and a custom selector', async () => {
    mockDns({ '_dmarc.example.org': ['v=DMARC1; p=none'] });
    const root = open('#/tool/bimi-checker');
    set(root, '#bimi-domain', 'example.org');
    set(root, '#bimi-selector', 'brand');
    submit(root, 0);
    await vi.waitFor(() => expect(row(root, 'BIMI record')).toBe('Not found'));
    expect(row(root, 'Record looked up')).toBe('brand._bimi.example.org');
    expect(row(root, 'DMARC strong enough for BIMI')).toBe('No');
    expect(text(root, '.result-notes')).toContain('p= must be quarantine or reject');
  });

  it('lists the problems of a broken record', async () => {
    mockDns({
      'default._bimi.example.net': ['v=BIMI1; l=http://example.net/logo.png'],
      '_dmarc.example.net': ['v=DMARC1; p=quarantine'],
    });
    const root = open('#/tool/bimi-checker');
    set(root, '#bimi-domain', 'example.net');
    submit(root, 0);
    await vi.waitFor(() => expect(row(root, 'BIMI record')).toBe('Found, with problems'));
    expect(text(root, '.result-notes')).toContain('must start with https://');
  });

  it('refuses a bad domain or selector without sending anything', () => {
    const root = open('#/tool/bimi-checker');
    set(root, '#bimi-domain', '192.0.2.1');
    submit(root, 0);
    expect(text(root, '#bimi-domain-error')).toContain('not an IP address');
    set(root, '#bimi-domain', 'example.com');
    set(root, '#bimi-selector', 'bad.selector');
    submit(root, 0);
    expect(text(root, '#bimi-selector-error')).toContain('A selector is one word');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains a blocked request', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const root = open('#/tool/bimi-checker');
    set(root, '#bimi-domain', 'example.com');
    submit(root, 0);
    await vi.waitFor(() =>
      expect(text(root, '[role="alert"]')).toContain('could not be completed'),
    );
    expect($<HTMLButtonElement>(root, 'button[type="submit"]').disabled).toBe(false);
  });
});

describe('BIMI record generator', () => {
  it('creates the record in the browser without sending anything', () => {
    const root = open('#/tool/bimi-checker');
    set(root, '#bimigen-domain', 'example.com');
    set(root, '#bimigen-logo', LOGO);
    set(root, '#bimigen-cert', VMC);
    submit(root, 1);
    expect(row(root, 'Name (host)')).toBe('default._bimi.example.com');
    expect(row(root, 'Value')).toBe(`v=BIMI1; l=${LOGO}; a=${VMC};`);
    expect(text(root, '[aria-label="Your BIMI record"] .result-notes')).toContain(
      '(default._bimi)',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows errors on the right field', () => {
    const root = open('#/tool/bimi-checker');
    set(root, '#bimigen-domain', 'example.com');
    set(root, '#bimigen-logo', 'https://example.com/logo.png');
    submit(root, 1);
    expect(text(root, '#bimigen-logo-error')).toBe('The logo address must end in .svg.');
    set(root, '#bimigen-logo', LOGO);
    set(root, '#bimigen-cert', 'https://example.com/vmc.crt');
    submit(root, 1);
    expect(text(root, '#bimigen-cert-error')).toBe('The certificate address must end in .pem.');
  });

  it('works in Bangla', () => {
    localStorage.setItem(LANG_KEY, 'bn');
    const root = open('#/tool/bimi-checker');
    expect(root.querySelector('h1')?.textContent).toBe('BIMI চেকার ও জেনারেটর');
    expect(text(root, '.net-notice')).toContain('বোতাম না চাপা পর্যন্ত');
  });
});
