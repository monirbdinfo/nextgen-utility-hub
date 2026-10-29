import { toBanglaDigits, toEnglishDigits } from '../../calc/digits';
import { groupDigits } from '../../calc/format';
import {
  addressKind6,
  embeddedIPv4,
  formatCidr6,
  formatIPv6,
  formatIPv6Full,
  generateUla,
  nat64,
  parseCidr6,
  parseIPv6,
  ipv4Compatible,
  ipv4Mapped,
  rangeToCidrs6,
  sixToFour,
  subnet6,
} from '../../calc/ipv6';
import {
  formatCidr,
  formatIPv4,
  parseCidr,
  parseIPv4,
  subnet,
  toBinary,
  MAX_IPV4,
} from '../../calc/ipv4';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  wireForm,
  type Field,
  type ResultRow,
  type ToolContext,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    // inputs
    inIPv4: 'IPv4 address',
    inIPv4Hint: 'For example 192.0.2.1.',
    inIPv6: 'IPv6 address',
    inIPv6Hint: 'Full or compressed form, for example 2001:db8::1 or 2001:0db8:0:0:0:0:0:1.',
    inCidr6: 'IPv6 CIDR block',
    inCidr6Hint: 'For example 2001:db8::/32.',
    inCidrAny: 'CIDR block',
    inCidrAnyHint: 'IPv4 such as 192.168.1.10/24, or IPv6 such as 2001:db8::1/64.',
    inRangeStart: 'First address',
    inRangeEnd: 'Last address',
    inDecimal: 'Decimal number',
    inDecimalHint: 'A whole number from 0 to 4294967295.',
    inDirection: 'Direction',
    optToDecimal: 'IPv4 → decimal',
    optFromDecimal: 'Decimal → IPv4',
    // actions
    btnConvert: 'Convert',
    btnCalculate: 'Calculate',
    btnExpand: 'Expand',
    btnCompress: 'Compress',
    btnSummarise: 'Summarise',
    btnGenerate: 'Generate',
    // result rows
    rDecimal: 'Decimal',
    rHex: 'Hexadecimal',
    rDotted: 'Dotted IPv4',
    rMapped: 'IPv4-mapped (dual-stack)',
    rCompatible: 'IPv4-compatible (deprecated)',
    rNat64: 'NAT64 well-known prefix',
    r6to4: '6to4 prefix',
    rEmbedded: 'Embedded IPv4',
    rFormKind: 'Form',
    rFull: 'Full form',
    rCompressed: 'Compressed form (RFC 5952)',
    rFirst: 'First address',
    rLast: 'Last address',
    rTotal: 'Total addresses',
    rBlocks: 'CIDR blocks',
    rBlockCount: 'Number of blocks',
    rNetwork: 'Network prefix',
    rType: 'Address type',
    rAddress: 'Address',
    rPrefix48: '/48 site prefix',
    rSubnet64: '/64 subnet (subnet ID 0)',
    rBroadcast: 'Broadcast',
    rNoBroadcast: 'None (IPv6 has no broadcast)',
    rMask: 'Subnet mask',
    rUsable: 'Usable hosts',
    rBinary: 'Mask in binary',
    rCidr: 'CIDR notation',
    // kinds of embedded address
    kind_mapped: 'IPv4-mapped',
    kind_compatible: 'IPv4-compatible',
    kind_nat64: 'NAT64 (64:ff9b::/96)',
    kind_6to4: '6to4 (2002::/16)',
    // address types
    type_unspecified: 'Unspecified (::)',
    type_loopback: 'Loopback (::1)',
    'type_ipv4-mapped': 'IPv4-mapped',
    type_ula: 'Unique local (fc00::/7)',
    'type_link-local': 'Link-local (fe80::/10)',
    type_multicast: 'Multicast (ff00::/8)',
    type_documentation: 'Documentation (2001:db8::/32)',
    type_global: 'Global unicast (2000::/3 range)',
    type_ipv4: 'IPv4',
    type_public: 'Public (globally routable)',
    // notes
    nDecimal: 'An IPv4 address is one 32-bit number. Decimal ↔ dotted uses the same value.',
    nMapped: 'Dual-stack systems use ::ffff:a.b.c.d to represent an IPv4 address as IPv6.',
    nCompatible: 'The ::a.b.c.d form is deprecated (RFC 4291) and is shown only for reference.',
    nNat64:
      'NAT64 translates IPv6 to IPv4 for IPv6-only networks; this shows the address a NAT64 gateway would use for this IPv4 address.',
    n6to4:
      'A 6to4 prefix embeds a public IPv4 address (RFC 3056). It is historic and only meaningful for public IPv4 addresses.',
    nNoEmbed: 'This address does not contain an IPv4 address in a known form.',
    nEmbed: 'The IPv4 address is taken from the last 32 bits (or, for 6to4, from bits 17–48).',
    nCompress:
      'Compressed form follows RFC 5952: lower case, no leading zeros, and the longest run of zero groups replaced by ::.',
    nExpand: 'Every group is written in four hex digits. The result is the same address.',
    nCidr6:
      'The first and last address are the bounds of the block. IPv6 has no broadcast address, so every address in the block is usable.',
    nRange:
      'The result is the fewest CIDR blocks that cover exactly the range, with no extra addresses.',
    nSubnet:
      'The IPv4 part uses the same rules as the Subnet Calculator; /31 and /32 are explained there.',
    nSubnet6: 'IPv6 has no broadcast address; every address in the block is part of the subnet.',
    nUla: 'Generated randomly from your browser’s secure random source (RFC 4193). Unique local addresses are for private networks and are not routed on the internet. Collisions are unlikely but not impossible.',
    nGenerate: 'Press Generate for a new address. Nothing is sent or stored.',
    nLocal: 'Everything here is calculated in your browser. Nothing is sent anywhere.',
    // errors
    e_empty: 'Enter a value.',
    e_format: 'Check the format. Use digits, letters a–f and colons (for IPv6) or dots (for IPv4).',
    'e_octet-range': 'Each number in an IPv4 address must be 0 to 255.',
    'e_leading-zero': 'Remove leading zeros (write 10.1.0.1, not 10.01.0.1).',
    'e_group-range': 'Each IPv6 group is one to four hex digits (0 to ffff).',
    'e_double-compression': 'Use :: only once in an IPv6 address.',
    'e_too-many-groups': 'An IPv6 address has at most eight groups.',
    'e_too-few-groups': 'An IPv6 address without :: needs exactly eight groups.',
    'e_ipv4-part': 'The dotted IPv4 part must be the last part of the IPv6 address and be valid.',
    e_zone: 'Zone identifiers such as %eth0 are not supported.',
    'e_prefix-empty': 'Enter a prefix length, for example /24 or /64.',
    'e_prefix-range':
      'The prefix length must be a whole number in the allowed range (0–32 for IPv4, 0–128 for IPv6).',
    'e_mask-invalid': 'A subnet mask must look like 255.255.255.0.',
    'e_mask-noncontiguous':
      'This is not a valid subnet mask: its 1-bits must be contiguous from the left.',
    'e_start-after-end': 'The first address must not be greater than the last address.',
    'e_decimal-range': 'A decimal IPv4 value must be a whole number from 0 to 4294967295.',
    'e_decimal-format': 'Enter digits only (Bangla or English), for example 3232235777.',
  },
  bn: {
    inIPv4: 'IPv4 অ্যাড্রেস',
    inIPv4Hint: 'যেমন 192.0.2.1।',
    inIPv6: 'IPv6 অ্যাড্রেস',
    inIPv6Hint: 'পূর্ণ বা সংক্ষিপ্ত রূপ, যেমন 2001:db8::1 বা 2001:0db8:0:0:0:0:0:1।',
    inCidr6: 'IPv6 CIDR ব্লক',
    inCidr6Hint: 'যেমন 2001:db8::/32।',
    inCidrAny: 'CIDR ব্লক',
    inCidrAnyHint: 'IPv4 যেমন 192.168.1.10/24, অথবা IPv6 যেমন 2001:db8::1/64।',
    inRangeStart: 'প্রথম অ্যাড্রেস',
    inRangeEnd: 'শেষ অ্যাড্রেস',
    inDecimal: 'দশমিক সংখ্যা',
    inDecimalHint: '০ থেকে ৪২৯৪৯৬৭২৯৫ পর্যন্ত একটি পূর্ণসংখ্যা।',
    inDirection: 'রূপান্তরের দিক',
    optToDecimal: 'IPv4 → দশমিক',
    optFromDecimal: 'দশমিক → IPv4',
    btnConvert: 'রূপান্তর করুন',
    btnCalculate: 'হিসাব করুন',
    btnExpand: 'প্রসারিত করুন',
    btnCompress: 'সংক্ষিপ্ত করুন',
    btnSummarise: 'সারসংক্ষেপ করুন',
    btnGenerate: 'তৈরি করুন',
    rDecimal: 'দশমিক',
    rHex: 'হেক্সাডেসিমাল',
    rDotted: 'ডটযুক্ত IPv4',
    rMapped: 'IPv4-ম্যাপড (ডুয়াল-স্ট্যাক)',
    rCompatible: 'IPv4-কম্প্যাটিবল (অচল)',
    rNat64: 'NAT64 সুপরিচিত প্রিফিক্স',
    r6to4: '6to4 প্রিফিক্স',
    rEmbedded: 'ভেতরের IPv4',
    rFormKind: 'রূপ',
    rFull: 'পূর্ণ রূপ',
    rCompressed: 'সংক্ষিপ্ত রূপ (RFC 5952)',
    rFirst: 'প্রথম অ্যাড্রেস',
    rLast: 'শেষ অ্যাড্রেস',
    rTotal: 'মোট অ্যাড্রেস',
    rBlocks: 'CIDR ব্লক',
    rBlockCount: 'ব্লকের সংখ্যা',
    rNetwork: 'নেটওয়ার্ক প্রিফিক্স',
    rType: 'অ্যাড্রেসের ধরন',
    rAddress: 'অ্যাড্রেস',
    rPrefix48: '/48 সাইট প্রিফিক্স',
    rSubnet64: '/64 সাবনেট (সাবনেট ID 0)',
    rBroadcast: 'ব্রডকাস্ট',
    rNoBroadcast: 'নেই (IPv6-এ ব্রডকাস্ট নেই)',
    rMask: 'সাবনেট মাস্ক',
    rUsable: 'ব্যবহারযোগ্য হোস্ট',
    rBinary: 'বাইনারিতে মাস্ক',
    rCidr: 'CIDR নোটেশন',
    kind_mapped: 'IPv4-ম্যাপড',
    kind_compatible: 'IPv4-কম্প্যাটিবল',
    kind_nat64: 'NAT64 (64:ff9b::/96)',
    kind_6to4: '6to4 (2002::/16)',
    type_unspecified: 'অনির্দিষ্ট (::)',
    type_loopback: 'লুপব্যাক (::1)',
    'type_ipv4-mapped': 'IPv4-ম্যাপড',
    type_ula: 'ইউনিক লোকাল (fc00::/7)',
    'type_link-local': 'লিংক-লোকাল (fe80::/10)',
    type_multicast: 'মাল্টিকাস্ট (ff00::/8)',
    type_documentation: 'ডকুমেন্টেশন (2001:db8::/32)',
    type_global: 'গ্লোবাল ইউনিকাস্ট (2000::/3 পরিসর)',
    type_ipv4: 'IPv4',
    type_public: 'পাবলিক (ইন্টারনেটে রাউটযোগ্য)',
    nDecimal: 'একটি IPv4 অ্যাড্রেস একটি ৩২-বিট সংখ্যা। দশমিক ↔ ডটযুক্ত রূপে একই মান।',
    nMapped: 'ডুয়াল-স্ট্যাক সিস্টেম ::ffff:a.b.c.d দিয়ে IPv4 অ্যাড্রেসকে IPv6 রূপে দেখায়।',
    nCompatible: '::a.b.c.d রূপটি অচল (RFC 4291); শুধু তথ্যের জন্য দেখানো হচ্ছে।',
    nNat64:
      'NAT64 IPv6-only নেটওয়ার্কের জন্য IPv6 থেকে IPv4-তে অনুবাদ করে; এটি এই IPv4-এর জন্য NAT64 গেটওয়ের ঠিকানা দেখায়।',
    n6to4:
      '6to4 প্রিফিক্সে একটি পাবলিক IPv4 অ্যাড্রেস থাকে (RFC 3056)। এটি পুরোনো পদ্ধতি এবং শুধু পাবলিক IPv4-এর ক্ষেত্রে অর্থবহ।',
    nNoEmbed: 'এই অ্যাড্রেসে কোনো পরিচিত রূপে IPv4 অ্যাড্রেস নেই।',
    nEmbed: 'IPv4 অ্যাড্রেসটি শেষ ৩২ বিট থেকে নেওয়া হয়েছে (6to4-এর ক্ষেত্রে বিট ১৭–৪৮ থেকে)।',
    nCompress:
      'সংক্ষিপ্ত রূপ RFC 5952 অনুসারে: ছোট হাতের অক্ষর, শুরুর শূন্য বাদ, এবং শূন্য গ্রুপের দীর্ঘতম সারি :: দিয়ে বদলানো।',
    nExpand: 'প্রতিটি গ্রুপ চার অক্ষরের হেক্স হিসেবে লেখা। ফল একই অ্যাড্রেস।',
    nCidr6:
      'প্রথম ও শেষ অ্যাড্রেস ব্লকের সীমা। IPv6-এ ব্রডকাস্ট অ্যাড্রেস নেই, তাই ব্লকের প্রতিটি অ্যাড্রেস ব্যবহারযোগ্য।',
    nRange: 'ফল হলো ঠিক ওই রেঞ্জটুকু ঢাকে এমন সবচেয়ে কম সংখ্যক CIDR ব্লক, বাড়তি অ্যাড্রেস ছাড়া।',
    nSubnet: 'IPv4 অংশে সাবনেট ক্যালকুলেটরের নিয়মই প্রযোজ্য; /31 ও /32 সেখানে ব্যাখ্যা করা আছে।',
    nSubnet6: 'IPv6-এ ব্রডকাস্ট অ্যাড্রেস নেই; ব্লকের প্রতিটি অ্যাড্রেস সাবনেটের অংশ।',
    nUla: 'আপনার ব্রাউজারের নিরাপদ র‍্যান্ডম উৎস থেকে তৈরি (RFC 4193)। ইউনিক লোকাল অ্যাড্রেস ব্যক্তিগত নেটওয়ার্কের জন্য, ইন্টারনেটে রাউট হয় না। সংঘর্ষ অসম্ভব নয়, তবে সম্ভাবনা কম।',
    nGenerate: 'নতুন অ্যাড্রেসের জন্য “তৈরি করুন” চাপুন। কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
    nLocal: 'সব হিসাব আপনার ব্রাউজারেই হয়। কিছুই কোথাও পাঠানো হয় না।',
    e_empty: 'একটি মান লিখুন।',
    e_format: 'ফরম্যাট দেখুন। সংখ্যা, a–f অক্ষর ও কোলন (IPv6) বা ডট (IPv4) ব্যবহার করুন।',
    'e_octet-range': 'IPv4 অ্যাড্রেসের প্রতিটি সংখ্যা ০ থেকে ২৫৫-এর মধ্যে হতে হবে।',
    'e_leading-zero': 'শুরুর শূন্য বাদ দিন (10.01.0.1 নয়, 10.1.0.1 লিখুন)।',
    'e_group-range': 'প্রতিটি IPv6 গ্রুপ এক থেকে চার অক্ষরের হেক্স (0 থেকে ffff)।',
    'e_double-compression': 'একটি IPv6 অ্যাড্রেসে :: একবারই ব্যবহার করুন।',
    'e_too-many-groups': 'একটি IPv6 অ্যাড্রেসে সর্বোচ্চ আটটি গ্রুপ থাকতে পারে।',
    'e_too-few-groups': ':: ছাড়া IPv6 অ্যাড্রেসে ঠিক আটটি গ্রুপ লাগে।',
    'e_ipv4-part': 'ডটযুক্ত IPv4 অংশটি IPv6 অ্যাড্রেসের শেষে হতে হবে এবং বৈধ হতে হবে।',
    e_zone: '%eth0-এর মতো জোন আইডেন্টিফায়ার সমর্থিত নয়।',
    'e_prefix-empty': 'প্রিফিক্স দৈর্ঘ্য লিখুন, যেমন /24 বা /64।',
    'e_prefix-range':
      'প্রিফিক্স দৈর্ঘ্য অনুমোদিত সীমার পূর্ণসংখ্যা হতে হবে (IPv4-এ ০–৩২, IPv6-এ ০–১২৮)।',
    'e_mask-invalid': 'সাবনেট মাস্ক 255.255.255.0-এর মতো হতে হবে।',
    'e_mask-noncontiguous': 'এটি বৈধ সাবনেট মাস্ক নয়: ১-বিটগুলো বাঁ দিক থেকে টানা হতে হবে।',
    'e_start-after-end': 'প্রথম অ্যাড্রেস শেষ অ্যাড্রেসের চেয়ে বড় হতে পারবে না।',
    'e_decimal-range': 'দশমিক IPv4 মান ০ থেকে ৪২৯৪৯৬৭২৯৫-এর মধ্যে পূর্ণসংখ্যা হতে হবে।',
    'e_decimal-format': 'শুধু সংখ্যা লিখুন (বাংলা বা ইংরেজি), যেমন 3232235777।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

/** Error codes from the calculation modules map to `e_<code>` messages. */
const err = (L: L, code: string): string => L(`e_${code}` as Key);

const bigText = (ctx: ToolContext, n: bigint): string => {
  const s = groupDigits(n.toString(), 'international');
  return ctx.lang === 'bn' ? toBanglaDigits(s) : s;
};

// ---------- shared single/multi-field calculator ----------

interface Spec {
  key: string;
  label: string;
  hint?: string;
  inputmode?: string;
  options?: Array<[value: string, label: string]>;
  default?: string;
}

type Outcome = { rows: ResultRow[]; notes?: string[] } | { field: string; error: string };

/**
 * A form with any number of inputs, a result panel and a notes list. `compute` returns either
 * result rows or the field and error to show. Every tool here uses this one flow.
 */
export function calcForm(
  ctx: ToolContext,
  opts: {
    specs: Spec[];
    submit: Key;
    compute(values: Record<string, string>): Outcome;
    notesText: string[];
  },
): HTMLElement {
  const L = S(ctx.lang);
  const controls = opts.specs.map((s) => {
    if (s.options) {
      const sel = select(s.options, { id: `net6-${s.key}` });
      bindMemo(sel, ctx.memo, s.key, s.default ?? s.options[0]![0]);
      return { spec: s, f: field(s.label, sel, { hint: s.hint }) };
    }
    const input = textInput({
      id: `net6-${s.key}`,
      inputmode: s.inputmode ?? 'text',
      autocapitalize: 'off',
    });
    bindMemo(input, ctx.memo, s.key, s.default ?? '');
    return { spec: s, f: field(s.label, input, { hint: s.hint }) };
  });
  const fields: Field[] = controls.map((c) => c.f);
  const byKey = new Map(controls.map((c) => [c.spec.key, c.f]));

  const panel = resultPanel(ctx, L(opts.submit));
  const form = h('form', { class: 'tool-form', 'aria-label': L(opts.submit) });
  if (controls.length) form.append(h('div', { class: 'field-grid' }, ...fields.map((f) => f.el)));
  form.append(
    formActions(ctx, {
      submitLabel: L(opts.submit),
      panel,
      onReset() {
        for (const c of controls) {
          const control = c.f.control;
          control.value = c.spec.default ?? c.spec.options?.[0]?.[0] ?? '';
          ctx.memo[c.spec.key] = control.value;
          c.f.setError(null);
        }
        Object.assign(ctx.memo, { __done: '' });
        panel.clear();
        (fields[0]?.control ?? form.querySelector('button'))?.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const values: Record<string, string> = {};
      for (const c of controls) values[c.spec.key] = c.f.control.value;
      const out = opts.compute(values);
      if ('error' in out) {
        const f = byKey.get(out.field) ?? fields[0];
        return f ? [[f, err(L, out.error)]] : [];
      }
      panel.show(out.rows, out.notes ?? []);
      return null;
    },
    fields,
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [...opts.notesText, L('nLocal')]),
  );
}

// ---------- the tools ----------

export const ipToDecimal: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnConvert',
    specs: [
      {
        key: 'direction',
        label: L('inDirection'),
        options: [
          ['to', L('optToDecimal')],
          ['from', L('optFromDecimal')],
        ],
      },
      { key: 'value', label: L('inIPv4'), hint: L('inIPv4Hint'), inputmode: 'decimal' },
    ],
    notesText: [L('nDecimal')],
    compute({ direction = '', value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      if (direction === 'to') {
        const a = parseIPv4(value);
        if (!a.ok) return { field: 'value', error: a.error };
        return {
          rows: [
            { label: L('rDecimal'), value: String(a.value), lang: 'en', primary: true, copy: true },
            {
              label: L('rHex'),
              value: `0x${a.value.toString(16).toUpperCase().padStart(8, '0')}`,
              lang: 'en',
            },
            { label: L('rDotted'), value: formatIPv4(a.value), lang: 'en' },
          ],
        };
      }
      const digits = toEnglishDigits(value).trim();
      if (!/^\d+$/.test(digits)) return { field: 'value', error: 'decimal-format' };
      const n = Number(digits);
      if (n > MAX_IPV4) return { field: 'value', error: 'decimal-range' };
      return {
        rows: [
          { label: L('rDotted'), value: formatIPv4(n), lang: 'en', primary: true, copy: true },
          {
            label: L('rHex'),
            value: `0x${n.toString(16).toUpperCase().padStart(8, '0')}`,
            lang: 'en',
          },
          { label: L('rBinary'), value: toBinary(n), lang: 'en' },
        ],
      };
    },
  });
};

export const ipv4ToIpv6: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnConvert',
    specs: [{ key: 'value', label: L('inIPv4'), hint: L('inIPv4Hint'), inputmode: 'decimal' }],
    notesText: [L('nMapped'), L('nCompatible'), L('nNat64'), L('n6to4')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      const a = parseIPv4(value);
      if (!a.ok) return { field: 'value', error: a.error };
      return {
        rows: [
          {
            label: L('rMapped'),
            value: formatIPv6(ipv4Mapped(a.value)),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rCompatible'), value: formatIPv6(ipv4Compatible(a.value)), lang: 'en' },
          { label: L('rNat64'), value: formatIPv6(nat64(a.value)), lang: 'en', copy: true },
          { label: L('r6to4'), value: `${formatIPv6(sixToFour(a.value))}/48`, lang: 'en' },
        ],
      };
    },
  });
};

const KIND_KEY = {
  mapped: 'kind_mapped',
  compatible: 'kind_compatible',
  nat64: 'kind_nat64',
  '6to4': 'kind_6to4',
} as const;

export const ipv6ToIpv4: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnConvert',
    specs: [{ key: 'value', label: L('inIPv6'), hint: L('inIPv6Hint') }],
    notesText: [L('nEmbed'), L('nMapped'), L('nCompatible')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      const a = parseIPv6(value);
      if (!a.ok) return { field: 'value', error: a.error };
      const e = embeddedIPv4(a.value);
      if (!e) return { rows: [{ label: L('rEmbedded'), value: L('nNoEmbed') }] };
      return {
        rows: [
          { label: L('rFormKind'), value: L(KIND_KEY[e.kind] as Key) },
          {
            label: L('rEmbedded'),
            value: formatIPv4(e.ipv4),
            lang: 'en',
            primary: true,
            copy: true,
          },
        ],
      };
    },
  });
};

export const ipv6Compression: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnCompress',
    specs: [{ key: 'value', label: L('inIPv6'), hint: L('inIPv6Hint') }],
    notesText: [L('nCompress')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      const a = parseIPv6(value);
      if (!a.ok) return { field: 'value', error: a.error };
      return {
        rows: [
          {
            label: L('rCompressed'),
            value: formatIPv6(a.value),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rFull'), value: formatIPv6Full(a.value), lang: 'en' },
        ],
      };
    },
  });
};

export const ipv6Expand: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnExpand',
    specs: [{ key: 'value', label: L('inIPv6'), hint: L('inIPv6Hint') }],
    notesText: [L('nExpand')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      const a = parseIPv6(value);
      if (!a.ok) return { field: 'value', error: a.error };
      return {
        rows: [
          {
            label: L('rFull'),
            value: formatIPv6Full(a.value),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rCompressed'), value: formatIPv6(a.value), lang: 'en' },
        ],
      };
    },
  });
};

export const ipv6CidrRange: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnCalculate',
    specs: [{ key: 'value', label: L('inCidr6'), hint: L('inCidr6Hint') }],
    notesText: [L('nCidr6')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      const c = parseCidr6(value);
      if (!c.ok) return { field: 'value', error: c.error };
      const s = subnet6(c.value.address, c.value.prefix);
      return {
        rows: [
          {
            label: L('rFirst'),
            value: formatIPv6(s.network),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rLast'), value: formatIPv6(s.last), lang: 'en', primary: true, copy: true },
          { label: L('rTotal'), value: bigText(ctx, s.total) },
          { label: L('rCidr'), value: formatCidr6(s.network, s.prefix), lang: 'en' },
        ],
      };
    },
  });
};

export const ipv6RangeCidr: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnSummarise',
    specs: [
      { key: 'start', label: L('inRangeStart'), hint: L('inIPv6Hint') },
      { key: 'end', label: L('inRangeEnd'), hint: L('inIPv6Hint') },
    ],
    notesText: [L('nRange')],
    compute({ start = '', end = '' }) {
      if (!start.trim()) return { field: 'start', error: 'empty' };
      if (!end.trim()) return { field: 'end', error: 'empty' };
      const a = parseIPv6(start);
      if (!a.ok) return { field: 'start', error: a.error };
      const b = parseIPv6(end);
      if (!b.ok) return { field: 'end', error: b.error };
      const r = rangeToCidrs6(a.value, b.value);
      if (!r.ok) return { field: 'end', error: r.error };
      return {
        rows: [
          {
            label: L('rBlocks'),
            value: r.value.map((x) => formatCidr6(x.network, x.prefix)).join('\n'),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rBlockCount'), value: bigText(ctx, BigInt(r.value.length)) },
          { label: L('rTotal'), value: bigText(ctx, b.value - a.value + 1n) },
        ],
      };
    },
  });
};

export const ipSubnetCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  return calcForm(ctx, {
    submit: 'btnCalculate',
    specs: [{ key: 'value', label: L('inCidrAny'), hint: L('inCidrAnyHint') }],
    notesText: [L('nSubnet'), L('nSubnet6')],
    compute({ value = '' }) {
      if (!value.trim()) return { field: 'value', error: 'empty' };
      if (value.includes(':')) {
        const c = parseCidr6(value);
        if (!c.ok) return { field: 'value', error: c.error };
        const s = subnet6(c.value.address, c.value.prefix);
        return {
          rows: [
            {
              label: L('rCidr'),
              value: formatCidr6(s.network, s.prefix),
              lang: 'en',
              primary: true,
              copy: true,
            },
            { label: L('rNetwork'), value: formatIPv6(s.network), lang: 'en' },
            { label: L('rLast'), value: formatIPv6(s.last), lang: 'en' },
            { label: L('rTotal'), value: bigText(ctx, s.total) },
            { label: L('rType'), value: L(`type_${addressKind6(s.network)}` as Key) },
          ],
        };
      }
      const c = parseCidr(value);
      if (!c.ok) return { field: 'value', error: c.error };
      const s = subnet(c.value.address, c.value.prefix);
      return {
        rows: [
          {
            label: L('rCidr'),
            value: formatCidr(s.network, s.prefix),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rNetwork'), value: formatIPv4(s.network), lang: 'en' },
          s.broadcast !== null
            ? { label: L('rBroadcast'), value: formatIPv4(s.broadcast), lang: 'en' }
            : { label: L('rBroadcast'), value: L('rNoBroadcast') },
          { label: L('rMask'), value: formatIPv4(s.mask), lang: 'en' },
          { label: L('rUsable'), value: bigText(ctx, BigInt(s.usableHosts)) },
          { label: L('rType'), value: L('type_ipv4') },
        ],
      };
    },
  });
};

export const localIpv6Generator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
  return calcForm(ctx, {
    submit: 'btnGenerate',
    specs: [],
    notesText: [L('nUla'), L('nGenerate')],
    compute() {
      const g = generateUla(random);
      return {
        rows: [
          {
            label: L('rAddress'),
            value: formatIPv6(g.address),
            lang: 'en',
            primary: true,
            copy: true,
          },
          { label: L('rPrefix48'), value: formatCidr6(g.prefix48, 48), lang: 'en' },
          { label: L('rSubnet64'), value: formatCidr6(g.prefix48, 64), lang: 'en' },
        ],
      };
    },
  });
};
