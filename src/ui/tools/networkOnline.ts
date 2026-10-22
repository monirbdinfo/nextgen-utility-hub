import { toBanglaDigits } from '../../calc/digits';
import {
  DOH_ENDPOINT,
  dohUrl,
  normaliseDomain,
  parseDohJson,
  parseTrace,
  RECORD_TYPES,
  summariseLatency,
  TRACE_ENDPOINT,
  type DnsResult,
  type LatencySummary,
  type RecordType,
  type TraceInfo,
} from '../../calc/netDiag';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { NetFailure, request, type NetError } from '../../lib/net';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  type ToolContext,
  type ToolView,
} from './kit';

/** Cloudflare's privacy policy for the 1.1.1.1 public resolver (also covers /cdn-cgi/trace on 1.1.1.1). */
const CLOUDFLARE_PRIVACY = 'https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/';
const LOOKUP_TIMEOUT_MS = 8000;
const PROBE_TIMEOUT_MS = 4000;
const PROBE_GAP_MS = 200;

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notesTitle: 'About these results',
    privacyLink: 'Cloudflare 1.1.1.1 privacy policy',
    nothingYet: 'Nothing is sent until you press the button.',
    // IP lookup
    ipNotice1:
      'When you press “Show my IP”, your browser sends one HTTPS request to Cloudflare at {endpoint}.',
    ipNotice2:
      'As with any website, Cloudflare receives your IP address and basic browser details (such as the user agent) with that request. No cookies and no page address (referrer) are sent. This site does not receive or store the answer.',
    ipButton: 'Show my IP',
    ipAddress: 'Public IP address',
    ipVersion: 'IP version',
    country: 'Country (as Cloudflare sees it)',
    colo: 'Cloudflare data centre',
    httpVersion: 'HTTP version',
    tlsVersion: 'TLS version',
    ipLooking: 'Asking Cloudflare…',
    ipDone: 'Done. Cloudflare answered.',
    ipN1: 'This is the address Cloudflare sees. With a VPN, proxy or carrier-grade NAT it is the address of that service, not of your device.',
    ipN2: 'Cloudflare is contacted at 1.1.1.1, an IPv4 address, so an IPv6 address is not shown even if you have one.',
    ipN3: 'The country is Cloudflare’s estimate for the address. This tool shows no city or map and does not look up anything else.',
    // DNS lookup
    dnsNotice1:
      'When you press “Look up”, your browser sends the domain name and record type to Cloudflare’s public DNS resolver ({endpoint}) over HTTPS.',
    dnsNotice2:
      'Cloudflare also receives your IP address and basic browser details. Do not look up private or internal names you do not want to share. This site does not receive or store the query or the answer.',
    domain: 'Domain name',
    domainHint:
      'For example example.com. Internationalised names are converted to their ASCII form.',
    recordType: 'Record type',
    dnsButton: 'Look up',
    dnsLooking: 'Asking Cloudflare DNS…',
    dnsDone: 'Done. {n} record(s) found.',
    queried: 'Domain queried',
    status: 'Response',
    status_NOERROR: 'NOERROR — the domain exists',
    status_NXDOMAIN: 'NXDOMAIN — this domain does not exist',
    status_SERVFAIL:
      'SERVFAIL — the resolver could not get an answer (often a DNSSEC or server problem)',
    status_REFUSED: 'REFUSED — the query was refused',
    status_other: '{code}',
    answers: 'Records found',
    dnssec: 'DNSSEC validated by Cloudflare',
    yes: 'Yes',
    no: 'No',
    noRecords: 'No {type} records were returned for this name.',
    colName: 'Name',
    colType: 'Type',
    colTtl: 'TTL (s)',
    colData: 'Value',
    tableCaption: 'DNS records',
    'domain-empty': 'Enter a domain name.',
    'domain-invalid': 'Enter a valid domain name such as example.com.',
    'domain-too-long': 'A domain name can be at most 253 characters.',
    'domain-ip': 'Enter a domain name, not an IP address.',
    dnsN1:
      'Answers come from Cloudflare’s resolver and may be cached for up to the TTL shown. Your own network’s DNS can return different answers (for example with filtering or internal names).',
    dnsN2: 'Only public DNS is queried. Reverse (PTR) lookups and port checks are not offered.',
    // Latency
    latNotice1:
      'This test sends small HTTPS requests to the server that hosts this site ({host}), the same server your browser loaded this page from. No third party is contacted.',
    latNotice2:
      'It measures HTTPS round-trip time, not ICMP ping: browsers cannot send ping. Times include browser and server processing and depend on the nearest CDN edge, so they are usually higher than ping and only roughly comparable.',
    count: 'Number of requests',
    latButton: 'Start',
    stop: 'Stop',
    latWarmup: 'Opening the connection…',
    latProgress: 'Request {i} of {n}…',
    latDone: 'Done. {n} requests sent.',
    latStopped: 'Stopped. Results show the requests completed so far.',
    average: 'Average round-trip time',
    min: 'Fastest',
    median: 'Median',
    max: 'Slowest',
    jitter: 'Jitter (average change between requests)',
    failed: 'Failed requests',
    failedValue: '{failed} of {sent} ({pct}%)',
    samples: 'Each request (ms)',
    failedSample: 'failed',
    server: 'Server tested',
    allFailed: 'Every request failed, so no times are available.',
    latN1:
      'One warm-up request is sent first and not counted, so connection setup does not skew the results.',
    latN2:
      'A failed request is one that errored or took longer than {seconds} seconds. This is not the same as packet loss: HTTPS runs over TCP, which resends lost packets, so packet loss shows up as slower requests rather than failures.',
    latN3: 'Jitter is the average absolute difference between consecutive successful requests.',
    // Errors
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout:
      'No answer within {seconds} seconds. The service may be slow or unreachable; try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it. Nothing was received.',
    err_http:
      'The service answered with an error (HTTP {status}). If many requests were sent quickly it may be limiting them; wait a moment and try again.',
    err_parse: 'The answer was not in the expected format, so it is not shown.',
    err_aborted: 'The request was cancelled.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    privacyLink: 'Cloudflare 1.1.1.1 প্রাইভেসি নীতি',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    ipNotice1:
      '“আমার আইপি দেখুন” চাপলে আপনার ব্রাউজার {endpoint} ঠিকানায় Cloudflare-এ একটি HTTPS রিকোয়েস্ট পাঠায়।',
    ipNotice2:
      'যেকোনো ওয়েবসাইটের মতোই, ওই রিকোয়েস্টের সঙ্গে Cloudflare আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্য (যেমন ইউজার এজেন্ট) পায়। কুকি বা পেজের ঠিকানা (রেফারার) পাঠানো হয় না। এই সাইট উত্তরটি গ্রহণ বা সংরক্ষণ করে না।',
    ipButton: 'আমার আইপি দেখুন',
    ipAddress: 'পাবলিক আইপি অ্যাড্রেস',
    ipVersion: 'আইপি সংস্করণ',
    country: 'দেশ (Cloudflare-এর হিসাবে)',
    colo: 'Cloudflare ডেটা সেন্টার',
    httpVersion: 'HTTP সংস্করণ',
    tlsVersion: 'TLS সংস্করণ',
    ipLooking: 'Cloudflare-এর কাছে জানতে চাওয়া হচ্ছে…',
    ipDone: 'সম্পন্ন। Cloudflare উত্তর দিয়েছে।',
    ipN1: 'এটি Cloudflare যে অ্যাড্রেস দেখে সেটি। ভিপিএন, প্রক্সি বা ক্যারিয়ার-গ্রেড NAT থাকলে এটি সেই সার্ভিসের অ্যাড্রেস, আপনার ডিভাইসের নয়।',
    ipN2: 'Cloudflare-এ যোগাযোগ হয় 1.1.1.1 (একটি IPv4 অ্যাড্রেস) দিয়ে, তাই আপনার IPv6 থাকলেও তা দেখানো হয় না।',
    ipN3: 'দেশটি অ্যাড্রেস অনুযায়ী Cloudflare-এর অনুমান। এই টুল কোনো শহর বা মানচিত্র দেখায় না এবং অন্য কিছু খোঁজে না।',
    dnsNotice1:
      '“খুঁজুন” চাপলে আপনার ব্রাউজার ডোমেইনের নাম ও রেকর্ডের ধরন HTTPS-এর মাধ্যমে Cloudflare-এর পাবলিক ডিএনএস রিজলভারে ({endpoint}) পাঠায়।',
    dnsNotice2:
      'Cloudflare আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্যও পায়। যে প্রাইভেট বা অভ্যন্তরীণ নাম শেয়ার করতে চান না তা খুঁজবেন না। এই সাইট প্রশ্ন বা উত্তর গ্রহণ বা সংরক্ষণ করে না।',
    domain: 'ডোমেইন নাম',
    domainHint: 'যেমন example.com। আন্তর্জাতিক (যেমন বাংলা) নাম ASCII রূপে রূপান্তর করা হয়।',
    recordType: 'রেকর্ডের ধরন',
    dnsButton: 'খুঁজুন',
    dnsLooking: 'Cloudflare ডিএনএস-এর কাছে জানতে চাওয়া হচ্ছে…',
    dnsDone: 'সম্পন্ন। {n}টি রেকর্ড পাওয়া গেছে।',
    queried: 'যে ডোমেইন খোঁজা হয়েছে',
    status: 'উত্তর',
    status_NOERROR: 'NOERROR — ডোমেইনটি আছে',
    status_NXDOMAIN: 'NXDOMAIN — এই ডোমেইনটি নেই',
    status_SERVFAIL: 'SERVFAIL — রিজলভার উত্তর পায়নি (প্রায়ই DNSSEC বা সার্ভারের সমস্যা)',
    status_REFUSED: 'REFUSED — প্রশ্নটি প্রত্যাখ্যাত হয়েছে',
    status_other: '{code}',
    answers: 'পাওয়া রেকর্ড',
    dnssec: 'Cloudflare-এর DNSSEC যাচাই',
    yes: 'হ্যাঁ',
    no: 'না',
    noRecords: 'এই নামের জন্য কোনো {type} রেকর্ড পাওয়া যায়নি।',
    colName: 'নাম',
    colType: 'ধরন',
    colTtl: 'TTL (সে.)',
    colData: 'মান',
    tableCaption: 'ডিএনএস রেকর্ড',
    'domain-empty': 'একটি ডোমেইন নাম লিখুন।',
    'domain-invalid': 'example.com-এর মতো একটি বৈধ ডোমেইন নাম লিখুন।',
    'domain-too-long': 'ডোমেইন নাম সর্বোচ্চ ২৫৩ অক্ষরের হতে পারে।',
    'domain-ip': 'আইপি অ্যাড্রেস নয়, ডোমেইন নাম লিখুন।',
    dnsN1:
      'উত্তরগুলো Cloudflare-এর রিজলভার থেকে আসে এবং দেখানো TTL পর্যন্ত ক্যাশ থাকতে পারে। আপনার নিজের নেটওয়ার্কের ডিএনএস ভিন্ন উত্তর দিতে পারে (যেমন ফিল্টারিং বা অভ্যন্তরীণ নামের ক্ষেত্রে)।',
    dnsN2: 'শুধু পাবলিক ডিএনএস খোঁজা হয়। রিভার্স (PTR) লুকআপ ও পোর্ট পরীক্ষা নেই।',
    latNotice1:
      'এই পরীক্ষা এই সাইটের সার্ভারে ({host}) ছোট ছোট HTTPS রিকোয়েস্ট পাঠায় — যে সার্ভার থেকে আপনার ব্রাউজার এই পেজটি এনেছে। কোনো তৃতীয় পক্ষের সঙ্গে যোগাযোগ হয় না।',
    latNotice2:
      'এটি HTTPS রাউন্ড-ট্রিপ সময় মাপে, ICMP পিং নয়: ব্রাউজার পিং পাঠাতে পারে না। সময়ের মধ্যে ব্রাউজার ও সার্ভারের প্রক্রিয়াকরণ থাকে এবং কাছের CDN এজের উপর নির্ভর করে, তাই এটি সাধারণত পিংয়ের চেয়ে বেশি এবং কেবল মোটামুটি তুলনীয়।',
    count: 'রিকোয়েস্টের সংখ্যা',
    latButton: 'শুরু',
    stop: 'থামান',
    latWarmup: 'সংযোগ খোলা হচ্ছে…',
    latProgress: '{n}টির মধ্যে {i} নম্বর রিকোয়েস্ট…',
    latDone: 'সম্পন্ন। {n}টি রিকোয়েস্ট পাঠানো হয়েছে।',
    latStopped: 'থামানো হয়েছে। এ পর্যন্ত শেষ হওয়া রিকোয়েস্টের ফল দেখানো হচ্ছে।',
    average: 'গড় রাউন্ড-ট্রিপ সময়',
    min: 'সবচেয়ে দ্রুত',
    median: 'মধ্যমা',
    max: 'সবচেয়ে ধীর',
    jitter: 'জিটার (রিকোয়েস্টের মধ্যে গড় পরিবর্তন)',
    failed: 'ব্যর্থ রিকোয়েস্ট',
    failedValue: '{sent}টির মধ্যে {failed}টি ({pct}%)',
    samples: 'প্রতিটি রিকোয়েস্ট (মি.সে.)',
    failedSample: 'ব্যর্থ',
    server: 'যে সার্ভার পরীক্ষা করা হয়েছে',
    allFailed: 'সব রিকোয়েস্ট ব্যর্থ হয়েছে, তাই কোনো সময় পাওয়া যায়নি।',
    latN1:
      'প্রথমে একটি ওয়ার্ম-আপ রিকোয়েস্ট পাঠানো হয় যা গণনায় ধরা হয় না, যাতে সংযোগ স্থাপনের সময় ফলকে প্রভাবিত না করে।',
    latN2:
      'ব্যর্থ রিকোয়েস্ট মানে যেটিতে ত্রুটি হয়েছে বা {seconds} সেকেন্ডের বেশি লেগেছে। এটি প্যাকেট লসের সমান নয়: HTTPS চলে TCP-এর উপর, যা হারানো প্যাকেট আবার পাঠায়, তাই প্যাকেট লস ব্যর্থতা নয় বরং ধীর রিকোয়েস্ট হিসেবে দেখা যায়।',
    latN3: 'জিটার হলো পরপর সফল রিকোয়েস্টগুলোর সময়ের পার্থক্যের গড়।',
    err_offline: 'আপনার ব্রাউজার জানাচ্ছে যে এটি অফলাইন। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      '{seconds} সেকেন্ডের মধ্যে কোনো উত্তর আসেনি। সার্ভিসটি ধীর বা নাগালের বাইরে থাকতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন হয়নি। আপনার সংযোগ, ফায়ারওয়াল, কোনো ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) বা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে দিয়ে থাকতে পারে। কিছুই পাওয়া যায়নি।',
    err_http:
      'সার্ভিসটি ত্রুটিসহ উত্তর দিয়েছে (HTTP {status})। দ্রুত অনেক রিকোয়েস্ট পাঠালে এটি সীমিত করতে পারে; একটু অপেক্ষা করে আবার চেষ্টা করুন।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
  },
});

type L = ReturnType<typeof S>;

function errorText(L: L, e: unknown, timeoutMs: number): string {
  const kind: NetError = e instanceof NetFailure ? e.kind : 'blocked';
  return L(`err_${kind}`, {
    seconds: timeoutMs / 1000,
    status: e instanceof NetFailure && e.status ? String(e.status) : '?',
  });
}

/** The privacy notice shown above the button, before anything is sent. */
function privacyNotice(L: L, paragraphs: string[], withPolicy: boolean): HTMLElement {
  return h(
    'aside',
    { class: 'net-notice', 'aria-labelledby': 'net-notice-title' },
    h('h2', { id: 'net-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
    ...paragraphs.map((p) => h('p', {}, p)),
    h('p', { class: 'net-notice-strong' }, L('nothingYet')),
    withPolicy
      ? h(
          'p',
          {},
          h('a', { href: CLOUDFLARE_PRIVACY, rel: 'noopener noreferrer' }, L('privacyLink')),
        )
      : null,
  );
}

/** Progress (polite) and error (assertive) messages for a request. */
function statusArea(): {
  el: HTMLElement;
  progress(text: string): void;
  error(text: string): void;
  clear(): void;
} {
  const progress = h('p', { class: 'net-status', role: 'status' });
  const error = h('p', { class: 'net-error', role: 'alert', hidden: '' });
  return {
    el: h('div', { class: 'net-status-area' }, progress, error),
    progress(text) {
      progress.textContent = text;
      error.textContent = '';
      error.hidden = true;
    },
    error(text) {
      progress.textContent = '';
      error.textContent = text;
      error.hidden = false;
    },
    clear() {
      progress.textContent = '';
      error.textContent = '';
      error.hidden = true;
    },
  };
}

const local = (ctx: ToolContext, s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);

/** Abort in-flight requests when the user leaves the tool or switches language. */
function abortOnCleanup(ctx: ToolContext): () => AbortController {
  let ctrl: AbortController | null = null;
  ctx.onCleanup(() => ctrl?.abort());
  return () => {
    ctrl?.abort();
    ctrl = new AbortController();
    return ctrl;
  };
}

function busy(form: HTMLFormElement, on: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) submit.disabled = on;
  form.setAttribute('aria-busy', String(on));
}

// ---------- IP Lookup ----------

export const ipLookup: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const panel = resultPanel(ctx, L('ipButton'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const render = (info: TraceInfo): void => {
    panel.show(
      [
        { label: L('ipAddress'), value: info.ip, lang: 'en', primary: true, copy: true },
        { label: L('ipVersion'), value: local(ctx, `IPv${info.family}`) },
        ...(info.country
          ? [{ label: L('country'), value: info.country, lang: 'en' as const }]
          : []),
        ...(info.colo ? [{ label: L('colo'), value: info.colo, lang: 'en' as const }] : []),
        ...(info.http ? [{ label: L('httpVersion'), value: info.http, lang: 'en' as const }] : []),
        ...(info.tls ? [{ label: L('tlsVersion'), value: info.tls, lang: 'en' as const }] : []),
      ],
      [L('ipN1')],
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('ipButton') });
  form.noValidate = true;
  form.append(
    privacyNotice(L, [L('ipNotice1', { endpoint: TRACE_ENDPOINT }), L('ipNotice2')], true),
    formActions(ctx, {
      submitLabel: L('ipButton'),
      panel,
      onReset() {
        next().abort();
        ctx.session.delete('ip');
        busy(form, false);
        status.clear();
        panel.clear();
      },
    }),
    status.el,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ctrl = next();
    busy(form, true);
    status.progress(L('ipLooking'));
    try {
      const res = await request(TRACE_ENDPOINT, {
        timeoutMs: LOOKUP_TIMEOUT_MS,
        signal: ctrl.signal,
      });
      const parsed = parseTrace(await res.text());
      if (!parsed.ok) throw new NetFailure('parse');
      ctx.session.set('ip', parsed.value);
      render(parsed.value);
      status.progress(L('ipDone'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      panel.clear();
      status.error(errorText(L, err, LOOKUP_TIMEOUT_MS));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  // A language switch re-renders the view: show the earlier answer again without a new request.
  const last = ctx.session.get('ip') as TraceInfo | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('ipN1'), L('ipN2'), L('ipN3')], L('notesTitle')),
  );
};

// ---------- DNS Lookup ----------

interface DnsSession {
  domain: string;
  type: RecordType;
  result: DnsResult;
}

export const dnsLookup: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const domain = field(
    L('domain'),
    textInput({ id: 'dns-domain', inputmode: 'url', required: '', autocapitalize: 'off' }),
    { hint: L('domainHint') },
  );
  const type = field(
    L('recordType'),
    select(
      RECORD_TYPES.map((r) => [r, r]),
      { id: 'dns-type' },
    ),
  );
  bindMemo(domain.control, ctx.memo, 'domain');
  bindMemo(type.control, ctx.memo, 'type', 'A');

  const status = statusArea();
  const tableWrap = h('div', { class: 'dns-table-wrap', hidden: '' });
  const panel = resultPanel(ctx, L('dnsButton'));
  panel.el.querySelector('.result-body')?.after(tableWrap);
  const next = abortOnCleanup(ctx);
  let copyText = '';

  const statusLabel = (r: DnsResult): string =>
    ['NOERROR', 'NXDOMAIN', 'SERVFAIL', 'REFUSED'].includes(r.statusName)
      ? L(`status_${r.statusName as 'NOERROR'}`)
      : L('status_other', { code: r.statusName });

  const render = ({ domain: name, type: rtype, result }: DnsSession): void => {
    const notesOut: string[] = [];
    if (result.status === 0 && !result.answers.length)
      notesOut.push(L('noRecords', { type: rtype }));
    panel.show(
      [
        { label: L('queried'), value: `${name} (${rtype})`, lang: 'en', primary: true },
        { label: L('status'), value: statusLabel(result) },
        { label: L('answers'), value: local(ctx, String(result.answers.length)) },
        { label: L('dnssec'), value: L(result.authenticated ? 'yes' : 'no') },
      ],
      notesOut,
    );
    tableWrap.hidden = !result.answers.length;
    tableWrap.replaceChildren();
    copyText = result.answers.map((a) => `${a.name}\t${a.type}\t${a.ttl}\t${a.data}`).join('\n');
    if (!result.answers.length) return;
    tableWrap.append(
      h(
        'table',
        { class: 'dns-table' },
        h('caption', { class: 'sr-only' }, L('tableCaption')),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            ...(['colName', 'colType', 'colTtl', 'colData'] as const).map((k) =>
              h('th', { scope: 'col' }, L(k)),
            ),
          ),
        ),
        h(
          'tbody',
          {},
          ...result.answers.map((a) =>
            h(
              'tr',
              {},
              h('td', { lang: 'en' }, a.name),
              h('td', { lang: 'en' }, a.type),
              h('td', {}, local(ctx, String(a.ttl))),
              h('td', { lang: 'en', class: 'dns-data' }, a.data),
            ),
          ),
        ),
      ),
    );
  };

  const clearResult = (): void => {
    panel.clear();
    tableWrap.hidden = true;
    tableWrap.replaceChildren();
    copyText = '';
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('dnsButton') });
  form.noValidate = true;
  form.append(
    privacyNotice(L, [L('dnsNotice1', { endpoint: DOH_ENDPOINT }), L('dnsNotice2')], true),
    h('div', { class: 'field-grid' }, domain.el, type.el),
    formActions(ctx, {
      submitLabel: L('dnsButton'),
      panel,
      copy: { label: ctx.t('copyResult'), text: () => copyText || panel.text(), emptyMessage: '' },
      onReset() {
        next().abort();
        domain.control.value = '';
        type.control.value = 'A';
        Object.assign(ctx.memo, { domain: '', type: 'A' });
        ctx.session.delete('dns');
        domain.setError(null);
        busy(form, false);
        status.clear();
        clearResult();
        domain.control.focus();
      },
    }),
    status.el,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    domain.setError(null);
    const name = normaliseDomain(domain.control.value);
    if (!name.ok) {
      domain.setError(L(name.error));
      domain.control.focus();
      return;
    }
    const rtype = type.control.value as RecordType;
    const ctrl = next();
    busy(form, true);
    status.progress(L('dnsLooking'));
    try {
      const res = await request(dohUrl(name.value, rtype), {
        timeoutMs: LOOKUP_TIMEOUT_MS,
        headers: { accept: 'application/dns-json' },
        signal: ctrl.signal,
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new NetFailure('parse');
      }
      const parsed = parseDohJson(body);
      if (!parsed.ok) throw new NetFailure('parse');
      const session: DnsSession = { domain: name.value, type: rtype, result: parsed.value };
      ctx.session.set('dns', session);
      render(session);
      status.progress(L('dnsDone', { n: parsed.value.answers.length }));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      clearResult();
      status.error(errorText(L, err, LOOKUP_TIMEOUT_MS));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('dns') as DnsSession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('dnsN1'), L('dnsN2')], L('notesTitle')),
  );
};

// ---------- Latency & failed-request check ----------

interface LatencySession {
  samples: Array<number | null>;
  host: string;
}

/** Same-origin file shipped in public/; a unique query string defeats every cache. */
export const probeUrl = (n: number): string =>
  new URL(`latency-probe.txt?n=${Date.now().toString(36)}-${n}`, document.baseURI).toString();

async function probe(n: number, signal: AbortSignal): Promise<number | null> {
  const start = performance.now();
  try {
    const res = await request(probeUrl(n), { timeoutMs: PROBE_TIMEOUT_MS, signal });
    await res.text();
    return performance.now() - start;
  } catch (e) {
    if (e instanceof NetFailure && e.kind === 'aborted') throw e;
    if (e instanceof NetFailure && e.kind === 'offline') throw e;
    return null;
  }
}

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });

export const latencyTest: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const count = field(
    L('count'),
    select(
      ['5', '10', '20'].map((n) => [n, local(ctx, n)]),
      { id: 'latency-count' },
    ),
  );
  bindMemo(count.control, ctx.memo, 'count', '10');
  const host = location.host || location.origin;

  const panel = resultPanel(ctx, L('latButton'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);
  const stopBtn = h(
    'button',
    { type: 'button', class: 'btn', id: 'latency-stop', hidden: '' },
    L('stop'),
  );
  let stopped = false;

  const ms = (x: number | null): string => (x === null ? '—' : `${local(ctx, x.toFixed(1))} ms`);

  const render = ({ samples, host: tested }: LatencySession): void => {
    const s: LatencySummary = summariseLatency(samples);
    panel.show(
      [
        { label: L('average'), value: ms(s.avg), primary: true },
        { label: L('min'), value: ms(s.min) },
        { label: L('median'), value: ms(s.median) },
        { label: L('max'), value: ms(s.max) },
        { label: L('jitter'), value: ms(s.jitter) },
        {
          label: L('failed'),
          value: L('failedValue', {
            failed: s.failed,
            sent: s.sent,
            pct: local(ctx, s.failedPercent.toFixed(s.failedPercent % 1 ? 1 : 0)),
          }),
        },
        {
          label: L('samples'),
          value: samples
            .map((x) => (x === null ? L('failedSample') : local(ctx, x.toFixed(0))))
            .join(', '),
        },
        { label: L('server'), value: tested, lang: 'en' },
      ],
      s.received ? [] : [L('allFailed')],
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('latButton') });
  form.noValidate = true;
  const actions = formActions(ctx, {
    submitLabel: L('latButton'),
    panel,
    onReset() {
      next().abort();
      count.control.value = '10';
      ctx.memo.count = '10';
      ctx.session.delete('latency');
      finish();
      status.clear();
      panel.clear();
    },
  });
  actions.querySelector('button[type="submit"]')?.after(stopBtn);
  form.append(
    privacyNotice(L, [L('latNotice1', { host }), L('latNotice2')], false),
    h('div', { class: 'field-grid' }, count.el),
    actions,
    status.el,
  );

  function finish(): void {
    busy(form, false);
    stopBtn.hidden = true;
    count.control.disabled = false;
  }

  stopBtn.addEventListener('click', () => {
    stopped = true;
    next().abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = Number(count.control.value) || 10;
    const ctrl = next();
    stopped = false;
    busy(form, true);
    count.control.disabled = true;
    stopBtn.hidden = false;
    stopBtn.focus();
    const samples: Array<number | null> = [];
    try {
      status.progress(L('latWarmup'));
      await probe(0, ctrl.signal);
      for (let i = 1; i <= n && !ctrl.signal.aborted; i++) {
        status.progress(L('latProgress', { i, n }));
        samples.push(await probe(i, ctrl.signal));
        if (i < n) await wait(PROBE_GAP_MS, ctrl.signal);
      }
      status.progress(L('latDone', { n }));
    } catch (err) {
      if (!(err instanceof NetFailure && err.kind === 'aborted')) {
        status.error(errorText(L, err, PROBE_TIMEOUT_MS));
      }
    }
    if (stopped) status.progress(L('latStopped'));
    else if (ctrl.signal.aborted) return; // left the tool or reset
    const session: LatencySession = { samples, host };
    if (samples.length) {
      ctx.session.set('latency', session);
      render(session);
    }
    finish();
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  });

  const last = ctx.session.get('latency') as LatencySession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(
      ctx,
      [L('latN1'), L('latN2', { seconds: PROBE_TIMEOUT_MS / 1000 }), L('latN3')],
      L('notesTitle'),
    ),
  );
};
