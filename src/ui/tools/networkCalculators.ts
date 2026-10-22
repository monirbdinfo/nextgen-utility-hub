import {
  addressKind,
  formatCidr,
  formatIPv4,
  parseCidr,
  parseIPv4,
  parsePrefix,
  rangeToCidrs,
  subnet,
  toBinary,
  type AddressKind,
  type CidrError,
} from '../../calc/ipv4';
import { formatInteger } from '../../calc/format';
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
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    address: 'IPv4 address',
    addressHint: 'For example 192.168.1.10 — you can also type 192.168.1.10/24 here.',
    prefix: 'Prefix length or subnet mask',
    prefixHint: 'For example 24, /24 or 255.255.255.0. Leave empty if the address includes /24.',
    calculate: 'Calculate',
    cidr: 'CIDR notation',
    network: 'Network address',
    broadcast: 'Broadcast address',
    noBroadcast31: 'None — /31 point-to-point link',
    noBroadcast32: 'None — /32 single host',
    mask: 'Subnet mask',
    wildcard: 'Wildcard mask',
    firstHost: 'First usable host',
    lastHost: 'Last usable host',
    usable: 'Usable hosts',
    total: 'Total addresses',
    kind: 'Address type',
    binaryMask: 'Mask in binary',
    hostBits:
      'The address you entered has host bits set, so the network is {network}. This is normal when you enter a host address.',
    note31:
      'A /31 has no network or broadcast address: both addresses are usable hosts on a point-to-point link (RFC 3021). Some older equipment does not support this.',
    note32: 'A /32 is a single address, usually a loopback or host route.',
    note0: 'A /0 covers the whole IPv4 address space (a default route).',
    empty: 'Enter an IPv4 address.',
    format: 'Use four numbers separated by dots, for example 192.168.1.10.',
    'octet-range': 'Each of the four numbers must be between 0 and 255.',
    'leading-zero': 'Remove leading zeros (write 10.1.0.1, not 10.01.0.1).',
    'prefix-empty': 'Enter a prefix length (0–32) or a subnet mask.',
    'prefix-range': 'The prefix length must be a whole number from 0 to 32.',
    'mask-invalid': 'The subnet mask must look like 255.255.255.0.',
    'mask-noncontiguous':
      'This is not a valid subnet mask: the 1-bits must be contiguous from the left (for example 255.255.240.0).',
    conflict: 'The address already has /{a}, which differs from {b}. Clear one of them.',
    kind_unspecified: 'Unspecified / “this network” (0.0.0.0/8)',
    kind_private: 'Private (RFC 1918)',
    kind_shared: 'Shared address space / carrier-grade NAT (100.64.0.0/10)',
    kind_loopback: 'Loopback (127.0.0.0/8)',
    'kind_link-local': 'Link-local (169.254.0.0/16)',
    kind_documentation: 'Documentation / examples (not routed)',
    kind_benchmarking: 'Benchmarking (198.18.0.0/15)',
    kind_multicast: 'Multicast (224.0.0.0/4)',
    kind_reserved: 'Reserved (240.0.0.0/4)',
    kind_broadcast: 'Limited broadcast (255.255.255.255)',
    kind_public: 'Public (globally routable)',
    n1: 'IPv4 only. IPv6 addresses are not supported.',
    n2: 'Usable hosts = total addresses − 2 (network and broadcast) for /0 to /30. A /31 has 2 usable hosts and a /32 has 1.',
    n3: 'Everything is calculated in your browser. Nothing is sent anywhere.',
    // CIDR & range tool
    mode: 'Convert',
    modeCidr: 'CIDR block → IP range',
    modeRange: 'IP range → CIDR blocks',
    cidrInput: 'CIDR block',
    cidrHint: 'For example 10.0.0.0/22 or 10.0.0.0/255.255.252.0.',
    start: 'First IP address',
    end: 'Last IP address',
    convert: 'Convert',
    rangeStart: 'First address',
    rangeEnd: 'Last address',
    blocks: 'CIDR blocks',
    blockCount: 'Number of blocks',
    normalised: 'The block was written with host bits set; it is the same as {cidr}.',
    'start-after-end': 'The first address must not be greater than the last address.',
    cn1: 'CIDR → range lists the first and last address in the block, including the network and broadcast addresses.',
    cn2: 'Range → CIDR returns the smallest set of blocks that covers exactly the range, with no extra addresses.',
  },
  bn: {
    address: 'IPv4 অ্যাড্রেস',
    addressHint: 'যেমন 192.168.1.10 — চাইলে এখানে 192.168.1.10/24 লিখতে পারেন।',
    prefix: 'প্রিফিক্স দৈর্ঘ্য বা সাবনেট মাস্ক',
    prefixHint: 'যেমন 24, /24 বা 255.255.255.0। অ্যাড্রেসে /24 থাকলে খালি রাখুন।',
    calculate: 'হিসাব করুন',
    cidr: 'CIDR নোটেশন',
    network: 'নেটওয়ার্ক অ্যাড্রেস',
    broadcast: 'ব্রডকাস্ট অ্যাড্রেস',
    noBroadcast31: 'নেই — /31 পয়েন্ট-টু-পয়েন্ট লিংক',
    noBroadcast32: 'নেই — /32 একক হোস্ট',
    mask: 'সাবনেট মাস্ক',
    wildcard: 'ওয়াইল্ডকার্ড মাস্ক',
    firstHost: 'প্রথম ব্যবহারযোগ্য হোস্ট',
    lastHost: 'শেষ ব্যবহারযোগ্য হোস্ট',
    usable: 'ব্যবহারযোগ্য হোস্ট',
    total: 'মোট অ্যাড্রেস',
    kind: 'অ্যাড্রেসের ধরন',
    binaryMask: 'বাইনারিতে মাস্ক',
    hostBits:
      'আপনার দেওয়া অ্যাড্রেসে হোস্ট বিট আছে, তাই নেটওয়ার্ক হলো {network}। হোস্ট অ্যাড্রেস দিলে এমনই হয়।',
    note31:
      '/31-এ আলাদা নেটওয়ার্ক বা ব্রডকাস্ট অ্যাড্রেস নেই: পয়েন্ট-টু-পয়েন্ট লিংকে দুটি অ্যাড্রেসই হোস্ট হিসেবে ব্যবহারযোগ্য (RFC 3021)। কিছু পুরোনো যন্ত্র এটি সমর্থন করে না।',
    note32: '/32 হলো একটি মাত্র অ্যাড্রেস, সাধারণত লুপব্যাক বা হোস্ট রুট।',
    note0: '/0 পুরো IPv4 অ্যাড্রেস স্পেস ধরে (ডিফল্ট রুট)।',
    empty: 'একটি IPv4 অ্যাড্রেস লিখুন।',
    format: 'ডট দিয়ে আলাদা চারটি সংখ্যা লিখুন, যেমন 192.168.1.10।',
    'octet-range': 'চারটি সংখ্যার প্রতিটি ০ থেকে ২৫৫-এর মধ্যে হতে হবে।',
    'leading-zero': 'শুরুর শূন্য বাদ দিন (10.01.0.1 নয়, 10.1.0.1 লিখুন)।',
    'prefix-empty': 'প্রিফিক্স দৈর্ঘ্য (০–৩২) বা সাবনেট মাস্ক লিখুন।',
    'prefix-range': 'প্রিফিক্স দৈর্ঘ্য ০ থেকে ৩২-এর মধ্যে পূর্ণসংখ্যা হতে হবে।',
    'mask-invalid': 'সাবনেট মাস্ক 255.255.255.0-এর মতো হতে হবে।',
    'mask-noncontiguous':
      'এটি বৈধ সাবনেট মাস্ক নয়: ১-বিটগুলো বাঁ দিক থেকে টানা হতে হবে (যেমন 255.255.240.0)।',
    conflict: 'অ্যাড্রেসে আগেই /{a} আছে, যা {b} থেকে ভিন্ন। যেকোনো একটি মুছে দিন।',
    kind_unspecified: 'অনির্দিষ্ট / “এই নেটওয়ার্ক” (0.0.0.0/8)',
    kind_private: 'প্রাইভেট (RFC 1918)',
    kind_shared: 'শেয়ার্ড অ্যাড্রেস স্পেস / ক্যারিয়ার-গ্রেড NAT (100.64.0.0/10)',
    kind_loopback: 'লুপব্যাক (127.0.0.0/8)',
    'kind_link-local': 'লিংক-লোকাল (169.254.0.0/16)',
    kind_documentation: 'ডকুমেন্টেশন / উদাহরণ (রাউট হয় না)',
    kind_benchmarking: 'বেঞ্চমার্কিং (198.18.0.0/15)',
    kind_multicast: 'মাল্টিকাস্ট (224.0.0.0/4)',
    kind_reserved: 'সংরক্ষিত (240.0.0.0/4)',
    kind_broadcast: 'লিমিটেড ব্রডকাস্ট (255.255.255.255)',
    kind_public: 'পাবলিক (ইন্টারনেটে রাউটযোগ্য)',
    n1: 'শুধু IPv4। IPv6 অ্যাড্রেস সমর্থিত নয়।',
    n2: '/0 থেকে /30 পর্যন্ত ব্যবহারযোগ্য হোস্ট = মোট অ্যাড্রেস − ২ (নেটওয়ার্ক ও ব্রডকাস্ট)। /31-এ ২টি এবং /32-এ ১টি হোস্ট।',
    n3: 'সব হিসাব আপনার ব্রাউজারেই হয়। কিছুই কোথাও পাঠানো হয় না।',
    mode: 'রূপান্তর',
    modeCidr: 'CIDR ব্লক → আইপি রেঞ্জ',
    modeRange: 'আইপি রেঞ্জ → CIDR ব্লক',
    cidrInput: 'CIDR ব্লক',
    cidrHint: 'যেমন 10.0.0.0/22 বা 10.0.0.0/255.255.252.0।',
    start: 'প্রথম আইপি অ্যাড্রেস',
    end: 'শেষ আইপি অ্যাড্রেস',
    convert: 'রূপান্তর করুন',
    rangeStart: 'প্রথম অ্যাড্রেস',
    rangeEnd: 'শেষ অ্যাড্রেস',
    blocks: 'CIDR ব্লক',
    blockCount: 'ব্লকের সংখ্যা',
    normalised: 'ব্লকটি হোস্ট বিটসহ লেখা হয়েছে; এটি {cidr}-এর সমান।',
    'start-after-end': 'প্রথম অ্যাড্রেস শেষ অ্যাড্রেসের চেয়ে বড় হতে পারবে না।',
    cn1: 'CIDR → রেঞ্জ ব্লকের প্রথম ও শেষ অ্যাড্রেস দেখায়, নেটওয়ার্ক ও ব্রডকাস্ট অ্যাড্রেসসহ।',
    cn2: 'রেঞ্জ → CIDR ঠিক ওই রেঞ্জটুকু ঢাকে এমন সবচেয়ে কম সংখ্যক ব্লক দেয়, বাড়তি কোনো অ্যাড্রেস ছাড়া।',
  },
});

type L = ReturnType<typeof S>;

/** Addresses are technical notation: always ASCII digits, marked as English text. */
const addrRow = (label: string, value: string, extra: Partial<ResultRow> = {}): ResultRow => ({
  label,
  value,
  lang: 'en',
  ...extra,
});

export const subnetCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const address = field(
    L('address'),
    textInput({ id: 'subnet-address', inputmode: 'decimal', required: '' }),
    { hint: L('addressHint') },
  );
  const prefix = field(L('prefix'), textInput({ id: 'subnet-prefix', inputmode: 'decimal' }), {
    hint: L('prefixHint'),
  });
  bindMemo(address.control, ctx.memo, 'address');
  bindMemo(prefix.control, ctx.memo, 'prefix', '24');

  const panel = resultPanel(ctx, L('calculate'));
  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': L('calculate') },
    h('div', { class: 'field-grid' }, address.el, prefix.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: L('calculate'),
      panel,
      onReset() {
        address.control.value = '';
        prefix.control.value = '24';
        Object.assign(ctx.memo, { address: '', prefix: '24', __done: '' });
        [address, prefix].forEach((f) => f.setError(null));
        panel.clear();
        address.control.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const raw = address.control.value;
      const prefixText = prefix.control.value.trim();
      let addr: number;
      let p: number;
      if (raw.includes('/')) {
        const c = parseCidr(raw);
        if (!c.ok) return [[address, L(c.error)]];
        addr = c.value.address;
        p = c.value.prefix;
        if (prefixText) {
          const q = parsePrefix(prefixText);
          if (!q.ok) return [[prefix, L(q.error)]];
          if (q.value !== p) return [[prefix, L('conflict', { a: p, b: prefixText })]];
        }
      } else {
        const errors: Array<[Field, string]> = [];
        const a = parseIPv4(raw);
        const q = parsePrefix(prefixText);
        if (!a.ok) errors.push([address, L(a.error)]);
        if (!q.ok) errors.push([prefix, L(q.error)]);
        if (!a.ok || !q.ok) return errors;
        addr = a.value;
        p = q.value;
      }

      const s = subnet(addr, p);
      const count = (n: number): string => formatInteger(n, ctx.lang);
      const broadcast =
        s.broadcast !== null
          ? addrRow(L('broadcast'), formatIPv4(s.broadcast))
          : { label: L('broadcast'), value: L(p === 31 ? 'noBroadcast31' : 'noBroadcast32') };
      const out: string[] = [];
      if (s.hostBitsSet) out.push(L('hostBits', { network: formatCidr(s.network, p) }));
      if (p === 31) out.push(L('note31'));
      if (p === 32) out.push(L('note32'));
      if (p === 0) out.push(L('note0'));
      panel.show(
        [
          addrRow(L('cidr'), formatCidr(s.network, p), { primary: true, copy: true }),
          addrRow(L('network'), formatIPv4(s.network), { copy: true }),
          broadcast,
          addrRow(L('mask'), formatIPv4(s.mask), { copy: true }),
          addrRow(L('wildcard'), formatIPv4(s.wildcard)),
          addrRow(L('firstHost'), formatIPv4(s.firstHost)),
          addrRow(L('lastHost'), formatIPv4(s.lastHost)),
          { label: L('usable'), value: count(s.usableHosts) },
          { label: L('total'), value: count(s.totalAddresses) },
          { label: L('kind'), value: kindLabel(L, addressKind(addr)) },
          addrRow(L('binaryMask'), toBinary(s.mask)),
        ],
        out,
      );
      return null;
    },
    [address, prefix],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3')]),
  );
};

const kindLabel = (L: L, kind: AddressKind): string => L(`kind_${kind}`);

export const cidrCalculator: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const mode = field(
    L('mode'),
    select(
      [
        ['cidr', L('modeCidr')],
        ['range', L('modeRange')],
      ],
      { id: 'cidr-mode' },
    ),
  );
  const cidr = field(L('cidrInput'), textInput({ id: 'cidr-block', inputmode: 'decimal' }), {
    hint: L('cidrHint'),
  });
  const start = field(L('start'), textInput({ id: 'cidr-start', inputmode: 'decimal' }));
  const end = field(L('end'), textInput({ id: 'cidr-end', inputmode: 'decimal' }));
  bindMemo(mode.control, ctx.memo, 'mode', 'cidr');
  bindMemo(cidr.control, ctx.memo, 'cidr');
  bindMemo(start.control, ctx.memo, 'start');
  bindMemo(end.control, ctx.memo, 'end');

  const panel = resultPanel(ctx, L('convert'));
  const all = [cidr, start, end];
  const syncMode = (): void => {
    const range = mode.control.value === 'range';
    cidr.el.hidden = range;
    start.el.hidden = end.el.hidden = !range;
  };
  syncMode();
  mode.control.addEventListener('change', () => {
    syncMode();
    all.forEach((f) => f.setError(null));
    ctx.memo.__done = '';
    panel.clear();
  });

  const form = h(
    'form',
    { class: 'tool-form', 'aria-label': L('convert') },
    h('div', { class: 'field-grid' }, mode.el, cidr.el, start.el, end.el),
  );
  form.append(
    formActions(ctx, {
      submitLabel: L('convert'),
      panel,
      onReset() {
        for (const f of all) {
          f.control.value = '';
          f.setError(null);
        }
        Object.assign(ctx.memo, { cidr: '', start: '', end: '', __done: '' });
        panel.clear();
        (mode.control.value === 'range' ? start : cidr).control.focus();
      },
    }),
  );

  const err = (f: Field, e: CidrError | 'start-after-end'): [Field, string] => [f, L(e)];

  wireForm(
    form,
    ctx.memo,
    () => {
      const count = (n: number): string => formatInteger(n, ctx.lang);
      if (mode.control.value === 'cidr') {
        const c = parseCidr(cidr.control.value);
        if (!c.ok) return [err(cidr, c.error)];
        const s = subnet(c.value.address, c.value.prefix);
        const block = formatCidr(s.network, s.prefix);
        panel.show(
          [
            addrRow(L('rangeStart'), formatIPv4(s.network), { primary: true, copy: true }),
            addrRow(L('rangeEnd'), formatIPv4(s.last), { primary: true, copy: true }),
            { label: L('total'), value: count(s.totalAddresses) },
            addrRow(L('cidr'), block),
            addrRow(L('mask'), formatIPv4(s.mask)),
          ],
          s.hostBitsSet ? [L('normalised', { cidr: block })] : [],
        );
        return null;
      }
      const a = parseIPv4(start.control.value);
      const b = parseIPv4(end.control.value);
      const errors: Array<[Field, string]> = [];
      if (!a.ok) errors.push(err(start, a.error));
      if (!b.ok) errors.push(err(end, b.error));
      if (!a.ok || !b.ok) return errors;
      const r = rangeToCidrs(a.value, b.value);
      if (!r.ok) return [err(end, r.error)];
      const list = r.value.map((x) => formatCidr(x.network, x.prefix));
      panel.show([
        addrRow(L('blocks'), list.join('\n'), { primary: true, copy: true }),
        { label: L('blockCount'), value: count(list.length) },
        { label: L('total'), value: count(b.value - a.value + 1) },
      ]);
      return null;
    },
    all,
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('cn1'), L('cn2'), L('n3')]),
  );
};
