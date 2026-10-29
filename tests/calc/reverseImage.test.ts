import { describe, expect, it } from 'vitest';
import { checkImageUrl, PROVIDERS, searchLinks } from '../../src/calc/reverseImage';

describe('checkImageUrl', () => {
  it('accepts public http(s) picture addresses and normalises them', () => {
    expect(checkImageUrl('  https://example.com/a b.jpg ')).toEqual({
      ok: true,
      value: 'https://example.com/a%20b.jpg',
    });
    expect(checkImageUrl('http://203.0.113.5/x.png').ok).toBe(true);
    expect(checkImageUrl('https://[2001:db8::1]/x.png').ok).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['example.com/photo.jpg', 'invalid'],
    ['not a url', 'invalid'],
    ['ftp://example.com/a.jpg', 'scheme'],
    ['data:image/png;base64,AAAA', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['file:///home/me/a.jpg', 'scheme'],
    ['http://localhost/a.jpg', 'private'],
    ['http://printer.local/a.jpg', 'private'],
    ['http://intranet/a.jpg', 'private'],
    ['http://127.0.0.1/a.jpg', 'private'],
    ['http://10.1.2.3/a.jpg', 'private'],
    ['http://172.16.0.1/a.jpg', 'private'],
    ['http://192.168.1.10/a.jpg', 'private'],
    ['http://169.254.1.1/a.jpg', 'private'],
    ['http://100.64.0.1/a.jpg', 'private'],
    ['http://[::1]/a.jpg', 'private'],
    ['http://[fd00::1]/a.jpg', 'private'],
    ['http://[fe80::1]/a.jpg', 'private'],
    [`https://example.com/${'a'.repeat(2000)}`, 'too-long'],
  ])('%s → %s', (text, error) => {
    expect(checkImageUrl(text)).toEqual({ ok: false, error });
  });

  it('does not treat public addresses that look similar as private', () => {
    expect(checkImageUrl('http://172.32.0.1/a.jpg').ok).toBe(true);
    expect(checkImageUrl('http://192.169.0.1/a.jpg').ok).toBe(true);
    expect(checkImageUrl('https://local.example.com/a.jpg').ok).toBe(true);
  });
});

describe('searchLinks', () => {
  it('builds one https link per provider with the address encoded', () => {
    const url = 'https://example.com/p.jpg?a=1&b=২';
    const links = searchLinks(url);
    expect(links.map((l) => l.provider.id)).toEqual(['google', 'bing', 'tineye', 'yandex']);
    for (const l of links) {
      const parsed = new URL(l.href);
      expect(parsed.protocol).toBe('https:');
      expect(l.href).toContain(encodeURIComponent(url));
      expect(l.href).not.toContain('&b=');
    }
    expect(links[0]!.href).toBe(
      `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
    );
    expect(new URL(links[2]!.href).searchParams.get('url')).toBe(url);
  });

  it('gives every provider an https upload page', () => {
    for (const p of PROVIDERS) expect(new URL(p.uploadPage).protocol).toBe('https:');
  });
});
