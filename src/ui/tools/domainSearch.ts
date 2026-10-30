import { toBanglaDigits } from '../../calc/digits';
import { normaliseDomain } from '../../calc/netDiag';
import { DNS_BOOTSTRAP_URL, domainEventDate } from '../../calc/rdap';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { lookupDomainRdap, RDAP_TIMEOUT_MS, RdapFailure, type DomainLookup } from '../../lib/rdap';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  textInput,
  type ResultRow,
  type ToolView,
} from './kit';
import { abortOnCleanup, busy, statusArea } from './networkOnline';

const RDAP_INFO = 'https://www.icann.org/rdap';

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notice1:
      'When you press “Search”, your browser downloads IANA’s list of domain registries ({bootstrap}) to find the registry for the name’s ending (such as .com), then asks that registry over RDAP whether it holds the name.',
    notice2:
      'The registry and IANA receive the name you typed, your IP address and basic browser details. No cookies and no page address (referrer) are sent. This site does not receive or store the name or the answer.',
    notice3:
      'Only search for names you are happy to share: some registries and registrars watch lookups for popular names.',
    nothingYet: 'Nothing is sent until you press the button.',
    rdapLink: 'About RDAP (ICANN)',
    domain: 'Domain name',
    hint: 'For example example.com. Internationalised names are converted to their ASCII form.',
    search: 'Search',
    looking: 'Asking the registry…',
    done: 'Done.',
    rResult: 'Result',
    registered: 'Registered: this name is taken',
    notFound: 'Not found in the registry: probably available',
    notFoundSub: 'Not found: {name} is not a registered domain on its own',
    noService: 'Unknown: the .{tld} registry does not offer RDAP',
    rQueried: 'Name searched',
    rRegistrar: 'Registrar',
    rRegistered: 'Registered on',
    rExpires: 'Expires on',
    rChanged: 'Last changed',
    rStatus: 'Registry status',
    rNameservers: 'Name servers',
    rDnssec: 'DNSSEC',
    signed: 'Signed',
    unsigned: 'Not signed',
    rSource: 'Source',
    rAt: 'Checked at',
    notPublished: 'Not published',
    nNotFound:
      'The registry has no record of this name. That usually means it can be registered, but some names are reserved, blocked or premium. Only a registrar can confirm and take your registration.',
    nNotFoundSub:
      'Registries only hold registered domains such as example.com, not names under them such as www.example.com. Search the registered name instead.',
    nNoService:
      'Some country registries, including Bangladesh’s .bd, do not publish RDAP. Availability is not guessed from DNS: ask a registrar for that country’s domains.',
    e_empty: 'Enter a domain name.',
    e_invalid: 'Enter a valid domain name such as example.com.',
    e_ip: 'Enter a domain name, not an IP address.',
    'e_too-long': 'A domain name can be at most 253 characters.',
    e_underscore: 'Registered domain names cannot contain “_”.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout: 'No answer within {seconds} seconds. The registry may be slow; try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it. Some registries do not allow lookups from web pages.',
    err_http:
      'The registry answered with an error (HTTP {status}), so nothing can be said about this name.',
    err_parse: 'The answer was not in the expected format, so it is not shown.',
    err_aborted: 'The request was cancelled.',
    err_bootstrap: 'IANA’s registry list could not be read. Try again later.',
    'err_no-service': 'No registry was found for this name.',
    'err_not-found': 'The registry has no record of this name.',
    'err_rate-limited':
      'The registry is limiting lookups from your address. Wait a few minutes and try again.',
    notesTitle: 'About these results',
    n1: '“Registered” comes from the registry itself and is reliable. “Not found” means the registry holds no record; only a registrar can confirm that a name is available to buy.',
    n2: 'This tool never decides availability from DNS: a name without DNS records can still be registered.',
    n3: 'Registrant contact details are usually hidden by registries for privacy and are not shown.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      '“খুঁজুন” চাপলে আপনার ব্রাউজার নামের শেষাংশের (যেমন .com) রেজিস্ট্রি খুঁজতে IANA-র ডোমেইন রেজিস্ট্রির তালিকা ({bootstrap}) ডাউনলোড করে, তারপর RDAP-এর মাধ্যমে সেই রেজিস্ট্রিকে জিজ্ঞেস করে নামটি তাদের কাছে আছে কি না।',
    notice2:
      'রেজিস্ট্রি ও IANA আপনার লেখা নাম, আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্য পায়। কুকি বা পেজের ঠিকানা (রেফারার) পাঠানো হয় না। এই সাইট নাম বা উত্তর গ্রহণ বা সংরক্ষণ করে না।',
    notice3:
      'শুধু সেই নাম খুঁজুন যা শেয়ার করতে আপনার আপত্তি নেই: কিছু রেজিস্ট্রি ও রেজিস্ট্রার জনপ্রিয় নামের খোঁজ নজরে রাখে।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    rdapLink: 'RDAP সম্পর্কে (ICANN)',
    domain: 'ডোমেইন নাম',
    hint: 'যেমন example.com। আন্তর্জাতিক নাম তাদের ASCII রূপে রূপান্তরিত হয়।',
    search: 'খুঁজুন',
    looking: 'রেজিস্ট্রিকে জিজ্ঞেস করা হচ্ছে…',
    done: 'সম্পন্ন।',
    rResult: 'ফলাফল',
    registered: 'নিবন্ধিত: এই নাম নেওয়া হয়ে গেছে',
    notFound: 'রেজিস্ট্রিতে পাওয়া যায়নি: সম্ভবত পাওয়া যাবে',
    notFoundSub: 'পাওয়া যায়নি: {name} নিজে কোনো নিবন্ধিত ডোমেইন নয়',
    noService: 'অজানা: .{tld} রেজিস্ট্রি RDAP দেয় না',
    rQueried: 'যে নাম খোঁজা হয়েছে',
    rRegistrar: 'রেজিস্ট্রার',
    rRegistered: 'নিবন্ধনের তারিখ',
    rExpires: 'মেয়াদ শেষের তারিখ',
    rChanged: 'সর্বশেষ পরিবর্তন',
    rStatus: 'রেজিস্ট্রি স্ট্যাটাস',
    rNameservers: 'নেম সার্ভার',
    rDnssec: 'DNSSEC',
    signed: 'সাইন করা',
    unsigned: 'সাইন করা নয়',
    rSource: 'উৎস',
    rAt: 'যাচাইয়ের সময়',
    notPublished: 'প্রকাশিত নয়',
    nNotFound:
      'রেজিস্ট্রিতে এই নামের কোনো রেকর্ড নেই। সাধারণত এর মানে এটি নিবন্ধন করা যাবে, তবে কিছু নাম সংরক্ষিত, ব্লক করা বা প্রিমিয়াম। শুধু একজন রেজিস্ট্রার নিশ্চিত করে নিবন্ধন নিতে পারে।',
    nNotFoundSub:
      'রেজিস্ট্রি শুধু example.com-এর মতো নিবন্ধিত ডোমেইন রাখে, www.example.com-এর মতো তার নিচের নাম নয়। বরং নিবন্ধিত নামটি খুঁজুন।',
    nNoService:
      'বাংলাদেশের .bd-সহ কিছু দেশের রেজিস্ট্রি RDAP প্রকাশ করে না। DNS দেখে প্রাপ্যতা অনুমান করা হয় না: সেই দেশের ডোমেইনের জন্য একজন রেজিস্ট্রারকে জিজ্ঞেস করুন।',
    e_empty: 'একটি ডোমেইন নাম লিখুন।',
    e_invalid: 'example.com-এর মতো একটি সঠিক ডোমেইন নাম লিখুন।',
    e_ip: 'আইপি অ্যাড্রেস নয়, একটি ডোমেইন নাম লিখুন।',
    'e_too-long': 'একটি ডোমেইন নাম সর্বোচ্চ ২৫৩ অক্ষরের হতে পারে।',
    e_underscore: 'নিবন্ধিত ডোমেইন নামে “_” থাকতে পারে না।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      '{seconds} সেকেন্ডের মধ্যে উত্তর আসেনি। রেজিস্ট্রি ধীর হতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন করা যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে। কিছু রেজিস্ট্রি ওয়েব পেজ থেকে খোঁজার অনুমতি দেয় না।',
    err_http:
      'রেজিস্ট্রি একটি ত্রুটি দিয়েছে (HTTP {status}), তাই এই নাম সম্পর্কে কিছু বলা যাচ্ছে না।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
    err_bootstrap: 'IANA-র রেজিস্ট্রি তালিকা পড়া যায়নি। পরে আবার চেষ্টা করুন।',
    'err_no-service': 'এই নামের জন্য কোনো রেজিস্ট্রি পাওয়া যায়নি।',
    'err_not-found': 'রেজিস্ট্রিতে এই নামের কোনো রেকর্ড নেই।',
    'err_rate-limited':
      'রেজিস্ট্রি আপনার অ্যাড্রেস থেকে খোঁজা সীমিত করছে। কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    n1: '“নিবন্ধিত” তথ্য রেজিস্ট্রি থেকেই আসে এবং নির্ভরযোগ্য। “পাওয়া যায়নি” মানে রেজিস্ট্রিতে কোনো রেকর্ড নেই; নামটি কেনা যাবে কি না শুধু একজন রেজিস্ট্রার নিশ্চিত করতে পারে।',
    n2: 'এই টুল কখনো DNS দেখে প্রাপ্যতা ঠিক করে না: DNS রেকর্ড ছাড়া নামও নিবন্ধিত থাকতে পারে।',
    n3: 'গোপনীয়তার জন্য রেজিস্ট্রি সাধারণত নিবন্ধনকারীর যোগাযোগের তথ্য লুকিয়ে রাখে এবং তা দেখানো হয় না।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

interface Session {
  name: string;
  lookup: DomainLookup;
}

export const domainSearch: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const num = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
  const domain = field(
    L('domain'),
    textInput({ id: 'domain-search-name', autocapitalize: 'off', inputmode: 'url' }),
    { hint: L('hint') },
  );
  bindMemo(domain.control, ctx.memo, 'domain');
  const panel = resultPanel(ctx, L('search'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const or = (v: string | null): string => v ?? L('notPublished');
  const date = (v: string | null): string => (v ? num(v.replace(/T.*$/, '')) : L('notPublished'));
  const when = (d: Date): string =>
    num(
      d
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, ' UTC'),
    );

  const render = ({ name, lookup }: Session): void => {
    const queried: ResultRow = { label: L('rQueried'), value: name, lang: 'en' };
    const at: ResultRow = { label: L('rAt'), value: when(lookup.at) };
    if (lookup.kind === 'no-service') {
      panel.show(
        [
          { label: L('rResult'), value: L('noService', { tld: lookup.tld }), primary: true },
          queried,
          at,
        ],
        [L('nNoService')],
      );
      return;
    }
    const source: ResultRow = { label: L('rSource'), value: lookup.source, lang: 'en' };
    if (lookup.kind === 'not-found') {
      const sub = name.split('.').length > 2;
      panel.show(
        [
          {
            label: L('rResult'),
            value: sub ? L('notFoundSub', { name }) : L('notFound'),
            primary: true,
          },
          queried,
          source,
          at,
        ],
        [L(sub ? 'nNotFoundSub' : 'nNotFound')],
      );
      return;
    }
    const d = lookup.domain;
    panel.show(
      [
        { label: L('rResult'), value: L('registered'), primary: true },
        queried,
        { label: L('rRegistrar'), value: or(d.registrar), lang: d.registrar ? 'en' : undefined },
        { label: L('rRegistered'), value: date(domainEventDate(d, 'registration')) },
        { label: L('rExpires'), value: date(domainEventDate(d, 'expiration')) },
        { label: L('rChanged'), value: date(domainEventDate(d, 'last changed')) },
        { label: L('rStatus'), value: d.status.length ? d.status.join(', ') : L('notPublished') },
        {
          label: L('rNameservers'),
          value: d.nameservers.length ? d.nameservers.join('\n') : L('notPublished'),
          lang: d.nameservers.length ? 'en' : undefined,
        },
        {
          label: L('rDnssec'),
          value: d.dnssec === null ? L('notPublished') : L(d.dnssec ? 'signed' : 'unsigned'),
        },
        source,
        at,
      ],
      [],
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('search') });
  form.noValidate = true;
  form.append(
    h(
      'aside',
      { class: 'net-notice', 'aria-labelledby': 'domain-search-notice-title' },
      h('h2', { id: 'domain-search-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
      h('p', {}, L('notice1', { bootstrap: DNS_BOOTSTRAP_URL })),
      h('p', {}, L('notice2')),
      h('p', {}, L('notice3')),
      h('p', { class: 'net-notice-strong' }, L('nothingYet')),
      h('p', {}, h('a', { href: RDAP_INFO, rel: 'noopener noreferrer' }, L('rdapLink'))),
    ),
    h('div', { class: 'field-grid' }, domain.el),
    formActions(ctx, {
      submitLabel: L('search'),
      panel,
      onReset() {
        next().abort();
        domain.control.value = '';
        domain.setError(null);
        ctx.memo.domain = '';
        ctx.session.delete('domain');
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
    const n = normaliseDomain(domain.control.value);
    const error = !n.ok
      ? n.error.replace(/^domain-/, '')
      : n.value.includes('_')
        ? 'underscore'
        : null;
    if (!n.ok || error) {
      domain.setError(L(`e_${error}` as Key));
      domain.control.focus();
      return;
    }
    const ctrl = next();
    busy(form, true);
    status.progress(L('looking'));
    try {
      const session: Session = {
        name: n.value,
        lookup: await lookupDomainRdap(n.value, ctrl.signal),
      };
      ctx.session.set('domain', session);
      render(session);
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      panel.clear();
      const f = err instanceof RdapFailure ? err : new RdapFailure('blocked');
      status.error(
        L(`err_${f.kind}` as Key, {
          seconds: num(String(RDAP_TIMEOUT_MS / 1000)),
          status: f.status ? String(f.status) : '?',
        }),
      );
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('domain') as Session | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, [L('n1'), L('n2'), L('n3')], L('notesTitle')),
  );
};
