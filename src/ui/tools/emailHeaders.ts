import {
  analyzeHeaders,
  MAX_HEADER_CHARS,
  type EmailAnalysis,
  type Hop,
} from '../../calc/emailHeaders';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  wireForm,
  type ResultRow,
  type ToolView,
} from './kit';

const S = defineStrings({
  en: {
    input: 'Email headers',
    inputHint:
      'Paste only the header block (the lines above the first blank line). Use “Show original” or “View source” in your mail app. Headers often contain IP addresses; nothing is sent from this page.',
    btn: 'Analyse headers',
    fromAddr: 'From',
    fromDomain: 'Sender domain',
    to: 'To',
    subject: 'Subject',
    date: 'Date',
    messageId: 'Message-ID',
    returnPath: 'Return-Path',
    replyTo: 'Reply-To',
    dkimSigned: 'DKIM signature present',
    spf: 'SPF result',
    dkim: 'DKIM result',
    dmarc: 'DMARC result',
    hops: 'Servers the message passed through',
    hopsTitle: 'Delivery path (oldest first)',
    colHop: 'Hop',
    colFrom: 'From',
    colBy: 'By',
    colWith: 'Protocol',
    colIp: 'IP address',
    colTime: 'Time (UTC)',
    colDelay: 'Delay',
    none: 'Not found',
    yes: 'Yes',
    no: 'No',
    firstHop: 'first',
    seconds: '{n} s',
    w_from_missing: 'There is no From header, so the sender cannot be identified.',
    w_no_received: 'No Received lines were found, so the delivery path cannot be shown.',
    w_no_auth_results:
      'No Authentication-Results or Received-SPF header was found, so the message has no recorded sender checks.',
    w_spf_not_pass:
      'SPF did not pass: the sending server is not authorised by the sender domain for this message.',
    w_dkim_not_pass: 'DKIM did not pass: the signature could not be verified.',
    w_dmarc_not_pass:
      'DMARC did not pass: the message does not align with the sender’s published policy.',
    w_return_path_domain_differs:
      'The Return-Path domain differs from the From domain. This is common for newsletters and forwarding, but also seen in spoofed mail.',
    w_reply_to_domain_differs:
      'Replies go to a different domain from the sender. Check it before replying with personal or payment information.',
    w_clock_skew:
      'One hop is timestamped earlier than the hop before it. Server clocks may differ.',
    e_empty: 'Paste the header block.',
    'e_too-long':
      'That is longer than {max} characters. Paste only the header block, not the message body.',
    'e_no-headers': 'No header fields were found. Paste lines such as “From: name <address>”.',
    summaryNote:
      'Results are read from the text you pasted. Authentication results are what the receiving server recorded; they are not checked again here.',
    n1: 'Hops are listed oldest first. A delay is the time between one hop and the next; large or negative values can mean slow relays or clock differences.',
    n2: 'Only the header block is analysed. The message body is never needed.',
    n3: 'Everything here runs in your browser. Nothing is sent or stored.',
  },
  bn: {
    input: 'ইমেইল হেডার',
    inputHint:
      'শুধু হেডারের অংশটি পেস্ট করুন (প্রথম খালি লাইনের আগের সব লাইন)। মেইল অ্যাপে “Show original” বা “View source” থেকে নিন। হেডারে প্রায়ই IP অ্যাড্রেস থাকে; এই পেজ থেকে কিছুই পাঠানো হয় না।',
    btn: 'হেডার বিশ্লেষণ করুন',
    fromAddr: 'প্রেরক (From)',
    fromDomain: 'প্রেরকের ডোমেইন',
    to: 'প্রাপক (To)',
    subject: 'বিষয়',
    date: 'তারিখ',
    messageId: 'Message-ID',
    returnPath: 'Return-Path',
    replyTo: 'Reply-To',
    dkimSigned: 'DKIM স্বাক্ষর আছে',
    spf: 'SPF ফল',
    dkim: 'DKIM ফল',
    dmarc: 'DMARC ফল',
    hops: 'বার্তাটি যে সার্ভারগুলো পেরিয়েছে',
    hopsTitle: 'বার্তার পথ (সবচেয়ে পুরোনো প্রথমে)',
    colHop: 'ধাপ',
    colFrom: 'থেকে',
    colBy: 'দিয়ে',
    colWith: 'প্রোটোকল',
    colIp: 'IP অ্যাড্রেস',
    colTime: 'সময় (UTC)',
    colDelay: 'বিলম্ব',
    none: 'পাওয়া যায়নি',
    yes: 'হ্যাঁ',
    no: 'না',
    firstHop: 'প্রথম',
    seconds: '{n} সেকেন্ড',
    w_from_missing: 'From হেডার নেই, তাই প্রেরককে চিহ্নিত করা যাচ্ছে না।',
    w_no_received: 'কোনো Received লাইন নেই, তাই বার্তার পথ দেখানো যাচ্ছে না।',
    w_no_auth_results:
      'কোনো Authentication-Results বা Received-SPF হেডার নেই, তাই প্রেরক-যাচাইয়ের কোনো রেকর্ড নেই।',
    w_spf_not_pass: 'SPF পাস করেনি: প্রেরক ডোমেইন এই সার্ভারকে এই বার্তা পাঠানোর অনুমতি দেয়নি।',
    w_dkim_not_pass: 'DKIM পাস করেনি: স্বাক্ষর যাচাই করা যায়নি।',
    w_dmarc_not_pass: 'DMARC পাস করেনি: বার্তাটি প্রেরকের ঘোষিত নীতির সঙ্গে মেলেনি।',
    w_return_path_domain_differs:
      'Return-Path ডোমেইন From ডোমেইন থেকে ভিন্ন। নিউজলেটার ও ফরওয়ার্ডিংয়ে এটি স্বাভাবিক, তবে জাল মেইলেও দেখা যায়।',
    w_reply_to_domain_differs:
      'উত্তর অন্য ডোমেইনে যাবে। ব্যক্তিগত বা পেমেন্টের তথ্য পাঠানোর আগে যাচাই করুন।',
    w_clock_skew: 'একটি ধাপের সময় আগের ধাপের চেয়ে আগের দেখাচ্ছে। সার্ভারের ঘড়ি ভিন্ন হতে পারে।',
    e_empty: 'হেডার অংশটি পেস্ট করুন।',
    'e_too-long': 'এটি {max} অক্ষরের বেশি। শুধু হেডার অংশ পেস্ট করুন, মেইলের মূল লেখা নয়।',
    'e_no-headers': 'কোনো হেডার ফিল্ড পাওয়া যায়নি। “From: নাম <ঠিকানা>”-এর মতো লাইন পেস্ট করুন।',
    summaryNote:
      'ফল আপনার পেস্ট করা লেখা থেকে পড়া হয়েছে। প্রমাণীকরণের ফল গ্রহণকারী সার্ভার যা রেকর্ড করেছে তাই; এখানে আবার যাচাই করা হয় না।',
    n1: 'ধাপগুলো সবচেয়ে পুরোনো প্রথমে। বিলম্ব হলো একটি ধাপ থেকে পরের ধাপের সময়ের ব্যবধান; বড় বা ঋণাত্মক মান মানে ধীর রিলে বা ঘড়ির পার্থক্য।',
    n2: 'শুধু হেডার অংশ বিশ্লেষণ করা হয়। মেইলের মূল লেখা লাগে না।',
    n3: 'সব কাজ আপনার ব্রাউজারেই হয়। কিছুই পাঠানো বা সংরক্ষণ করা হয় না।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const shown = (x: string | null, L: L): string => x ?? L('none');
const yesNo = (x: boolean, L: L): string => (x ? L('yes') : L('no'));
const dash = (ms: number | null): string =>
  ms === null ? '—' : new Date(ms).toISOString().replace('T', ' ').slice(0, 19);

function hopsTable(L: L, hops: Hop[]): HTMLElement {
  return h(
    'table',
    { class: 'dns-table hop-table' },
    h('caption', { class: 'sr-only' }, L('hopsTitle')),
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        ...(['colHop', 'colFrom', 'colBy', 'colWith', 'colIp', 'colTime', 'colDelay'] as const).map(
          (k) => h('th', { scope: 'col' }, L(k)),
        ),
      ),
    ),
    h(
      'tbody',
      {},
      ...hops.map((hop, i) =>
        h(
          'tr',
          {},
          h('td', {}, i === 0 ? L('firstHop') : String(i + 1)),
          h('td', { lang: 'en' }, hop.from ?? L('none')),
          h('td', { lang: 'en' }, hop.by ?? L('none')),
          h('td', { lang: 'en' }, hop.with ?? L('none')),
          h('td', { lang: 'en' }, hop.ip ?? L('none')),
          h('td', { lang: 'en' }, dash(hop.time)),
          h(
            'td',
            { lang: 'en' },
            hop.delaySeconds === null ? '—' : L('seconds', { n: hop.delaySeconds }),
          ),
        ),
      ),
    ),
  );
}

function summaryRows(L: L, a: EmailAnalysis): ResultRow[] {
  return [
    { label: L('fromAddr'), value: shown(a.from, L), lang: 'en', primary: true, copy: true },
    { label: L('fromDomain'), value: shown(a.fromDomain, L), lang: 'en' },
    { label: L('to'), value: shown(a.to, L), lang: 'en' },
    { label: L('subject'), value: shown(a.subject, L) },
    { label: L('date'), value: shown(a.date, L), lang: 'en' },
    { label: L('messageId'), value: shown(a.messageId, L), lang: 'en' },
    { label: L('returnPath'), value: shown(a.returnPath, L), lang: 'en' },
    { label: L('replyTo'), value: shown(a.replyTo, L), lang: 'en' },
    { label: L('dkimSigned'), value: yesNo(a.dkimSigned, L) },
    { label: L('spf'), value: shown(a.auth.spf, L), lang: 'en' },
    { label: L('dkim'), value: shown(a.auth.dkim, L), lang: 'en' },
    { label: L('dmarc'), value: shown(a.auth.dmarc, L), lang: 'en' },
  ];
}

export const emailHeaderAnalyzer: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const area = h('textarea', {
    id: 'mail-headers',
    class: 'input textarea textarea-lg',
    rows: '12',
    spellcheck: 'false',
    autocapitalize: 'off',
  });
  bindMemo(area, ctx.memo, 'headers');
  const input = field(L('input'), area, { hint: L('inputHint') });

  const panel = resultPanel(ctx, L('btn'));
  const hops = h('div', { class: 'hop-wrap' });
  const form = h('form', { class: 'tool-form', 'aria-label': L('btn') });
  form.noValidate = true;
  form.append(
    input.el,
    formActions(ctx, {
      submitLabel: L('btn'),
      panel,
      onReset() {
        area.value = '';
        ctx.memo.headers = '';
        ctx.memo.__done = '';
        input.setError(null);
        hops.replaceChildren();
        panel.clear();
        area.focus();
      },
    }),
  );

  wireForm(
    form,
    ctx.memo,
    () => {
      const r = analyzeHeaders(area.value);
      if (!r.ok) {
        hops.replaceChildren();
        return [
          [input, L(`e_${r.error}` as Key, { max: MAX_HEADER_CHARS.toLocaleString('en-US') })],
        ];
      }
      input.setError(null);
      const a = r.value;
      panel.show(summaryRows(L, a), [
        ...a.warnings.map((w) => L(`w_${w.replace(/-/g, '_')}` as Key)),
        L('summaryNote'),
      ]);
      hops.replaceChildren(
        h('h3', { class: 'hop-title' }, L('hops'), ` (${a.hops.length})`),
        a.hops.length
          ? h(
              'div',
              {
                class: 'dns-table-wrap',
                role: 'region',
                tabindex: '0',
                'aria-label': L('hopsTitle'),
              },
              hopsTable(L, a.hops),
            )
          : h('p', { class: 'result-empty' }, L('none')),
      );
      return null;
    },
    [input],
  );

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    hops,
    notes(ctx, [L('n1'), L('n2'), L('n3')]),
  );
};
