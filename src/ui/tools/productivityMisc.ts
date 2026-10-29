import { checkCard, groupCard, type CardNetwork } from '../../calc/cardCheck';
import { formatAmount } from '../../calc/format';
import { analyzeText } from '../../calc/textCount';
import { timeCard } from '../../calc/timeCard';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { icon } from '../icons';
import { bindMemo, copyText, notes, type ToolView } from './kit';
import { toolForm, type Outcome } from './toolForm';

const S = defineStrings({
  en: {
    local: 'Everything here runs in your browser. Nothing is sent or stored.',
    // Time card
    tcStart: 'Clock in',
    tcEnd: 'Clock out',
    tcBreak: 'Unpaid break (minutes)',
    tcDays: 'Number of days',
    tcRate: 'Hourly rate (optional)',
    tcRateHint: 'Leave empty to skip pay. Up to 2 decimal places.',
    tcSubmit: 'Calculate hours',
    tcPerDay: 'Paid time per day',
    tcDecimal: 'In decimal hours',
    tcTotal: 'Total for {days} days',
    tcTotalDecimal: 'Total in decimal hours',
    tcPay: 'Total pay',
    tcDuration: '{h} h {m} min',
    tcOvernight:
      'Clock-out is earlier than clock-in, so the shift is counted as ending the next day.',
    'e_start-invalid': 'Enter the clock-in time, for example 09:00.',
    'e_end-invalid': 'Enter the clock-out time, for example 17:30.',
    'e_times-equal':
      'Clock-in and clock-out are the same time. That could mean no time or a full 24 hours, so please change one of them.',
    'e_break-invalid': 'Enter the break as whole minutes, for example 30.',
    'e_break-too-long': 'The break is as long as the whole shift or longer. Shorten the break.',
    'e_days-invalid': 'Enter a whole number of days from 1 to 366.',
    'e_rate-invalid': 'Enter the rate as a number with up to 2 decimal places.',
    tcN1: 'Times use the 24-hour clock. If clock-out is earlier than clock-in, the shift crosses midnight.',
    tcN2: 'Decimal hours are minutes ÷ 60, rounded to 2 places (8 h 30 min = 8.50). Pay uses the exact minutes, then rounds to 2 places.',
    tcN3: 'Equal clock-in and clock-out times are refused, because they cannot tell “no time” from “24 hours”.',
    // Card checker
    ccNumber: 'Card number',
    ccHint: 'Digits only; spaces and hyphens are ignored. Nothing is sent anywhere.',
    ccSubmit: 'Check number',
    ccChecksum: 'Checksum (Luhn)',
    ccValid: 'Valid',
    ccInvalid: 'Not valid',
    ccNumberRow: 'Number',
    ccNetwork: 'Likely network',
    ccUnknown: 'Not recognised',
    ccLength: 'Length',
    ccLengthOk: '{n} digits (this network issues {lengths})',
    ccLengthBad: '{n} digits (this network issues {lengths}, so this length is unusual)',
    ccLengthPlain: '{n} digits',
    e_empty: 'Enter a card number.',
    e_characters: 'Use digits only. Spaces and hyphens are fine.',
    e_length: 'A card number has 12 to 19 digits.',
    ccN1: 'A valid checksum only shows the number is well-formed. It does not show that a card exists, is active or has funds.',
    ccN2: 'The network is guessed from the first digits and can be wrong.',
    ccN3: 'Do not type a real card number on a shared or untrusted device. This tool sends nothing, but anything typed is visible on screen. Test numbers such as 4111 1111 1111 1111 pass the checksum.',
    // Notepad
    npLabel: 'Your note',
    npCounts: '{w} words, {c} characters',
    npCopy: 'Copy',
    npDownload: 'Download .txt',
    npClear: 'Clear note',
    npCopied: 'Copied to clipboard.',
    npCopyFailed: 'Copy failed. Select the text and copy it yourself.',
    npCleared: 'Note cleared.',
    npDownloaded: 'Download started.',
    npEmpty: 'There is nothing to copy or download yet.',
    npNotice:
      'Your note stays only in this page’s memory. It is not saved or sent anywhere, and it is lost when you leave or reload this page. Download it if you want to keep it.',
    npN1: 'Switching language keeps your note while the page stays open.',
    npN2: 'The download is a plain text file named note.txt, saved by your browser.',
  },
  bn: {
    local: 'সব কাজ আপনার ব্রাউজারেই হয়। কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
    tcStart: 'কাজ শুরু',
    tcEnd: 'কাজ শেষ',
    tcBreak: 'বিনা বেতনের বিরতি (মিনিট)',
    tcDays: 'কত দিন',
    tcRate: 'ঘণ্টাপ্রতি হার (ঐচ্ছিক)',
    tcRateHint: 'বেতন হিসাব না চাইলে খালি রাখুন। দশমিকের পর সর্বোচ্চ ২ অঙ্ক।',
    tcSubmit: 'ঘণ্টা হিসাব করুন',
    tcPerDay: 'প্রতিদিনের বেতনযোগ্য সময়',
    tcDecimal: 'দশমিক ঘণ্টায়',
    tcTotal: '{days} দিনে মোট',
    tcTotalDecimal: 'মোট দশমিক ঘণ্টা',
    tcPay: 'মোট বেতন',
    tcDuration: '{h} ঘণ্টা {m} মিনিট',
    tcOvernight: 'কাজ শেষের সময় শুরুর সময়ের আগে, তাই কাজটি পরের দিন শেষ হয়েছে ধরা হয়েছে।',
    'e_start-invalid': 'কাজ শুরুর সময় লিখুন, যেমন 09:00।',
    'e_end-invalid': 'কাজ শেষের সময় লিখুন, যেমন 17:30।',
    'e_times-equal':
      'শুরু ও শেষের সময় একই। এটি শূন্য সময় বা পুরো ২৪ ঘণ্টা দুটোই হতে পারে, তাই একটি বদলান।',
    'e_break-invalid': 'বিরতি পূর্ণ মিনিটে লিখুন, যেমন 30।',
    'e_break-too-long': 'বিরতি পুরো কাজের সমান বা তার বেশি। বিরতি কমান।',
    'e_days-invalid': '১ থেকে ৩৬৬-এর মধ্যে পূর্ণসংখ্যায় দিন লিখুন।',
    'e_rate-invalid': 'হার দশমিকের পর সর্বোচ্চ ২ অঙ্কের একটি সংখ্যা হতে হবে।',
    tcN1: 'সময় ২৪-ঘণ্টার ঘড়িতে। কাজ শেষের সময় শুরুর আগে হলে কাজটি মধ্যরাত পেরিয়েছে ধরা হয়।',
    tcN2: 'দশমিক ঘণ্টা হলো মিনিট ÷ ৬০, ২ ঘর পর্যন্ত (৮ ঘণ্টা ৩০ মিনিট = ৮.৫০)। বেতন সঠিক মিনিটে হিসাব হয়, পরে ২ ঘর পর্যন্ত রাউন্ড হয়।',
    tcN3: 'শুরু ও শেষের সময় সমান হলে নেওয়া হয় না, কারণ তাতে “শূন্য সময়” ও “২৪ ঘণ্টা” আলাদা করা যায় না।',
    ccNumber: 'কার্ড নম্বর',
    ccHint: 'শুধু অঙ্ক; স্পেস ও হাইফেন বাদ যায়। কিছুই কোথাও পাঠানো হয় না।',
    ccSubmit: 'নম্বর পরীক্ষা করুন',
    ccChecksum: 'চেকসাম (Luhn)',
    ccValid: 'বৈধ',
    ccInvalid: 'বৈধ নয়',
    ccNumberRow: 'নম্বর',
    ccNetwork: 'সম্ভাব্য নেটওয়ার্ক',
    ccUnknown: 'চেনা যায়নি',
    ccLength: 'দৈর্ঘ্য',
    ccLengthOk: '{n} অঙ্ক (এই নেটওয়ার্ক {lengths} অঙ্কের কার্ড দেয়)',
    ccLengthBad: '{n} অঙ্ক (এই নেটওয়ার্ক {lengths} অঙ্কের কার্ড দেয়, তাই এই দৈর্ঘ্য অস্বাভাবিক)',
    ccLengthPlain: '{n} অঙ্ক',
    e_empty: 'একটি কার্ড নম্বর লিখুন।',
    e_characters: 'শুধু অঙ্ক ব্যবহার করুন। স্পেস ও হাইফেন চলবে।',
    e_length: 'কার্ড নম্বরে ১২ থেকে ১৯টি অঙ্ক থাকে।',
    ccN1: 'বৈধ চেকসাম শুধু বোঝায় নম্বরটি সঠিক গঠনের। এতে বোঝা যায় না কার্ডটি আছে, সচল বা তাতে টাকা আছে কি না।',
    ccN2: 'প্রথম কয়েকটি অঙ্ক থেকে নেটওয়ার্ক আন্দাজ করা হয়, তা ভুল হতে পারে।',
    ccN3: 'শেয়ার করা বা অবিশ্বস্ত ডিভাইসে আসল কার্ড নম্বর লিখবেন না। এই টুল কিছু পাঠায় না, তবে যা লিখবেন তা পর্দায় দেখা যায়। 4111 1111 1111 1111-এর মতো টেস্ট নম্বর চেকসাম পাস করে।',
    npLabel: 'আপনার নোট',
    npCounts: '{w}টি শব্দ, {c}টি অক্ষর',
    npCopy: 'কপি',
    npDownload: '.txt ডাউনলোড',
    npClear: 'নোট মুছুন',
    npCopied: 'ক্লিপবোর্ডে কপি হয়েছে।',
    npCopyFailed: 'কপি হয়নি। লেখা নির্বাচন করে নিজে কপি করুন।',
    npCleared: 'নোট মুছে ফেলা হয়েছে।',
    npDownloaded: 'ডাউনলোড শুরু হয়েছে।',
    npEmpty: 'কপি বা ডাউনলোড করার মতো কিছু এখনো নেই।',
    npNotice:
      'আপনার নোট শুধু এই পেজের মেমোরিতে থাকে। কোথাও সংরক্ষণ বা পাঠানো হয় না, এবং পেজ ছাড়লে বা রিলোড করলে হারিয়ে যায়। রাখতে চাইলে ডাউনলোড করুন।',
    npN1: 'পেজ খোলা থাকলে ভাষা বদলালেও নোট থেকে যায়।',
    npN2: 'ডাউনলোড হয় note.txt নামের সাধারণ টেক্সট ফাইল, যা আপনার ব্রাউজার সংরক্ষণ করে।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];
const err =
  (L: L) =>
  (code: string): string =>
    L(`e_${code}` as Key);

// ---------- Time card ----------

export const timeCardCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const duration = (minutes: number): string =>
    L('tcDuration', { h: Math.floor(minutes / 60), m: minutes % 60 });
  const decimal = (x: number): string => formatAmount(x, ctx.lang);
  return toolForm(ctx, {
    prefix: 'tc',
    submit: L('tcSubmit'),
    errorText: err(L),
    notesText: [L('tcN1'), L('tcN2'), L('tcN3'), L('local')],
    fields: [
      { key: 'start', kind: 'text', type: 'time', label: L('tcStart'), default: '09:00' },
      { key: 'end', kind: 'text', type: 'time', label: L('tcEnd'), default: '17:00' },
      { key: 'break', kind: 'text', label: L('tcBreak'), inputmode: 'numeric', default: '0' },
      { key: 'days', kind: 'text', label: L('tcDays'), inputmode: 'numeric', default: '1' },
      {
        key: 'rate',
        kind: 'text',
        label: L('tcRate'),
        hint: L('tcRateHint'),
        inputmode: 'decimal',
      },
    ],
    compute({ start = '', end = '', break: brk = '', days = '', rate = '' }): Outcome {
      const r = timeCard({ start, end, breakMinutes: brk, days, rate });
      if (!r.ok) {
        const field =
          r.error === 'start-invalid' || r.error === 'times-equal'
            ? 'start'
            : r.error === 'end-invalid'
              ? 'end'
              : r.error.startsWith('break')
                ? 'break'
                : r.error === 'days-invalid'
                  ? 'days'
                  : 'rate';
        return { field, error: r.error };
      }
      const v = r.value;
      return {
        rows: [
          { label: L('tcPerDay'), value: duration(v.shiftMinutes), primary: true },
          { label: L('tcDecimal'), value: decimal(v.decimalHours) },
          ...(v.days > 1
            ? [
                { label: L('tcTotal', { days: v.days }), value: duration(v.totalMinutes) },
                { label: L('tcTotalDecimal'), value: decimal(v.totalDecimalHours) },
              ]
            : []),
          ...(v.pay !== null ? [{ label: L('tcPay'), value: decimal(v.pay), copy: true }] : []),
        ],
        notes: v.overnight ? [L('tcOvernight')] : [],
      };
    },
  });
};

// ---------- Credit card number checker ----------

const NETWORK_NAME: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

export const creditCardChecker: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return toolForm(ctx, {
    prefix: 'cc',
    submit: L('ccSubmit'),
    errorText: err(L),
    notesText: [L('ccN1'), L('ccN2'), L('ccN3'), L('local')],
    fields: [
      {
        key: 'number',
        kind: 'text',
        label: L('ccNumber'),
        hint: L('ccHint'),
        inputmode: 'numeric',
      },
    ],
    compute({ number = '' }): Outcome {
      const r = checkCard(number);
      if (!r.ok) return { field: 'number', error: r.error };
      const c = r.value;
      const lengths = c.expectedLengths.join(', ');
      return {
        rows: [
          {
            label: L('ccChecksum'),
            value: L(c.luhnValid ? 'ccValid' : 'ccInvalid'),
            primary: true,
          },
          { label: L('ccNumberRow'), value: groupCard(c.digits), lang: 'en' },
          {
            label: L('ccNetwork'),
            value: c.network ? NETWORK_NAME[c.network] : L('ccUnknown'),
            lang: c.network ? 'en' : undefined,
          },
          {
            label: L('ccLength'),
            value:
              c.lengthMatchesNetwork === null
                ? L('ccLengthPlain', { n: c.length })
                : L(c.lengthMatchesNetwork ? 'ccLengthOk' : 'ccLengthBad', {
                    n: c.length,
                    lengths,
                  }),
          },
        ],
      };
    },
  });
};

// ---------- Notepad ----------

export const notepadOnline: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const area = h('textarea', {
    id: 'note-text',
    class: 'input textarea textarea-lg',
    rows: '14',
    spellcheck: 'false',
  });
  bindMemo(area, ctx.memo, 'note');
  const label = h('label', { for: 'note-text', class: 'field-label' }, L('npLabel'));
  const counts = h('p', { class: 'field-hint', id: 'note-counts', 'aria-live': 'polite' });
  const status = h('p', { class: 'copy-status', role: 'status' });

  const refresh = (): void => {
    const s = analyzeText(area.value);
    counts.textContent = L('npCounts', { w: s.words, c: s.characters });
  };
  area.addEventListener('input', refresh);
  refresh();

  const button = (
    text: string,
    iconName: 'copy' | 'download' | 'reset',
    run: () => void,
  ): HTMLButtonElement => {
    const b = h('button', { type: 'button', class: 'btn' }, icon(iconName, 18), text);
    b.addEventListener('click', run);
    return b;
  };

  const copy = button(L('npCopy'), 'copy', async () => {
    if (!area.value) {
      status.textContent = L('npEmpty');
      return;
    }
    status.textContent = L((await copyText(area.value)) ? 'npCopied' : 'npCopyFailed');
  });
  const download = button(L('npDownload'), 'download', () => {
    if (!area.value) {
      status.textContent = L('npEmpty');
      return;
    }
    const url = URL.createObjectURL(new Blob([area.value], { type: 'text/plain;charset=utf-8' }));
    const a = h('a', { href: url, download: 'note.txt' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = L('npDownloaded');
  });
  const clear = button(L('npClear'), 'reset', () => {
    area.value = '';
    ctx.memo.note = '';
    refresh();
    status.textContent = L('npCleared');
    area.focus();
  });

  return h(
    'div',
    { class: 'tool-layout' },
    h(
      'div',
      { class: 'tool-form' },
      h('p', { class: 'net-notice' }, L('npNotice')),
      h('div', { class: 'field' }, label, area, counts),
      h('div', { class: 'form-actions' }, copy, download, clear),
      status,
    ),
    notes(ctx, [L('npN1'), L('npN2'), L('local')]),
  );
};
