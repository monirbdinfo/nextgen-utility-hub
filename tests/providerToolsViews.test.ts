import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDomainRdapCache } from '../src/lib/rdap';
import { LANG_KEY, mountApp } from '../src/ui/app';
import { CREATED, PING_DONE, TRACE_DONE } from './fixtures/globalping';
import { BOOTSTRAP_DNS, VERISIGN_DOMAIN } from './fixtures/rdap';

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
const fieldError = (root: ParentNode): string => text(root, '.field-error');

beforeEach(() => {
  localStorage.clear();
  resetDomainRdapCache();
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

/** DoH answers keyed by "name TYPE"; unknown names are NXDOMAIN. */
function doh(map: Record<string, string[]>, trace = 'ip=8.8.8.8\nloc=US\n'): void {
  const codes: Record<string, number> = { A: 1, TXT: 16 };
  fetchMock.mockImplementation(async (url: string) => {
    if (url === 'https://1.1.1.1/cdn-cgi/trace') return new Response(trace);
    const u = new URL(url);
    const type = u.searchParams.get('type')!;
    const data = map[`${u.searchParams.get('name')} ${type}`];
    return Response.json({
      Status: data ? 0 : 3,
      Answer: (data ?? []).map((d) => ({ name: 'x.', type: codes[type], TTL: 60, data: d })),
    });
  });
}
const CYMRU = {
  '8.8.8.8.origin.asn.cymru.com TXT': ['"15169 | 8.8.8.0/24 | US | arin | 2023-12-28"'],
  'AS15169.asn.cymru.com TXT': ['"15169 | US | arin | 2000-03-30 | GOOGLE, US"'],
};

const ALL = [
  'ping-ipv4',
  'ping-ipv6',
  'traceroute',
  'my-isp',
  'ip-location-lookup',
  'ip-blacklist-check',
  'domain-name-search',
];

describe('provider tools: nothing is sent before the button', () => {
  it.each(ALL)('%s shows its notice and makes no request on load', (id) => {
    const root = open(`#/tool/${id}`);
    expect(text(root, '.net-notice')).toContain('Nothing is sent until you press the button.');
    expect(text(root, '.tool-badges')).toContain('Uses the internet when you ask');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the BIN Checker never contacts anything and is not marked online', () => {
    const root = open('#/tool/bin-checker');
    expect(root.querySelector('.net-notice')).toBeNull();
    expect(text(root, '.tool-badges')).not.toContain('Uses the internet');
    set(root, '#bin-bin', '411111');
    submit(root);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Ping and Traceroute (Globalping)', () => {
  function globalping(done: unknown): void {
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) =>
      init.method === 'POST' ? Response.json(CREATED, { status: 202 }) : Response.json(done),
    );
  }

  it('says the probes are Globalping’s, not the visitor’s device', () => {
    const root = open('#/tool/ping-ipv4');
    expect(text(root, '.net-notice')).toContain('api.globalping.io');
    expect(text(root, '.net-notice')).toContain('not from your own device');
  });

  it('refuses private and wrong-family targets without sending', () => {
    const root = open('#/tool/ping-ipv4');
    set(root, '#ping4-target', '192.168.0.1');
    submit(root);
    expect(fieldError(root)).toContain('private');
    set(root, '#ping4-target', '2001:4860:4860::8888');
    submit(root);
    expect(fieldError(root)).toContain('Ping IPv6');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows each probe’s location, network and timings', async () => {
    globalping(PING_DONE);
    const root = open('#/tool/ping-ipv4');
    set(root, '#ping4-target', 'example.com');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Probes')).toBe('1 finished, 0 failed, of 1'), {
      timeout: 3000,
    });
    expect(row(root, 'Measured from')).toBe('Anywhere in the world');
    expect(row(root, 'Source')).toBe('Globalping measurement PY8lHBpNhG0rOVpp');
    const probe = text(root, '.gp-probe');
    expect(probe).toContain('Probe 1: Dhaka, BD, AS');
    expect(probe).toContain('Example Networks Ltd — AS63526');
    expect(probe).toContain('11.5 / 12.3 / 13.2 ms');
    expect(probe).toContain('0% (3 of 3 received)');
    expect($(root, '.gp-raw pre').textContent).toContain('3 packets transmitted');
  });

  it('shows traceroute hops, marking silent ones', async () => {
    globalping(TRACE_DONE);
    const root = open('#/tool/traceroute');
    expect(root.querySelector('#trace-packets')).toBeNull();
    set(root, '#trace-target', '8.8.8.8');
    submit(root);
    await vi.waitFor(() => expect(root.querySelectorAll('.gp-probe tbody tr')).toHaveLength(3), {
      timeout: 3000,
    });
    const rows = [...root.querySelectorAll('.gp-probe tbody tr')].map((r) => r.textContent);
    expect(rows[0]).toContain('gw.local — 10.0.0.1');
    expect(rows[1]).toContain('* (no answer)');
  });

  it('explains the hourly limit when Globalping refuses', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }));
    const root = open('#/tool/ping-ipv6');
    set(root, '#ping6-target', '2001:4860:4860::8888');
    submit(root);
    await vi.waitFor(() => expect(text(root, '.net-error')).toContain('250 tests per hour'));
  });

  it('works in Bangla with Bangla digits', async () => {
    localStorage.setItem(LANG_KEY, 'bn');
    globalping(PING_DONE);
    const root = open('#/tool/ping-ipv4');
    set(root, '#ping4-target', 'example.com');
    submit(root);
    await vi.waitFor(() => expect(root.querySelector('.gp-probe')).not.toBeNull(), {
      timeout: 3000,
    });
    expect(text(root, '.gp-probe')).toContain('১১.৫ / ১২.৩ / ১৩.২ ms');
  });
});

describe('What Is My ISP and IP Location Lookup', () => {
  it('finds the visitor’s network from Cloudflare and Team Cymru', async () => {
    doh(CYMRU);
    const root = open('#/tool/my-isp');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Network (AS name)')).toBe('GOOGLE, US'));
    expect(row(root, 'Your public IP address (IPv4)')).toBe('8.8.8.8');
    expect(row(root, 'Autonomous system number')).toBe('AS15169');
    expect(row(root, 'Source')).toBe('Team Cymru IP-to-ASN mapping, via Cloudflare DNS');
  });

  it('shows the registered country, never a city, for a typed address', async () => {
    doh(CYMRU);
    const root = open('#/tool/ip-location-lookup');
    set(root, '#iploc-address', '10.1.1.1');
    submit(root);
    expect(fieldError(root)).toContain('private');
    expect(fetchMock).not.toHaveBeenCalled();
    set(root, '#iploc-address', '8.8.8.8');
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Country the block is registered in')).toBe('US'));
    expect(text(root, '.tool-layout')).toContain('This is not a physical location.');
    expect(text(root, '.tool-layout')).not.toMatch(/latitude|longitude/i);
  });

  it('says so when no network announces the address', async () => {
    doh({});
    const root = open('#/tool/ip-location-lookup');
    set(root, '#iploc-address', '8.8.8.8');
    submit(root);
    await vi.waitFor(() =>
      expect(row(root, 'Network (AS name)')).toBe('Team Cymru has no route for this address'),
    );
  });
});

describe('IP Blacklist Check', () => {
  it('lists every checked list and never counts a refusal as clean', async () => {
    doh({
      '8.8.8.8.zen.spamhaus.org A': ['127.255.255.254'],
      '8.8.8.8.bl.spamcop.net A': ['127.0.0.2'],
    });
    const root = open('#/tool/ip-blacklist-check');
    expect(text(root, '.net-notice')).toContain('Spamhaus ZEN, SpamCop');
    set(root, '#dnsbl-address', '8.8.8.8');
    submit(root);
    await vi.waitFor(() =>
      expect(row(root, 'Result')).toBe('Listed on 1 of the 4 lists that answered'),
    );
    expect(row(root, 'Lists that could not be checked')).toBe('1 of 5');
    expect(row(root, 'Spamhaus ZEN')).toBe('Could not check: the list refused the question');
    expect(root.querySelectorAll('tr[data-verdict]')).toHaveLength(5);
    expect(text(root, '.result')).toContain('Only the 5 lists in the table were checked.');
  });

  it('accepts IPv4 only', () => {
    const root = open('#/tool/ip-blacklist-check');
    set(root, '#dnsbl-address', '2001:4860:4860::8888');
    submit(root);
    expect(fieldError(root)).toContain('Only IPv4');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('BIN Checker', () => {
  it('names the network and does not invent bank details', () => {
    const root = open('#/tool/bin-checker');
    set(root, '#bin-bin', '411111');
    submit(root);
    expect(row(root, 'Card network')).toBe('Visa');
    expect(row(root, 'Issuing bank')).toBe('Not available: no approved BIN data source');
    expect(row(root, 'Country of issue')).toBe('Not available: no approved BIN data source');
  });

  it('refuses a full card number and limits the input length', () => {
    const root = open('#/tool/bin-checker');
    expect($(root, '#bin-bin').maxLength).toBe(11);
    set(root, '#bin-bin', '41111111111');
    submit(root);
    expect(fieldError(root)).toContain('Do not enter a full card number');
    expect(root.querySelector('.result-row')).toBeNull();
  });
});

describe('Domain Name Search', () => {
  const routes = (map: Record<string, () => Response>): void => {
    fetchMock.mockImplementation(async (url: string) => {
      const f = map[url];
      if (!f) throw new Error(`unexpected request ${url}`);
      return f();
    });
  };
  const search = async (root: HTMLElement, name: string): Promise<void> => {
    set(root, '#domain-search-name', name);
    submit(root);
    await vi.waitFor(() => expect(row(root, 'Result')).toBeDefined());
  };

  it('reports a registered name with its registrar and dates', async () => {
    routes({
      'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS),
      'https://rdap.verisign.com/com/v1/domain/example.com': () => Response.json(VERISIGN_DOMAIN),
    });
    const root = open('#/tool/domain-name-search');
    await search(root, 'Example.com');
    expect(row(root, 'Result')).toBe('Registered: this name is taken');
    expect(row(root, 'Registrar')).toBe('Example Registrar, Inc.');
    expect(row(root, 'Expires on')).toBe('2027-08-13');
  });

  it('says “probably available” only for a registry 404, and asks to confirm', async () => {
    routes({
      'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS),
      'https://rdap.verisign.com/com/v1/domain/free-name-123.com': () =>
        new Response('', { status: 404 }),
      'https://rdap.verisign.com/com/v1/domain/www.example.com': () =>
        new Response('', { status: 404 }),
    });
    const root = open('#/tool/domain-name-search');
    await search(root, 'free-name-123.com');
    expect(row(root, 'Result')).toBe('Not found in the registry: probably available');
    expect(text(root, '.result')).toContain('Only a registrar can confirm');
    await search(root, 'www.example.com');
    await vi.waitFor(() =>
      expect(row(root, 'Result')).toBe(
        'Not found: www.example.com is not a registered domain on its own',
      ),
    );
  });

  it('cannot check .bd and does not guess from DNS', async () => {
    routes({ 'https://data.iana.org/rdap/dns.json': () => Response.json(BOOTSTRAP_DNS) });
    const root = open('#/tool/domain-name-search');
    await search(root, 'example.com.bd');
    expect(row(root, 'Result')).toBe('Unknown: the .bd registry does not offer RDAP');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses names that cannot be registered', () => {
    const root = open('#/tool/domain-name-search');
    set(root, '#domain-search-name', 'my_site.com');
    submit(root);
    expect(fieldError(root)).toContain('“_”');
    set(root, '#domain-search-name', '8.8.8.8');
    submit(root);
    expect(fieldError(root)).toContain('not an IP address');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
