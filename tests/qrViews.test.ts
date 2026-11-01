import jsQR from 'jsqr';
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
const err = (root: ParentNode, id: string): string =>
  $<HTMLElement>(root, `#${id}-error`).textContent ?? '';

/** Read the QR picture the page drew (an SVG path) back into pixels and decode it with jsQR. */
function decodeShown(root: ParentNode): string | null {
  const svg = $<SVGSVGElement>(root, '.qr-svg');
  const total = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
  const scale = 4;
  const width = total * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  const path = $<SVGPathElement>(svg, 'path').getAttribute('d')!;
  for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, run] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let dy = 0; dy < scale; dy++)
      for (let dx = 0; dx < run * scale; dx++)
        data.set([0, 0, 0, 255], ((y * scale + dy) * width + x * scale + dx) * 4);
  }
  return jsQR(data, width, width)?.data ?? null;
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
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.restoreAllMocks();
  delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
});

describe('QR Code Generator', () => {
  const tab = (root: ParentNode, type: string): void =>
    $<HTMLButtonElement>(root, `#qr-tab-${type}`).click();
  /** Whether a field is on screen: its tab panel is shown and the field itself is not hidden. */
  const shown = (root: ParentNode, id: string): boolean => {
    const el = $(root, `#${id}`);
    return (
      !el.closest<HTMLElement>('[role="tabpanel"]')!.hidden &&
      !el.closest<HTMLElement>('.field, .check')!.hidden
    );
  };

  it('draws a code that decodes to exactly what was typed', () => {
    const root = open('#/tool/qr-code-generator');
    expect(root.querySelector('.qg-result')?.textContent).toContain('Enter your content');
    set(root, '#qr-text', 'https://example.com/path?x=1');
    submit(root);
    expect(decodeShown(root)).toBe('https://example.com/path?x=1');
    expect(row(root, 'Type')).toBe('Text / Link');
    expect(row(root, 'Size')).toBe('250 × 250 pixels');
    expect(row(root, 'Data')).toBe('28 characters (28 bytes)');
    expect(row(root, 'Error correction')).toBe('Medium (M)');
    expect(row(root, 'Margin')).toBe('4 modules');
    expect(row(root, 'Code version')).toMatch(/^Version \d+ \(\d+ × \d+ squares\)$/);
    expect($(root, '.qr-svg').getAttribute('role')).toBe('img');
    expect($(root, '.qr-svg').getAttribute('aria-label')).toBe('QR code');
    // The label never repeats the content, which could be a secret.
    expect(root.querySelector('.qr-preview')?.textContent).not.toContain('example.com');
  });

  it('keeps Bangla text intact', () => {
    const root = open('#/tool/qr-code-generator');
    set(root, '#qr-text', 'আমার সোনার বাংলা');
    submit(root);
    expect(decodeShown(root)).toBe('আমার সোনার বাংলা');
  });

  it('shows only the fields for the chosen tab', () => {
    const root = open('#/tool/qr-code-generator');
    expect([shown(root, 'qr-text'), shown(root, 'qr-ssid'), shown(root, 'qr-cname')]).toEqual([
      true,
      false,
      false,
    ]);
    expect($(root, '#qr-tab-text').getAttribute('aria-selected')).toBe('true');
    tab(root, 'wifi');
    expect([
      shown(root, 'qr-text'),
      shown(root, 'qr-ssid'),
      shown(root, 'qr-password'),
      shown(root, 'qr-cname'),
    ]).toEqual([false, true, true, false]);
    set(root, '#qr-security', 'nopass');
    expect(shown(root, 'qr-password')).toBe(false);
    tab(root, 'contact');
    expect([shown(root, 'qr-text'), shown(root, 'qr-ssid'), shown(root, 'qr-cname')]).toEqual([
      false,
      false,
      true,
    ]);
    // Arrow keys move between tabs.
    $(root, '#qr-tab-contact').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect($(root, '#qr-tab-email').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement?.id).toBe('qr-tab-email');
  });

  it('makes a Wi-Fi code that decodes to the standard payload', () => {
    const root = open('#/tool/qr-code-generator');
    tab(root, 'wifi');
    set(root, '#qr-ssid', 'HomeNet');
    set(root, '#qr-password', 'password123');
    submit(root);
    expect(decodeShown(root)).toBe('WIFI:T:WPA;S:HomeNet;P:password123;;');
    expect(row(root, 'Type')).toBe('Wi-Fi');
  });

  it('checks Wi-Fi fields and focuses the first problem', () => {
    const root = open('#/tool/qr-code-generator');
    tab(root, 'wifi');
    submit(root);
    expect(err(root, 'qr-ssid')).toBe('Enter the network name.');
    expect(document.activeElement?.id).toBe('qr-ssid');
    set(root, '#qr-ssid', 'Net');
    set(root, '#qr-password', 'short');
    submit(root);
    expect(err(root, 'qr-password')).toContain('WPA passwords are 8 to 63 characters');
  });

  it('makes a contact-card code and names the field that is wrong', () => {
    const root = open('#/tool/qr-code-generator');
    tab(root, 'contact');
    set(root, '#qr-cname', 'Md. Maniruzzaman');
    set(root, '#qr-cemail', 'not-an-email');
    submit(root);
    expect(err(root, 'qr-cemail')).toBe('Enter a valid email address.');
    set(root, '#qr-cemail', 'hello@example.com');
    submit(root);
    const decoded = decodeShown(root) ?? '';
    expect(decoded).toContain('BEGIN:VCARD');
    expect(decoded).toContain('FN:Md. Maniruzzaman');
    expect(decoded).toContain('EMAIL:hello@example.com');
  });

  it('makes email, phone and SMS codes', () => {
    const root = open('#/tool/qr-code-generator');
    tab(root, 'email');
    set(root, '#qr-emailto', 'bad');
    submit(root);
    expect(err(root, 'qr-emailto')).toBe('Enter a valid email address.');
    set(root, '#qr-emailto', 'info@example.com');
    set(root, '#qr-emailsubject', 'Hi there');
    submit(root);
    expect(decodeShown(root)).toBe('mailto:info@example.com?subject=Hi%20there');
    expect(row(root, 'Type')).toBe('Email');
    tab(root, 'phone');
    submit(root);
    expect(err(root, 'qr-phone')).toBe('Enter a phone number.');
    set(root, '#qr-phone', '+৮৮০ ১৭০০-০০০০০০');
    submit(root);
    expect(decodeShown(root)).toBe('tel:+8801700000000');
    tab(root, 'sms');
    set(root, '#qr-smsnumber', '01700000000');
    set(root, '#qr-smsmessage', 'Hello');
    submit(root);
    expect(decodeShown(root)).toBe('SMSTO:01700000000:Hello');
    expect(row(root, 'Type')).toBe('SMS');
  });

  it('refuses empty text and text that is too long', () => {
    const root = open('#/tool/qr-code-generator');
    submit(root);
    expect(err(root, 'qr-text')).toBe('Enter the text to put in the code.');
    set(root, '#qr-ecc', 'H');
    set(root, '#qr-text', 'a'.repeat(1300));
    submit(root);
    expect(err(root, 'qr-text')).toContain('too long');
    expect(root.querySelector('.qr-svg')).toBeNull();
  });

  it('honours the error-correction level, margin and size, and redraws at once', () => {
    const root = open('#/tool/qr-code-generator');
    set(root, '#qr-text', 'a'.repeat(100));
    set(root, '#qr-ecc', 'L');
    submit(root);
    const low = row(root, 'Code version');
    set(root, '#qr-ecc', 'H');
    expect(row(root, 'Code version')).not.toBe(low);
    expect(row(root, 'Error correction')).toBe('High (H)');
    expect(decodeShown(root)).toBe('a'.repeat(100));
    const modules = (): number => Number($(root, '.qr-svg').getAttribute('viewBox')!.split(' ')[2]);
    const before = modules();
    set(root, '#qr-margin', '8');
    expect(modules()).toBe(before + 8);
    expect(row(root, 'Margin')).toBe('8 modules');
    set(root, '#qr-margin', '2');
    expect(root.querySelector('.qg-warnings')?.textContent).toContain('below the QR standard');
    set(root, '#qr-size', '600');
    expect(row(root, 'Size')).toBe('600 × 600 pixels');
  });

  it('uses custom colours and refuses a code lighter than its background', () => {
    const root = open('#/tool/qr-code-generator');
    set(root, '#qr-text', 'colours');
    set(root, '#qr-fg', '#1e3a8a');
    submit(root);
    expect($(root, '.qr-svg path').getAttribute('fill')).toBe('#1e3a8a');
    set(root, '#qr-fg', '#ffffff');
    set(root, '#qr-bg', '#000000');
    submit(root);
    expect(err(root, 'qr-fg')).toBe('The code colour must be darker than the background colour.');
    expect($<HTMLDetailsElement>(root, '.qg-advanced').open).toBe(true);
    expect(root.querySelector('.qr-svg')).toBeNull();
  });

  it('fills the form from an example and resets everything', () => {
    const root = open('#/tool/qr-code-generator');
    $<HTMLButtonElement>(root, '#qr-example-wifi').click();
    expect($(root, '#qr-tab-wifi').getAttribute('aria-selected')).toBe('true');
    expect($(root, '#qr-ssid').value).toBe('Office WiFi');
    expect(decodeShown(root)).toBe('WIFI:T:WPA;S:Office WiFi;P:ChangeThisPassword;;');
    $<HTMLButtonElement>(root, '#qr-example-contact').click();
    expect(decodeShown(root)).toContain('FN:Md. Maniruzzaman');
    [...root.querySelectorAll<HTMLButtonElement>('.qg-form button')]
      .find((b) => b.textContent?.trim() === 'Reset')!
      .click();
    expect($(root, '#qr-tab-text').getAttribute('aria-selected')).toBe('true');
    expect($(root, '#qr-cname').value).toBe('');
    expect(root.querySelector('.qr-svg')).toBeNull();
  });

  it('links only to related tools that exist', () => {
    const root = open('#/tool/qr-code-generator');
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.qg-related a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(['#/tool/qr-scanner', '#/tool/wifi-qr-scanner']);
    expect(root.querySelector('.related')).toBeNull();
  });

  it('offers PNG, SVG and image-copy and saves a real SVG file', async () => {
    let saved: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob) => {
      saved = b;
      return 'blob:qr';
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    let name = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      name = this.download;
    });
    const root = open('#/tool/qr-code-generator');
    set(root, '#qr-text', 'download me');
    set(root, '#qr-size', '400');
    submit(root);
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.qr-preview button')].map(
      (b) => b.textContent,
    );
    expect(buttons).toEqual(['Download PNG', 'Download SVG', 'Copy Image']);
    [...root.querySelectorAll<HTMLButtonElement>('.qr-preview button')]
      .find((b) => b.textContent === 'Download SVG')!
      .click();
    expect(name).toBe('qr-code.svg');
    expect($(root, '.qr-preview .copy-status').textContent).toBe('Download started.');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(saved as unknown as Blob);
    });
    expect(text).toContain('<svg');
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(text).toContain('width="400"');
    // jsdom has no image clipboard: the page says so instead of failing silently.
    [...root.querySelectorAll<HTMLButtonElement>('.qr-preview button')]
      .find((b) => b.textContent === 'Copy Image')!
      .click();
    await vi.waitFor(() =>
      expect($(root, '.qr-preview .copy-status').textContent).toBe(
        'This browser cannot copy images. Download the PNG instead.',
      ),
    );
  });

  it('keeps the form and code across a language switch', async () => {
    const root = open('#/tool/qr-code-generator');
    set(root, '#qr-text', 'keep me');
    submit(root);
    $<HTMLButtonElement>(root, '#lang-btn').click();
    await Promise.resolve();
    expect($(root, 'h1').textContent).toBe('QR কোড জেনারেটর');
    expect($<HTMLTextAreaElement>(root, '#qr-text').value).toBe('keep me');
    await vi.waitFor(() => expect(decodeShown(root)).toBe('keep me'));
    expect(row(root, 'আকার')).toBe('২৫০ × ২৫০ পিক্সেল');
  });
});

describe('QR Scanner', () => {
  it('says what it does with the camera and pictures before anything is used', () => {
    const root = open('#/tool/qr-scanner');
    expect($(root, '.net-notice').textContent).toContain('never recorded, stored or uploaded');
    expect($(root, '#qrscan-camera').textContent).toBe('Start camera');
    expect($(root, '#qrscan-image').getAttribute('accept')).toBe('image/*');
    expect($(root, 'label[for="qrscan-image"]').textContent).toBe(
      'Or choose a picture with a QR code',
    );
  });

  it('explains when there is no camera', () => {
    const root = open('#/tool/qr-scanner');
    $<HTMLButtonElement>(root, '#qrscan-camera').click();
    const alert = $<HTMLElement>(root, '.net-error');
    expect(alert.hidden).toBe(false);
    expect(alert.textContent).toBe('No camera is available here. Choose a picture instead.');
  });

  it('explains when permission is denied, and does not start scanning', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) },
      configurable: true,
    });
    const root = open('#/tool/qr-scanner');
    $<HTMLButtonElement>(root, '#qrscan-camera').click();
    await vi.waitFor(() =>
      expect($(root, '.net-error').textContent).toContain('Camera permission was denied'),
    );
    expect($(root, '#qrscan-camera').textContent).toBe('Start camera');
    expect($<HTMLElement>(root, '.qr-video').hidden).toBe(true);
  });
});

describe('WiFi QR Scanner', () => {
  const submitPaste = (root: ParentNode): void =>
    $<HTMLFormElement>(root, 'form.qr-paste').requestSubmit();
  const PAYLOAD = 'WIFI:T:WPA;S:HomeNet;P:secret pass;H:true;;';

  it('reads a pasted code, hiding the password until asked', () => {
    const root = open('#/tool/wifi-qr-scanner');
    set(root, '#wifiscan-text', PAYLOAD);
    submitPaste(root);
    expect(row(root, 'Network name (SSID)')).toBe('HomeNet');
    expect(row(root, 'Security')).toBe('WPA / WPA2 / WPA3');
    expect(row(root, 'Hidden network')).toBe('Yes');
    expect(row(root, 'Password')).toBe('•'.repeat(11));
    expect(root.textContent).not.toContain('secret pass');

    const show = $<HTMLInputElement>(root, '#wifiscan-show');
    show.checked = true;
    show.dispatchEvent(new Event('change', { bubbles: true }));
    expect(row(root, 'Password')).toBe('secret pass');
    show.checked = false;
    show.dispatchEvent(new Event('change', { bubbles: true }));
    expect(row(root, 'Password')).toBe('•'.repeat(11));
  });

  it('shows an open network without a password', () => {
    const root = open('#/tool/wifi-qr-scanner');
    set(root, '#wifiscan-text', 'WIFI:T:nopass;S:Cafe;;');
    submitPaste(root);
    expect(row(root, 'Security')).toBe('None (open network)');
    expect(row(root, 'Password')).toBe('(none)');
  });

  it('refuses text that is not a Wi-Fi code, or empty text', () => {
    const root = open('#/tool/wifi-qr-scanner');
    submitPaste(root);
    expect(err(root, 'wifiscan-text')).toBe('Paste the text of a Wi-Fi code.');
    set(root, '#wifiscan-text', 'https://example.com');
    submitPaste(root);
    expect(err(root, 'wifiscan-text')).toBe(
      'This is not a Wi-Fi code. The text should start with WIFI:',
    );
    expect(document.activeElement?.id).toBe('wifiscan-text');
  });
});
