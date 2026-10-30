import { toBanglaDigits } from '../../calc/digits';
import {
  BOOTSTRAP_URLS,
  eventDate,
  holder,
  parseIpInput,
  type IpVersion,
  type RdapEntity,
} from '../../calc/rdap';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { lookupIpRdap, RDAP_TIMEOUT_MS, RdapFailure, type RdapLookup } from '../../lib/rdap';
import { bindMemo, field, formActions, notes, resultPanel, textInput, type ToolView } from './kit';
import { abortOnCleanup, busy, statusArea } from './networkOnline';

/** IANA's page about the regional internet registries that run RDAP for IP addresses. */
const RIR_INFO = 'https://www.iana.org/numbers';

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notice1:
      'When you press “Look up”, your browser first downloads IANA’s public list of registries ({bootstrap}). That request contains no address.',
    notice2:
      'It then sends the IP address you entered to the regional internet registry responsible for it (AFRINIC, APNIC, ARIN, LACNIC or RIPE NCC) using RDAP, the standard registration-data protocol. The registry also receives your own IP address and basic browser details. No cookies and no page address (referrer) are sent, and this site does not receive or store the address or the answer.',
    notice3: 'Your own IP address is never looked up automatically.',
    nothingYet: 'Nothing is sent until you press the button.',
    rirLink: 'About the regional internet registries (IANA)',
    address4: 'IPv4 address',
    address6: 'IPv6 address',
    hint4: 'A public IPv4 address, for example 8.8.8.8.',
    hint6: 'A public IPv6 address, for example 2001:4860:4860::8888.',
    lookup: 'Look up',
    looking: 'Asking the registry…',
    done: 'Done. The registry answered.',
    rQueried: 'Address queried',
    rRange: 'Registered network',
    rCidr: 'CIDR',
    rName: 'Network name',
    rHandle: 'Registry handle',
    rType: 'Allocation type',
    rCountry: 'Country (as registered)',
    rStatus: 'Status',
    rHolder: 'Registered to',
    rContacts: 'Contacts',
    rRegistered: 'Registered',
    rChanged: 'Last changed',
    rParent: 'Parent network',
    rRemarks: 'Registry remarks',
    rSource: 'Source (authoritative registry)',
    rRedirected: '{url} (redirected from {server})',
    rAt: 'Looked up at',
    notPublished: 'Not published by the registry',
    role_registrant: 'registrant',
    role_administrative: 'administrative',
    role_technical: 'technical',
    role_abuse: 'abuse',
    role_noc: 'network operations',
    e_empty: 'Enter an IP address.',
    e_invalid4: 'Enter an IPv4 address such as 192.0.2.1.',
    e_invalid6: 'Enter an IPv6 address such as 2001:db8::1.',
    'e_wrong-version4': 'That is an IPv6 address. Use the IPv6 WHOIS Lookup tool.',
    'e_wrong-version6': 'That is an IPv4 address. Use the IP WHOIS Lookup tool.',
    'e_not-public':
      'That is a private, local or special-purpose address. Registries hold no record for it.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout:
      'No answer within {seconds} seconds. The registry may be slow or unreachable; try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the registry’s cross-origin rules may have blocked it. Nothing was received.',
    err_http: 'The registry answered with an error (HTTP {status}). Try again later.',
    'err_rate-limited':
      'The registry is limiting requests (HTTP 429). Wait a minute before trying again.',
    'err_not-found': 'The registry has no record for this address.',
    'err_no-service': 'IANA’s list names no registry for this address, so there is nothing to ask.',
    err_bootstrap: 'IANA’s list of registries could not be read. Try again later.',
    err_parse: 'The registry’s answer was not valid RDAP data, so it is not shown.',
    err_aborted: 'The request was cancelled.',
    notesTitle: 'About these results',
    n1: 'This is registration data: the address block the registry allocated or assigned, and to whom. It shows who holds the block, which is not necessarily the internet provider or the person using this address today.',
    n2: 'Fields the registry did not publish are shown as “Not published”; nothing is filled in or guessed. Contact details are as the registry publishes them.',
    n3: 'The registry is found from IANA’s RDAP bootstrap list, which says which registry is responsible for each address range. A registry may redirect the question to another one; the source shown is the one that answered.',
    n4: 'Private, loopback, link-local and documentation addresses are not looked up: no registry holds records for them.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      '“খুঁজুন” চাপলে আপনার ব্রাউজার প্রথমে IANA-র রেজিস্ট্রির পাবলিক তালিকা ({bootstrap}) ডাউনলোড করে। সেই রিকোয়েস্টে কোনো অ্যাড্রেস থাকে না।',
    notice2:
      'এরপর আপনার দেওয়া আইপি অ্যাড্রেসটি RDAP (নিবন্ধন-তথ্যের মানসম্মত প্রোটোকল) দিয়ে সংশ্লিষ্ট আঞ্চলিক ইন্টারনেট রেজিস্ট্রিতে (AFRINIC, APNIC, ARIN, LACNIC বা RIPE NCC) পাঠানো হয়। রেজিস্ট্রি আপনার নিজের আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্যও পায়। কুকি বা পেজের ঠিকানা (রেফারার) পাঠানো হয় না, এবং এই সাইট অ্যাড্রেস বা উত্তর গ্রহণ বা সংরক্ষণ করে না।',
    notice3: 'আপনার নিজের আইপি অ্যাড্রেস কখনো স্বয়ংক্রিয়ভাবে খোঁজা হয় না।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    rirLink: 'আঞ্চলিক ইন্টারনেট রেজিস্ট্রি সম্পর্কে (IANA)',
    address4: 'IPv4 অ্যাড্রেস',
    address6: 'IPv6 অ্যাড্রেস',
    hint4: 'একটি পাবলিক IPv4 অ্যাড্রেস, যেমন 8.8.8.8।',
    hint6: 'একটি পাবলিক IPv6 অ্যাড্রেস, যেমন 2001:4860:4860::8888।',
    lookup: 'খুঁজুন',
    looking: 'রেজিস্ট্রির কাছে জানতে চাওয়া হচ্ছে…',
    done: 'সম্পন্ন। রেজিস্ট্রি উত্তর দিয়েছে।',
    rQueried: 'যে অ্যাড্রেস খোঁজা হয়েছে',
    rRange: 'নিবন্ধিত নেটওয়ার্ক',
    rCidr: 'CIDR',
    rName: 'নেটওয়ার্কের নাম',
    rHandle: 'রেজিস্ট্রি হ্যান্ডেল',
    rType: 'বরাদ্দের ধরন',
    rCountry: 'দেশ (নিবন্ধন অনুযায়ী)',
    rStatus: 'অবস্থা',
    rHolder: 'যার নামে নিবন্ধিত',
    rContacts: 'যোগাযোগ',
    rRegistered: 'নিবন্ধনের তারিখ',
    rChanged: 'সর্বশেষ পরিবর্তন',
    rParent: 'মূল নেটওয়ার্ক',
    rRemarks: 'রেজিস্ট্রির মন্তব্য',
    rSource: 'উৎস (প্রামাণিক রেজিস্ট্রি)',
    rRedirected: '{url} ({server} থেকে রিডাইরেক্ট)',
    rAt: 'খোঁজার সময়',
    notPublished: 'রেজিস্ট্রি প্রকাশ করেনি',
    role_registrant: 'নিবন্ধক',
    role_administrative: 'প্রশাসনিক',
    role_technical: 'কারিগরি',
    role_abuse: 'অপব্যবহার',
    role_noc: 'নেটওয়ার্ক পরিচালনা',
    e_empty: 'একটি আইপি অ্যাড্রেস লিখুন।',
    e_invalid4: '192.0.2.1-এর মতো একটি IPv4 অ্যাড্রেস লিখুন।',
    e_invalid6: '2001:db8::1-এর মতো একটি IPv6 অ্যাড্রেস লিখুন।',
    'e_wrong-version4': 'এটি একটি IPv6 অ্যাড্রেস। IPv6 WHOIS লুকআপ টুল ব্যবহার করুন।',
    'e_wrong-version6': 'এটি একটি IPv4 অ্যাড্রেস। আইপি WHOIS লুকআপ টুল ব্যবহার করুন।',
    'e_not-public':
      'এটি একটি প্রাইভেট, লোকাল বা বিশেষ-উদ্দেশ্যের অ্যাড্রেস। রেজিস্ট্রিতে এর কোনো রেকর্ড নেই।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      '{seconds} সেকেন্ডের মধ্যে কোনো উত্তর আসেনি। রেজিস্ট্রি ধীর বা নাগালের বাইরে থাকতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন করা যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা রেজিস্ট্রির ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে। কিছুই পাওয়া যায়নি।',
    err_http: 'রেজিস্ট্রি একটি ত্রুটি দিয়েছে (HTTP {status})। পরে আবার চেষ্টা করুন।',
    'err_rate-limited':
      'রেজিস্ট্রি রিকোয়েস্ট সীমিত করছে (HTTP 429)। আবার চেষ্টার আগে এক মিনিট অপেক্ষা করুন।',
    'err_not-found': 'এই অ্যাড্রেসের কোনো রেকর্ড রেজিস্ট্রিতে নেই।',
    'err_no-service':
      'IANA-র তালিকায় এই অ্যাড্রেসের কোনো রেজিস্ট্রি নেই, তাই জানতে চাওয়ার কিছু নেই।',
    err_bootstrap: 'IANA-র রেজিস্ট্রি তালিকা পড়া যায়নি। পরে আবার চেষ্টা করুন।',
    err_parse: 'রেজিস্ট্রির উত্তরটি সঠিক RDAP ডেটা ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    n1: 'এটি নিবন্ধনের তথ্য: রেজিস্ট্রি যে অ্যাড্রেস ব্লক বরাদ্দ বা নির্ধারণ করেছে এবং কাকে করেছে। এটি দেখায় ব্লকটি কার নামে, যা আজ এই অ্যাড্রেস ব্যবহারকারী ইন্টারনেট সেবাদাতা বা ব্যক্তি নাও হতে পারে।',
    n2: 'রেজিস্ট্রি যে তথ্য প্রকাশ করেনি তা “প্রকাশ করেনি” হিসেবে দেখানো হয়; কিছুই বানানো বা অনুমান করা হয় না। যোগাযোগের তথ্য রেজিস্ট্রি যেমন প্রকাশ করে তেমনই।',
    n3: 'IANA-র RDAP বুটস্ট্র্যাপ তালিকা থেকে রেজিস্ট্রি খুঁজে নেওয়া হয়, যেখানে লেখা থাকে কোন অ্যাড্রেস রেঞ্জের জন্য কোন রেজিস্ট্রি দায়ী। কোনো রেজিস্ট্রি প্রশ্নটি অন্য রেজিস্ট্রিতে রিডাইরেক্ট করতে পারে; যে উত্তর দিয়েছে সেটিই উৎস হিসেবে দেখানো হয়।',
    n4: 'প্রাইভেট, লুপব্যাক, লিংক-লোকাল ও ডকুমেন্টেশন অ্যাড্রেস খোঁজা হয় না: কোনো রেজিস্ট্রিতে এগুলোর রেকর্ড থাকে না।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

interface WhoisSession {
  queried: string;
  lookup: RdapLookup;
}

function whoisView(version: IpVersion): ToolView {
  return (ctx) => {
    const L = S(ctx.lang);
    const id = version === 4 ? 'whois4' : 'whois6';
    const num = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
    const address = field(
      L(version === 4 ? 'address4' : 'address6'),
      textInput({
        id: `${id}-address`,
        inputmode: version === 4 ? 'decimal' : 'text',
        autocapitalize: 'off',
      }),
      { hint: L(version === 4 ? 'hint4' : 'hint6') },
    );
    bindMemo(address.control, ctx.memo, 'address');
    const status = statusArea();
    const panel = resultPanel(ctx, L('lookup'));
    const next = abortOnCleanup(ctx);

    const or = (v: string | null | undefined): string => v || L('notPublished');
    const roleText = (r: string): string =>
      ['registrant', 'administrative', 'technical', 'abuse', 'noc'].includes(r)
        ? L(`role_${r}` as Key)
        : r;
    const entityLine = (e: RdapEntity): string =>
      [
        e.org ?? e.name ?? e.handle ?? L('notPublished'),
        e.handle && (e.org ?? e.name) ? `(${e.handle})` : '',
        e.roles.length ? `— ${e.roles.map(roleText).join(', ')}` : '',
        ...e.emails,
        ...e.phones,
        e.address ?? '',
      ]
        .filter(Boolean)
        .join(' ');

    const render = ({ queried, lookup }: WhoisSession): void => {
      const n = lookup.network;
      const who = holder(n);
      const range = n.startAddress && n.endAddress ? `${n.startAddress} – ${n.endAddress}` : null;
      panel.show(
        [
          { label: L('rQueried'), value: queried, lang: 'en' },
          { label: L('rRange'), value: or(range), lang: range ? 'en' : undefined, primary: true },
          { label: L('rCidr'), value: n.cidrs.length ? n.cidrs.join(', ') : L('notPublished') },
          { label: L('rName'), value: or(n.name) },
          { label: L('rHandle'), value: or(n.handle) },
          { label: L('rType'), value: or(n.type) },
          { label: L('rCountry'), value: or(n.country) },
          { label: L('rStatus'), value: n.status.length ? n.status.join(', ') : L('notPublished') },
          { label: L('rHolder'), value: who ? entityLine(who) : L('notPublished') },
          {
            label: L('rContacts'),
            value:
              n.entities
                .filter((e) => e !== who)
                .map(entityLine)
                .join('\n') || L('notPublished'),
          },
          { label: L('rRegistered'), value: or(eventDate(n, 'registration')) },
          { label: L('rChanged'), value: or(eventDate(n, 'last changed')) },
          { label: L('rParent'), value: or(n.parentHandle) },
          ...(n.remarks.length ? [{ label: L('rRemarks'), value: n.remarks.join('\n') }] : []),
          {
            label: L('rSource'),
            value: lookup.redirected
              ? L('rRedirected', { url: lookup.source, server: lookup.server })
              : lookup.source,
            lang: 'en',
          },
          {
            label: L('rAt'),
            value: num(
              lookup.at
                .toISOString()
                .replace('T', ' ')
                .replace(/\.\d+Z$/, ' UTC'),
            ),
          },
        ],
        [],
      );
    };

    const form = h('form', { class: 'tool-form', 'aria-label': L('lookup') });
    form.noValidate = true;
    form.append(
      h(
        'aside',
        { class: 'net-notice', 'aria-labelledby': `${id}-notice-title` },
        h('h2', { id: `${id}-notice-title`, class: 'net-notice-title' }, L('noticeTitle')),
        h('p', {}, L('notice1', { bootstrap: BOOTSTRAP_URLS[version] })),
        h('p', {}, L('notice2')),
        h('p', {}, L('notice3')),
        h('p', { class: 'net-notice-strong' }, L('nothingYet')),
        h('p', {}, h('a', { href: RIR_INFO, rel: 'noopener noreferrer' }, L('rirLink'))),
      ),
      h('div', { class: 'field-grid' }, address.el),
      formActions(ctx, {
        submitLabel: L('lookup'),
        panel,
        onReset() {
          next().abort();
          address.control.value = '';
          address.setError(null);
          ctx.memo.address = '';
          ctx.session.delete('whois');
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
      const ip = parseIpInput(address.control.value, version);
      if (!ip.ok) {
        const key =
          ip.error === 'invalid' || ip.error === 'wrong-version'
            ? `e_${ip.error}${version}`
            : `e_${ip.error}`;
        address.setError(L(key as Key));
        address.control.focus();
        return;
      }
      const ctrl = next();
      busy(form, true);
      status.progress(L('looking'));
      try {
        const lookup = await lookupIpRdap(ip.value, ctrl.signal);
        const session: WhoisSession = { queried: ip.value.text, lookup };
        ctx.session.set('whois', session);
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

    const last = ctx.session.get('whois') as WhoisSession | undefined;
    if (last) render(last);

    return h(
      'div',
      { class: 'tool-layout' },
      form,
      panel.el,
      notes(ctx, [L('n1'), L('n2'), L('n3'), L('n4')], L('notesTitle')),
    );
  };
}

export const ipWhois: ToolView = whoisView(4);
export const ipv6Whois: ToolView = whoisView(6);
