import { toBanglaDigits } from '../../calc/digits';
import { formatInteger } from '../../calc/format';
import {
  ECC_LEVELS,
  encodeQr,
  toSvgPath,
  totalModules,
  type EccLevel,
  type QrSymbol,
} from '../../calc/qr';
import {
  emailPayload,
  phonePayload,
  smsPayload,
  vcardPayload,
  wifiPayload,
  type WifiSecurity,
} from '../../calc/qrPayload';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { getTool } from '../../registry';
import { toHash } from '../../router/router';
import { icon, type UiIcon } from '../icons';
import {
  bindMemo,
  checkbox,
  copyText,
  field,
  notes,
  select,
  textInput,
  type Field,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    contentTitle: '1. Enter Content',
    typesLabel: 'What to put in the code',
    type_text: 'Text / Link',
    type_wifi: 'Wi-Fi',
    type_contact: 'Contact Card',
    type_email: 'Email',
    type_phone: 'Phone',
    type_sms: 'SMS',
    text: 'Text or Link',
    textPlaceholder: 'Enter a website URL, text, or any information…',
    textHint:
      'You can enter a website address (e.g. https://example.com), a phone number, an email address or any text.',
    clear: 'Clear the text',
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
    emailTo: 'Email address',
    emailSubject: 'Subject (optional)',
    emailBody: 'Message (optional)',
    phoneNumber: 'Phone number',
    phoneHint: 'Bangla or English digits; spaces and hyphens are removed.',
    smsNumber: 'Phone number',
    smsMessage: 'Message (optional)',
    size: 'Size (pixels)',
    size_150: '150 × 150 (Small)',
    size_250: '250 × 250 (Medium)',
    size_400: '400 × 400 (Large)',
    size_600: '600 × 600 (Print)',
    size_1000: '1000 × 1000 (Extra large)',
    ecc: 'Error correction',
    ecc_L: 'Low (≈7%)',
    ecc_M: 'Medium (≈15%)',
    ecc_Q: 'Quartile (≈25%)',
    ecc_H: 'High (≈30%)',
    margin: 'Margin (quiet zone)',
    margin_2: '2 modules (compact)',
    margin_4: '4 modules (Default)',
    margin_6: '6 modules',
    margin_8: '8 modules',
    advanced: 'Advanced options',
    fg: 'Code colour',
    bg: 'Background colour',
    colorsHint:
      'Keep the code dark on a light background. Light-on-dark codes fail in many scanners.',
    submit: 'Create QR code',
    reset: 'Reset',
    copyResult: 'Copy result',
    copyEmpty: 'Create a QR code first.',
    previewTitle: '2. Preview & Download',
    empty: 'Enter your content and select “Create QR code” to see it here.',
    infoTitle: 'QR Code Information',
    rType: 'Type',
    rSize: 'Size',
    rSizeValue: '{n} × {n} pixels',
    rData: 'Data',
    rDataValue: '{c} characters ({b} bytes)',
    rEcc: 'Error correction',
    rEccValue_L: 'Low (L)',
    rEccValue_M: 'Medium (M)',
    rEccValue_Q: 'Quartile (Q)',
    rEccValue_H: 'High (H)',
    rMargin: 'Margin',
    rMarginValue: '{n} modules',
    rVersion: 'Code version',
    rVersionValue: 'Version {v} ({n} × {n} squares)',
    previewLabel: 'QR code',
    downloadPng: 'Download PNG',
    downloadSvg: 'Download SVG',
    copyImage: 'Copy Image',
    downloaded: 'Download started.',
    imageCopied: 'Image copied.',
    imageCopyFailed: 'This browser cannot copy images. Download the PNG instead.',
    pngFailed: 'This browser could not make a PNG. Try the SVG instead.',
    scanNote: 'Scan with your phone camera to check it before you share it.',
    wSmall:
      'At this size each square is under 3 pixels in the PNG. Choose a larger size for reliable scanning.',
    wMargin: 'A margin under 4 modules is below the QR standard; some scanners may not read it.',
    wContrast: 'Low contrast between the colours: some scanners may not read this code.',
    e_empty: 'Enter the text to put in the code.',
    'e_too-long':
      'That is too long for a QR code (at most about 2,900 characters at the lowest correction level). Shorten it or lower the error correction.',
    'e_ssid-empty': 'Enter the network name.',
    'e_ssid-too-long': 'A Wi-Fi network name can be at most 32 bytes (a Bangla letter uses 3).',
    'e_password-empty': 'Enter the password, or choose “No password”.',
    'e_password-length':
      'WPA passwords are 8 to 63 characters. WEP passwords are 5 or 13 characters, or 10 or 26 hex digits.',
    'e_name-empty': 'Enter a name.',
    'e_phone-empty': 'Enter a phone number.',
    'e_phone-invalid':
      'Enter a phone number with digits, spaces, hyphens or brackets, for example +880 1700-000000.',
    'e_email-invalid': 'Enter a valid email address.',
    'e_url-invalid': 'Enter a website address starting with http:// or https://.',
    'e_nothing-else': 'Add at least a phone number, email, organisation, job title or website.',
    'e_colors-inverted': 'The code colour must be darker than the background colour.',
    f1Title: 'Multiple Content Types',
    f1Text: 'Create QR codes for text, links, Wi-Fi, contact cards, email, phone numbers and SMS.',
    f2Title: 'Customizable Design',
    f2Text: 'Adjust size, error correction, margin and colours.',
    f3Title: 'High Quality Output',
    f3Text: 'Download in PNG or SVG format for print or digital use.',
    f4Title: 'Private & Secure',
    f4Text: 'Everything is processed in your browser. No data is uploaded or stored on a server.',
    howTitle: 'How is this calculated?',
    howText:
      'A QR code stores the information you enter by converting it into a pattern of black and white squares. The error correction level adds extra data so the code stays readable if it is slightly damaged or covered. A margin (quiet zone) is added around the code to make scanning easier.',
    usesTitle: 'Common use cases',
    use1: 'Share website links easily',
    use2: 'Wi-Fi network login (name and password)',
    use3: 'Share contact details (vCard)',
    use4: 'Print on business cards, posters and brochures',
    use5: 'Event registration, product information and more',
    examplesTitle: 'Try some examples',
    examplesSub: 'Click an example to fill in the form.',
    exUrl: 'Website URL',
    exWifi: 'Wi-Fi Network',
    exContact: 'Contact Card',
    exEmail: 'Email',
    exUse: 'Use the example: {name}',
    relatedTitle: 'Related Tools',
    relatedSub: 'You may also find these tools useful.',
    notesTitle: 'Privacy and printing',
    n1: 'Anyone who scans a QR code can read what is inside it. Do not put secrets in a code you will share, and remember a Wi-Fi code contains the password.',
    n2: 'Made in your browser. The text, password and contact details are not sent or stored anywhere; the code is drawn here.',
    n3: 'Keep the margin when you print the code, and print it at least 2 cm wide. Dark on light scans best.',
    n4: 'Contact cards use the vCard 3.0 format that phones understand. SMS codes use the SMSTO format and email codes a mailto link.',
  },
  bn: {
    contentTitle: '১. তথ্য দিন',
    typesLabel: 'কোডে কী রাখবেন',
    type_text: 'লেখা / লিংক',
    type_wifi: 'ওয়াই-ফাই',
    type_contact: 'যোগাযোগ কার্ড',
    type_email: 'ইমেইল',
    type_phone: 'ফোন',
    type_sms: 'এসএমএস',
    text: 'লেখা বা লিংক',
    textPlaceholder: 'ওয়েবসাইটের ঠিকানা, লেখা বা যেকোনো তথ্য দিন…',
    textHint:
      'ওয়েবসাইটের ঠিকানা (যেমন https://example.com), ফোন নম্বর, ইমেইল ঠিকানা বা যেকোনো লেখা দিতে পারেন।',
    clear: 'লেখা মুছুন',
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
    emailTo: 'ইমেইল ঠিকানা',
    emailSubject: 'বিষয় (ঐচ্ছিক)',
    emailBody: 'বার্তা (ঐচ্ছিক)',
    phoneNumber: 'ফোন নম্বর',
    phoneHint: 'বাংলা বা ইংরেজি অঙ্ক; স্পেস ও হাইফেন বাদ দেওয়া হয়।',
    smsNumber: 'ফোন নম্বর',
    smsMessage: 'বার্তা (ঐচ্ছিক)',
    size: 'আকার (পিক্সেল)',
    size_150: '১৫০ × ১৫০ (ছোট)',
    size_250: '২৫০ × ২৫০ (মাঝারি)',
    size_400: '৪০০ × ৪০০ (বড়)',
    size_600: '৬০০ × ৬০০ (ছাপার জন্য)',
    size_1000: '১০০০ × ১০০০ (অনেক বড়)',
    ecc: 'ভুল সংশোধন',
    ecc_L: 'কম (≈৭%)',
    ecc_M: 'মাঝারি (≈১৫%)',
    ecc_Q: 'কোয়ার্টাইল (≈২৫%)',
    ecc_H: 'বেশি (≈৩০%)',
    margin: 'চারপাশের ফাঁকা জায়গা',
    margin_2: '২ ঘর (ছোট)',
    margin_4: '৪ ঘর (স্বাভাবিক)',
    margin_6: '৬ ঘর',
    margin_8: '৮ ঘর',
    advanced: 'আরও অপশন',
    fg: 'কোডের রং',
    bg: 'পটভূমির রং',
    colorsHint:
      'হালকা পটভূমিতে গাঢ় কোড রাখুন। গাঢ় পটভূমিতে হালকা কোড অনেক স্ক্যানার পড়তে পারে না।',
    submit: 'QR কোড তৈরি করুন',
    reset: 'রিসেট',
    copyResult: 'ফলাফল কপি করুন',
    copyEmpty: 'আগে একটি QR কোড তৈরি করুন।',
    previewTitle: '২. প্রিভিউ ও ডাউনলোড',
    empty: 'তথ্য দিয়ে “QR কোড তৈরি করুন” চাপলে কোডটি এখানে দেখা যাবে।',
    infoTitle: 'QR কোডের তথ্য',
    rType: 'ধরন',
    rSize: 'আকার',
    rSizeValue: '{n} × {n} পিক্সেল',
    rData: 'তথ্য',
    rDataValue: '{c} অক্ষর ({b} বাইট)',
    rEcc: 'ভুল সংশোধন',
    rEccValue_L: 'কম (L)',
    rEccValue_M: 'মাঝারি (M)',
    rEccValue_Q: 'কোয়ার্টাইল (Q)',
    rEccValue_H: 'বেশি (H)',
    rMargin: 'ফাঁকা জায়গা',
    rMarginValue: '{n} ঘর',
    rVersion: 'কোডের সংস্করণ',
    rVersionValue: 'সংস্করণ {v} ({n} × {n} ঘর)',
    previewLabel: 'QR কোড',
    downloadPng: 'PNG ডাউনলোড',
    downloadSvg: 'SVG ডাউনলোড',
    copyImage: 'ছবি কপি করুন',
    downloaded: 'ডাউনলোড শুরু হয়েছে।',
    imageCopied: 'ছবি কপি হয়েছে।',
    imageCopyFailed: 'এই ব্রাউজার ছবি কপি করতে পারে না। PNG ডাউনলোড করুন।',
    pngFailed: 'এই ব্রাউজার PNG বানাতে পারেনি। SVG ব্যবহার করে দেখুন।',
    scanNote: 'শেয়ার করার আগে ফোনের ক্যামেরায় স্ক্যান করে যাচাই করে নিন।',
    wSmall: 'এই আকারে PNG-এর প্রতিটি ঘর ৩ পিক্সেলের কম। ভালোভাবে স্ক্যানের জন্য বড় আকার বেছে নিন।',
    wMargin: '৪ ঘরের কম ফাঁকা জায়গা QR মানের চেয়ে কম; কিছু স্ক্যানার পড়তে না-ও পারে।',
    wContrast: 'রং দুটির পার্থক্য কম: কিছু স্ক্যানার এই কোড পড়তে না-ও পারে।',
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
    'e_phone-empty': 'একটি ফোন নম্বর দিন।',
    'e_phone-invalid': 'অঙ্ক, স্পেস, হাইফেন বা ব্র্যাকেটসহ ফোন নম্বর দিন, যেমন +880 1700-000000।',
    'e_email-invalid': 'একটি বৈধ ইমেইল ঠিকানা দিন।',
    'e_url-invalid': 'http:// বা https:// দিয়ে শুরু হওয়া ওয়েব ঠিকানা দিন।',
    'e_nothing-else': 'অন্তত ফোন, ইমেইল, প্রতিষ্ঠান, পদবি বা ওয়েবসাইটের একটি যোগ করুন।',
    'e_colors-inverted': 'কোডের রং পটভূমির রঙের চেয়ে গাঢ় হতে হবে।',
    f1Title: 'নানা ধরনের তথ্য',
    f1Text: 'লেখা, লিংক, ওয়াই-ফাই, যোগাযোগ কার্ড, ইমেইল, ফোন ও এসএমএসের QR কোড তৈরি করুন।',
    f2Title: 'নিজের মতো সাজান',
    f2Text: 'আকার, ভুল সংশোধন, ফাঁকা জায়গা ও রং বদলান।',
    f3Title: 'উচ্চ মানের ফাইল',
    f3Text: 'ছাপা বা ডিজিটাল ব্যবহারের জন্য PNG বা SVG ডাউনলোড করুন।',
    f4Title: 'গোপনীয় ও নিরাপদ',
    f4Text: 'সবকিছু আপনার ব্রাউজারেই হয়। কোনো তথ্য সার্ভারে আপলোড বা সংরক্ষণ হয় না।',
    howTitle: 'কীভাবে তৈরি হয়?',
    howText:
      'আপনার দেওয়া তথ্য সাদা-কালো ঘরের একটি বিশেষ নকশায় রূপান্তর করে QR কোডে রাখা হয়। ভুল সংশোধন স্তর বাড়তি তথ্য যোগ করে, যাতে কোডটি একটু নষ্ট বা ঢাকা পড়লেও পড়া যায়। সহজে স্ক্যানের জন্য কোডের চারপাশে ফাঁকা জায়গা রাখা হয়।',
    usesTitle: 'সাধারণ ব্যবহার',
    use1: 'সহজে ওয়েবসাইটের লিংক শেয়ার',
    use2: 'ওয়াই-ফাই নেটওয়ার্কে যুক্ত হওয়া (নাম ও পাসওয়ার্ড)',
    use3: 'যোগাযোগের তথ্য শেয়ার (vCard)',
    use4: 'বিজনেস কার্ড, পোস্টার ও ব্রোশিওরে ছাপা',
    use5: 'ইভেন্ট নিবন্ধন, পণ্যের তথ্য ও আরও অনেক কিছু',
    examplesTitle: 'কিছু উদাহরণ দেখুন',
    examplesSub: 'উদাহরণে ক্লিক করলে ফর্মটি পূরণ হবে।',
    exUrl: 'ওয়েবসাইট লিংক',
    exWifi: 'ওয়াই-ফাই নেটওয়ার্ক',
    exContact: 'যোগাযোগ কার্ড',
    exEmail: 'ইমেইল',
    exUse: 'উদাহরণ ব্যবহার করুন: {name}',
    relatedTitle: 'সম্পর্কিত টুল',
    relatedSub: 'এই টুলগুলোও কাজে লাগতে পারে।',
    notesTitle: 'গোপনীয়তা ও ছাপা',
    n1: 'যে কেউ QR কোড স্ক্যান করে ভেতরের তথ্য পড়তে পারে। শেয়ার করবেন এমন কোডে গোপন কিছু রাখবেন না, আর মনে রাখবেন ওয়াই-ফাই কোডে পাসওয়ার্ড থাকে।',
    n2: 'আপনার ব্রাউজারেই তৈরি হয়। লেখা, পাসওয়ার্ড ও যোগাযোগের তথ্য কোথাও পাঠানো বা সংরক্ষণ করা হয় না; কোডটি এখানেই আঁকা হয়।',
    n3: 'ছাপানোর সময় চারপাশের ফাঁকা জায়গা রাখুন এবং অন্তত ২ সেমি চওড়া করে ছাপুন। হালকা পটভূমিতে গাঢ় কোড সবচেয়ে ভালো পড়া যায়।',
    n4: 'যোগাযোগ কার্ড ফোনের বোঝা vCard 3.0 ফরম্যাটে হয়। এসএমএস কোড SMSTO ফরম্যাটে এবং ইমেইল কোড mailto লিংকে হয়।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const TYPES = ['text', 'wifi', 'contact', 'email', 'phone', 'sms'] as const;
type QrType = (typeof TYPES)[number];
const TYPE_ICON: Record<QrType, UiIcon> = {
  text: 'link',
  wifi: 'wifi',
  contact: 'user',
  email: 'mail',
  phone: 'phone',
  sms: 'chat',
};
const SIZES = ['150', '250', '400', '600', '1000'] as const;
const MARGINS = ['2', '4', '6', '8'] as const;
const RELATED = ['qr-scanner', 'wifi-qr-scanner'] as const;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Relative luminance of a #rrggbb colour (WCAG). */
function luminance(hex: string): number {
  const n = /^#([0-9a-f]{6})$/i.exec(hex)?.[1] ?? '000000';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

interface Look {
  size: number;
  margin: number;
  fg: string;
  bg: string;
}

/** SVG of the symbol with its margin. Built with DOM calls, not a string. */
function svgOf(symbol: QrSymbol, look: Look, label: string): SVGSVGElement {
  const total = totalModules(symbol, look.margin);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('class', 'qr-svg');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(total));
  bg.setAttribute('height', String(total));
  bg.setAttribute('fill', look.bg);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', toSvgPath(symbol, look.margin));
  path.setAttribute('fill', look.fg);
  svg.append(bg, path);
  return svg;
}

/**
 * A PNG of exactly `size` × `size` pixels. Module edges are rounded to whole pixels, so every
 * square is sharp (neighbouring squares may differ by one pixel). Null if canvas is unavailable.
 */
function pngOf(symbol: QrSymbol, look: Look): Promise<Blob | null> {
  const total = totalModules(symbol, look.margin);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = look.size;
  const g = canvas.getContext('2d');
  if (!g) return Promise.resolve(null);
  const at = (i: number): number => Math.round((i * look.size) / total);
  g.fillStyle = look.bg;
  g.fillRect(0, 0, look.size, look.size);
  g.fillStyle = look.fg;
  symbol.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      const [cx, cy] = [x + look.margin, y + look.margin];
      g.fillRect(at(cx), at(cy), at(cx + 1) - at(cx), at(cy + 1) - at(cy));
    }),
  );
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });
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
  const num = (n: number): string => formatInteger(n, ctx.lang);
  const plain = (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n));
  const memo = ctx.memo;

  // ---------- Content fields ----------
  const fields = new Map<
    string,
    Field<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  >();
  const add = <C extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    key: string,
    f: Field<C>,
  ): Field<C> => {
    bindMemo(f.control, memo, key, f.control instanceof HTMLSelectElement ? f.control.value : '');
    fields.set(key, f as unknown as Field<HTMLInputElement>);
    return f;
  };
  const text = (key: string, label: string, attrs: Record<string, string> = {}, hint?: string) =>
    add(key, field(label, textInput({ id: `qr-${key}`, ...attrs }), hint ? { hint } : {}));
  const area = (key: string, label: string, rows: number, attrs: Record<string, string> = {}) =>
    add(
      key,
      field(
        label,
        h('textarea', { id: `qr-${key}`, class: 'input', rows: String(rows), ...attrs }),
      ),
    );

  const textField = add(
    'text',
    field(
      L('text'),
      h('textarea', {
        id: 'qr-text',
        class: 'input qg-textarea',
        rows: '3',
        placeholder: L('textPlaceholder'),
      }),
      { hint: L('textHint') },
    ),
  );
  const clearBtn = h(
    'button',
    { type: 'button', class: 'qg-clear', 'aria-label': L('clear'), title: L('clear') },
    icon('close', 18),
  );
  {
    const wrap = h('div', { class: 'qg-textwrap' });
    textField.control.replaceWith(wrap);
    wrap.append(textField.control, clearBtn);
  }
  clearBtn.addEventListener('click', () => {
    textField.control.value = '';
    memo.text = '';
    textField.setError(null);
    textField.control.focus();
  });

  const ssid = text('ssid', L('ssid'));
  const security = add(
    'security',
    field(
      L('security'),
      select(
        (['WPA', 'WEP', 'nopass'] as const).map((s) => [s, L(`sec_${s}` as Key)]),
        { id: 'qr-security' },
      ),
    ),
  );
  const password = text('password', L('password'), { autocomplete: 'off' });
  const hiddenBox = checkbox(L('hidden'), { id: 'qr-hidden' });
  bindMemo(hiddenBox.input, memo, 'hidden');

  const cname = text('cname', L('cName'), { autocomplete: 'name' });
  const cphone = text('cphone', L('cPhone'), { inputmode: 'tel' });
  const cemail = text('cemail', L('cEmail'), { inputmode: 'email' });
  const corg = text('corg', L('cOrg'));
  const ctitle = text('ctitle', L('cTitle'));
  const curl = text('curl', L('cUrl'), { inputmode: 'url' });

  const emailTo = text('emailto', L('emailTo'), { inputmode: 'email', autocomplete: 'email' });
  const emailSubject = text('emailsubject', L('emailSubject'));
  const emailBody = area('emailbody', L('emailBody'), 3);

  const phone = text('phone', L('phoneNumber'), { inputmode: 'tel' }, L('phoneHint'));
  const smsNumber = text('smsnumber', L('smsNumber'), { inputmode: 'tel' });
  const smsMessage = area('smsmessage', L('smsMessage'), 3);

  const grid = (...els: HTMLElement[]): HTMLElement => h('div', { class: 'qg-fields' }, ...els);
  const panelContent: Record<QrType, HTMLElement[]> = {
    text: [textField.el],
    wifi: [grid(ssid.el, security.el), grid(password.el), hiddenBox.el],
    contact: [grid(cname.el, cphone.el), grid(cemail.el, corg.el), grid(ctitle.el, curl.el)],
    email: [emailTo.el, emailSubject.el, emailBody.el],
    phone: [phone.el],
    sms: [smsNumber.el, smsMessage.el],
  };
  const syncPassword = (): void => {
    password.el.hidden = security.control.value === 'nopass';
  };
  security.control.addEventListener('change', syncPassword);
  syncPassword();

  // ---------- Tabs ----------
  let type: QrType = (TYPES as readonly string[]).includes(memo.type ?? '')
    ? (memo.type as QrType)
    : 'text';
  const tabs = new Map<QrType, HTMLButtonElement>();
  const panels = new Map<QrType, HTMLElement>();
  for (const t of TYPES) {
    const b = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `qr-tab-${t}`,
        class: 'qg-tab',
        'aria-controls': `qr-panel-${t}`,
      },
      icon(TYPE_ICON[t], 18),
      L(`type_${t}` as Key),
    );
    b.addEventListener('click', () => selectType(t, true));
    b.addEventListener('keydown', (e) => {
      const i = TYPES.indexOf(t);
      const next =
        e.key === 'ArrowRight'
          ? TYPES[(i + 1) % TYPES.length]
          : e.key === 'ArrowLeft'
            ? TYPES[(i + TYPES.length - 1) % TYPES.length]
            : e.key === 'Home'
              ? TYPES[0]
              : e.key === 'End'
                ? TYPES[TYPES.length - 1]
                : undefined;
      if (!next) return;
      e.preventDefault();
      selectType(next, true);
      tabs.get(next)?.focus();
    });
    tabs.set(t, b);
    panels.set(
      t,
      h(
        'div',
        { role: 'tabpanel', id: `qr-panel-${t}`, class: 'qg-panel', 'aria-labelledby': b.id },
        ...panelContent[t],
      ),
    );
  }
  function selectType(t: QrType, remember = false): void {
    type = t;
    if (remember) memo.type = t;
    for (const [k, b] of tabs) {
      const on = k === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      panels.get(k)!.hidden = !on;
    }
  }
  selectType(type);

  // ---------- Look options ----------
  const optSelect = (key: string, label: string, options: Array<[string, string]>, def: string) => {
    const f = field(label, select(options, { id: `qr-${key}` }));
    bindMemo(f.control, memo, key, def);
    return f;
  };
  const sizeF = optSelect(
    'size',
    L('size'),
    SIZES.map((s) => [s, L(`size_${s}` as Key)]),
    '250',
  );
  const eccF = optSelect(
    'ecc',
    L('ecc'),
    ECC_LEVELS.map((e) => [e, L(`ecc_${e}` as Key)]),
    'M',
  );
  const marginF = optSelect(
    'margin',
    L('margin'),
    MARGINS.map((m) => [m, L(`margin_${m}` as Key)]),
    '4',
  );
  const colorInput = (key: 'fg' | 'bg', def: string): Field<HTMLInputElement> => {
    const f = field(
      L(key),
      h('input', { type: 'color', id: `qr-${key}`, class: 'qg-color', value: def }),
    );
    bindMemo(f.control, memo, key, def);
    return f;
  };
  const fgF = colorInput('fg', '#000000');
  const bgF = colorInput('bg', '#ffffff');
  const advanced = h(
    'details',
    { class: 'qg-advanced' },
    h('summary', {}, icon('gear', 18), L('advanced')),
    h(
      'div',
      { class: 'qg-advanced-body' },
      h('div', { class: 'qg-fields' }, fgF.el, bgF.el),
      h('p', { class: 'field-hint' }, L('colorsHint')),
    ),
  );
  if (memo.fg && memo.fg !== '#000000') advanced.open = true;
  if (memo.bg && memo.bg !== '#ffffff') advanced.open = true;

  const warnings = h('ul', { class: 'image-warnings qg-warnings', role: 'list' });
  const formStatus = h('p', { class: 'copy-status qg-form-status', role: 'status' });

  const submitBtn = h(
    'button',
    { type: 'submit', class: 'btn btn-primary qg-submit' },
    icon('qr', 20),
    L('submit'),
    icon('arrow-right', 18),
  );
  const resetBtn = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), L('reset'));
  const copyBtn = h('button', { type: 'button', class: 'btn' }, icon('copy', 18), L('copyResult'));

  const form = h(
    'form',
    { class: 'tool-form qg-card qg-form', 'aria-labelledby': 'qr-form-title' },
    h(
      'div',
      { class: 'qg-card-head' },
      h('span', { class: 'qg-head-icon', 'aria-hidden': 'true' }, icon('gear', 22)),
      h('h2', { id: 'qr-form-title', class: 'qg-card-title' }, L('contentTitle')),
    ),
    h(
      'div',
      { class: 'qg-tabs', role: 'tablist', 'aria-label': L('typesLabel') },
      ...tabs.values(),
    ),
    ...panels.values(),
    h('div', { class: 'qg-options' }, sizeF.el, eccF.el, marginF.el),
    advanced,
    warnings,
    h('div', { class: 'form-actions qg-actions' }, submitBtn, resetBtn, copyBtn),
    formStatus,
  );
  form.noValidate = true;

  // ---------- Result card ----------
  const resultBody = h('div', { class: 'qg-result-body', 'aria-live': 'polite' });
  const result = h(
    'section',
    { class: 'qg-card qg-result', 'aria-labelledby': 'qr-result-title' },
    h(
      'div',
      { class: 'qg-result-head' },
      h('span', { class: 'qg-check', 'aria-hidden': 'true' }, icon('check', 20)),
      h('h2', { id: 'qr-result-title', class: 'qg-card-title' }, L('previewTitle')),
    ),
    resultBody,
  );
  let summary = '';
  const showEmpty = (): void => {
    summary = '';
    resultBody.replaceChildren(
      h(
        'div',
        { class: 'qg-empty' },
        h('span', { class: 'qg-empty-icon', 'aria-hidden': 'true' }, icon('qr', 40)),
        h('p', { class: 'result-empty' }, L('empty')),
      ),
    );
  };

  // ---------- Generate ----------
  const look = (): Look => ({
    size: Number(sizeF.control.value) || 250,
    margin: Number(marginF.control.value) || 4,
    fg: fgF.control.value || '#000000',
    bg: bgF.control.value || '#ffffff',
  });

  function payload(): { ok: true; value: string } | { ok: false; field: string; error: string } {
    const v = (k: string): string => fields.get(k)?.control.value ?? '';
    const bad = (field: string, error: string) => ({ ok: false as const, field, error });
    if (type === 'text') {
      return v('text').trim() ? { ok: true, value: v('text') } : bad('text', 'empty');
    }
    if (type === 'wifi') {
      const r = wifiPayload({
        ssid: v('ssid'),
        password: v('password'),
        security: v('security') as WifiSecurity,
        hidden: hiddenBox.input.checked,
      });
      return r.ok ? r : bad(r.error.startsWith('ssid') ? 'ssid' : 'password', r.error);
    }
    if (type === 'contact') {
      const r = vcardPayload({
        name: v('cname'),
        phone: v('cphone'),
        email: v('cemail'),
        organisation: v('corg'),
        title: v('ctitle'),
        url: v('curl'),
      });
      if (r.ok) return r;
      const map: Record<string, string> = {
        'name-empty': 'cname',
        'phone-invalid': 'cphone',
        'email-invalid': 'cemail',
        'url-invalid': 'curl',
      };
      return bad(map[r.error] ?? 'cphone', r.error);
    }
    if (type === 'email') {
      const r = emailPayload({
        to: v('emailto'),
        subject: v('emailsubject'),
        body: v('emailbody'),
      });
      return r.ok ? r : bad('emailto', r.error);
    }
    if (type === 'phone') {
      const r = phonePayload(v('phone'));
      return r.ok ? r : bad('phone', r.error);
    }
    const r = smsPayload({ number: v('smsnumber'), message: v('smsmessage') });
    return r.ok ? r : bad('smsnumber', r.error);
  }

  const contentField: Record<QrType, string> = {
    text: 'text',
    wifi: 'ssid',
    contact: 'cname',
    email: 'emailto',
    phone: 'phone',
    sms: 'smsnumber',
  };

  /** Validate, encode and show. Returns false (with the error shown) when it cannot. */
  function generate(focus: boolean): boolean {
    for (const f of [...fields.values(), fgF]) f.setError(null);
    formStatus.textContent = '';
    const p = payload();
    if (!p.ok) {
      const f = fields.get(p.field);
      f?.setError(L(`e_${p.error}` as Key));
      if (focus) f?.control.focus();
      return false;
    }
    const lk = look();
    if (luminance(lk.fg) >= luminance(lk.bg)) {
      advanced.open = true;
      fgF.setError(L('e_colors-inverted'));
      if (focus) fgF.control.focus();
      return false;
    }
    const ecc = (eccF.control.value || 'M') as EccLevel;
    const q = encodeQr(p.value, { ecc });
    if (!q.ok) {
      const f = fields.get(contentField[type]);
      f?.setError(L(`e_${q.error}` as Key));
      if (focus) f?.control.focus();
      return false;
    }
    show(q.value, p.value, ecc, lk);
    return true;
  }

  function show(symbol: QrSymbol, data: string, ecc: EccLevel, lk: Look): void {
    const bytes = new TextEncoder().encode(data).length;
    const total = totalModules(symbol, lk.margin);
    const notes: string[] = [];
    if (lk.size / total < 3) notes.push(L('wSmall'));
    if (lk.margin < 4) notes.push(L('wMargin'));
    const [l1, l2] = [luminance(lk.fg), luminance(lk.bg)];
    if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) < 4) notes.push(L('wContrast'));
    warnings.replaceChildren(...notes.map((n) => h('li', {}, icon('alert', 16), n)));

    const rows: Array<[UiIcon, string, string]> = [
      [TYPE_ICON[type], L('rType'), L(`type_${type}` as Key)],
      ['image', L('rSize'), L('rSizeValue', { n: num(lk.size) })],
      ['doc', L('rData'), L('rDataValue', { c: num([...data].length), b: num(bytes) })],
      ['shield', L('rEcc'), L(`rEccValue_${ecc}` as Key)],
      ['grid', L('rMargin'), L('rMarginValue', { n: plain(lk.margin) })],
      [
        'hash',
        L('rVersion'),
        L('rVersionValue', {
          v: plain(symbol.version),
          n: num(symbol.size),
        }),
      ],
    ];
    summary = rows.map(([, k, v]) => `${k}: ${v}`).join('\n');

    const status = h('p', { class: 'copy-status', role: 'status' });
    const btn = (cls: string, ic: UiIcon, label: string, run: () => void | Promise<void>) => {
      const b = h('button', { type: 'button', class: `btn ${cls}` }, icon(ic, 18), label);
      b.addEventListener('click', () => void run());
      return b;
    };
    const svg = svgOf(symbol, lk, L('previewLabel'));
    svg.style.width = `${Math.min(lk.size, 240)}px`;
    resultBody.replaceChildren(
      h(
        'div',
        { class: 'qr-preview' },
        h(
          'div',
          { class: 'qg-preview-grid' },
          h('div', { class: 'qr-frame qg-frame' }, svg),
          h(
            'div',
            { class: 'qg-info' },
            h('h3', {}, L('infoTitle')),
            h(
              'dl',
              { class: 'qg-info-list' },
              ...rows.map(([ic, k, v]) =>
                h(
                  'div',
                  { class: 'result-row qg-info-row' },
                  h('span', { class: 'qg-info-icon', 'aria-hidden': 'true' }, icon(ic, 18)),
                  h('dt', {}, k),
                  h('dd', {}, h('span', { class: 'result-value' }, v)),
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { class: 'form-actions qg-downloads' },
          btn('qg-png', 'download', L('downloadPng'), async () => {
            const blob = await pngOf(symbol, lk);
            if (!blob) {
              status.textContent = L('pngFailed');
              return;
            }
            saveBlob(blob, 'qr-code.png');
            status.textContent = L('downloaded');
          }),
          btn('qg-svg', 'download', L('downloadSvg'), () => {
            const out = svgOf(symbol, lk, L('previewLabel'));
            out.setAttribute('xmlns', SVG_NS);
            out.setAttribute('width', String(lk.size));
            out.setAttribute('height', String(lk.size));
            saveBlob(
              new Blob([new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' }),
              'qr-code.svg',
            );
            status.textContent = L('downloaded');
          }),
          btn('qg-copyimg', 'copy', L('copyImage'), async () => {
            const Item = (window as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
            if (!Item || !navigator.clipboard?.write) {
              status.textContent = L('imageCopyFailed');
              return;
            }
            try {
              const blob = await pngOf(symbol, lk);
              if (!blob) throw new Error('png');
              await navigator.clipboard.write([new Item({ 'image/png': blob })]);
              status.textContent = L('imageCopied');
            } catch {
              status.textContent = L('imageCopyFailed');
            }
          }),
        ),
        h('p', { class: 'qg-scan-note' }, icon('devices', 18), h('span', {}, L('scanNote'))),
        status,
      ),
    );
  }

  // ---------- Events ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (generate(true)) memo.made = '1';
    else if (memo.made === '1') {
      // Keep the last good code visible only while its inputs are unchanged.
      showEmpty();
      warnings.replaceChildren();
      delete memo.made;
    }
  });
  // Changing how the code looks redraws an existing code straight away.
  for (const f of [sizeF, eccF, marginF, fgF, bgF])
    f.control.addEventListener(f === fgF || f === bgF ? 'input' : 'change', () => {
      if (memo.made === '1') generate(false);
    });
  resetBtn.addEventListener('click', () => {
    for (const k of Object.keys(memo)) delete memo[k];
    for (const f of fields.values()) {
      f.control.value = f.control instanceof HTMLSelectElement ? 'WPA' : '';
      f.setError(null);
    }
    hiddenBox.input.checked = false;
    sizeF.control.value = '250';
    eccF.control.value = 'M';
    marginF.control.value = '4';
    fgF.control.value = '#000000';
    bgF.control.value = '#ffffff';
    fgF.setError(null);
    advanced.open = false;
    syncPassword();
    selectType('text');
    warnings.replaceChildren();
    formStatus.textContent = '';
    showEmpty();
    textField.control.focus();
  });
  copyBtn.addEventListener('click', async () => {
    if (!summary) {
      formStatus.textContent = L('copyEmpty');
      return;
    }
    const ok = await copyText(summary);
    formStatus.textContent = ctx.t(ok ? 'copied' : 'copyFailed');
  });

  // ---------- Examples ----------
  const EXAMPLES: Array<{
    id: string;
    icon: UiIcon;
    title: Key;
    sub: string;
    type: QrType;
    values: Record<string, string>;
  }> = [
    {
      id: 'url',
      icon: 'globe',
      title: 'exUrl',
      sub: 'https://nextgentechbd.com',
      type: 'text',
      values: { text: 'https://nextgentechbd.com' },
    },
    {
      id: 'wifi',
      icon: 'wifi',
      title: 'exWifi',
      sub: 'Office WiFi',
      type: 'wifi',
      values: { ssid: 'Office WiFi', security: 'WPA', password: 'ChangeThisPassword' },
    },
    {
      id: 'contact',
      icon: 'user',
      title: 'exContact',
      sub: 'Md. Maniruzzaman',
      type: 'contact',
      values: {
        cname: 'Md. Maniruzzaman',
        corg: 'NextGen Tech BD',
        cemail: 'info@nextgentechbd.com',
        curl: 'https://nextgentechbd.com',
      },
    },
    {
      id: 'email',
      icon: 'mail',
      title: 'exEmail',
      sub: 'info@nextgentechbd.com',
      type: 'email',
      values: { emailto: 'info@nextgentechbd.com', emailsubject: 'Hello' },
    },
  ];
  const examples = h(
    'section',
    { class: 'qg-panel-card qg-examples', 'aria-labelledby': 'qr-examples-title' },
    h(
      'div',
      { class: 'qg-panel-head' },
      h('span', { class: 'qg-emoji', 'aria-hidden': 'true' }, '💡'),
      h(
        'div',
        {},
        h('h2', { id: 'qr-examples-title' }, L('examplesTitle'), ' ✨'),
        h('p', {}, L('examplesSub')),
      ),
    ),
    h(
      'ul',
      { class: 'qg-example-list', role: 'list' },
      ...EXAMPLES.map((ex) => {
        const b = h(
          'button',
          {
            type: 'button',
            class: 'qg-example',
            id: `qr-example-${ex.id}`,
            'aria-label': L('exUse', { name: L(ex.title) }),
          },
          h(
            'span',
            { class: `qg-example-icon qg-ex-${ex.id}`, 'aria-hidden': 'true' },
            icon(ex.icon, 20),
          ),
          h(
            'span',
            { class: 'qg-example-text' },
            h('strong', {}, L(ex.title)),
            h('span', {}, ex.sub),
          ),
          icon('arrow-right', 16),
        );
        b.addEventListener('click', () => {
          selectType(ex.type, true);
          for (const [k, v] of Object.entries(ex.values)) {
            const f = fields.get(k);
            if (!f) continue;
            f.control.value = v;
            memo[k] = v;
          }
          syncPassword();
          if (generate(true)) memo.made = '1';
          if (window.matchMedia?.('(max-width: 900px)').matches)
            result.scrollIntoView?.({ block: 'start' });
        });
        return h('li', {}, b);
      }),
    ),
  );

  // ---------- Related tools (only tools that exist) ----------
  const relatedTools = RELATED.map((id) => getTool(id)).filter(
    (t): t is NonNullable<typeof t> => !!t && t.status === 'available',
  );
  const related = relatedTools.length
    ? h(
        'nav',
        { class: 'qg-panel-card qg-related', 'aria-labelledby': 'qr-related-title' },
        h(
          'div',
          { class: 'qg-panel-head' },
          h('span', { class: 'qg-related-head-icon', 'aria-hidden': 'true' }, icon('grid', 22)),
          h(
            'div',
            {},
            h('h2', { id: 'qr-related-title' }, L('relatedTitle')),
            h('p', {}, L('relatedSub')),
          ),
        ),
        h(
          'ul',
          { class: 'qg-related-list', role: 'list' },
          ...relatedTools.map((t) =>
            h(
              'li',
              {},
              h(
                'a',
                { href: toHash({ name: 'tool', id: t.id }), class: 'qg-related-link' },
                h(
                  'span',
                  { class: 'qg-related-icon', 'aria-hidden': 'true' },
                  icon(t.id === 'wifi-qr-scanner' ? 'wifi' : 'qr', 20),
                ),
                h(
                  'span',
                  { class: 'qg-related-text' },
                  h('strong', {}, t.name[ctx.lang]),
                  h('span', {}, t.description[ctx.lang]),
                ),
                icon('arrow-right', 16),
              ),
            ),
          ),
        ),
      )
    : null;

  // ---------- Information sections ----------
  const features = h(
    'ul',
    { class: 'qg-features', role: 'list' },
    ...(
      [
        ['qg-tone-green', 'bolt', 'f1Title', 'f1Text'],
        ['qg-tone-blue', 'palette', 'f2Title', 'f2Text'],
        ['qg-tone-violet', 'shield', 'f3Title', 'f3Text'],
        ['qg-tone-amber', 'lock', 'f4Title', 'f4Text'],
      ] as const
    ).map(([tone, ic, title, body]) =>
      h(
        'li',
        { class: 'qg-feature' },
        h('span', { class: `qg-feature-icon ${tone}`, 'aria-hidden': 'true' }, icon(ic, 24)),
        h('div', {}, h('h3', {}, L(title)), h('p', {}, L(body))),
      ),
    ),
  );
  const how = h(
    'section',
    { class: 'qg-panel-card qg-how', 'aria-labelledby': 'qr-how-title' },
    h('span', { class: 'qg-round-icon qg-round-blue', 'aria-hidden': 'true' }, icon('info', 24)),
    h('div', {}, h('h2', { id: 'qr-how-title' }, L('howTitle')), h('p', {}, L('howText'))),
  );
  const uses = h(
    'section',
    { class: 'qg-panel-card qg-uses', 'aria-labelledby': 'qr-uses-title' },
    h('span', { class: 'qg-round-icon qg-round-green', 'aria-hidden': 'true' }, icon('check', 24)),
    h(
      'div',
      {},
      h('h2', { id: 'qr-uses-title' }, L('usesTitle')),
      h(
        'ul',
        { class: 'qg-bullets' },
        ...(['use1', 'use2', 'use3', 'use4', 'use5'] as const).map((k) => h('li', {}, L(k))),
      ),
    ),
  );

  // Restore after a language switch (memo lives in memory for this tool).
  showEmpty();
  if (memo.made === '1' && !generate(false)) delete memo.made;

  return h(
    'div',
    { class: 'qg-page', 'data-own-related': related ? 'true' : 'false' },
    h('div', { class: 'qg-main' }, form, result),
    features,
    h('div', { class: 'qg-info-row-cards' }, how, uses),
    h('div', { class: 'qg-bottom' }, examples, related),
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
  );
};
