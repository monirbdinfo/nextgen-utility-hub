import { describe, expect, it } from 'vitest';
import {
  classifyPayload,
  parseWifi,
  vcardPayload,
  wifiPayload,
  type Contact,
  type WifiNetwork,
} from '../../src/calc/qrPayload';

const wifi = (over: Partial<WifiNetwork> = {}): WifiNetwork => ({
  ssid: 'HomeNet',
  password: 'correct horse',
  security: 'WPA',
  hidden: false,
  ...over,
});

describe('wifiPayload', () => {
  it('builds the standard payload', () => {
    expect(wifiPayload(wifi())).toEqual({
      ok: true,
      value: 'WIFI:T:WPA;S:HomeNet;P:correct horse;;',
    });
    expect(wifiPayload(wifi({ hidden: true }))).toEqual({
      ok: true,
      value: 'WIFI:T:WPA;S:HomeNet;P:correct horse;H:true;;',
    });
    expect(wifiPayload(wifi({ security: 'nopass', password: 'ignored' }))).toEqual({
      ok: true,
      value: 'WIFI:T:nopass;S:HomeNet;;',
    });
  });

  it('escapes backslash, semicolon, comma, colon and quote', () => {
    const r = wifiPayload(wifi({ ssid: 'a;b,c:d"e\\f', password: 'p;a:s,s"w\\rd' }));
    expect(r).toEqual({
      ok: true,
      value: 'WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;a\\:s\\,s\\"w\\\\rd;;',
    });
  });

  it('validates the name and the password length for each security type', () => {
    expect(wifiPayload(wifi({ ssid: '' }))).toEqual({ ok: false, error: 'ssid-empty' });
    expect(wifiPayload(wifi({ ssid: 'x'.repeat(33) }))).toEqual({
      ok: false,
      error: 'ssid-too-long',
    });
    expect(wifiPayload(wifi({ password: '' }))).toEqual({ ok: false, error: 'password-empty' });
    expect(wifiPayload(wifi({ password: 'short' }))).toEqual({
      ok: false,
      error: 'password-length',
    });
    expect(wifiPayload(wifi({ password: 'x'.repeat(64) }))).toEqual({
      ok: false,
      error: 'password-length',
    });
    expect(wifiPayload(wifi({ security: 'WEP', password: 'abcde' })).ok).toBe(true); // 5 ASCII
    expect(wifiPayload(wifi({ security: 'WEP', password: 'abcdef0123' })).ok).toBe(true); // 10 hex
    expect(wifiPayload(wifi({ security: 'WEP', password: 'abcdef' }))).toEqual({
      ok: false,
      error: 'password-length',
    });
  });

  it('counts the name in bytes, not characters', () => {
    expect(wifiPayload(wifi({ ssid: 'ক'.repeat(11) }))).toEqual({
      ok: false,
      error: 'ssid-too-long',
    }); // 33 bytes
    expect(wifiPayload(wifi({ ssid: 'ক'.repeat(10) })).ok).toBe(true); // 30 bytes
  });
});

describe('parseWifi', () => {
  it('reads a payload back, including escaped characters', () => {
    expect(parseWifi('WIFI:T:WPA;S:HomeNet;P:correct horse;H:true;;')).toEqual({
      ok: true,
      value: { ssid: 'HomeNet', password: 'correct horse', security: 'WPA', hidden: true },
    });
    const built = wifiPayload(wifi({ ssid: 'a;b,c:d"e\\f', password: 'p;a:s,s"w\\rd' }));
    if (!built.ok) throw new Error();
    expect(parseWifi(built.value)).toEqual({
      ok: true,
      value: { ssid: 'a;b,c:d"e\\f', password: 'p;a:s,s"w\\rd', security: 'WPA', hidden: false },
    });
  });

  it('treats missing or unknown security as an open network and accepts WPA2/WPA3 labels', () => {
    expect(parseWifi('WIFI:S:Cafe;;')).toMatchObject({
      ok: true,
      value: { security: 'nopass', password: '' },
    });
    expect(parseWifi('WIFI:T:WPA2;S:x;P:12345678;;')).toMatchObject({ value: { security: 'WPA' } });
    expect(parseWifi('WIFI:T:SAE;S:x;P:12345678;;')).toMatchObject({ value: { security: 'WPA' } });
    expect(parseWifi('wifi:T:WEP;S:x;P:abcde;;')).toMatchObject({ value: { security: 'WEP' } });
  });

  it('refuses text that is not a Wi-Fi code or has no network name', () => {
    expect(parseWifi('https://example.com')).toEqual({ ok: false, error: 'not-wifi' });
    expect(parseWifi('WIFI:T:WPA;P:secret;;')).toEqual({ ok: false, error: 'no-ssid' });
  });

  it('round-trips generated payloads', () => {
    for (const net of [
      wifi(),
      wifi({ security: 'nopass' }),
      wifi({ hidden: true }),
      wifi({ ssid: 'বাংলা নেট', password: 'পাসওয়ার্ড১২৩' }),
    ]) {
      const built = wifiPayload(net);
      if (!built.ok) throw new Error(built.error);
      const parsed = parseWifi(built.value);
      expect(parsed.ok && parsed.value.ssid).toBe(net.ssid);
      expect(parsed.ok && parsed.value.security).toBe(net.security);
      expect(parsed.ok && parsed.value.hidden).toBe(net.hidden);
      if (net.security !== 'nopass') expect(parsed.ok && parsed.value.password).toBe(net.password);
    }
  });
});

const contact = (over: Partial<Contact> = {}): Contact => ({
  name: 'Md. Maniruzzaman',
  phone: '+880 1700-000000',
  email: 'hello@example.com',
  organisation: 'NextGen Tech BD',
  title: 'Developer',
  url: 'https://example.com',
  ...over,
});

describe('vcardPayload', () => {
  it('writes a vCard 3.0 with only the filled fields', () => {
    expect(vcardPayload(contact())).toEqual({
      ok: true,
      value: [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Maniruzzaman;Md.;;;',
        'FN:Md. Maniruzzaman',
        'ORG:NextGen Tech BD',
        'TITLE:Developer',
        'TEL:+880 1700-000000',
        'EMAIL:hello@example.com',
        'URL:https://example.com',
        'END:VCARD',
      ].join('\n'),
    });
    const minimal = vcardPayload(contact({ phone: '', organisation: '', title: '', url: '' }));
    expect(minimal).toMatchObject({ ok: true });
    if (minimal.ok) expect(minimal.value).not.toContain('TEL:');
  });

  it('escapes commas, semicolons, backslashes and new lines', () => {
    const r = vcardPayload(contact({ name: 'Rahman, A; B', organisation: 'A\\B\nC' }));
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toContain('FN:Rahman\\, A\\; B');
    expect(r.value).toContain('ORG:A\\\\B\\nC');
  });

  it('handles a single-word name and Bangla digits in the phone number', () => {
    const r = vcardPayload(contact({ name: 'Rahim', phone: '০১৭০০-০০০০০০' }));
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toContain('N:;Rahim;;;');
    expect(r.value).toContain('TEL:01700-000000');
  });

  it('validates the fields', () => {
    expect(vcardPayload(contact({ name: '  ' }))).toEqual({ ok: false, error: 'name-empty' });
    expect(vcardPayload(contact({ phone: 'abc' }))).toEqual({ ok: false, error: 'phone-invalid' });
    expect(vcardPayload(contact({ email: 'not-an-email' }))).toEqual({
      ok: false,
      error: 'email-invalid',
    });
    expect(vcardPayload(contact({ url: 'ftp://x' }))).toEqual({ ok: false, error: 'url-invalid' });
    expect(
      vcardPayload(contact({ phone: '', email: '', organisation: '', title: '', url: '' })),
    ).toEqual({
      ok: false,
      error: 'nothing-else',
    });
  });
});

describe('classifyPayload', () => {
  it.each([
    ['https://example.com/a?b=1', 'url'],
    ['HTTP://EXAMPLE.COM', 'url'],
    ['WIFI:T:WPA;S:x;P:y;;', 'wifi'],
    ['BEGIN:VCARD\nVERSION:3.0\nEND:VCARD', 'contact'],
    ['mailto:a@b.co', 'email'],
    ['tel:+8801700000000', 'phone'],
    ['SMSTO:+880170000000:hi', 'sms'],
    ['geo:23.8103,90.4125', 'geo'],
    ['just some text', 'text'],
    ['javascript:alert(1)', 'text'],
    ['https://example.com with spaces', 'text'],
  ])('%s is %s', (text, kind) => {
    expect(classifyPayload(text)).toBe(kind);
  });
});
