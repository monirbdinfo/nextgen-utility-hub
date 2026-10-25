import { h } from '../../lib/dom';
import type { ToolView } from './kit';

/** Browser-only productivity utilities. No input is persisted or uploaded by these views. */
type ViewFactory = (root: HTMLElement) => void;
const button = (label: string, run: () => void): HTMLButtonElement => {
  const el = h('button', { type: 'button', class: 'button button-primary' }, label);
  el.addEventListener('click', run);
  return el;
};
const input = (label: string, type = 'text'): { el: HTMLElement; control: HTMLInputElement } => {
  const control = h('input', { class: 'input', type, autocomplete: 'off' });
  return { el: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control), control };
};
const area = (label: string, rows = 6): { el: HTMLElement; control: HTMLTextAreaElement } => {
  const control = h('textarea', { class: 'input textarea', rows: String(rows) });
  return { el: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control), control };
};
const result = (): HTMLElement => h('pre', { class: 'result-value', 'aria-live': 'polite', style: 'white-space:pre-wrap;overflow-wrap:anywhere' });
const shell = (title: string, description: string, factory: ViewFactory): HTMLElement => {
  const root = h('section', { class: 'tool-form' }, h('p', { class: 'field-hint' }, description));
  factory(root);
  return h('div', { class: 'tool-content' }, h('h2', { class: 'tool-section-title' }, title), root);
};
const copyButton = (text: () => string, status: HTMLElement): HTMLButtonElement =>
  button('Copy result', () => {
    const value = text();
    void navigator.clipboard?.writeText(value).then(() => { status.textContent = 'Copied.' }).catch(() => { status.textContent = 'Copy failed; select and copy the text manually.' });
  });
const setResult = (el: HTMLElement, text: string): void => { el.textContent = text; };

export const loremIpsum: ToolView = () => shell('Lorem Ipsum Generator', 'Generate placeholder text locally in your browser.', (root) => {
  const count = input('Paragraphs (1–20)', 'number'); count.control.value = '3'; count.control.min = '1'; count.control.max = '20';
  const output = result(); const status = h('p', { class: 'copy-status', role: 'status' });
  const make = (): string => {
    const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    const n = Math.max(1, Math.min(20, Number(count.control.value) || 1));
    return Array.from({ length: n }, (_, p) => Array.from({ length: 45 + (p % 4) * 7 }, (_, i) => words[(i + p * 3) % words.length]).join(' ').replace(/^./, (c) => c.toUpperCase()) + '.').join('\n\n');
  };
  root.append(count.el, button('Generate text', () => setResult(output, make())), output, copyButton(() => output.textContent ?? '', status), status);
  setResult(output, make());
});

export const timeCardCalculator: ToolView = () => shell('Time Card Calculator', 'Calculate shift duration and optional unpaid break. Overnight shifts are supported.', (root) => {
  const start = input('Clock in (HH:MM)', 'time'); const end = input('Clock out (HH:MM)', 'time'); const breakMins = input('Unpaid break (minutes)', 'number'); breakMins.control.value = '0'; breakMins.control.min = '0';
  const out = result();
  root.append(start.el, end.el, breakMins.el, button('Calculate hours', () => {
    const parse = (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
    const a = parse(start.control.value), b = parse(end.control.value), br = Number(breakMins.control.value);
    if (!a || !b || !Number.isFinite(br) || br < 0) { setResult(out, 'Enter valid times and a non-negative break.'); return; }
    const mins = Number(b[1]) * 60 + Number(b[2]) - Number(a[1]) * 60 - Number(a[2]) + (Number(b[1]) * 60 + Number(b[2]) <= Number(a[1]) * 60 + Number(a[2]) ? 1440 : 0) - br;
    if (mins < 0) { setResult(out, 'Break cannot exceed the shift duration.'); return; }
    setResult(out, 'Duration: ' + Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min\nDecimal hours: ' + (mins / 60).toFixed(2));
  }), out);
});

export const creditCardChecker: ToolView = () => shell('Credit Card Number Checker', 'Checks only the number format and Luhn checksum. No payment or bank request is made.', (root) => {
  const card = input('Card number'); card.control.inputMode = 'numeric'; const out = result();
  root.append(card.el, button('Validate number', () => {
    const digits = card.control.value.replace(/[ -]/g, '');
    if (!/^\d{12,19}$/.test(digits)) { setResult(out, 'Enter 12–19 digits.'); return; }
    let sum = 0, double = false;
    for (let i = digits.length - 1; i >= 0; i--) { let n = Number(digits[i]); if (double) { n *= 2; if (n > 9) n -= 9; } sum += n; double = !double; }
    const network = /^4/.test(digits) ? 'Visa (possible)' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits) ? 'Mastercard (possible)' : /^3[47]/.test(digits) ? 'American Express (possible)' : /^6(?:011|5)/.test(digits) ? 'Discover (possible)' : 'Unknown card network';
    setResult(out, (sum % 10 === 0 ? 'Luhn checksum: valid' : 'Luhn checksum: invalid') + '\nNetwork: ' + network + '\nThis does not verify that the card exists or is active.');
  }), out);
});

export const rot13Tool: ToolView = () => shell('ROT13 Encoder / Decoder', 'ROT13 is reversible and is not encryption.', (root) => {
  const source = area('Text to convert'); const out = result();
  const convert = (s: string) => s.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)));
  source.control.addEventListener('input', () => setResult(out, convert(source.control.value)));
  root.append(source.el, button('Convert', () => setResult(out, convert(source.control.value))), out, copyButton(() => out.textContent ?? '', h('p', { class: 'copy-status' })));
});

const MORSE: Record<string, string> = { A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.', '.':'.-.-.-', ',':'--..--', '?':'..--..', '/':'-..-.' };
export const morseTranslator: ToolView = () => shell('Morse Code Translator', 'Supports English letters, digits and common punctuation. Words are separated by /.', (root) => {
  const source = area('Text or Morse code'); const mode = h('select', { class: 'input' }, h('option', { value: 'encode' }, 'Text → Morse'), h('option', { value: 'decode' }, 'Morse → Text')); const out = result();
  const decode = Object.fromEntries(Object.entries(MORSE).map(([k,v]) => [v,k]));
  const run = () => { const val = source.control.value.trim(); if (mode.value === 'encode') setResult(out, val.toUpperCase().split(/\s+/).map(w => [...w].map(c => MORSE[c] ?? (c === ' ' ? '/' : '?')).join(' ')).join(' / ')); else setResult(out, val.split(/\s*\/\s*/).map(w => w.trim().split(/\s+/).map(c => decode[c] ?? '?').join('')).join(' ')); };
  source.control.addEventListener('input', run); mode.addEventListener('change', run); root.append(mode, source.el, button('Translate', run), out);
});

export const smallTextGenerator: ToolView = () => shell('Small Text Generator', 'Maps supported Latin letters to Unicode superscript and small-cap-like characters; unsupported characters stay unchanged.', (root) => {
  const source = area('Text'); const out = result();
  const map: Record<string,string> = { a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ' };
  const run = () => setResult(out, [...source.control.value].map(c => map[c.toLowerCase()] ?? c).join(''));
  source.control.addEventListener('input', run); root.append(source.el, out, copyButton(() => out.textContent ?? '', h('p', { class: 'copy-status' })));
});

export const runicTranslator: ToolView = () => shell('Runic Translator', 'Decorative transliteration only. Runic alphabets do not map exactly to modern English.', (root) => {
  const source = area('Text'); const out = result(); const runes = [...'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᛩᚱᛊᛏᚢᚡᚹᛪᛃᛉ'];
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const run = () => setResult(out, [...source.control.value.toLowerCase()].map(c => { const i = letters.indexOf(c); return i < 0 ? c : runes[i] ?? c; }).join(''));
  source.control.addEventListener('input', run); root.append(source.el, out, copyButton(() => out.textContent ?? '', h('p', { class: 'copy-status' })));
});

export const invisibleCharacter: ToolView = () => shell('Invisible Character Generator', 'Generate whitespace-like Unicode characters for testing. These can confuse readers and accessibility tools; do not use them to impersonate or evade moderation.', (root) => {
  const kind = h('select', { class: 'input' }, h('option', { value: '\u200B' }, 'Zero-width space (U+200B)'), h('option', { value: '\u200C' }, 'Zero-width non-joiner (U+200C)'), h('option', { value: '\u200D' }, 'Zero-width joiner (U+200D)'), h('option', { value: '\u00A0' }, 'Non-breaking space (U+00A0)'));
  const count = input('Character count (1–1000)', 'number'); count.control.value = '1'; const out = result(); const visible = h('p', { class: 'field-hint' });
  const run = () => { const n = Math.max(1, Math.min(1000, Number(count.control.value) || 1)); setResult(out, kind.value.repeat(n)); visible.textContent = 'Generated ' + n + ' character(s). Selected code point: U+' + kind.value.codePointAt(0)!.toString(16).toUpperCase().padStart(4,'0'); };
  kind.addEventListener('change', run); count.control.addEventListener('input', run); root.append(kind, count.el, button('Generate', run), visible, out, copyButton(() => out.textContent ?? '', h('p', { class: 'copy-status' }))); run();
});

export const notepadOnline: ToolView = () => shell('Notepad Online', 'Temporary note editor. Notes stay in this page memory only and are cleared when you leave; download a copy if you need to keep them.', (root) => {
  const note = area('Your note', 12); const status = h('p', { class: 'field-hint' }); const download = button('Download .txt', () => {
    const blob = new Blob([note.control.value], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: 'note.txt' }); a.click(); URL.revokeObjectURL(url); status.textContent = 'Download requested.';
  });
  const clear = button('Clear note', () => { note.control.value = ''; status.textContent = 'Note cleared.'; });
  root.append(note.el, h('p', { class: 'field-hint' }, () => String(note.control.value.length) + ' characters'), download, clear, status);
});

export const qrScanner: ToolView = () => shell('QR Scanner', 'Uses the browser BarcodeDetector API when supported. Camera access is requested only after you press Start camera.', (root) => {
  const video = h('video', { playsinline: '', muted: '', class: 'input', style: 'max-width:100%' }) as HTMLVideoElement; const file = input('Or select an image', 'file'); file.control.accept = 'image/*'; const out = result(); let stream: MediaStream | null = null; let stopped = false;
  const stop = () => { stopped = true; stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; };
  root.append(button('Start camera', async () => {
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: {formats:string[]}) => {detect: (src: HTMLVideoElement|HTMLImageElement|ImageBitmap) => Promise<Array<{rawValue:string}>>} }).BarcodeDetector;
    if (!Detector) { setResult(out, 'This browser does not support built-in QR detection. Try a recent Chromium-based browser or use an image scanner.'); return; }
    try { stop(); stopped = false; stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = stream; await video.play(); const detector = new Detector({ formats: ['qr_code'] }); const scan = async () => { if (stopped) return; try { const found = await detector.detect(video); if (found[0]) { setResult(out, found[0].rawValue); stop(); return; } } catch {} requestAnimationFrame(scan); }; requestAnimationFrame(scan); } catch { setResult(out, 'Camera permission was denied or no camera is available.'); }
  }), video, file.el, button('Read image', async () => {
    const f = file.control.files?.[0]; if (!f) { setResult(out, 'Choose an image first.'); return; }
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: {formats:string[]}) => {detect: (src: ImageBitmap) => Promise<Array<{rawValue:string}>>} }).BarcodeDetector;
    if (!Detector) { setResult(out, 'This browser does not support image QR detection.'); return; }
    try { const bitmap = await createImageBitmap(f); const found = await new Detector({ formats: ['qr_code'] }).detect(bitmap); bitmap.close(); setResult(out, found[0]?.rawValue ?? 'No QR code found in this image.'); } catch { setResult(out, 'Could not read this image.'); }
  }), out);
  // Ensure camera hardware is released when the user leaves this view.
  window.addEventListener('pagehide', stop, { once: true });
});

export const wifiQrScanner: ToolView = () => shell('Wi-Fi QR Scanner', 'Read a Wi-Fi QR payload copied as text or decoded by a compatible QR scanner. Processing stays in your browser.', (root) => {
  const source = area('Wi-Fi QR payload (WIFI:T:WPA;S:network;P:password;;)'); const out = result();
  root.append(source.el, button('Parse Wi-Fi details', () => {
    const raw = source.control.value.trim(); if (!raw.startsWith('WIFI:')) { setResult(out, 'This does not look like a Wi-Fi QR payload.'); return; }
    const fields: Record<string,string> = {}; const body = raw.slice(5).replace(/;;$/, ''); const parts = body.split(/;(?=[A-Z]:)/);
    for (const part of parts) { const m = /^([A-Z]):(.*)$/.exec(part); if (m) fields[m[1]!] = m[2]!.replace(/\\([;,:\\])/g, '$1'); }
    setResult(out, 'SSID: ' + (fields.S || '(hidden/unknown)') + '\nSecurity: ' + (fields.T || 'unknown') + '\nPassword: ' + (fields.P || '(not present)') + '\nHidden: ' + (fields.H === 'true' ? 'yes' : 'no'));
  }), out);
});

export const reverseImageSearch: ToolView = () => shell('Reverse Image Search', 'Choose an image and open a search provider in a new tab. The provider may receive the image or its URL; review its privacy policy before continuing.', (root) => {
  const file = input('Choose image', 'file'); file.control.accept = 'image/*'; const link = h('a', { class: 'button button-primary', target: '_blank', rel: 'noopener noreferrer', href: 'https://lens.google.com/' }, 'Open Google Lens');
  root.append(file.el, link, h('p', { class: 'field-hint' }, 'This tool does not upload the image from this page. Open the provider and choose the image there.'));
});

export const qrCodeGenerator: ToolView = () => shell('QR Code Generator', 'QR generation uses a third-party image service. Do not encode passwords, private data or secrets.', (root) => {
  const source = area('Text, URL or contact details', 4); const out = h('div', { class: 'result-body' }); const link = h('a', { target: '_blank', rel: 'noopener noreferrer', class: 'button button-primary', hidden: '' }, 'Open QR image');
  const run = () => { const value = source.control.value.trim(); out.replaceChildren(); if (!value) { link.hidden = true; return; } const url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(value); const img = h('img', { src: url, alt: 'Generated QR code', width: '300', height: '300', loading: 'lazy' }); out.append(img); link.href = url; link.hidden = false; };
  root.append(source.el, button('Generate QR code', run), out, link, h('p', { class: 'field-hint' }, 'When generated, the encoded text is sent to api.qrserver.com to create the image.'));
});

export const internetSpeedTest: ToolView = () => shell('Internet Speed Test', 'Estimates download speed by fetching a public test file. The server may log your IP address. Results vary with caching and network conditions.', (root) => {
  const out = result(); const status = h('p', { class: 'copy-status', role: 'status' });
  root.append(button('Run download test', async () => { status.textContent = 'Testing…'; setResult(out, ''); const start = performance.now(); try { const response = await fetch('https://speed.cloudflare.com/__down?bytes=10000000', { cache: 'no-store', mode: 'cors' }); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.arrayBuffer(); const seconds = (performance.now() - start) / 1000; const mbps = data.byteLength * 8 / seconds / 1_000_000; setResult(out, 'Downloaded: ' + (data.byteLength / 1_000_000).toFixed(2) + ' MB\nElapsed: ' + seconds.toFixed(2) + ' s\nEstimated download: ' + mbps.toFixed(2) + ' Mbps\nUpload speed is not tested.'); status.textContent = 'Test completed.'; } catch { status.textContent = 'Test failed. Check connectivity, browser privacy settings or try again.'; } }), out, status);
});

export const domainNameSearch: ToolView = () => shell('Domain Name Search', 'This static-first site does not have a registrar API. Open a registrar search with your candidate domain to check current availability and pricing.', (root) => {
  const domain = input('Domain name'); domain.control.placeholder = 'example.com'; const link = h('a', { class: 'button button-primary', target: '_blank', rel: 'noopener noreferrer', href: 'https://www.cloudflare.com/products/registrar/' }, 'Open domain registrar');
  root.append(domain.el, button('Search domain', () => { const value = domain.control.value.trim(); if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) { domain.control.setCustomValidity('Enter a valid domain name.'); domain.control.reportValidity(); return; } domain.control.setCustomValidity(''); link.href = 'https://www.cloudflare.com/products/registrar/'; link.textContent = 'Open registrar search for ' + value; }), link, h('p', { class: 'field-hint' }, 'Availability and pricing are determined by the registrar, not this tool.'));
});

export const usernameChecker: ToolView = () => shell('Name Checker', 'Availability checks need each platform’s current API. Use official search pages; this tool does not claim usernames are available.', (root) => {
  const username = input('Username'); username.control.placeholder = 'yourname';
  root.append(username.el, ...[['Google','https://www.google.com/search?q='],['GitHub','https://github.com/'],['Instagram','https://www.instagram.com/'],['Facebook','https://www.facebook.com/']].map(([name,url]) => { const a = h('a', { class: 'button button-secondary', target: '_blank', rel: 'noopener noreferrer', href: url + encodeURIComponent(username.control.value) }, 'Search ' + name); username.control.addEventListener('input', () => { a.href = url + encodeURIComponent(username.control.value); }); return a; }), h('p', { class: 'field-hint' }, 'Search results are not proof of availability; check the platform directly.'));
});

export const binChecker: ToolView = () => shell('BIN Checker', 'A BIN lookup requires a maintained provider. This tool opens a public search and does not submit card numbers or query a private database.', (root) => {
  const bin = input('First 6–8 digits', 'text'); bin.control.inputMode = 'numeric'; const link = h('a', { class: 'button button-primary', target: '_blank', rel: 'noopener noreferrer', href: 'https://binlist.net/' }, 'Open BIN lookup');
  root.append(bin.el, button('Validate BIN format', () => { const value = bin.control.value.replace(/\s/g,''); if (!/^\d{6,8}$/.test(value)) { setResult(status, 'Enter 6–8 digits.'); return; } link.href = 'https://binlist.net/'; link.textContent = 'Look up BIN ' + value; setResult(status, 'Format looks valid. Issuer details must be confirmed by the lookup provider.'); }), link, status);
  const status = result();
});

export const bimiChecker: ToolView = () => shell('BIMI Checker & Generator', 'BIMI requires DNS and brand-logo configuration. Enter a domain to open a public checker; this page does not modify DNS.', (root) => {
  const domain = input('Domain'); domain.control.placeholder = 'example.com'; const link = h('a', { class: 'button button-primary', target: '_blank', rel: 'noopener noreferrer', href: 'https://bimigroup.org/' }, 'Open BIMI Group');
  root.append(domain.el, button('Prepare domain lookup', () => { const value = domain.control.value.trim().replace(/^https?:\/\//,'').replace(/\/$/,''); if (!/^(?=.{1,253}$)[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) { setResult(status, 'Enter a valid domain.'); return; } setResult(status, 'BIMI DNS record name: default._bimi.' + value + '\nCheck the TXT record with your DNS provider or a trusted BIMI checker.'); }), link, status);
  const status = result();
});

export const imageToText: ToolView = () => shell('Image to Text Converter', 'OCR requires a downloadable language model. To keep this site lightweight and avoid silently uploading images, this tool currently guides you to use your device’s built-in OCR.', (root) => {
  const file = input('Choose image', 'file'); file.control.accept = 'image/*'; const preview = h('img', { alt: 'Selected image preview', hidden: '', style: 'max-width:100%;max-height:320px' });
  file.control.addEventListener('change', () => { const f = file.control.files?.[0]; if (!f) return; if (preview instanceof HTMLImageElement) { preview.src = URL.createObjectURL(f); preview.hidden = false; } });
  root.append(file.el, preview, h('p', { class: 'field-hint' }, 'Use Live Text on supported Apple devices, Google Lens on Android, or a trusted offline OCR app. Text extraction is not performed by this page yet.'));
});
