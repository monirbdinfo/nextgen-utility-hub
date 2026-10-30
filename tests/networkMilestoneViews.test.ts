import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_KEY, mountApp } from '../src/ui/app';
import { resetRdapCache } from '../src/lib/rdap';
import { ARIN_V4, APNIC_V6, BOOTSTRAP_V4, BOOTSTRAP_V6 } from './fixtures/rdap';

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
}
const submit = (root: ParentNode): void =>
  $<HTMLFormElement>(root, 'form.tool-form').requestSubmit();
const row = (root: ParentNode, label: string): string | undefined =>
  [...root.querySelectorAll('.result-row')]
    .find((r) => r.querySelector('dt')?.textContent === label)
    ?.querySelector('.result-value')?.textContent ?? undefined;
const text = (root: ParentNode, sel: string): string => $<HTMLElement>(root, sel).textContent ?? '';

beforeEach(() => {
  localStorage.clear();
  resetRdapCache();
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

/** Cloudflare DoH answers keyed by "name TYPE". */
function doh(records: Record<string, string[]>): void {
  const codes: Record<string, number> = { A: 1, NS: 2, MX: 15, AAAA: 28 };
  fetchMock.mockImplementation(async (url: string) => {
    const u = new URL(url);
    const name = u.searchParams.get('name')!;
    const type = u.searchParams.get('type')!;
    const data = records[`${name} ${type}`] ?? [];
    return Response.json({
      Status: 0,
      Answer: data.map((d) => ({ name: `${name}.`, type: codes[type], TTL: 60, data: d })),
    });
  });
}

describe('IPv6 Compatibility Checker', () => {
  it('sends nothing on load and explains what will be asked', () => {
    const root = open('#/tool/ipv6-compatibility');
    expect(text(root, '.net-notice')).toContain('https://cloudflare-dns.com/dns-query');
    expect(text(root, '.net-notice')).toContain('up to 14 DNS questions');
    expect(text(root, '.tool-badges')).toContain('Uses the internet when you ask');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports DNS findings separately from connectivity, which stays untested', async () => {
    doh({
      'example.com A': ['192.0.2.1'],
      'example.com AAAA': ['2001:db8::1'],
      'www.example.com A': ['192.0.2.1'],
      'example.com NS': ['ns1.example.net.', 'ns2.example.net.'],
      'example.com MX': ['10 mx.example.net.'],
      'ns1.example.net AAAA': ['2001:db8::53'],
    });
    const root = open('#/tool/ipv6-compatibility');
    set(root, '#v6c-domain', 'Example.com');
    submit(root);
    await vi.waitFor(() =>
      expect(row(root, 'IPv6 in DNS')).toBe(
        'Partly ready: some parts publish IPv6 addresses, some do not',
      ),
    );
    expect(row(root, 'Website (example.com)')).toContain('IPv4 and IPv6 (A and AAAA records)');
    expect(row(root, 'www (www.example.com)')).toContain('IPv4 only');
    expect(row(root, 'Name servers with IPv6')).toContain('1 of 2');
    expect(row(root, 'Mail servers with IPv6')).toContain('0 of 1');
    // Connectivity is never inferred from DNS.
    expect(row(root, 'Your browser’s IPv6 connection')).toBe('Not tested');
    expect(row(root, 'Whether the site answers over IPv6')).toBe('Not tested');
    // 6 first-round questions, then AAAA for 2 name servers and 1 mail server.
    expect(fetchMock).toHaveBeenCalledTimes(9);
    for (const [url] of fetchMock.mock.calls as Array<[string]>)
      expect(new URL(url).origin).toBe('https://cloudflare-dns.com');
  });

  it('refuses invalid input without sending anything, and explains a blocked request', async () => {
    const root = open('#/tool/ipv6-compatibility');
    set(root, '#v6c-domain', '2001:db8::1');
    submit(root);
    expect(text(root, '#v6c-domain-error')).toContain('valid domain name');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    set(root, '#v6c-domain', 'example.com');
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '[role="alert"]')).toContain('could not be completed'),
    );
  });
});

/** IANA bootstrap and registry answers for the WHOIS tools. */
function rdap(extra: Record<string, () => Response> = {}): void {
  const map: Record<string, () => Response> = {
    'https://data.iana.org/rdap/ipv4.json': () => Response.json(BOOTSTRAP_V4),
    'https://data.iana.org/rdap/ipv6.json': () => Response.json(BOOTSTRAP_V6),
    'https://rdap.arin.net/registry/ip/8.8.8.8': () => Response.json(ARIN_V4),
    'https://rdap.apnic.net/ip/2404%3A6800%3A%3A1': () => Response.json(APNIC_V6),
    ...extra,
  };
  fetchMock.mockImplementation(async (url: string) => {
    const f = map[url];
    if (!f) throw new TypeError(`unexpected ${url}`);
    return f();
  });
}

describe('IP WHOIS Lookup (IPv4) and IPv6 WHOIS Lookup share one RDAP service', () => {
  it('shows the disclosure, never looks up the visitor automatically, and sends nothing on load', () => {
    const root = open('#/tool/ip-whois');
    expect(text(root, '.net-notice')).toContain('https://data.iana.org/rdap/ipv4.json');
    expect(text(root, '.net-notice')).toContain('never looked up automatically');
    expect($<HTMLInputElement>(root, '#whois4-address').value).toBe('');
    expect(text(root, '.tool-privacy')).toContain('IANA and the internet registry');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('looks up an IPv4 address and shows the registry, source and time', async () => {
    rdap();
    const root = open('#/tool/ip-whois');
    set(root, '#whois4-address', '8.8.8.8');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Registered network')).toBe('8.8.8.0 – 8.8.8.255'));
    expect(row(root, 'CIDR')).toBe('8.8.8.0/24');
    expect(row(root, 'Network name')).toBe('GOGL');
    expect(row(root, 'Registered to')).toContain('Example Search LLC (GOGL) — registrant');
    expect(row(root, 'Contacts')).toContain('network-abuse@example.com');
    expect(row(root, 'Country (as registered)')).toBe('Not published by the registry');
    expect(row(root, 'Source (authoritative registry)')).toBe(
      'https://rdap.arin.net/registry/ip/8.8.8.8',
    );
    expect(row(root, 'Looked up at')).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC$/);
    expect(text(root, '.tool-notes')).toContain('not necessarily the internet provider');
  });

  it('uses the same service for IPv6', async () => {
    rdap();
    const root = open('#/tool/ipv6-whois');
    set(root, '#whois6-address', '2404:6800::1');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Country (as registered)')).toBe('BD'));
    expect(row(root, 'Registered to')).toContain('Example ISP Limited');
    expect(row(root, 'Source (authoritative registry)')).toBe(
      'https://rdap.apnic.net/ip/2404%3A6800%3A%3A1',
    );
  });

  it('validates before sending: wrong version, private and invalid addresses', () => {
    const root = open('#/tool/ip-whois');
    for (const [value, msg] of [
      ['', 'Enter an IP address.'],
      ['300.1.1.1', 'Enter an IPv4 address'],
      ['2404:6800::1', 'Use the IPv6 WHOIS Lookup tool'],
      ['192.168.0.1', 'private, local or special-purpose'],
    ] as const) {
      set(root, '#whois4-address', value);
      submit(root);
      expect(text(root, '#whois4-address-error')).toContain(msg);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains missing records and rate limits', async () => {
    rdap({
      'https://rdap.arin.net/registry/ip/8.8.8.8': () => new Response('{}', { status: 404 }),
      'https://rdap.arin.net/registry/ip/8.8.4.4': () => new Response('{}', { status: 429 }),
    });
    const root = open('#/tool/ip-whois');
    set(root, '#whois4-address', '8.8.8.8');
    submit(root);
    await vi.waitFor(() =>
      expect(text(root, '[role="alert"]')).toBe('The registry has no record for this address.'),
    );
    set(root, '#whois4-address', '8.8.4.4');
    submit(root);
    await vi.waitFor(() => expect(text(root, '[role="alert"]')).toContain('HTTP 429'));
    expect(root.querySelector('.result-list')).toBeNull();
  });

  it('works in Bangla', () => {
    localStorage.setItem(LANG_KEY, 'bn');
    const root = open('#/tool/ipv6-whois');
    expect(root.querySelector('h1')?.textContent).toBe('IPv6 WHOIS লুকআপ');
    expect(text(root, '.net-notice')).toContain('স্বয়ংক্রিয়ভাবে খোঁজা হয় না');
  });
});
