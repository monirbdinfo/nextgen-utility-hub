import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../src/ui/app';

let dispose: (() => void) | null = null;

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
  const el = $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(root, sel);
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
const fieldError = (root: ParentNode, id: string): string =>
  $<HTMLElement>(root, `#${id}-error`).textContent ?? '';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.restoreAllMocks();
});

describe('IP to Decimal', () => {
  it('converts an IPv4 address to decimal and hexadecimal', () => {
    const root = open('#/tool/ip-to-decimal');
    set(root, '#net6-value', '192.168.1.1');
    submit(root);
    expect(row(root, 'Decimal')).toBe('3232235777');
    expect(row(root, 'Hexadecimal')).toBe('0xC0A80101');
  });

  it('converts a decimal number back to an address', () => {
    const root = open('#/tool/ip-to-decimal');
    set(root, '#net6-direction', 'from');
    set(root, '#net6-value', '3232235777');
    submit(root);
    expect(row(root, 'Dotted IPv4')).toBe('192.168.1.1');
  });

  it('refuses numbers above 32 bits and focuses the field', () => {
    const root = open('#/tool/ip-to-decimal');
    set(root, '#net6-direction', 'from');
    set(root, '#net6-value', '4294967296');
    submit(root);
    expect(fieldError(root, 'net6-value')).toBe(
      'A decimal IPv4 value must be a whole number from 0 to 4294967295.',
    );
    expect(document.activeElement?.id).toBe('net6-value');
  });
});

describe('IPv6 converters', () => {
  it('shows the mapped, NAT64 and 6to4 forms of an IPv4 address', () => {
    const root = open('#/tool/ipv4-to-ipv6');
    set(root, '#net6-value', '192.0.2.1');
    submit(root);
    expect(row(root, 'IPv4-mapped (dual-stack)')).toBe('::ffff:c000:201');
    expect(row(root, 'NAT64 well-known prefix')).toBe('64:ff9b::c000:201');
    expect(row(root, '6to4 prefix')).toBe('2002:c000:201::/48');
  });

  it('extracts the IPv4 address from a mapped IPv6 address', () => {
    const root = open('#/tool/ipv6-to-ipv4');
    set(root, '#net6-value', '::ffff:192.0.2.1');
    submit(root);
    expect(row(root, 'Embedded IPv4')).toBe('192.0.2.1');
    expect(row(root, 'Form')).toBe('IPv4-mapped');
  });

  it('says when no IPv4 address is embedded', () => {
    const root = open('#/tool/ipv6-to-ipv4');
    set(root, '#net6-value', '2001:db8::1');
    submit(root);
    expect(row(root, 'Embedded IPv4')).toBe(
      'This address does not contain an IPv4 address in a known form.',
    );
  });

  it('compresses and expands to the expected forms', () => {
    const c = open('#/tool/ipv6-compression');
    set(c, '#net6-value', '2001:0db8:0000:0000:0000:0000:0000:0001');
    submit(c);
    expect(row(c, 'Compressed form (RFC 5952)')).toBe('2001:db8::1');
    expect(row(c, 'Full form')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');

    const e = open('#/tool/ipv6-expand');
    set(e, '#net6-value', '2001:db8::1');
    submit(e);
    expect(row(e, 'Full form')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });

  it('reports a clear error for a malformed IPv6 address', () => {
    const root = open('#/tool/ipv6-expand');
    set(root, '#net6-value', '1::2::3');
    submit(root);
    expect(fieldError(root, 'net6-value')).toBe('Use :: only once in an IPv6 address.');
  });
});

describe('IPv6 ranges', () => {
  it('gives the first, last and total addresses of an IPv6 block', () => {
    const root = open('#/tool/ipv6-cidr-range');
    set(root, '#net6-value', '2001:db8::/32');
    submit(root);
    expect(row(root, 'First address')).toBe('2001:db8::');
    expect(row(root, 'Last address')).toBe('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
    expect(row(root, 'Total addresses')).toBe('79,228,162,514,264,337,593,543,950,336');
  });

  it('summarises a range into CIDR blocks', () => {
    const root = open('#/tool/ipv6-range-cidr');
    set(root, '#net6-start', '2001:db8::');
    set(root, '#net6-end', '2001:db8::ffff');
    submit(root);
    expect(row(root, 'CIDR blocks')).toBe('2001:db8::/112');
    expect(row(root, 'Number of blocks')).toBe('1');
  });

  it('refuses a reversed range and focuses the end field', () => {
    const root = open('#/tool/ipv6-range-cidr');
    set(root, '#net6-start', '2001:db8::2');
    set(root, '#net6-end', '2001:db8::1');
    submit(root);
    expect(fieldError(root, 'net6-end')).toBe(
      'The first address must not be greater than the last address.',
    );
    expect(document.activeElement?.id).toBe('net6-end');
  });
});

describe('IP subnet calculator', () => {
  it('handles an IPv4 block with the same rules as the Subnet Calculator', () => {
    const root = open('#/tool/ip-subnet-calculator');
    set(root, '#net6-value', '192.168.1.10/24');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('192.168.1.0/24');
    expect(row(root, 'Broadcast')).toBe('192.168.1.255');
    expect(row(root, 'Usable hosts')).toBe('254');
  });

  it('handles an IPv6 block and says IPv6 has no broadcast', () => {
    const root = open('#/tool/ip-subnet-calculator');
    set(root, '#net6-value', '2001:db8::1/64');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('2001:db8::/64');
    expect(row(root, 'Address type')).toBe('Documentation (2001:db8::/32)');
  });

  it('asks for a prefix when none is given', () => {
    const root = open('#/tool/ip-subnet-calculator');
    set(root, '#net6-value', '192.168.1.10');
    submit(root);
    expect(fieldError(root, 'net6-value')).toBe('Enter a prefix length, for example /24 or /64.');
  });
});

describe('local IPv6 address generator', () => {
  it('generates a unique-local address with a /48 and /64', () => {
    const root = open('#/tool/local-ipv6-generator');
    $<HTMLButtonElement>(root, 'button[type="submit"]').click();
    const address = row(root, 'Address') ?? '';
    expect(address).toMatch(/^fd[0-9a-f]{2}:[0-9a-f]{1,4}:[0-9a-f]{1,4}:0:/);
    expect(row(root, '/48 site prefix')).toMatch(/^fd[0-9a-f]{2}:[0-9a-f:]+::\/48$/);
    expect(row(root, '/64 subnet (subnet ID 0)')).toMatch(/\/64$/);
  });

  it('gives a new address each time', () => {
    const root = open('#/tool/local-ipv6-generator');
    submit(root);
    const first = row(root, 'Address');
    submit(root);
    expect(row(root, 'Address')).not.toBe(first);
  });
});

describe('Bangla and reset', () => {
  it('keeps the input across a language switch and recalculates', async () => {
    const root = open('#/tool/ipv6-compression');
    set(root, '#net6-value', '2001:0db8:0:0:0:0:0:1');
    submit(root);
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('IPv6 কম্প্রেশন টুল');
    expect($<HTMLInputElement>(root, '#net6-value').value).toBe('2001:0db8:0:0:0:0:0:1');
    expect(row(root, 'সংক্ষিপ্ত রূপ (RFC 5952)')).toBe('2001:db8::1');
  });

  it('resets the form and result to empty', () => {
    const root = open('#/tool/ipv6-expand');
    set(root, '#net6-value', '2001:db8::1');
    submit(root);
    [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')]
      .find((b) => b.textContent === 'Reset')!
      .click();
    expect($<HTMLInputElement>(root, '#net6-value').value).toBe('');
    expect(root.querySelector('.result-list')).toBeNull();
  });
});

describe('Email header analyzer', () => {
  const HEADERS = [
    'Received: from smtp.example.org (smtp.example.org [203.0.113.5]) by mx.recipient.example with ESMTP; Mon, 20 Oct 2026 10:00:10 +0000',
    'Received: from laptop (unknown [192.0.2.44]) by smtp.example.org with ESMTPSA; Mon, 20 Oct 2026 09:59:50 +0000',
    'Authentication-Results: mx.recipient.example; spf=pass; dkim=pass; dmarc=pass',
    'From: "Alice" <alice@example.org>',
    'To: bob@recipient.example',
    'Subject: Hello',
    '',
    'body',
  ].join('\n');

  it('summarises pasted headers and lists the hops oldest first', () => {
    const root = open('#/tool/email-header-analyzer');
    set(root, '#mail-headers', HEADERS);
    submit(root);
    expect(row(root, 'From')).toBe('alice@example.org');
    expect(row(root, 'DMARC result')).toBe('pass');
    const hops = [...root.querySelectorAll('.hop-table tbody tr')].map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent,
    );
    expect(hops).toEqual(['laptop', 'smtp.example.org']);
  });

  it('explains why nothing was analysed when the paste is not headers', () => {
    const root = open('#/tool/email-header-analyzer');
    set(root, '#mail-headers', 'just words here');
    submit(root);
    expect(fieldError(root, 'mail-headers')).toBe(
      'No header fields were found. Paste lines such as “From: name <address>”.',
    );
    expect(document.activeElement?.id).toBe('mail-headers');
  });
});
