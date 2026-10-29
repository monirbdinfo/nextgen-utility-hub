import {
  byteCapacity,
  ECC_LEVELS,
  encodeQr,
  QUIET_ZONE,
  toSvgPath,
  totalModules,
  type EccLevel,
  type QrSymbol,
} from '../../calc/qr';
import { vcardPayload, wifiPayload, type WifiSecurity } from '../../calc/qrPayload';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { icon } from '../icons';
import { toolForm, type Outcome } from './toolForm';
import type { ToolView } from './kit';

const S = defineStrings({
  en: {
    type: 'What to put in the code',
    type_text: 'Text or link',
    type_wifi: 'Wi-Fi network',
    type_contact: 'Contact card',
    text: 'Text or link',
    textHint: 'A web address, a phone number (tel:+880…), an email (mailto:…) or any text.',
    ssid: 'Network name (SSID)',
    security: 'Security',
    sec_WPA: 'WPA / WPA2 / WPA3',
    sec_WEP: 'WEP (old)',
    sec_nopass: 'No password',
    password: 'Password',
    hidden: 'This is a hidden network',
    cName: 'Full name',
    cPhone: 'Phone (optional)',
    cEmail: 'Email (optional)',
    cOrg: 'Organisation (optional)',
    cTitle: 'Job title (optional)',
    cUrl: 'Website (optional)',
    ecc: 'Error correction',
    ecc_L: 'Low (about 7% can be damaged)',
    ecc_M: 'Medium (about 15%)',
    ecc_Q: 'Quartile (about 25%)',
    ecc_H: 'High (about 30%)',
    eccHint: 'Higher levels survive more damage but make the code denser.',
    submit: 'Create QR code',
    rType: 'Type',
    rSize: 'Size',
    rSizeValue: 'Version {v}, {n} × {n} squares',
    rData: 'Data',
    rDataValue: '{bytes} bytes (this level holds up to {max})',
    previewLabel: 'QR code',
    downloadPng: 'Download PNG',
    downloadSvg: 'Download SVG',
    downloaded: 'Download started.',
    pngFailed: 'This browser could not make a PNG. Try the SVG instead.',
    scanNote: 'Scan it with your phone camera to check it before you share it.',
    e_empty: 'Enter the text to put in the code.',
    'e_too-long':
      'That is too long for a QR code (at most about 2,900 characters at the lowest correction level). Shorten it or lower the error correction.',
    'e_ssid-empty': 'Enter the network name.',
    'e_ssid-too-long': 'A Wi-Fi network name can be at most 32 bytes (a Bangla letter uses 3).',
    'e_password-empty': 'Enter the password, or choose “No password”.',
    'e_password-length':
      'WPA passwords are 8 to 63 characters. WEP passwords are 5 or 13 characters, or 10 or 26 hex digits.',
    'e_name-empty': 'Enter a name.',
    'e_phone-invalid':
      'Enter a phone number with digits, spaces, hyphens or brackets, for example +880 1700-000000.',
    'e_email-invalid': 'Enter a valid email address.',
    'e_url-invalid': 'Enter a website address starting with http:// or https://.',
    'e_nothing-else': 'Add at least a phone number, email, organisation, job title or website.',
    n1: 'Anyone who scans a QR code can read what is inside it. Do not put secrets in a code you will share, and remember a Wi-Fi code contains the password.',
    n2: 'Made in your browser. The text, password and contact details are not sent or stored anywhere; the code is drawn here.',
    n3: 'The code is black on white with a clear margin, which scanners need. Keep that margin when you print it, and print it at least 2 cm wide.',
    n4: 'Contact cards use the vCard 3.0 format that phones understand. Long lines are not wrapped, which scanners accept.',
  },
  bn: {
    type: 'কোডে কী রাখবেন',
    type_text: 'লেখা বা লিংক',
    type_wifi: 'ওয়াই-ফাই নেটওয়ার্ক',
    type_contact: 'যোগাযোগ কার্ড',
    text: 'লেখা বা লিংক',
    textHint: 'ওয়েব ঠিকানা, ফোন নম্বর (tel:+880…), ইমেইল (mailto:…) বা যেকোনো লেখা।',
    ssid: 'নেটওয়ার্কের নাম (SSID)',
    security: 'নিরাপত্তা',
    sec_WPA: 'WPA / WPA2 / WPA3',
    sec_WEP: 'WEP (পুরোনো)',
    sec_nopass: 'পাসওয়ার্ড নেই',
    password: 'পাসওয়ার্ড',
    hidden: 'এটি লুকানো নেটওয়ার্ক',
    cName: 'পূর্ণ নাম',
    cPhone: 'ফোন (ঐচ্ছিক)',
    cEmail: 'ইমেইল (ঐচ্ছিক)',
    cOrg: 'প্রতিষ্ঠান (ঐচ্ছিক)',
    cTitle: 'পদবি (ঐচ্ছিক)',
    cUrl: 'ওয়েবসাইট (ঐচ্ছিক)',
    ecc: 'ভুল সংশোধন',
    ecc_L: 'কম (প্রায় ৭% নষ্ট হলেও চলে)',
    ecc_M: 'মাঝারি (প্রায় ১৫%)',
    ecc_Q: 'কোয়ার্টাইল (প্রায় ২৫%)',
    ecc_H: 'বেশি (প্রায় ৩০%)',
    eccHint: 'উঁচু স্তর বেশি ক্ষতি সহ্য করে, কিন্তু কোড ঘন হয়।',
    submit: 'QR কোড তৈরি করুন',
    rType: 'ধরন',
    rSize: 'আকার',
    rSizeValue: 'সংস্করণ {v}, {n} × {n} ঘর',
    rData: 'তথ্য',
    rDataValue: '{bytes} বাইট (এই স্তরে সর্বোচ্চ {max} বাইট ধরে)',
    previewLabel: 'QR কোড',
    downloadPng: 'PNG ডাউনলোড',
    downloadSvg: 'SVG ডাউনলোড',
    downloaded: 'ডাউনলোড শুরু হয়েছে।',
    pngFailed: 'এই ব্রাউজার PNG বানাতে পারেনি। SVG ব্যবহার করে দেখুন।',
    scanNote: 'শেয়ার করার আগে ফোনের ক্যামেরায় স্ক্যান করে যাচাই করে নিন।',
    e_empty: 'কোডে রাখার লেখা দিন।',
    'e_too-long':
      'QR কোডের জন্য এটি বেশি লম্বা (সবচেয়ে কম সংশোধন স্তরে প্রায় ২,৯০০ অক্ষর পর্যন্ত)। ছোট করুন বা সংশোধন স্তর কমান।',
    'e_ssid-empty': 'নেটওয়ার্কের নাম দিন।',
    'e_ssid-too-long':
      'ওয়াই-ফাই নেটওয়ার্কের নাম সর্বোচ্চ ৩২ বাইট (একটি বাংলা অক্ষর ৩ বাইট নেয়)।',
    'e_password-empty': 'পাসওয়ার্ড দিন, অথবা “পাসওয়ার্ড নেই” বেছে নিন।',
    'e_password-length':
      'WPA পাসওয়ার্ড ৮ থেকে ৬৩ অক্ষরের। WEP পাসওয়ার্ড ৫ বা ১৩ অক্ষরের, অথবা ১০ বা ২৬টি হেক্স অঙ্কের।',
    'e_name-empty': 'একটি নাম দিন।',
    'e_phone-invalid': 'অঙ্ক, স্পেস, হাইফেন বা ব্র্যাকেটসহ ফোন নম্বর দিন, যেমন +880 1700-000000।',
    'e_email-invalid': 'একটি বৈধ ইমেইল ঠিকানা দিন।',
    'e_url-invalid': 'http:// বা https:// দিয়ে শুরু হওয়া ওয়েব ঠিকানা দিন।',
    'e_nothing-else': 'অন্তত ফোন, ইমেইল, প্রতিষ্ঠান, পদবি বা ওয়েবসাইটের একটি যোগ করুন।',
    n1: 'যে কেউ QR কোড স্ক্যান করে ভেতরের তথ্য পড়তে পারে। শেয়ার করবেন এমন কোডে গোপন কিছু রাখবেন না, আর মনে রাখবেন ওয়াই-ফাই কোডে পাসওয়ার্ড থাকে।',
    n2: 'আপনার ব্রাউজারেই তৈরি হয়। লেখা, পাসওয়ার্ড ও যোগাযোগের তথ্য কোথাও পাঠানো বা সংরক্ষণ করা হয় না; কোডটি এখানেই আঁকা হয়।',
    n3: 'কোডটি সাদা জমিতে কালো এবং চারপাশে ফাঁকা জায়গা সহ, যা স্ক্যানারের দরকার। ছাপানোর সময় সেই ফাঁকা জায়গা রাখুন এবং অন্তত ২ সেমি চওড়া করে ছাপুন।',
    n4: 'যোগাযোগ কার্ড ফোনের বোঝা vCard 3.0 ফরম্যাটে হয়। লম্বা লাইন ভাঙা হয় না, স্ক্যানার তা মেনে নেয়।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Black-on-white SVG of the symbol with its quiet zone. Built with DOM calls, not a string. */
function svgOf(symbol: QrSymbol, label: string): SVGSVGElement {
  const total = totalModules(symbol);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('class', 'qr-svg');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(total));
  bg.setAttribute('height', String(total));
  bg.setAttribute('fill', '#ffffff');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', toSvgPath(symbol));
  path.setAttribute('fill', '#000000');
  svg.append(bg, path);
  return svg;
}

/** A PNG of the symbol, at least 600 px wide, drawn on a canvas. Null if canvas is unavailable. */
function pngOf(symbol: QrSymbol): Promise<Blob | null> {
  const total = totalModules(symbol);
  const scale = Math.max(4, Math.ceil(600 / total));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = total * scale;
  const g = canvas.getContext('2d');
  if (!g) return Promise.resolve(null);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#000000';
  symbol.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) g.fillRect((x + QUIET_ZONE) * scale, (y + QUIET_ZONE) * scale, scale, scale);
    }),
  );
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const qrCodeGenerator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const is = (type: string) => (v: Record<string, string>) => v.type === type;
  const wifiWithPassword = (v: Record<string, string>) =>
    v.type === 'wifi' && v.security !== 'nopass';

  const errorText = (code: string): string => L(`e_${code}` as Key);

  return toolForm(ctx, {
    prefix: 'qr',
    submit: L('submit'),
    errorText,
    notesText: [L('n1'), L('n2'), L('n3'), L('n4')],
    fields: [
      {
        key: 'type',
        kind: 'select',
        label: L('type'),
        options: (['text', 'wifi', 'contact'] as const).map((t) => [t, L(`type_${t}` as Key)]),
      },
      {
        key: 'text',
        kind: 'textarea',
        label: L('text'),
        hint: L('textHint'),
        rows: 4,
        showWhen: is('text'),
      },
      { key: 'ssid', kind: 'text', label: L('ssid'), showWhen: is('wifi') },
      {
        key: 'security',
        kind: 'select',
        label: L('security'),
        options: (['WPA', 'WEP', 'nopass'] as const).map((s) => [s, L(`sec_${s}` as Key)]),
        showWhen: is('wifi'),
      },
      { key: 'password', kind: 'text', label: L('password'), showWhen: wifiWithPassword },
      { key: 'hidden', kind: 'checkbox', label: L('hidden'), showWhen: is('wifi') },
      { key: 'cname', kind: 'text', label: L('cName'), showWhen: is('contact') },
      {
        key: 'cphone',
        kind: 'text',
        label: L('cPhone'),
        inputmode: 'tel',
        showWhen: is('contact'),
      },
      {
        key: 'cemail',
        kind: 'text',
        label: L('cEmail'),
        inputmode: 'email',
        showWhen: is('contact'),
      },
      { key: 'corg', kind: 'text', label: L('cOrg'), showWhen: is('contact') },
      { key: 'ctitle', kind: 'text', label: L('cTitle'), showWhen: is('contact') },
      { key: 'curl', kind: 'text', label: L('cUrl'), inputmode: 'url', showWhen: is('contact') },
      {
        key: 'ecc',
        kind: 'select',
        label: L('ecc'),
        hint: L('eccHint'),
        default: 'M',
        options: ECC_LEVELS.map((e) => [e, L(`ecc_${e}` as Key)]),
      },
    ],
    compute(v): Outcome {
      const type = v.type ?? 'text';
      let payload = '';
      if (type === 'text') {
        if (!(v.text ?? '').trim()) return { field: 'text', error: 'empty' };
        payload = v.text ?? '';
      } else if (type === 'wifi') {
        const r = wifiPayload({
          ssid: v.ssid ?? '',
          password: v.password ?? '',
          security: (v.security ?? 'WPA') as WifiSecurity,
          hidden: v.hidden === '1',
        });
        if (!r.ok)
          return { field: r.error.startsWith('ssid') ? 'ssid' : 'password', error: r.error };
        payload = r.value;
      } else {
        const r = vcardPayload({
          name: v.cname ?? '',
          phone: v.cphone ?? '',
          email: v.cemail ?? '',
          organisation: v.corg ?? '',
          title: v.ctitle ?? '',
          url: v.curl ?? '',
        });
        if (!r.ok) {
          const field = {
            'name-empty': 'cname',
            'phone-invalid': 'cphone',
            'email-invalid': 'cemail',
            'url-invalid': 'curl',
          }[r.error as string];
          return { field: field ?? 'cphone', error: r.error };
        }
        payload = r.value;
      }

      const ecc = (v.ecc ?? 'M') as EccLevel;
      const q = encodeQr(payload, { ecc });
      if (!q.ok)
        return {
          field: type === 'wifi' ? 'ssid' : type === 'contact' ? 'cname' : 'text',
          error: q.error,
        };
      const symbol = q.value;
      const bytes = new TextEncoder().encode(payload).length;

      const status = h('p', { class: 'copy-status', role: 'status' });
      const button = (label: string, run: () => void | Promise<void>) => {
        const b = h('button', { type: 'button', class: 'btn' }, icon('download', 18), label);
        b.addEventListener('click', () => void run());
        return b;
      };
      const preview = h(
        'div',
        { class: 'qr-preview' },
        h('div', { class: 'qr-frame' }, svgOf(symbol, L('previewLabel'))),
        h(
          'div',
          { class: 'form-actions' },
          button(L('downloadPng'), async () => {
            const blob = await pngOf(symbol);
            if (!blob) {
              status.textContent = L('pngFailed');
              return;
            }
            saveBlob(blob, 'qr-code.png');
            status.textContent = L('downloaded');
          }),
          button(L('downloadSvg'), () => {
            const svg = svgOf(symbol, L('previewLabel'));
            svg.setAttribute('xmlns', SVG_NS);
            svg.setAttribute('width', String(totalModules(symbol) * 10));
            svg.setAttribute('height', String(totalModules(symbol) * 10));
            saveBlob(
              new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
              'qr-code.svg',
            );
            status.textContent = L('downloaded');
          }),
        ),
        status,
      );

      return {
        rows: [
          { label: L('rType'), value: L(`type_${type}` as Key) },
          { label: L('rSize'), value: L('rSizeValue', { v: symbol.version, n: symbol.size }) },
          {
            label: L('rData'),
            value: L('rDataValue', { bytes, max: byteCapacity(symbol.version, ecc) }),
          },
        ],
        notes: [L('scanNote')],
        extra: preview,
      };
    },
  });
};
