import { toBanglaDigits } from '../../calc/digits';
import {
  answersOf,
  assess,
  family,
  hostsFrom,
  MAX_HOSTS,
  type HostAddresses,
  type HostFamily,
  type Ipv6DnsFindings,
  type ServerSet,
} from '../../calc/ipv6Compat';
import { DOH_ENDPOINT, normaliseDomain } from '../../calc/netDiag';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { NetFailure, type NetError } from '../../lib/net';
import { bindMemo, field, formActions, notes, resultPanel, textInput, type ToolView } from './kit';
import { abortOnCleanup, busy, dohJson, statusArea } from './networkOnline';

const CLOUDFLARE_PRIVACY = 'https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/';
const LOOKUP_TIMEOUT_S = 8;
/** Website, www (A and AAAA each), NS and MX, then AAAA for each name and mail server. */
const MAX_QUERIES = 6 + 2 * MAX_HOSTS;

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notice1:
      'When you press “Check IPv6”, your browser sends up to {n} DNS questions about the domain you enter to Cloudflare’s public DNS resolver ({endpoint}) over HTTPS: its IPv4 (A) and IPv6 (AAAA) addresses, those of www, its name servers (NS) and mail servers (MX), and the IPv6 addresses of up to {max} of each.',
    notice2:
      'Cloudflare also receives your IP address and basic browser details. No connection is made to the domain itself. This site does not receive or store the query or the answer.',
    nothingYet: 'Nothing is sent until you press the button.',
    privacyLink: 'Cloudflare 1.1.1.1 privacy policy',
    domain: 'Domain name',
    domainHint: 'For example example.com.',
    check: 'Check IPv6',
    looking: 'Asking Cloudflare DNS…',
    lookingServers: 'Checking the name and mail servers…',
    done: 'Done.',
    rDomain: 'Domain checked',
    rReadiness: 'IPv6 in DNS',
    ready_ready: 'Ready: the website, name servers and mail servers publish IPv6 addresses',
    ready_partial: 'Partly ready: some parts publish IPv6 addresses, some do not',
    'ready_not-ready': 'Not ready: no IPv6 addresses are published',
    ready_unknown: 'Unknown: the domain has no website addresses to check',
    rWebsite: 'Website ({name})',
    rWww: 'www ({name})',
    f_dual: 'IPv4 and IPv6 (A and AAAA records)',
    'f_ipv6-only': 'IPv6 only (AAAA record, no A record)',
    'f_ipv4-only': 'IPv4 only (A record, no AAAA record)',
    f_none: 'No A or AAAA record',
    rNs: 'Name servers with IPv6',
    rMx: 'Mail servers with IPv6',
    serversValue: '{n} of {total}',
    serversMore: '{n} more not checked',
    noNs: 'No NS records at this name (for a subdomain, the parent zone’s servers answer)',
    noMx: 'No mail servers (MX) published',
    rBrowser: 'Your browser’s IPv6 connection',
    rReach: 'Whether the site answers over IPv6',
    notTested: 'Not tested',
    nxdomain: 'This domain does not exist (NXDOMAIN).',
    e_empty: 'Enter a domain name.',
    'e_domain-empty': 'Enter a domain name.',
    'e_domain-invalid': 'Enter a valid domain name such as example.com.',
    'e_domain-too-long': 'A domain name can be at most 253 characters.',
    'e_domain-ip': 'Enter a domain name, not an IP address.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout:
      'No answer within {seconds} seconds. The service may be slow or unreachable; try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it.',
    err_http:
      'The service answered with an error (HTTP {status}). It may be limiting requests; wait a moment and try again.',
    err_parse: 'The answer was not in the expected format, so it is not shown.',
    err_aborted: 'The request was cancelled.',
    notesTitle: 'About these results',
    n1: 'These results show only what the domain publishes in DNS. An AAAA record means a host claims an IPv6 address; it does not prove the host actually answers over IPv6.',
    n2: 'Your own IPv6 connection is not tested: this site has no verified IPv6-only test address yet, so it says “Not tested” rather than guess.',
    n3: 'Whether the site answers over IPv6 is not tested either: a web page cannot choose IPv6 for a request, so it cannot reach a host over IPv6 on purpose.',
    n4: 'Up to {max} name servers and {max} mail servers are checked, mail servers in order of preference. Answers come from Cloudflare and may be cached.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      '“IPv6 পরীক্ষা করুন” চাপলে আপনার ব্রাউজার আপনার দেওয়া ডোমেইন সম্পর্কে সর্বোচ্চ {n}টি DNS প্রশ্ন Cloudflare-এর পাবলিক DNS রিজলভারে ({endpoint}) HTTPS-এ পাঠায়: এর IPv4 (A) ও IPv6 (AAAA) অ্যাড্রেস, www-এর অ্যাড্রেস, নেম সার্ভার (NS) ও মেইল সার্ভার (MX), এবং প্রতিটির সর্বোচ্চ {max}টির IPv6 অ্যাড্রেস।',
    notice2:
      'Cloudflare আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্যও পায়। ডোমেইনটির সঙ্গে সরাসরি কোনো সংযোগ করা হয় না। এই সাইট প্রশ্ন বা উত্তর গ্রহণ বা সংরক্ষণ করে না।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    privacyLink: 'Cloudflare 1.1.1.1 প্রাইভেসি নীতি',
    domain: 'ডোমেইন নাম',
    domainHint: 'যেমন example.com।',
    check: 'IPv6 পরীক্ষা করুন',
    looking: 'Cloudflare DNS-এর কাছে জানতে চাওয়া হচ্ছে…',
    lookingServers: 'নেম ও মেইল সার্ভার পরীক্ষা করা হচ্ছে…',
    done: 'সম্পন্ন।',
    rDomain: 'যে ডোমেইন পরীক্ষা করা হয়েছে',
    rReadiness: 'DNS-এ IPv6',
    ready_ready: 'প্রস্তুত: ওয়েবসাইট, নেম সার্ভার ও মেইল সার্ভার IPv6 অ্যাড্রেস প্রকাশ করে',
    ready_partial: 'আংশিক প্রস্তুত: কিছু অংশ IPv6 অ্যাড্রেস প্রকাশ করে, কিছু করে না',
    'ready_not-ready': 'প্রস্তুত নয়: কোনো IPv6 অ্যাড্রেস প্রকাশিত নেই',
    ready_unknown: 'অজানা: পরীক্ষা করার মতো ওয়েবসাইটের অ্যাড্রেস নেই',
    rWebsite: 'ওয়েবসাইট ({name})',
    rWww: 'www ({name})',
    f_dual: 'IPv4 ও IPv6 (A ও AAAA রেকর্ড)',
    'f_ipv6-only': 'শুধু IPv6 (AAAA রেকর্ড, A রেকর্ড নেই)',
    'f_ipv4-only': 'শুধু IPv4 (A রেকর্ড, AAAA রেকর্ড নেই)',
    f_none: 'A বা AAAA রেকর্ড নেই',
    rNs: 'IPv6-সহ নেম সার্ভার',
    rMx: 'IPv6-সহ মেইল সার্ভার',
    serversValue: '{total}টির মধ্যে {n}টি',
    serversMore: 'আরও {n}টি পরীক্ষা করা হয়নি',
    noNs: 'এই নামে কোনো NS রেকর্ড নেই (সাবডোমেইনের ক্ষেত্রে মূল জোনের সার্ভার উত্তর দেয়)',
    noMx: 'কোনো মেইল সার্ভার (MX) প্রকাশিত নেই',
    rBrowser: 'আপনার ব্রাউজারের IPv6 সংযোগ',
    rReach: 'সাইটটি IPv6-এ উত্তর দেয় কি না',
    notTested: 'পরীক্ষা করা হয়নি',
    nxdomain: 'এই ডোমেইনটির অস্তিত্ব নেই (NXDOMAIN)।',
    e_empty: 'একটি ডোমেইন নাম লিখুন।',
    'e_domain-empty': 'একটি ডোমেইন নাম লিখুন।',
    'e_domain-invalid': 'example.com-এর মতো একটি সঠিক ডোমেইন নাম লিখুন।',
    'e_domain-too-long': 'ডোমেইন নাম সর্বোচ্চ ২৫৩ অক্ষরের হতে পারে।',
    'e_domain-ip': 'আইপি অ্যাড্রেস নয়, একটি ডোমেইন নাম লিখুন।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      '{seconds} সেকেন্ডের মধ্যে কোনো উত্তর আসেনি। সার্ভিসটি ধীর বা নাগালের বাইরে থাকতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন করা যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে।',
    err_http:
      'সার্ভিসটি একটি ত্রুটি দিয়েছে (HTTP {status})। এটি রিকোয়েস্ট সীমিত করছে হতে পারে; একটু অপেক্ষা করে আবার চেষ্টা করুন।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    n1: 'এই ফলাফল শুধু দেখায় ডোমেইনটি DNS-এ কী প্রকাশ করে। AAAA রেকর্ড মানে একটি হোস্ট IPv6 অ্যাড্রেস দাবি করে; এটি প্রমাণ করে না যে হোস্টটি সত্যিই IPv6-এ উত্তর দেয়।',
    n2: 'আপনার নিজের IPv6 সংযোগ পরীক্ষা করা হয় না: এই সাইটের এখনও কোনো যাচাই করা IPv6-only পরীক্ষার ঠিকানা নেই, তাই অনুমান না করে “পরীক্ষা করা হয়নি” দেখায়।',
    n3: 'সাইটটি IPv6-এ উত্তর দেয় কি না তাও পরীক্ষা করা হয় না: একটি ওয়েব পেজ রিকোয়েস্টের জন্য IPv6 বেছে নিতে পারে না, তাই ইচ্ছাকৃতভাবে IPv6-এ কোনো হোস্টে পৌঁছাতে পারে না।',
    n4: 'সর্বোচ্চ {max}টি নেম সার্ভার ও {max}টি মেইল সার্ভার পরীক্ষা করা হয়, মেইল সার্ভার পছন্দক্রম অনুযায়ী। উত্তর Cloudflare থেকে আসে এবং ক্যাশ করা থাকতে পারে।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

interface Ipv6Session {
  findings: Ipv6DnsFindings;
}

export const ipv6Compatibility: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const num = (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n));
  const domain = field(
    L('domain'),
    textInput({ id: 'v6c-domain', inputmode: 'url', autocapitalize: 'off' }),
    { hint: L('domainHint') },
  );
  bindMemo(domain.control, ctx.memo, 'domain');
  const status = statusArea();
  const panel = resultPanel(ctx, L('check'));
  const next = abortOnCleanup(ctx);

  const errorText = (e: unknown): string => {
    const kind: NetError = e instanceof NetFailure ? e.kind : 'blocked';
    return L(`err_${kind}`, {
      seconds: num(LOOKUP_TIMEOUT_S),
      status: e instanceof NetFailure && e.status ? String(e.status) : '?',
    });
  };

  const hostValue = (h6: HostAddresses): string => {
    const f: HostFamily = family(h6);
    return [L(`f_${f}`), ...h6.aaaa, ...h6.a].join('\n');
  };
  const serverValue = (set: ServerSet, empty: Key): string => {
    if (!set.checked.length) return L(empty);
    const with6 = set.checked.filter((s) => s.aaaa.length);
    return [
      L('serversValue', { n: num(with6.length), total: num(set.checked.length) }),
      ...set.checked.map((s) => `${s.name}: ${s.aaaa.length ? s.aaaa.join(', ') : '—'}`),
      ...(set.more ? [L('serversMore', { n: num(set.more) })] : []),
    ].join('\n');
  };

  const render = ({ findings: f }: Ipv6Session): void => {
    const a = assess(f);
    panel.show(
      [
        { label: L('rDomain'), value: f.domain, lang: 'en' },
        { label: L('rReadiness'), value: L(`ready_${a.readiness}`), primary: true },
        { label: L('rWebsite', { name: f.website.name }), value: hostValue(f.website) },
        ...(f.www ? [{ label: L('rWww', { name: f.www.name }), value: hostValue(f.www) }] : []),
        { label: L('rNs'), value: serverValue(f.nameServers, 'noNs') },
        { label: L('rMx'), value: serverValue(f.mailServers, 'noMx') },
        { label: L('rBrowser'), value: L('notTested') },
        { label: L('rReach'), value: L('notTested') },
      ],
      f.exists ? [] : [L('nxdomain')],
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('check') });
  form.noValidate = true;
  form.append(
    h(
      'aside',
      { class: 'net-notice', 'aria-labelledby': 'v6c-notice-title' },
      h('h2', { id: 'v6c-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
      h(
        'p',
        {},
        L('notice1', { n: num(MAX_QUERIES), max: num(MAX_HOSTS), endpoint: DOH_ENDPOINT }),
      ),
      h('p', {}, L('notice2')),
      h('p', { class: 'net-notice-strong' }, L('nothingYet')),
      h(
        'p',
        {},
        h('a', { href: CLOUDFLARE_PRIVACY, rel: 'noopener noreferrer' }, L('privacyLink')),
      ),
    ),
    h('div', { class: 'field-grid' }, domain.el),
    formActions(ctx, {
      submitLabel: L('check'),
      panel,
      onReset() {
        next().abort();
        domain.control.value = '';
        domain.setError(null);
        ctx.memo.domain = '';
        ctx.session.delete('v6c');
        busy(form, false);
        status.clear();
        panel.clear();
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
      domain.setError(L(`e_${name.error}`));
      domain.control.focus();
      return;
    }
    const ctrl = next();
    const q = (n: string, type: 'A' | 'AAAA' | 'NS' | 'MX') => dohJson(n, type, ctrl.signal);
    const wwwName = name.value.startsWith('www.') ? null : `www.${name.value}`;
    busy(form, true);
    status.progress(L('looking'));
    try {
      const [a, aaaa, wa, waaaa, ns, mx] = await Promise.all([
        q(name.value, 'A'),
        q(name.value, 'AAAA'),
        wwwName ? q(wwwName, 'A') : null,
        wwwName ? q(wwwName, 'AAAA') : null,
        q(name.value, 'NS'),
        q(name.value, 'MX'),
      ]);
      const nsHosts = hostsFrom(ns, 'NS');
      const mxHosts = hostsFrom(mx, 'MX');
      status.progress(L('lookingServers'));
      const servers = async (hosts: string[]): Promise<HostAddresses[]> =>
        Promise.all(
          hosts.map(async (host) => ({
            name: host,
            a: [],
            aaaa: answersOf(await q(host, 'AAAA'), 'AAAA'),
          })),
        );
      const [nsChecked, mxChecked] = await Promise.all([
        servers(nsHosts.hosts),
        servers(mxHosts.hosts),
      ]);
      const findings: Ipv6DnsFindings = {
        domain: name.value,
        exists: a.statusName !== 'NXDOMAIN' && aaaa.statusName !== 'NXDOMAIN',
        website: { name: name.value, a: answersOf(a, 'A'), aaaa: answersOf(aaaa, 'AAAA') },
        www:
          wwwName && wa && waaaa
            ? { name: wwwName, a: answersOf(wa, 'A'), aaaa: answersOf(waaaa, 'AAAA') }
            : null,
        nameServers: { checked: nsChecked, more: nsHosts.more },
        mailServers: { checked: mxChecked, more: mxHosts.more },
      };
      ctx.session.set('v6c', { findings } satisfies Ipv6Session);
      render({ findings });
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      panel.clear();
      status.error(errorText(err));
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('v6c') as Ipv6Session | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4', { max: num(MAX_HOSTS) })], L('notesTitle')),
  );
};
