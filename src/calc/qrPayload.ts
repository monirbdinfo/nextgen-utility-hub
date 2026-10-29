import { toEnglishDigits } from './digits';
import { fail, ok, type Result } from './result';

/**
 * What goes *inside* a QR code: Wi-Fi network settings, contact cards, and plain text, and the
 * reverse for the scanners. Pure string work; nothing is looked up or sent.
 */

// ---------- Wi-Fi ("WIFI:T:WPA;S:name;P:password;;") ----------

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

export interface WifiNetwork {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export type WifiError = 'ssid-empty' | 'ssid-too-long' | 'password-empty' | 'password-length';

/** The characters that must be escaped inside a Wi-Fi payload field. */
const escapeWifi = (s: string): string => s.replace(/[\\;,:"]/g, (c) => `\\${c}`);

const utf8Length = (s: string): number => new TextEncoder().encode(s).length;

export function wifiPayload(n: WifiNetwork): Result<string, WifiError> {
  if (!n.ssid) return fail('ssid-empty');
  if (utf8Length(n.ssid) > 32) return fail('ssid-too-long');
  if (n.security !== 'nopass') {
    if (!n.password) return fail('password-empty');
    const len = n.password.length;
    const wepOk =
      [5, 13].includes(len) || (/^[0-9a-f]+$/i.test(n.password) && [10, 26].includes(len));
    if (n.security === 'WPA' ? len < 8 || len > 63 : !wepOk) return fail('password-length');
  }
  const parts = [`T:${n.security}`, `S:${escapeWifi(n.ssid)}`];
  if (n.security !== 'nopass') parts.push(`P:${escapeWifi(n.password)}`);
  if (n.hidden) parts.push('H:true');
  return ok(`WIFI:${parts.join(';')};;`);
}

/** Read the fields of a `WIFI:` payload, honouring backslash escapes. */
export function parseWifi(payload: string): Result<WifiNetwork, 'not-wifi' | 'no-ssid'> {
  const text = payload.trim();
  if (!/^WIFI:/i.test(text)) return fail('not-wifi');
  const fields = new Map<string, string>();
  let key = '';
  let value = '';
  let inValue = false;
  for (let i = 5; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\\' && i + 1 < text.length) {
      const escaped = text[++i]!;
      if (inValue) value += escaped;
      else key += escaped;
    } else if (c === ':' && !inValue) {
      inValue = true;
    } else if (c === ';') {
      if (key) fields.set(key.toUpperCase(), value);
      key = '';
      value = '';
      inValue = false;
    } else if (inValue) value += c;
    else key += c;
  }
  if (key) fields.set(key.toUpperCase(), value);
  const ssid = fields.get('S') ?? '';
  if (!ssid) return fail('no-ssid');
  const t = (fields.get('T') ?? '').toUpperCase();
  const security: WifiSecurity =
    t === 'WPA' || t === 'WPA2' || t === 'WPA3' || t === 'SAE'
      ? 'WPA'
      : t === 'WEP'
        ? 'WEP'
        : 'nopass';
  return ok({
    ssid,
    password: fields.get('P') ?? '',
    security,
    hidden: (fields.get('H') ?? '').toLowerCase() === 'true',
  });
}

// ---------- Contact card (vCard 3.0) ----------

export interface Contact {
  name: string;
  phone: string;
  email: string;
  organisation: string;
  title: string;
  url: string;
}

export type ContactError =
  'name-empty' | 'phone-invalid' | 'email-invalid' | 'url-invalid' | 'nothing-else';

const escapeVcard = (s: string): string =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

/**
 * A vCard 3.0 contact. Only the fields that were filled in are written. Phone numbers keep digits,
 * spaces, hyphens, brackets and a leading +. Long lines are not folded: QR readers accept that.
 */
export function vcardPayload(c: Contact): Result<string, ContactError> {
  const name = c.name.trim();
  if (!name) return fail('name-empty');
  const phone = toEnglishDigits(c.phone).trim();
  if (phone && !/^\+?[\d\s\-()]{5,20}$/.test(phone)) return fail('phone-invalid');
  const email = c.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('email-invalid');
  const url = c.url.trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) return fail('url-invalid');
  const org = c.organisation.trim();
  const title = c.title.trim();
  if (!phone && !email && !url && !org && !title) return fail('nothing-else');

  // N is "family;given": use the last word as the family name when there is more than one.
  const words = name.split(/\s+/);
  const family = words.length > 1 ? words.pop()! : '';
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVcard(family)};${escapeVcard(words.join(' '))};;;`,
    `FN:${escapeVcard(name)}`,
    ...(org ? [`ORG:${escapeVcard(org)}`] : []),
    ...(title ? [`TITLE:${escapeVcard(title)}`] : []),
    ...(phone ? [`TEL:${phone}`] : []),
    ...(email ? [`EMAIL:${escapeVcard(email)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    'END:VCARD',
  ];
  return ok(lines.join('\n'));
}

// ---------- What a scanned code contains ----------

export type PayloadKind = 'url' | 'wifi' | 'contact' | 'email' | 'phone' | 'sms' | 'geo' | 'text';

export function classifyPayload(text: string): PayloadKind {
  const t = text.trim();
  if (/^https?:\/\/\S+$/i.test(t)) return 'url';
  if (/^WIFI:/i.test(t)) return 'wifi';
  if (/^BEGIN:VCARD/i.test(t)) return 'contact';
  if (/^mailto:/i.test(t)) return 'email';
  if (/^tel:/i.test(t)) return 'phone';
  if (/^smsto?:/i.test(t)) return 'sms';
  if (/^geo:/i.test(t)) return 'geo';
  return 'text';
}
