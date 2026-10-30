import { CYMRU_INFO } from '../../calc/cymru';
import { BLOCKLISTS } from '../../calc/dnsbl';
import { toBanglaDigits } from '../../calc/digits';
import { parseIPv4 } from '../../calc/ipv4';
import { DOH_ENDPOINT } from '../../calc/netDiag';
import { parseIpInput } from '../../calc/rdap';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import {
  checkBlocklists,
  LOOKUP_TIMEOUT_MS,
  lookupNetwork,
  publicIp,
  type ListResult,
  type NetworkInfo,
} from '../../lib/ipIntel';
import { NetFailure, type NetError } from '../../lib/net';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  textInput,
  type ResultRow,
  type ToolContext,
  type ToolView,
} from './kit';
import { abortOnCleanup, busy, statusArea } from './networkOnline';

const CLOUDFLARE_PRIVACY = 'https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/';

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    nothingYet: 'Nothing is sent until you press the button.',
    notesTitle: 'About these results',
    privacyLink: 'Cloudflare 1.1.1.1 privacy policy',
    cymruLink: 'About Team Cymru’s IP-to-ASN data',
    dnsNotice:
      'The questions go over HTTPS to Cloudflare’s public DNS resolver ({endpoint}). Cloudflare receives the address being looked up, your own IP address and basic browser details; it then asks {target} on your behalf, so they see Cloudflare’s resolver, not you. No cookies and no page address (referrer) are sent, and this site does not receive or store anything.',
    // What Is My ISP
    ispButton: 'Find my ISP',
    ispNotice1:
      'When you press “Find my ISP”, your browser first asks Cloudflare ({trace}) for your public IP address, then asks Team Cymru’s IP-to-ASN service, through DNS, which network announces that address.',
    ispLooking: 'Asking Cloudflare for your public IP address…',
    ispLooking2: 'Looking up the network for {ip}…',
    // IP Location
    locButton: 'Look up',
    locIn: 'Public IP address',
    locHint: 'For example 8.8.8.8 or 2001:4860:4860::8888.',
    locNotice1:
      'When you press “Look up”, your browser asks Team Cymru’s IP-to-ASN service, through DNS, which network announces the address you typed and which country its address block is registered in.',
    locLooking: 'Looking up {ip}…',
    // Shared result rows
    done: 'Done.',
    rIp: 'Your public IP address (IPv4)',
    rQueried: 'Address looked up',
    rNetwork: 'Network (AS name)',
    rAsn: 'Autonomous system number',
    rPrefix: 'Announced address block',
    rCountry: 'Country the block is registered in',
    rRegistry: 'Registry',
    rAllocated: 'Block allocated',
    rSource: 'Source',
    sourceCymru: 'Team Cymru IP-to-ASN mapping, via Cloudflare DNS',
    rAt: 'Checked at',
    notPublished: 'Not published',
    noRoute: 'Team Cymru has no route for this address',
    noRouteNote:
      'No network currently announces this address on the internet, or Team Cymru does not know of one. It may be unused, newly assigned or not routed publicly.',
    noAnswer:
      'Cloudflare’s resolver could not get an answer from Team Cymru ({status}). Try again later.',
    e_empty: 'Enter an IP address.',
    e_invalid: 'Enter a valid IPv4 or IPv6 address.',
    'e_not-public':
      'That is a private, local or special-purpose address. It is not registered to any network on the internet.',
    // Blacklist
    blButton: 'Check lists',
    blIn: 'Public IPv4 address',
    blHint: 'For example the public address of a mail server.',
    targetLists: 'the blocklists',
    blNotice1:
      'When you press “Check lists”, your browser asks {n} public DNS blocklists (named below) whether they list the address you typed, one DNS question per list.',
    blLists: 'Lists that are checked: {lists}.',
    blLooking: 'Checked {done} of {total} lists…',
    blIn6: 'Only IPv4 addresses can be checked here. Most blocklists listed here cover IPv4 only.',
    blSummary: 'Result',
    blListed: 'Listed on {listed} of the {answered} lists that answered',
    blClean: 'Not listed on any of the {answered} lists that answered',
    blNone: 'No list could be checked',
    blUnchecked: 'Lists that could not be checked',
    blUncheckedValue: '{n} of {total}',
    blCaption: 'Blocklist results',
    colList: 'List',
    colResult: 'Result',
    colCodes: 'Answer',
    v_listed: 'Listed',
    'v_not-listed': 'Not listed',
    v_refused: 'Could not check: the list refused the question',
    v_unexpected: 'Could not check: unexpected answer',
    'v_no-answer': 'Could not check: no answer ({status})',
    v_error: 'Could not check: {reason}',
    reason_offline: 'offline',
    reason_timeout: 'timed out',
    reason_blocked: 'request blocked',
    reason_http: 'resolver error',
    reason_parse: 'unreadable answer',
    reason_aborted: 'cancelled',
    blN1: 'Only the {n} lists in the table were checked. There are many other blocklists, and mail providers also use private reputation data, so “not listed” here does not mean an address is clean everywhere.',
    blN2: 'Spamhaus does not answer questions that come through large public resolvers such as Cloudflare’s, so it normally shows “Could not check”. Use Spamhaus’s own lookup page to check it.',
    blN3: 'A listing is the list operator’s decision. To find out why an address is listed or how to be removed, follow the list’s link and its own procedure.',
    // Errors
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout: 'No answer within {seconds} seconds. Try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it.',
    err_http: 'The service answered with an error (HTTP {status}). Try again later.',
    err_parse: 'The answer was not in the expected format, so it is not shown.',
    err_aborted: 'The request was cancelled.',
    // Notes
    ispN1:
      'This shows the network (autonomous system) that announces your public IP address on the internet. For home and mobile connections that is normally your ISP.',
    ispN2:
      'With a VPN, proxy, corporate network or some mobile carriers, the network shown is that service or its upstream provider, not your ISP.',
    ispN3:
      'Cloudflare is contacted at 1.1.1.1, an IPv4 address, so this tool looks up your IPv4 address only.',
    locN1:
      'This is not a physical location. The country is where the address block is registered, which can differ from where the address is used: cloud, VPN and international networks often use addresses registered elsewhere.',
    locN2:
      'No city, map or coordinates are shown. City-level IP geolocation comes from commercial databases that this site does not use, and it is often wrong.',
    locN3: 'For the full registration record of the address block, use IP WHOIS Lookup.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    privacyLink: 'Cloudflare 1.1.1.1 প্রাইভেসি নীতি',
    cymruLink: 'Team Cymru-র IP-to-ASN ডেটা সম্পর্কে',
    dnsNotice:
      'প্রশ্নগুলো HTTPS-এ Cloudflare-এর পাবলিক DNS রিজলভারে ({endpoint}) যায়। Cloudflare যে অ্যাড্রেসটি খোঁজা হচ্ছে সেটি, আপনার নিজের আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্য পায়; এরপর সে আপনার হয়ে {target}-কে জিজ্ঞেস করে, তাই তারা আপনাকে নয়, Cloudflare-এর রিজলভারকে দেখে। কুকি বা পেজের ঠিকানা (রেফারার) পাঠানো হয় না, এবং এই সাইট কিছুই গ্রহণ বা সংরক্ষণ করে না।',
    ispButton: 'আমার ISP খুঁজুন',
    ispNotice1:
      '“আমার ISP খুঁজুন” চাপলে আপনার ব্রাউজার প্রথমে Cloudflare ({trace})-এর কাছে আপনার পাবলিক আইপি অ্যাড্রেস জানতে চায়, তারপর DNS-এর মাধ্যমে Team Cymru-র IP-to-ASN সার্ভিসকে জিজ্ঞেস করে কোন নেটওয়ার্ক অ্যাড্রেসটি ঘোষণা করে।',
    ispLooking: 'Cloudflare-এর কাছে আপনার পাবলিক আইপি অ্যাড্রেস জানতে চাওয়া হচ্ছে…',
    ispLooking2: '{ip}-এর নেটওয়ার্ক খোঁজা হচ্ছে…',
    locButton: 'খুঁজুন',
    locIn: 'পাবলিক আইপি অ্যাড্রেস',
    locHint: 'যেমন 8.8.8.8 বা 2001:4860:4860::8888।',
    locNotice1:
      '“খুঁজুন” চাপলে আপনার ব্রাউজার DNS-এর মাধ্যমে Team Cymru-র IP-to-ASN সার্ভিসকে জিজ্ঞেস করে আপনার লেখা অ্যাড্রেসটি কোন নেটওয়ার্ক ঘোষণা করে এবং তার অ্যাড্রেস ব্লক কোন দেশে নিবন্ধিত।',
    locLooking: '{ip} খোঁজা হচ্ছে…',
    done: 'সম্পন্ন।',
    rIp: 'আপনার পাবলিক আইপি অ্যাড্রেস (IPv4)',
    rQueried: 'যে অ্যাড্রেস খোঁজা হয়েছে',
    rNetwork: 'নেটওয়ার্ক (AS নাম)',
    rAsn: 'অটোনোমাস সিস্টেম নম্বর',
    rPrefix: 'ঘোষিত অ্যাড্রেস ব্লক',
    rCountry: 'যে দেশে ব্লকটি নিবন্ধিত',
    rRegistry: 'রেজিস্ট্রি',
    rAllocated: 'ব্লক বরাদ্দের তারিখ',
    rSource: 'উৎস',
    sourceCymru: 'Team Cymru IP-to-ASN ম্যাপিং, Cloudflare DNS-এর মাধ্যমে',
    rAt: 'যাচাইয়ের সময়',
    notPublished: 'প্রকাশিত নয়',
    noRoute: 'এই অ্যাড্রেসের জন্য Team Cymru-র কাছে কোনো রুট নেই',
    noRouteNote:
      'এই মুহূর্তে কোনো নেটওয়ার্ক ইন্টারনেটে এই অ্যাড্রেসটি ঘোষণা করছে না, অথবা Team Cymru তা জানে না। এটি অব্যবহৃত, সদ্য বরাদ্দ বা পাবলিকভাবে রুট না করা হতে পারে।',
    noAnswer:
      'Cloudflare-এর রিজলভার Team Cymru থেকে উত্তর পায়নি ({status})। পরে আবার চেষ্টা করুন।',
    e_empty: 'একটি আইপি অ্যাড্রেস লিখুন।',
    e_invalid: 'একটি সঠিক IPv4 বা IPv6 অ্যাড্রেস লিখুন।',
    'e_not-public':
      'এটি একটি প্রাইভেট, লোকাল বা বিশেষ-উদ্দেশ্যের অ্যাড্রেস। এটি ইন্টারনেটের কোনো নেটওয়ার্কে নিবন্ধিত নয়।',
    blButton: 'তালিকা যাচাই করুন',
    blIn: 'পাবলিক IPv4 অ্যাড্রেস',
    blHint: 'যেমন কোনো মেইল সার্ভারের পাবলিক অ্যাড্রেস।',
    targetLists: 'ব্লকলিস্টগুলো',
    blNotice1:
      '“তালিকা যাচাই করুন” চাপলে আপনার ব্রাউজার {n}টি পাবলিক DNS ব্লকলিস্টকে (নিচে নাম দেওয়া) জিজ্ঞেস করে তারা আপনার লেখা অ্যাড্রেসটি তালিকাভুক্ত করেছে কি না, প্রতিটি তালিকায় একটি DNS প্রশ্ন।',
    blLists: 'যে তালিকাগুলো যাচাই করা হয়: {lists}।',
    blLooking: '{total}টির মধ্যে {done}টি তালিকা যাচাই হয়েছে…',
    blIn6: 'এখানে শুধু IPv4 অ্যাড্রেস যাচাই করা যায়। এখানকার বেশিরভাগ ব্লকলিস্ট শুধু IPv4 দেখে।',
    blSummary: 'ফলাফল',
    blListed: 'উত্তর দেওয়া {answered}টি তালিকার মধ্যে {listed}টিতে তালিকাভুক্ত',
    blClean: 'উত্তর দেওয়া {answered}টি তালিকার কোনোটিতে তালিকাভুক্ত নয়',
    blNone: 'কোনো তালিকা যাচাই করা যায়নি',
    blUnchecked: 'যে তালিকাগুলো যাচাই করা যায়নি',
    blUncheckedValue: '{total}টির মধ্যে {n}টি',
    blCaption: 'ব্লকলিস্টের ফলাফল',
    colList: 'তালিকা',
    colResult: 'ফলাফল',
    colCodes: 'উত্তর',
    v_listed: 'তালিকাভুক্ত',
    'v_not-listed': 'তালিকাভুক্ত নয়',
    v_refused: 'যাচাই করা যায়নি: তালিকাটি প্রশ্ন প্রত্যাখ্যান করেছে',
    v_unexpected: 'যাচাই করা যায়নি: অপ্রত্যাশিত উত্তর',
    'v_no-answer': 'যাচাই করা যায়নি: উত্তর নেই ({status})',
    v_error: 'যাচাই করা যায়নি: {reason}',
    reason_offline: 'অফলাইন',
    reason_timeout: 'সময় শেষ',
    reason_blocked: 'রিকোয়েস্ট আটকে গেছে',
    reason_http: 'রিজলভারের ত্রুটি',
    reason_parse: 'উত্তর পড়া যায়নি',
    reason_aborted: 'বাতিল',
    blN1: 'শুধু টেবিলের {n}টি তালিকা যাচাই করা হয়েছে। আরও অনেক ব্লকলিস্ট আছে, এবং মেইল প্রোভাইডাররা নিজস্ব রেপুটেশন ডেটাও ব্যবহার করে, তাই এখানে “তালিকাভুক্ত নয়” মানে সব জায়গায় অ্যাড্রেসটি পরিষ্কার নয়।',
    blN2: 'Cloudflare-এর মতো বড় পাবলিক রিজলভার থেকে আসা প্রশ্নের উত্তর Spamhaus দেয় না, তাই সাধারণত এটি “যাচাই করা যায়নি” দেখায়। এটি যাচাই করতে Spamhaus-এর নিজস্ব লুকআপ পেজ ব্যবহার করুন।',
    blN3: 'তালিকাভুক্ত করা তালিকা পরিচালকের সিদ্ধান্ত। কেন তালিকাভুক্ত বা কীভাবে সরানো যায় জানতে তালিকার লিংক ও তাদের নিজস্ব প্রক্রিয়া অনুসরণ করুন।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout: '{seconds} সেকেন্ডের মধ্যে উত্তর আসেনি। পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন করা যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে।',
    err_http: 'সার্ভিসটি একটি ত্রুটি দিয়েছে (HTTP {status})। পরে আবার চেষ্টা করুন।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
    ispN1:
      'এটি দেখায় কোন নেটওয়ার্ক (অটোনোমাস সিস্টেম) ইন্টারনেটে আপনার পাবলিক আইপি অ্যাড্রেস ঘোষণা করে। বাসা ও মোবাইল সংযোগে সাধারণত সেটিই আপনার ISP।',
    ispN2:
      'VPN, প্রক্সি, অফিসের নেটওয়ার্ক বা কিছু মোবাইল অপারেটরের ক্ষেত্রে দেখানো নেটওয়ার্কটি সেই সার্ভিস বা তার আপস্ট্রিম প্রোভাইডার, আপনার ISP নয়।',
    ispN3:
      'Cloudflare-এর সঙ্গে 1.1.1.1-এ যোগাযোগ করা হয়, যা একটি IPv4 অ্যাড্রেস, তাই এই টুল শুধু আপনার IPv4 অ্যাড্রেস খোঁজে।',
    locN1:
      'এটি কোনো বাস্তব অবস্থান নয়। দেশটি হলো যেখানে অ্যাড্রেস ব্লকটি নিবন্ধিত, যা অ্যাড্রেসটি যেখানে ব্যবহৃত হয় তার থেকে ভিন্ন হতে পারে: ক্লাউড, VPN ও আন্তর্জাতিক নেটওয়ার্ক প্রায়ই অন্য দেশে নিবন্ধিত অ্যাড্রেস ব্যবহার করে।',
    locN2:
      'কোনো শহর, ম্যাপ বা স্থানাঙ্ক দেখানো হয় না। শহর-পর্যায়ের আইপি জিওলোকেশন আসে বাণিজ্যিক ডেটাবেস থেকে, যা এই সাইট ব্যবহার করে না, এবং তা প্রায়ই ভুল হয়।',
    locN3: 'অ্যাড্রেস ব্লকের পূর্ণ নিবন্ধন তথ্যের জন্য আইপি WHOIS লুকআপ ব্যবহার করুন।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const num = (ctx: ToolContext, s: string | number): string =>
  ctx.lang === 'bn' ? toBanglaDigits(String(s)) : String(s);

const timestamp = (ctx: ToolContext, d: Date): string =>
  num(
    ctx,
    d
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, ' UTC'),
  );

function errorText(L: L, ctx: ToolContext, e: unknown): string {
  const kind: NetError = e instanceof NetFailure ? e.kind : 'blocked';
  return L(`err_${kind}`, {
    seconds: num(ctx, LOOKUP_TIMEOUT_MS / 1000),
    status: e instanceof NetFailure && e.status ? String(e.status) : '?',
  });
}

function notice(
  id: string,
  L: L,
  paragraphs: string[],
  ...links: Array<[string, string]>
): HTMLElement {
  return h(
    'aside',
    { class: 'net-notice', 'aria-labelledby': `${id}-notice-title` },
    h('h2', { id: `${id}-notice-title`, class: 'net-notice-title' }, L('noticeTitle')),
    ...paragraphs.map((p) => h('p', {}, p)),
    h('p', { class: 'net-notice-strong' }, L('nothingYet')),
    ...links.map(([href, text]) => h('p', {}, h('a', { href, rel: 'noopener noreferrer' }, text))),
  );
}

/** Rows describing the network for an address, shared by the ISP and location tools. */
function networkRows(
  ctx: ToolContext,
  L: L,
  info: NetworkInfo,
  primary: 'network' | 'country',
): { rows: ResultRow[]; notes: string[] } {
  const o = info.origin;
  const tail: ResultRow[] = [
    { label: L('rSource'), value: L('sourceCymru') },
    { label: L('rAt'), value: timestamp(ctx, info.at) },
  ];
  if (!o)
    return {
      rows: [
        {
          label: L('rNetwork'),
          value: info.noAnswer ? L('noAnswer', { status: info.noAnswer }) : L('noRoute'),
          primary: true,
        },
        ...tail,
      ],
      notes: info.noAnswer ? [] : [L('noRouteNote')],
    };
  const or = (v: string | null): string => v ?? L('notPublished');
  return {
    rows: [
      {
        label: L('rNetwork'),
        value: or(info.as?.name ?? null),
        lang: 'en',
        primary: primary === 'network',
      },
      { label: L('rAsn'), value: o.asns.map((a) => `AS${a}`).join(', '), lang: 'en', copy: true },
      { label: L('rPrefix'), value: or(o.prefix), lang: 'en' },
      { label: L('rCountry'), value: or(o.country), lang: 'en', primary: primary === 'country' },
      { label: L('rRegistry'), value: or(o.registry?.toUpperCase() ?? null), lang: 'en' },
      { label: L('rAllocated'), value: o.allocated ? num(ctx, o.allocated) : L('notPublished') },
      ...tail,
    ],
    notes: [],
  };
}

// ---------- What Is My ISP ----------

interface IspSession {
  ip: string;
  info: NetworkInfo;
}

export const myIsp: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const panel = resultPanel(ctx, L('ispButton'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const render = (s: IspSession): void => {
    const { rows, notes: extra } = networkRows(ctx, L, s.info, 'network');
    panel.show([{ label: L('rIp'), value: s.ip, lang: 'en', copy: true }, ...rows], extra);
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('ispButton') });
  form.noValidate = true;
  form.append(
    notice(
      'isp',
      L,
      [
        L('ispNotice1', { trace: 'https://1.1.1.1/cdn-cgi/trace' }),
        L('dnsNotice', { endpoint: DOH_ENDPOINT, target: 'Team Cymru' }),
      ],
      [CLOUDFLARE_PRIVACY, L('privacyLink')],
      [CYMRU_INFO, L('cymruLink')],
    ),
    formActions(ctx, {
      submitLabel: L('ispButton'),
      panel,
      onReset() {
        next().abort();
        ctx.session.delete('isp');
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
    status.progress(L('ispLooking'));
    try {
      const trace = await publicIp(ctrl.signal);
      const ip = parseIpInput(trace.ip, 4);
      if (!ip.ok) throw new NetFailure('parse');
      status.progress(L('ispLooking2', { ip: trace.ip }));
      const session: IspSession = {
        ip: ip.value.text,
        info: await lookupNetwork(ip.value, ctrl.signal),
      };
      ctx.session.set('isp', session);
      render(session);
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      panel.clear();
      status.error(errorText(L, ctx, err));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('isp') as IspSession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('ispN1'), L('ispN2'), L('ispN3')], L('notesTitle')),
  );
};

// ---------- IP Location Lookup ----------

/** Either family; the address picks the lookup. */
function parseAnyIp(text: string): ReturnType<typeof parseIpInput> {
  const v4 = parseIpInput(text, 4);
  if (v4.ok || v4.error !== 'wrong-version') return v4;
  return parseIpInput(text, 6);
}

interface LocSession {
  ip: string;
  info: NetworkInfo;
}

export const ipLocation: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const address = field(
    L('locIn'),
    textInput({ id: 'iploc-address', autocapitalize: 'off', inputmode: 'text' }),
    { hint: L('locHint') },
  );
  bindMemo(address.control, ctx.memo, 'address');
  const panel = resultPanel(ctx, L('locButton'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const render = (s: LocSession): void => {
    const { rows, notes: extra } = networkRows(ctx, L, s.info, 'country');
    panel.show([{ label: L('rQueried'), value: s.ip, lang: 'en' }, ...rows], extra);
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('locButton') });
  form.noValidate = true;
  form.append(
    notice(
      'iploc',
      L,
      [L('locNotice1'), L('dnsNotice', { endpoint: DOH_ENDPOINT, target: 'Team Cymru' })],
      [CLOUDFLARE_PRIVACY, L('privacyLink')],
      [CYMRU_INFO, L('cymruLink')],
    ),
    h('div', { class: 'field-grid' }, address.el),
    formActions(ctx, {
      submitLabel: L('locButton'),
      panel,
      onReset() {
        next().abort();
        address.control.value = '';
        address.setError(null);
        ctx.memo.address = '';
        ctx.session.delete('iploc');
        busy(form, false);
        status.clear();
        panel.clear();
        address.control.focus();
      },
    }),
    status.el,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    address.setError(null);
    const ip = parseAnyIp(address.control.value);
    if (!ip.ok) {
      address.setError(L(`e_${ip.error === 'wrong-version' ? 'invalid' : ip.error}` as Key));
      address.control.focus();
      return;
    }
    const ctrl = next();
    busy(form, true);
    status.progress(L('locLooking', { ip: ip.value.text }));
    try {
      const session: LocSession = {
        ip: ip.value.text,
        info: await lookupNetwork(ip.value, ctrl.signal),
      };
      ctx.session.set('iploc', session);
      render(session);
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      panel.clear();
      status.error(errorText(L, ctx, err));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('iploc') as LocSession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('locN1'), L('locN2'), L('locN3')], L('notesTitle')),
  );
};

// ---------- IP Blacklist Check ----------

interface BlSession {
  ip: string;
  results: ListResult[];
}

export const ipBlacklist: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const total = BLOCKLISTS.length;
  const address = field(
    L('blIn'),
    textInput({ id: 'dnsbl-address', autocapitalize: 'off', inputmode: 'decimal' }),
    { hint: L('blHint') },
  );
  bindMemo(address.control, ctx.memo, 'address');
  const panel = resultPanel(ctx, L('blButton'));
  const table = h('div', { class: 'gp-results' });
  panel.el.querySelector('.result-body')?.after(table);
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const verdictText = (r: ListResult): string => {
    const v = r.verdict;
    if (v.kind === 'error') return L('v_error', { reason: L(`reason_${v.error}` as Key) });
    if (v.kind === 'no-answer') return L('v_no-answer', { status: v.status });
    return L(`v_${v.kind}` as Key);
  };
  const codes = (r: ListResult): string =>
    'codes' in r.verdict
      ? r.verdict.codes.join(', ')
      : r.verdict.kind === 'not-listed'
        ? 'NXDOMAIN'
        : '—';

  const render = (s: BlSession): void => {
    const listed = s.results.filter((r) => r.verdict.kind === 'listed').length;
    const answered = s.results.filter(
      (r) => r.verdict.kind === 'listed' || r.verdict.kind === 'not-listed',
    ).length;
    const summary =
      answered === 0
        ? L('blNone')
        : listed
          ? L('blListed', { listed: num(ctx, listed), answered: num(ctx, answered) })
          : L('blClean', { answered: num(ctx, answered) });
    panel.show(
      [
        { label: L('rQueried'), value: s.ip, lang: 'en' },
        { label: L('blSummary'), value: summary, primary: true },
        {
          label: L('blUnchecked'),
          value: L('blUncheckedValue', {
            n: num(ctx, s.results.length - answered),
            total: num(ctx, s.results.length),
          }),
        },
        ...s.results.map((r) => ({ label: r.list.name, value: verdictText(r) })),
      ],
      [L('blN1', { n: num(ctx, total) })],
    );
    table.replaceChildren(
      h(
        'div',
        { class: 'dns-table-wrap', role: 'region', tabindex: '0', 'aria-label': L('blCaption') },
        h(
          'table',
          { class: 'dns-table' },
          h('caption', { class: 'sr-only' }, L('blCaption')),
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              ...(['colList', 'colResult', 'colCodes'] as const).map((k) =>
                h('th', { scope: 'col' }, L(k)),
              ),
            ),
          ),
          h(
            'tbody',
            {},
            ...s.results.map((r) =>
              h(
                'tr',
                { 'data-verdict': r.verdict.kind },
                h(
                  'td',
                  { lang: 'en' },
                  h('a', { href: r.list.info, rel: 'noopener noreferrer' }, r.list.name),
                  h('br', {}),
                  h('span', { class: 'dns-data' }, r.list.zone),
                ),
                h('td', {}, verdictText(r)),
                h('td', { class: 'dns-data', lang: 'en' }, codes(r)),
              ),
            ),
          ),
        ),
      ),
    );
  };

  const clear = (): void => {
    panel.clear();
    table.replaceChildren();
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('blButton') });
  form.noValidate = true;
  form.append(
    notice(
      'dnsbl',
      L,
      [
        L('blNotice1', { n: num(ctx, total) }),
        L('blLists', { lists: BLOCKLISTS.map((b) => b.name).join(', ') }),
        L('dnsNotice', { endpoint: DOH_ENDPOINT, target: L('targetLists') }),
      ],
      [CLOUDFLARE_PRIVACY, L('privacyLink')],
    ),
    h('div', { class: 'field-grid' }, address.el),
    formActions(ctx, {
      submitLabel: L('blButton'),
      panel,
      onReset() {
        next().abort();
        address.control.value = '';
        address.setError(null);
        ctx.memo.address = '';
        ctx.session.delete('dnsbl');
        busy(form, false);
        status.clear();
        clear();
        address.control.focus();
      },
    }),
    status.el,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    address.setError(null);
    const ip = parseIpInput(address.control.value, 4);
    if (!ip.ok) {
      const key =
        ip.error === 'wrong-version'
          ? 'blIn6'
          : ip.error === 'invalid'
            ? 'e_invalid'
            : `e_${ip.error}`;
      address.setError(L(key as Key));
      address.control.focus();
      return;
    }
    const v4 = parseIPv4(ip.value.text);
    if (!v4.ok) return;
    const ctrl = next();
    busy(form, true);
    clear();
    status.progress(L('blLooking', { done: num(ctx, 0), total: num(ctx, total) }));
    try {
      const results = await checkBlocklists(v4.value, ctrl.signal, (done) =>
        status.progress(L('blLooking', { done: num(ctx, done), total: num(ctx, total) })),
      );
      const session: BlSession = { ip: ip.value.text, results };
      ctx.session.set('dnsbl', session);
      render(session);
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      status.error(errorText(L, ctx, err));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('dnsbl') as BlSession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('blN1', { n: num(ctx, total) }), L('blN2'), L('blN3')], L('notesTitle')),
  );
};
