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
const error = (root: ParentNode, id: string): string =>
  $<HTMLElement>(root, `#${id}-error`).hidden ? '' : ($(root, `#${id}-error`).textContent ?? '');
const resultNotes = (root: ParentNode): string[] =>
  [...root.querySelectorAll('.result-notes li')].map((li) => li.textContent ?? '');

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

describe('subnet calculator', () => {
  it('calculates a /24 from an address and prefix', () => {
    const root = open('#/tool/subnet-calculator');
    expect($(root, 'h1').textContent).toBe('Subnet Calculator');
    expect($(root, '#subnet-prefix').value).toBe('24');
    set(root, '#subnet-address', '192.168.1.10');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('192.168.1.0/24');
    expect(row(root, 'Network address')).toBe('192.168.1.0');
    expect(row(root, 'Broadcast address')).toBe('192.168.1.255');
    expect(row(root, 'Subnet mask')).toBe('255.255.255.0');
    expect(row(root, 'Wildcard mask')).toBe('0.0.0.255');
    expect(row(root, 'First usable host')).toBe('192.168.1.1');
    expect(row(root, 'Last usable host')).toBe('192.168.1.254');
    expect(row(root, 'Usable hosts')).toBe('254');
    expect(row(root, 'Total addresses')).toBe('256');
    expect(row(root, 'Address type')).toBe('Private (RFC 1918)');
    expect(row(root, 'Mask in binary')).toBe('11111111.11111111.11111111.00000000');
    expect(resultNotes(root)[0]).toContain('host bits set');
  });

  it('accepts CIDR in the address field and a dotted mask in the prefix field', () => {
    const root = open('#/tool/subnet-calculator');
    set(root, '#subnet-address', '172.16.35.123/20');
    set(root, '#subnet-prefix', '');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('172.16.32.0/20');
    expect(row(root, 'Usable hosts')).toBe('4,094');

    set(root, '#subnet-address', '10.0.0.0');
    set(root, '#subnet-prefix', '255.255.255.192');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('10.0.0.0/26');
    expect(resultNotes(root)).toEqual([]);
  });

  it('explains /31 and /32', () => {
    const root = open('#/tool/subnet-calculator');
    set(root, '#subnet-address', '10.0.0.0/31');
    set(root, '#subnet-prefix', '');
    submit(root);
    expect(row(root, 'Broadcast address')).toBe('None — /31 point-to-point link');
    expect(row(root, 'Usable hosts')).toBe('2');
    expect(row(root, 'First usable host')).toBe('10.0.0.0');
    expect(resultNotes(root).join(' ')).toContain('RFC 3021');

    set(root, '#subnet-address', '8.8.8.8');
    set(root, '#subnet-prefix', '/32');
    submit(root);
    expect(row(root, 'Broadcast address')).toBe('None — /32 single host');
    expect(row(root, 'Usable hosts')).toBe('1');
    expect(row(root, 'Address type')).toBe('Public (globally routable)');
  });

  it('validates the address and prefix and focuses the first error', () => {
    const root = open('#/tool/subnet-calculator');
    set(root, '#subnet-address', '256.1.1.1');
    set(root, '#subnet-prefix', '33');
    submit(root);
    expect(error(root, 'subnet-address')).toBe(
      'Each of the four numbers must be between 0 and 255.',
    );
    expect(error(root, 'subnet-prefix')).toBe(
      'The prefix length must be a whole number from 0 to 32.',
    );
    expect(document.activeElement?.id).toBe('subnet-address');
    expect($(root, '#subnet-address').getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('.result-list')).toBeNull();

    set(root, '#subnet-address', '10.01.0.1');
    set(root, '#subnet-prefix', '255.0.255.0');
    submit(root);
    expect(error(root, 'subnet-address')).toContain('leading zeros');
    expect(error(root, 'subnet-prefix')).toContain('not a valid subnet mask');

    set(root, '#subnet-address', '10.0.0.1/8');
    set(root, '#subnet-prefix', '16');
    submit(root);
    expect(error(root, 'subnet-address')).toBe('');
    expect(error(root, 'subnet-prefix')).toContain('differs from 16');
  });

  it('works in Bangla with Bangla digits and keeps input across a language switch', async () => {
    const root = open('#/tool/subnet-calculator');
    set(root, '#subnet-address', '১০.০.০.৫');
    set(root, '#subnet-prefix', '২২');
    submit(root);
    expect(row(root, 'CIDR notation')).toBe('10.0.0.0/22');
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('সাবনেট ক্যালকুলেটর');
    expect($(root, '#subnet-address').value).toBe('১০.০.০.৫');
    expect(row(root, 'CIDR নোটেশন')).toBe('10.0.0.0/22');
    expect(row(root, 'ব্যবহারযোগ্য হোস্ট')).toBe('১,০২২');
    // Addresses stay in ASCII digits and are marked as English text.
    expect(
      [...root.querySelectorAll('.result-row')]
        .find((r) => r.querySelector('dt')?.textContent === 'নেটওয়ার্ক অ্যাড্রেস')
        ?.querySelector('.result-value')
        ?.getAttribute('lang'),
    ).toBe('en');
  });

  it('resets to the defaults', () => {
    const root = open('#/tool/subnet-calculator');
    set(root, '#subnet-address', '10.0.0.1');
    set(root, '#subnet-prefix', '8');
    submit(root);
    [...root.querySelectorAll<HTMLButtonElement>('.form-actions button')]
      .find((b) => b.textContent === 'Reset')!
      .click();
    expect($(root, '#subnet-address').value).toBe('');
    expect($(root, '#subnet-prefix').value).toBe('24');
    expect(root.querySelector('.result-list')).toBeNull();
    expect(document.activeElement?.id).toBe('subnet-address');
  });
});

describe('CIDR & IP range calculator', () => {
  it('converts a CIDR block to its range', () => {
    const root = open('#/tool/cidr-calculator');
    expect($<HTMLElement>(root, '#cidr-start').closest('.field')?.hasAttribute('hidden')).toBe(
      true,
    );
    set(root, '#cidr-block', '10.0.1.7/22');
    submit(root);
    expect(row(root, 'First address')).toBe('10.0.0.0');
    expect(row(root, 'Last address')).toBe('10.0.3.255');
    expect(row(root, 'Total addresses')).toBe('1,024');
    expect(row(root, 'Subnet mask')).toBe('255.255.252.0');
    expect(resultNotes(root)[0]).toContain('10.0.0.0/22');
  });

  it('converts a range to the fewest CIDR blocks', () => {
    const root = open('#/tool/cidr-calculator');
    set(root, '#cidr-mode', 'range');
    expect($<HTMLElement>(root, '#cidr-block').closest('.field')?.hasAttribute('hidden')).toBe(
      true,
    );
    set(root, '#cidr-start', '192.168.1.10');
    set(root, '#cidr-end', '192.168.1.20');
    submit(root);
    expect(row(root, 'CIDR blocks')).toBe(
      '192.168.1.10/31\n192.168.1.12/30\n192.168.1.16/30\n192.168.1.20/32',
    );
    expect(row(root, 'Number of blocks')).toBe('4');
    expect(row(root, 'Total addresses')).toBe('11');
  });

  it('validates input in each mode', () => {
    const root = open('#/tool/cidr-calculator');
    set(root, '#cidr-block', '10.0.0.0');
    submit(root);
    expect(error(root, 'cidr-block')).toContain('prefix length');

    set(root, '#cidr-mode', 'range');
    set(root, '#cidr-start', '10.0.0.9');
    set(root, '#cidr-end', '10.0.0.1');
    submit(root);
    expect(error(root, 'cidr-end')).toBe(
      'The first address must not be greater than the last address.',
    );
    set(root, '#cidr-start', '');
    submit(root);
    expect(error(root, 'cidr-start')).toBe('Enter an IPv4 address.');
    expect(document.activeElement?.id).toBe('cidr-start');
  });
});
