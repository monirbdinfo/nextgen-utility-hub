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

const TRACE = 'fl=1\nh=1.1.1.1\nip=203.0.113.7\ncolo=DAC\nhttp=http/2\nloc=BD\ntls=TLSv1.3\n';

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

describe('online tools: privacy', () => {
  it('send nothing on load and say what will be sent, and to whom', () => {
    for (const [id, recipient] of [
      ['my-ip-info', 'https://1.1.1.1/cdn-cgi/trace'],
      ['dns-lookup', 'https://cloudflare-dns.com/dns-query'],
      ['latency-test', 'the server that hosts this site'],
    ] as const) {
      const root = open(`#/tool/${id}`);
      expect(text(root, '.net-notice')).toContain(recipient);
      expect(text(root, '.net-notice')).toContain('Nothing is sent until you press the button.');
      // The page badge and footer no longer claim the tool is offline.
      expect(text(root, '.tool-badges')).toContain('Uses the internet when you ask');
      expect(text(root, '.tool-badges')).not.toContain('Runs in your browser');
      expect(text(root, '.tool-privacy')).not.toContain('entirely in your browser');
      dispose?.();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keep the offline badge on ordinary tools', () => {
    const root = open('#/tool/subnet-calculator');
    expect(text(root, '.tool-badges')).toContain('Runs in your browser');
    expect(text(root, '.tool-privacy')).toContain('entirely in your browser');
  });
});

describe('IP Lookup', () => {
  it('asks Cloudflare once, without credentials, and shows the answer', async () => {
    fetchMock.mockResolvedValue(new Response(TRACE));
    const root = open('#/tool/my-ip-info');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Public IP address')).toBe('203.0.113.7'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://1.1.1.1/cdn-cgi/trace');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    expect(row(root, 'IP version')).toBe('IPv4');
    expect(row(root, 'Country (as Cloudflare sees it)')).toBe('BD');
    expect(row(root, 'Cloudflare data centre')).toBe('DAC');
    expect(text(root, '.net-status')).toBe('Done. Cloudflare answered.');
  });

  it('keeps the answer across a language switch without asking again', async () => {
    fetchMock.mockResolvedValue(new Response(TRACE));
    const root = open('#/tool/my-ip-info');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Public IP address')).toBe('203.0.113.7'));
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect(row(root, 'পাবলিক আইপি অ্যাড্রেস')).toBe('203.0.113.7');
    expect(row(root, 'আইপি সংস্করণ')).toBe('IPv৪');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('explains a blocked request and a bad answer', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const root = open('#/tool/my-ip-info');
    submit(root);
    await vi.waitFor(() => expect($<HTMLElement>(root, '.net-error').hidden).toBe(false));
    expect(text(root, '.net-error')).toContain('browser extension');
    expect(root.querySelector('.result-list')).toBeNull();
    expect($<HTMLButtonElement>(root, 'button[type="submit"]').disabled).toBe(false);

    fetchMock.mockResolvedValueOnce(new Response('<html>captive portal</html>'));
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '.net-error')).toBe(
        'The answer was not in the expected format, so it is not shown.',
      ),
    );
  });
});

describe('DNS Lookup', () => {
  const answer = {
    Status: 0,
    AD: false,
    Answer: [
      { name: 'example.com.', type: 15, TTL: 3600, data: '10 mail.example.com.' },
      { name: 'example.com.', type: 15, TTL: 3600, data: '20 backup.example.com.' },
    ],
  };

  it('validates the domain before sending anything', () => {
    const root = open('#/tool/dns-lookup');
    submit(root);
    expect(text(root, '#dns-domain-error')).toBe('Enter a domain name.');
    expect(document.activeElement?.id).toBe('dns-domain');
    set(root, '#dns-domain', '8.8.8.8');
    submit(root);
    expect(text(root, '#dns-domain-error')).toBe('Enter a domain name, not an IP address.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries Cloudflare DoH JSON and shows a table of records', async () => {
    fetchMock.mockResolvedValue(Response.json(answer));
    const root = open('#/tool/dns-lookup');
    set(root, '#dns-domain', 'https://Example.com/page');
    set(root, '#dns-type', 'MX');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Records found')).toBe('2'));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://cloudflare-dns.com/dns-query?name=example.com&type=MX',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/dns-json' },
    });
    expect(row(root, 'Domain queried')).toBe('example.com (MX)');
    expect(row(root, 'Response')).toBe('NOERROR — the domain exists');
    expect(row(root, 'DNSSEC validated by Cloudflare')).toBe('No');
    const cells = [...root.querySelectorAll('.dns-table tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent),
    );
    expect(cells).toEqual([
      ['example.com', 'MX', '3600', '10 mail.example.com.'],
      ['example.com', 'MX', '3600', '20 backup.example.com.'],
    ]);
    expect(
      [...root.querySelectorAll('.dns-table th')].map((th) => th.getAttribute('scope')),
    ).toEqual(['col', 'col', 'col', 'col']);
  });

  it('explains NXDOMAIN and empty answers, and an HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ Status: 3 }));
    const root = open('#/tool/dns-lookup');
    set(root, '#dns-domain', 'no-such-name.example');
    submit(root);
    await vi.waitFor(() =>
      expect(row(root, 'Response')).toBe('NXDOMAIN — this domain does not exist'),
    );
    expect($<HTMLElement>(root, '.dns-table-wrap').hidden).toBe(true);

    fetchMock.mockResolvedValueOnce(Response.json({ Status: 0 }));
    set(root, '#dns-type', 'CAA');
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '.result-notes')).toBe('No CAA records were returned for this name.'),
    );

    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    submit(root);
    await vi.waitFor(() => expect(text(root, '.net-error')).toContain('HTTP 429'));
    expect(root.querySelector('.result-list')).toBeNull();
  });
});

describe('Latency check', () => {
  it('times same-origin requests after a warm-up and reports failures', async () => {
    let call = 0;
    fetchMock.mockImplementation(async () => {
      call++;
      if (call === 3) throw new TypeError('Failed to fetch');
      return new Response('ok\n');
    });
    const root = open('#/tool/latency-test');
    set(root, '#latency-count', '5');
    submit(root);
    expect($<HTMLButtonElement>(root, '#latency-stop').hidden).toBe(false);
    await vi.waitFor(() => expect(text(root, '.net-status')).toBe('Done. 5 requests sent.'), {
      timeout: 4000,
    });
    // One warm-up plus five counted requests, all to this site, each with a unique query.
    expect(fetchMock).toHaveBeenCalledTimes(6);
    const urls = fetchMock.mock.calls.map((c) => new URL(c[0] as string));
    for (const u of urls) {
      expect(u.origin).toBe(location.origin);
      expect(u.pathname).toBe('/latency-probe.txt');
    }
    expect(new Set(urls.map((u) => u.search)).size).toBe(6);
    expect(row(root, 'Failed requests')).toBe('1 of 5 (20%)');
    expect(row(root, 'Each request (ms)')).toMatch(/^\d+, failed, \d+, \d+, \d+$/);
    expect(row(root, 'Average round-trip time')).toMatch(/^\d+\.\d ms$/);
    expect($<HTMLButtonElement>(root, '#latency-stop').hidden).toBe(true);
  });

  it('can be stopped, and shows the requests completed so far', async () => {
    let release: (() => void) | null = null;
    let call = 0;
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          call++;
          if (call <= 3) return resolve(new Response('ok'));
          release = () => reject(new DOMException('', 'AbortError'));
          init.signal?.addEventListener('abort', () => release?.());
        }),
    );
    const root = open('#/tool/latency-test');
    set(root, '#latency-count', '10');
    submit(root);
    await vi.waitFor(() => expect(call).toBe(4), { timeout: 4000 });
    $<HTMLButtonElement>(root, '#latency-stop').click();
    await vi.waitFor(() =>
      expect(text(root, '.net-status')).toBe(
        'Stopped. Results show the requests completed so far.',
      ),
    );
    expect(row(root, 'Failed requests')).toBe('0 of 2 (0%)');
    expect($<HTMLButtonElement>(root, 'button[type="submit"]').disabled).toBe(false);
  });
});
