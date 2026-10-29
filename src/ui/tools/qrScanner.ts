import {
  classifyPayload,
  parseWifi,
  type PayloadKind,
  type WifiNetwork,
} from '../../calc/qrPayload';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  bindMemo,
  checkbox,
  field,
  notes,
  resultPanel,
  type ResultPanel,
  type ToolContext,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    privacy:
      'The camera starts only when you press “Start camera”. Pictures are checked on this device and are never recorded, stored or uploaded.',
    startCamera: 'Start camera',
    stopCamera: 'Stop camera',
    cameraPreview: 'Camera preview',
    scanning: 'Looking for a QR code… hold it steady and fill most of the picture.',
    found: 'QR code found.',
    imageLabel: 'Or choose a picture with a QR code',
    imageHint: 'A photo or screenshot. Make sure the whole code is in view.',
    reading: 'Reading the picture…',
    noCode:
      'No QR code was found. Try a sharper, larger picture with the whole code in view and a clear margin.',
    badImage: 'This file could not be read as a picture.',
    denied:
      'Camera permission was denied. Allow it in your browser settings, or choose a picture instead.',
    noCamera: 'No camera is available here. Choose a picture instead.',
    // QR scanner result
    rKind: 'Type',
    rContent: 'Content',
    kind_url: 'Web link',
    kind_wifi: 'Wi-Fi network',
    kind_contact: 'Contact card',
    kind_email: 'Email address',
    kind_phone: 'Phone number',
    kind_sms: 'Text message',
    kind_geo: 'Map location',
    kind_text: 'Text',
    openLink: 'Open link in a new tab',
    urlWarn:
      'Check the address carefully before opening it. QR codes are sometimes used to send people to fake sites.',
    wifiHint: 'This is a Wi-Fi code. Use the WiFi QR Scanner tool to read the network details.',
    qrN1: 'This tool shows what is inside the code. It never opens anything by itself.',
    qrN2: 'Scanning works in all modern browsers. Very blurry, tiny or damaged codes may not be read.',
    // Wi-Fi scanner
    pasteLabel: 'Or paste the code’s text',
    pasteHint: 'For a code you already read somewhere else. It starts with WIFI:',
    readDetails: 'Read details',
    rSsid: 'Network name (SSID)',
    rSecurity: 'Security',
    sec_WPA: 'WPA / WPA2 / WPA3',
    sec_WEP: 'WEP (old and weak)',
    sec_nopass: 'None (open network)',
    rPassword: 'Password',
    rHidden: 'Hidden network',
    yes: 'Yes',
    no: 'No',
    none: '(none)',
    showPassword: 'Show the password',
    'e_not-wifi': 'This is not a Wi-Fi code. The text should start with WIFI:',
    'e_no-ssid': 'This Wi-Fi code has no network name.',
    e_empty: 'Paste the text of a Wi-Fi code.',
    wifiN1:
      'Your phone can join the network by pointing its camera at the code. This tool only shows the details.',
    wifiN2: 'The password is hidden until you tick the box. Keep it private.',
    wifiN3: 'Everything is read in your browser. Nothing is sent or stored.',
  },
  bn: {
    privacy:
      '“ক্যামেরা চালু করুন” চাপলেই কেবল ক্যামেরা চালু হয়। ছবি এই ডিভাইসেই পরীক্ষা হয়; কখনো রেকর্ড, সংরক্ষণ বা আপলোড করা হয় না।',
    startCamera: 'ক্যামেরা চালু করুন',
    stopCamera: 'ক্যামেরা বন্ধ করুন',
    cameraPreview: 'ক্যামেরার প্রিভিউ',
    scanning: 'QR কোড খোঁজা হচ্ছে… স্থির ধরে রাখুন এবং ছবির বেশিরভাগ জুড়ে রাখুন।',
    found: 'QR কোড পাওয়া গেছে।',
    imageLabel: 'অথবা QR কোডসহ একটি ছবি বেছে নিন',
    imageHint: 'ছবি বা স্ক্রিনশট। পুরো কোডটি যেন ছবিতে থাকে।',
    reading: 'ছবি পড়া হচ্ছে…',
    noCode:
      'কোনো QR কোড পাওয়া যায়নি। আরও স্পষ্ট ও বড় ছবি নিন, যেন পুরো কোড এবং চারপাশের ফাঁকা জায়গা দেখা যায়।',
    badImage: 'এই ফাইলটি ছবি হিসেবে পড়া যায়নি।',
    denied: 'ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংসে অনুমতি দিন, অথবা ছবি বেছে নিন।',
    noCamera: 'এখানে কোনো ক্যামেরা নেই। ছবি বেছে নিন।',
    rKind: 'ধরন',
    rContent: 'বিষয়বস্তু',
    kind_url: 'ওয়েব লিংক',
    kind_wifi: 'ওয়াই-ফাই নেটওয়ার্ক',
    kind_contact: 'যোগাযোগ কার্ড',
    kind_email: 'ইমেইল ঠিকানা',
    kind_phone: 'ফোন নম্বর',
    kind_sms: 'টেক্সট মেসেজ',
    kind_geo: 'মানচিত্রের অবস্থান',
    kind_text: 'লেখা',
    openLink: 'নতুন ট্যাবে লিংক খুলুন',
    urlWarn:
      'খোলার আগে ঠিকানাটি ভালো করে দেখুন। QR কোড কখনো কখনো ভুয়া সাইটে নিয়ে যেতে ব্যবহার হয়।',
    wifiHint: 'এটি ওয়াই-ফাই কোড। নেটওয়ার্কের তথ্য পড়তে WiFi QR Scanner টুল ব্যবহার করুন।',
    qrN1: 'এই টুল কোডের ভেতরে কী আছে তা দেখায়। নিজে থেকে কিছু খোলে না।',
    qrN2: 'সব আধুনিক ব্রাউজারে স্ক্যান চলে। খুব ঝাপসা, ছোট বা ক্ষতিগ্রস্ত কোড পড়া নাও যেতে পারে।',
    pasteLabel: 'অথবা কোডের লেখা পেস্ট করুন',
    pasteHint: 'অন্য কোথাও পড়ে ফেলা কোডের জন্য। এটি WIFI: দিয়ে শুরু হয়।',
    readDetails: 'তথ্য পড়ুন',
    rSsid: 'নেটওয়ার্কের নাম (SSID)',
    rSecurity: 'নিরাপত্তা',
    sec_WPA: 'WPA / WPA2 / WPA3',
    sec_WEP: 'WEP (পুরোনো ও দুর্বল)',
    sec_nopass: 'নেই (খোলা নেটওয়ার্ক)',
    rPassword: 'পাসওয়ার্ড',
    rHidden: 'লুকানো নেটওয়ার্ক',
    yes: 'হ্যাঁ',
    no: 'না',
    none: '(নেই)',
    showPassword: 'পাসওয়ার্ড দেখান',
    'e_not-wifi': 'এটি ওয়াই-ফাই কোড নয়। লেখাটি WIFI: দিয়ে শুরু হওয়া উচিত।',
    'e_no-ssid': 'এই ওয়াই-ফাই কোডে নেটওয়ার্কের নাম নেই।',
    e_empty: 'ওয়াই-ফাই কোডের লেখা পেস্ট করুন।',
    wifiN1:
      'ফোনের ক্যামেরা কোডের দিকে ধরলেই ফোন নেটওয়ার্কে যুক্ত হতে পারে। এই টুল শুধু তথ্য দেখায়।',
    wifiN2: 'বাক্সে টিক না দেওয়া পর্যন্ত পাসওয়ার্ড লুকানো থাকে। এটি গোপন রাখুন।',
    wifiN3: 'সব কিছু আপনার ব্রাউজারেই পড়া হয়। কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

// ---------- Decoding (jsQR is loaded only when something is scanned) ----------

async function decode(image: ImageData): Promise<string | null> {
  const { default: jsQR } = await import('jsqr');
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
  return code ? code.data : null;
}

/** Draw a picture file onto a canvas no larger than `max` pixels and read its pixels. */
async function imageDataOf(file: File, max: number): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const hgt = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = hgt;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('canvas');
    g.drawImage(bitmap, 0, 0, w, hgt);
    const data = g.getImageData(0, 0, w, hgt);
    canvas.width = canvas.height = 0;
    return data;
  } finally {
    bitmap.close();
  }
}

// ---------- The shared scanning controls ----------

function scanControls(
  ctx: ToolContext,
  L: L,
  idPrefix: string,
  onText: (text: string) => void,
): HTMLElement {
  const status = h('p', { class: 'net-status', role: 'status' });
  const error = h('p', { class: 'net-error', role: 'alert', hidden: '' });
  const say = (text: string): void => {
    status.textContent = text;
    error.hidden = true;
    error.textContent = '';
  };
  const fail = (text: string): void => {
    status.textContent = '';
    error.textContent = text;
    error.hidden = false;
  };

  const video = h('video', {
    class: 'qr-video',
    'aria-label': L('cameraPreview'),
    playsinline: '',
    hidden: '',
  });
  video.muted = true;
  const toggle = h(
    'button',
    { type: 'button', class: 'btn btn-primary', id: `${idPrefix}-camera` },
    L('startCamera'),
  );

  let stream: MediaStream | null = null;
  let running = false;
  let busy = false;
  let raf = 0;
  let last = 0;

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    video.hidden = true;
    toggle.textContent = L('startCamera');
  };
  ctx.onCleanup(stop);

  async function start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) return fail(L('noCamera'));
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (e) {
      return fail(L((e as DOMException).name === 'NotAllowedError' ? 'denied' : 'noCamera'));
    }
    video.srcObject = stream;
    video.hidden = false;
    toggle.textContent = L('stopCamera');
    try {
      await video.play();
    } catch {
      /* autoplay can be blocked; the loop below waits for frames */
    }
    running = true;
    say(L('scanning'));
    const canvas = document.createElement('canvas');
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const tick = (time: number): void => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (busy || !g || time - last < 120 || video.readyState < 2 || !video.videoWidth) return;
      last = time;
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      g.drawImage(video, 0, 0, canvas.width, canvas.height);
      busy = true;
      void decode(g.getImageData(0, 0, canvas.width, canvas.height))
        .then((text) => {
          if (text && running) {
            stop();
            say(L('found'));
            onText(text);
          }
        })
        .finally(() => {
          busy = false;
        });
    };
    raf = requestAnimationFrame(tick);
  }

  toggle.addEventListener('click', () => {
    if (running || stream) {
      stop();
      say('');
    } else void start();
  });

  const picker = field(
    L('imageLabel'),
    h('input', { type: 'file', accept: 'image/*', class: 'input', id: `${idPrefix}-image` }),
    { hint: L('imageHint') },
  );
  picker.control.addEventListener('change', async () => {
    const file = (picker.control as HTMLInputElement).files?.[0];
    if (!file) return;
    stop();
    say(L('reading'));
    try {
      let text: string | null = null;
      // A smaller copy reads faster; a larger one rescues small codes in big pictures.
      for (const max of [1600, 3200]) {
        text = await decode(await imageDataOf(file, max));
        if (text) break;
      }
      if (!text) return fail(L('noCode'));
      say(L('found'));
      onText(text);
    } catch {
      fail(L('badImage'));
    }
  });

  return h(
    'div',
    { class: 'qr-scan' },
    h('p', { class: 'net-notice' }, L('privacy')),
    h('div', { class: 'form-actions' }, toggle),
    video,
    picker.el,
    status,
    error,
  );
}

// ---------- QR Scanner ----------

export const qrScanner: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const panel = resultPanel(ctx, L('startCamera'));
  const linkSlot = h('div', { class: 'result-extra' });
  panel.el.querySelector('.result-body')?.after(linkSlot);

  const show = (text: string): void => {
    ctx.session.set('qr-last', text);
    const kind: PayloadKind = classifyPayload(text);
    panel.show(
      [
        { label: L('rKind'), value: L(`kind_${kind}` as Key) },
        { label: L('rContent'), value: text, primary: true, copy: true },
      ],
      kind === 'url' ? [L('urlWarn')] : kind === 'wifi' ? [L('wifiHint')] : [],
    );
    linkSlot.replaceChildren(
      ...(kind === 'url'
        ? [
            h(
              'a',
              { class: 'btn', href: text.trim(), target: '_blank', rel: 'noopener noreferrer' },
              L('openLink'),
            ),
          ]
        : []),
    );
  };

  const last = ctx.session.get('qr-last');
  if (typeof last === 'string') show(last);

  return h(
    'div',
    { class: 'tool-layout' },
    h('div', { class: 'tool-form' }, scanControls(ctx, L, 'qrscan', show)),
    panel.el,
    notes(ctx, [L('qrN1'), L('qrN2')]),
  );
};

// ---------- WiFi QR Scanner ----------

export const wifiQrScanner: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const panel: ResultPanel = resultPanel(ctx, L('readDetails'));

  const showPw = checkbox(L('showPassword'), { id: 'wifiscan-show' });
  bindMemo(showPw.input, ctx.memo, 'show', '0');

  const render = (net: WifiNetwork): void => {
    const reveal = showPw.input.checked;
    panel.show([
      { label: L('rSsid'), value: net.ssid, primary: true, copy: true },
      { label: L('rSecurity'), value: L(`sec_${net.security}` as Key) },
      net.security === 'nopass'
        ? { label: L('rPassword'), value: L('none') }
        : {
            label: L('rPassword'),
            value: reveal
              ? net.password
              : '•'.repeat(Math.min(Math.max(net.password.length, 1), 16)),
            copy: reveal,
            lang: reveal ? ('en' as const) : undefined,
          },
      { label: L('rHidden'), value: L(net.hidden ? 'yes' : 'no') },
    ]);
  };

  const area = h('textarea', {
    id: 'wifiscan-text',
    class: 'input textarea',
    rows: '3',
    spellcheck: 'false',
  });
  bindMemo(area, ctx.memo, 'payload');
  const pasted = field(L('pasteLabel'), area, { hint: L('pasteHint') });
  const readBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, L('readDetails'));

  const apply = (text: string): boolean => {
    const r = parseWifi(text);
    if (!r.ok) {
      pasted.setError(L(`e_${r.error}` as Key));
      panel.clear();
      return false;
    }
    pasted.setError(null);
    ctx.session.set('wifi-last', r.value);
    render(r.value);
    return true;
  };

  const form = h(
    'form',
    { class: 'qr-paste' },
    pasted.el,
    h('div', { class: 'form-actions' }, readBtn),
  );
  form.noValidate = true;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!area.value.trim()) {
      pasted.setError(L('e_empty'));
      area.focus();
      return;
    }
    if (!apply(area.value)) area.focus();
  });

  showPw.input.addEventListener('change', () => {
    const net = ctx.session.get('wifi-last') as WifiNetwork | undefined;
    if (net) render(net);
  });

  const scanned = (text: string): void => {
    area.value = text;
    ctx.memo.payload = text;
    apply(text);
  };

  const prev = ctx.session.get('wifi-last') as WifiNetwork | undefined;
  if (prev) render(prev);

  return h(
    'div',
    { class: 'tool-layout' },
    h('div', { class: 'tool-form' }, scanControls(ctx, L, 'wifiscan', scanned), form, showPw.el),
    panel.el,
    notes(ctx, [L('wifiN1'), L('wifiN2'), L('wifiN3')]),
  );
};
