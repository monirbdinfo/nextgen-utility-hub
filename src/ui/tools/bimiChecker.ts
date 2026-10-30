import {
  bimiName,
  bimiRecords,
  buildBimi,
  DEFAULT_SELECTOR,
  dmarcName,
  dmarcProblems,
  isSelector,
  parseBimi,
  parseDmarc,
  txtValue,
  type BimiIssue,
  type BimiRecord,
  type DmarcPolicy,
  type DmarcProblem,
} from '../../calc/bimi';
import { DOH_ENDPOINT, normaliseDomain, type DnsResult } from '../../calc/netDiag';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { NetFailure, type NetError } from '../../lib/net';
import { bindMemo, field, formActions, resultPanel, textInput, type ToolView } from './kit';
import { abortOnCleanup, busy, dohJson, statusArea } from './networkOnline';
import { toolForm } from './toolForm';

const CLOUDFLARE_PRIVACY = 'https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/';
const LOOKUP_TIMEOUT_S = 8;

const S = defineStrings({
  en: {
    checkTitle: 'Check a domain’s BIMI record',
    checkResult: 'BIMI check result',
    generateTitle: 'Create a BIMI record',
    noticeTitle: 'Before you use this tool',
    notice1:
      'When you press “Check BIMI”, your browser sends two DNS questions to Cloudflare’s public DNS resolver ({endpoint}) over HTTPS: the BIMI record ({bimi}) and the DMARC record ({dmarc}) of the domain you enter.',
    notice2:
      'Cloudflare also receives your IP address and basic browser details. The logo and certificate files are not downloaded. This site does not receive or store the query or the answer.',
    nothingYet: 'Nothing is sent until you press the button.',
    privacyLink: 'Cloudflare 1.1.1.1 privacy policy',
    domain: 'Domain',
    domainHint: 'The domain in your From address, for example example.com.',
    selector: 'Selector',
    selectorHint: 'Leave as “default” unless your mail uses a BIMI-Selector header.',
    check: 'Check BIMI',
    looking: 'Asking Cloudflare DNS…',
    done: 'Done.',
    rName: 'Record looked up',
    rStatus: 'BIMI record',
    st_valid: 'Found and valid',
    st_warnings: 'Found, with warnings',
    st_invalid: 'Found, with problems',
    st_declined: 'Found: the domain declines to show a logo',
    st_none: 'Not found',
    st_many: 'More than one BIMI record (receivers ignore them all)',
    rRecord: 'Record text',
    rLogo: 'Logo (l=)',
    rCert: 'Mark certificate (a=)',
    none: 'None',
    rDmarc: 'DMARC policy',
    rReady: 'DMARC strong enough for BIMI',
    yes: 'Yes',
    no: 'No',
    dmarcNone: 'No DMARC record at {name}',
    dmarcValue: 'p={p}, pct={pct}{sp}',
    i_notBimi: 'The record must start with v=BIMI1 (exactly, in capitals).',
    'i_duplicate-tag': 'A tag appears more than once.',
    i_syntax: 'Part of the record is not in tag=value form.',
    'i_no-location': 'There is no logo address (l=) and no certificate address (a=).',
    'i_no-l-tag': 'The l= tag is missing. It is required, even when empty.',
    'i_logo-not-https': 'The logo address must start with https:// ({value}).',
    'i_cert-not-https': 'The certificate address must start with https:// ({value}).',
    'i_logo-not-svg': 'The logo should be an SVG file (SVG Tiny PS) ({value}).',
    'i_cert-not-pem': 'The certificate should be a PEM file ({value}).',
    'i_logo-list': 'Only one logo address is expected; receivers may use just the first ({value}).',
    'i_unknown-tag': 'Unknown tag “{value}”; receivers ignore it.',
    'i_cert-self':
      'a=self is an older form meaning “no certificate”. Gmail and Apple Mail need a certificate to show the logo.',
    'i_no-cert':
      'No mark certificate (a=). Some mail services show the logo without one, but Gmail and Apple Mail need a Verified Mark Certificate (or, for Gmail, a Common Mark Certificate).',
    'i_no-logo': 'The logo address is empty; receivers that need l= may not show a logo.',
    d_none:
      'No DMARC record was found at {name}. BIMI needs DMARC. If the domain is a subdomain, its parent domain’s policy may apply; check that domain too.',
    'd_weak-policy': 'DMARC policy p= must be quarantine or reject; none is not enough for BIMI.',
    d_partial: 'DMARC pct= must be 100 (the default) for BIMI.',
    'd_weak-subdomain': 'The subdomain policy sp=none is not enough for BIMI.',
    noRecordNote:
      'No BIMI record was found at {name}. Use the form below to create one, or check the selector.',
    manyNote:
      'There is more than one TXT record starting with v=BIMI1 at this name. Remove all but one.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout:
      'No answer within {seconds} seconds. The service may be slow or unreachable; try again later.',
    err_blocked:
      'The request could not be completed. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it.',
    err_http: 'The service answered with an error (HTTP {status}). Wait a moment and try again.',
    err_parse: 'The answer was not in the expected format, so it is not shown.',
    err_aborted: 'The request was cancelled.',
    'e_domain-empty': 'Enter a domain name.',
    'e_domain-invalid': 'Enter a valid domain name such as example.com.',
    'e_domain-too-long': 'A domain name can be at most 253 characters.',
    'e_domain-ip': 'Enter a domain name, not an IP address.',
    'e_selector-invalid':
      'A selector is one word of letters, digits, hyphens or underscores (not starting or ending with a hyphen).',
    // Generator
    gDomain: 'Domain',
    gLogo: 'Logo address (l=)',
    gLogoHint: 'An https:// address of your logo as an SVG Tiny PS file.',
    gCert: 'Mark certificate address (a=, optional)',
    gCertHint:
      'An https:// address of your VMC or CMC as a PEM file. Leave empty if you do not have one.',
    gSelector: 'Selector',
    generate: 'Create record',
    gResult: 'Your BIMI record',
    gName: 'Name (host)',
    gType: 'Type',
    gValue: 'Value',
    gNote1:
      'Add this as a TXT record at your DNS provider. Some providers want only the part before your domain as the host ({host}).',
    gNote2: 'The record is made in your browser; nothing is sent.',
    'g_logo-empty': 'Enter the address of your SVG logo.',
    'g_logo-not-https': 'The logo address must start with https://.',
    'g_logo-not-svg': 'The logo address must end in .svg.',
    'g_cert-not-https': 'The certificate address must start with https://.',
    'g_cert-not-pem': 'The certificate address must end in .pem.',
    notesTitle: 'About BIMI',
    n1: 'BIMI lets mail services show your brand logo next to messages that pass DMARC. Each mail service decides whether to show it; a valid record does not guarantee a logo.',
    n2: 'This tool checks the record’s format and the DMARC policy only. It does not download or check the SVG logo or the certificate, and it is not an official certification.',
    n3: 'Requirements: SPF and DKIM aligned with DMARC, a DMARC policy of quarantine or reject at 100%, an SVG Tiny PS logo over HTTPS and, for Gmail and Apple Mail, a mark certificate.',
  },
  bn: {
    checkTitle: 'ডোমেইনের BIMI রেকর্ড পরীক্ষা করুন',
    checkResult: 'BIMI পরীক্ষার ফলাফল',
    generateTitle: 'BIMI রেকর্ড তৈরি করুন',
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      '“BIMI পরীক্ষা করুন” চাপলে আপনার ব্রাউজার Cloudflare-এর পাবলিক DNS রিজলভারে ({endpoint}) HTTPS-এ দুটি DNS প্রশ্ন পাঠায়: আপনার দেওয়া ডোমেইনের BIMI রেকর্ড ({bimi}) ও DMARC রেকর্ড ({dmarc})।',
    notice2:
      'Cloudflare আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্যও পায়। লোগো ও সার্টিফিকেট ফাইল ডাউনলোড করা হয় না। এই সাইট প্রশ্ন বা উত্তর গ্রহণ বা সংরক্ষণ করে না।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    privacyLink: 'Cloudflare 1.1.1.1 প্রাইভেসি নীতি',
    domain: 'ডোমেইন',
    domainHint: 'আপনার From ঠিকানার ডোমেইন, যেমন example.com।',
    selector: 'সিলেক্টর',
    selectorHint: 'আপনার মেইলে BIMI-Selector হেডার না থাকলে “default” রাখুন।',
    check: 'BIMI পরীক্ষা করুন',
    looking: 'Cloudflare DNS-এর কাছে জানতে চাওয়া হচ্ছে…',
    done: 'সম্পন্ন।',
    rName: 'যে রেকর্ড খোঁজা হয়েছে',
    rStatus: 'BIMI রেকর্ড',
    st_valid: 'পাওয়া গেছে ও সঠিক',
    st_warnings: 'পাওয়া গেছে, সতর্কতাসহ',
    st_invalid: 'পাওয়া গেছে, সমস্যাসহ',
    st_declined: 'পাওয়া গেছে: ডোমেইনটি লোগো না দেখানোর কথা জানিয়েছে',
    st_none: 'পাওয়া যায়নি',
    st_many: 'একাধিক BIMI রেকর্ড (প্রাপকেরা সবগুলোই উপেক্ষা করে)',
    rRecord: 'রেকর্ডের লেখা',
    rLogo: 'লোগো (l=)',
    rCert: 'মার্ক সার্টিফিকেট (a=)',
    none: 'নেই',
    rDmarc: 'DMARC নীতি',
    rReady: 'BIMI-এর জন্য DMARC যথেষ্ট কঠোর',
    yes: 'হ্যাঁ',
    no: 'না',
    dmarcNone: '{name}-এ কোনো DMARC রেকর্ড নেই',
    dmarcValue: 'p={p}, pct={pct}{sp}',
    i_notBimi: 'রেকর্ডটি অবশ্যই v=BIMI1 (হুবহু, বড় হাতের অক্ষরে) দিয়ে শুরু হতে হবে।',
    'i_duplicate-tag': 'একটি ট্যাগ একাধিকবার আছে।',
    i_syntax: 'রেকর্ডের একটি অংশ tag=value আকারে নেই।',
    'i_no-location': 'লোগোর ঠিকানা (l=) বা সার্টিফিকেটের ঠিকানা (a=) কোনোটিই নেই।',
    'i_no-l-tag': 'l= ট্যাগ নেই। ফাঁকা হলেও এটি থাকা আবশ্যক।',
    'i_logo-not-https': 'লোগোর ঠিকানা https:// দিয়ে শুরু হতে হবে ({value})।',
    'i_cert-not-https': 'সার্টিফিকেটের ঠিকানা https:// দিয়ে শুরু হতে হবে ({value})।',
    'i_logo-not-svg': 'লোগোটি SVG ফাইল (SVG Tiny PS) হওয়া উচিত ({value})।',
    'i_cert-not-pem': 'সার্টিফিকেটটি PEM ফাইল হওয়া উচিত ({value})।',
    'i_logo-list':
      'একটিমাত্র লোগো ঠিকানা প্রত্যাশিত; প্রাপকেরা হয়তো শুধু প্রথমটি ব্যবহার করবে ({value})।',
    'i_unknown-tag': 'অজানা ট্যাগ “{value}”; প্রাপকেরা এটি উপেক্ষা করে।',
    'i_cert-self':
      'a=self একটি পুরোনো রূপ, যার মানে “সার্টিফিকেট নেই”। লোগো দেখাতে Gmail ও Apple Mail-এর সার্টিফিকেট লাগে।',
    'i_no-cert':
      'মার্ক সার্টিফিকেট (a=) নেই। কিছু মেইল সার্ভিস এটি ছাড়াই লোগো দেখায়, কিন্তু Gmail ও Apple Mail-এর Verified Mark Certificate (অথবা Gmail-এর জন্য Common Mark Certificate) লাগে।',
    'i_no-logo': 'লোগোর ঠিকানা ফাঁকা; যেসব প্রাপকের l= লাগে তারা হয়তো লোগো দেখাবে না।',
    d_none:
      '{name}-এ কোনো DMARC রেকর্ড পাওয়া যায়নি। BIMI-এর জন্য DMARC লাগে। ডোমেইনটি সাবডোমেইন হলে মূল ডোমেইনের নীতি প্রযোজ্য হতে পারে; সেটিও পরীক্ষা করুন।',
    'd_weak-policy': 'DMARC নীতি p= অবশ্যই quarantine বা reject হতে হবে; none যথেষ্ট নয়।',
    d_partial: 'BIMI-এর জন্য DMARC pct= অবশ্যই ১০০ (ডিফল্ট) হতে হবে।',
    'd_weak-subdomain': 'সাবডোমেইন নীতি sp=none BIMI-এর জন্য যথেষ্ট নয়।',
    noRecordNote:
      '{name}-এ কোনো BIMI রেকর্ড পাওয়া যায়নি। নিচের ফর্ম দিয়ে একটি তৈরি করুন, অথবা সিলেক্টর পরীক্ষা করুন।',
    manyNote: 'এই নামে v=BIMI1 দিয়ে শুরু হওয়া একাধিক TXT রেকর্ড আছে। একটি রেখে বাকিগুলো মুছুন।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      '{seconds} সেকেন্ডের মধ্যে কোনো উত্তর আসেনি। সার্ভিসটি ধীর বা নাগালের বাইরে থাকতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'রিকোয়েস্টটি সম্পন্ন করা যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে।',
    err_http: 'সার্ভিসটি একটি ত্রুটি দিয়েছে (HTTP {status})। একটু অপেক্ষা করে আবার চেষ্টা করুন।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    err_aborted: 'রিকোয়েস্টটি বাতিল করা হয়েছে।',
    'e_domain-empty': 'একটি ডোমেইন নাম লিখুন।',
    'e_domain-invalid': 'example.com-এর মতো একটি সঠিক ডোমেইন নাম লিখুন।',
    'e_domain-too-long': 'ডোমেইন নাম সর্বোচ্চ ২৫৩ অক্ষরের হতে পারে।',
    'e_domain-ip': 'আইপি অ্যাড্রেস নয়, একটি ডোমেইন নাম লিখুন।',
    'e_selector-invalid':
      'সিলেক্টর হলো অক্ষর, সংখ্যা, হাইফেন বা আন্ডারস্কোর দিয়ে গঠিত একটি শব্দ (হাইফেন দিয়ে শুরু বা শেষ নয়)।',
    gDomain: 'ডোমেইন',
    gLogo: 'লোগোর ঠিকানা (l=)',
    gLogoHint: 'SVG Tiny PS ফাইল হিসেবে আপনার লোগোর https:// ঠিকানা।',
    gCert: 'মার্ক সার্টিফিকেটের ঠিকানা (a=, ঐচ্ছিক)',
    gCertHint: 'PEM ফাইল হিসেবে আপনার VMC বা CMC-এর https:// ঠিকানা। না থাকলে ফাঁকা রাখুন।',
    gSelector: 'সিলেক্টর',
    generate: 'রেকর্ড তৈরি করুন',
    gResult: 'আপনার BIMI রেকর্ড',
    gName: 'নাম (হোস্ট)',
    gType: 'ধরন',
    gValue: 'মান',
    gNote1:
      'আপনার DNS প্রোভাইডারে এটি TXT রেকর্ড হিসেবে যোগ করুন। কিছু প্রোভাইডার হোস্ট হিসেবে শুধু ডোমেইনের আগের অংশটি চায় ({host})।',
    gNote2: 'রেকর্ডটি আপনার ব্রাউজারেই তৈরি হয়; কিছুই পাঠানো হয় না।',
    'g_logo-empty': 'আপনার SVG লোগোর ঠিকানা লিখুন।',
    'g_logo-not-https': 'লোগোর ঠিকানা https:// দিয়ে শুরু হতে হবে।',
    'g_logo-not-svg': 'লোগোর ঠিকানা .svg দিয়ে শেষ হতে হবে।',
    'g_cert-not-https': 'সার্টিফিকেটের ঠিকানা https:// দিয়ে শুরু হতে হবে।',
    'g_cert-not-pem': 'সার্টিফিকেটের ঠিকানা .pem দিয়ে শেষ হতে হবে।',
    notesTitle: 'BIMI সম্পর্কে',
    n1: 'BIMI দিয়ে DMARC পাস করা মেইলের পাশে মেইল সার্ভিসগুলো আপনার ব্র্যান্ডের লোগো দেখাতে পারে। লোগো দেখাবে কি না তা প্রতিটি মেইল সার্ভিস নিজে ঠিক করে; সঠিক রেকর্ড থাকলেই লোগো দেখানোর নিশ্চয়তা নেই।',
    n2: 'এই টুল শুধু রেকর্ডের ফরম্যাট ও DMARC নীতি পরীক্ষা করে। এটি SVG লোগো বা সার্টিফিকেট ডাউনলোড বা যাচাই করে না, এবং এটি কোনো অফিশিয়াল সার্টিফিকেশন নয়।',
    n3: 'প্রয়োজনীয়তা: DMARC-এর সঙ্গে মিলে যাওয়া SPF ও DKIM, ১০০% এ quarantine বা reject DMARC নীতি, HTTPS-এ SVG Tiny PS লোগো এবং Gmail ও Apple Mail-এর জন্য মার্ক সার্টিফিকেট।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

interface BimiSession {
  name: string;
  dmarcAt: string;
  records: string[];
  dmarc: DmarcPolicy | null;
}

function errorText(L: L, e: unknown): string {
  const kind: NetError = e instanceof NetFailure ? e.kind : 'blocked';
  return L(`err_${kind}`, {
    seconds: LOOKUP_TIMEOUT_S,
    status: e instanceof NetFailure && e.status ? String(e.status) : '?',
  });
}

const issueText = (L: L, i: BimiIssue): string =>
  L((i.code === 'not-bimi' ? 'i_notBimi' : `i_${i.code}`) as Key, {
    value: 'value' in i ? i.value : '',
  });

/** TXT strings of the answers that belong to the name asked (not CNAME hops). */
const txtAnswers = (r: DnsResult): string[] =>
  r.answers.filter((a) => a.type === 'TXT').map((a) => txtValue(a.data));

export const bimiChecker: ToolView = (ctx) => {
  const L = S(ctx.lang);

  // ---------- Checker (online) ----------
  const domain = field(
    L('domain'),
    textInput({ id: 'bimi-domain', inputmode: 'url', autocapitalize: 'off' }),
    { hint: L('domainHint') },
  );
  const selector = field(L('selector'), textInput({ id: 'bimi-selector', autocapitalize: 'off' }), {
    hint: L('selectorHint'),
  });
  bindMemo(domain.control, ctx.memo, 'domain');
  bindMemo(selector.control, ctx.memo, 'selector', DEFAULT_SELECTOR);

  const panel = resultPanel(ctx, L('check'));
  panel.el.setAttribute('aria-label', L('checkResult'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);

  const render = (s: BimiSession): void => {
    const notesOut: string[] = [];
    let state: string;
    let record: BimiRecord | null = null;
    if (!s.records.length) {
      state = L('st_none');
      notesOut.push(L('noRecordNote', { name: s.name }));
    } else if (s.records.length > 1) {
      state = L('st_many');
      notesOut.push(L('manyNote'));
    } else {
      record = parseBimi(s.records[0]!);
      state = L(`st_${record.state}`);
      notesOut.push(...record.issues.map((i) => issueText(L, i)));
    }
    const problems: DmarcProblem[] = dmarcProblems(s.dmarc);
    notesOut.push(...problems.map((p) => L(`d_${p}` as Key, { name: s.dmarcAt })));
    panel.show(
      [
        { label: L('rName'), value: s.name, lang: 'en' },
        { label: L('rStatus'), value: state, primary: true },
        ...(s.records.length === 1
          ? [
              { label: L('rRecord'), value: s.records[0]!, lang: 'en' as const, copy: true },
              { label: L('rLogo'), value: record?.logo ?? L('none'), lang: 'en' as const },
              { label: L('rCert'), value: record?.cert ?? L('none'), lang: 'en' as const },
            ]
          : []),
        {
          label: L('rDmarc'),
          value: s.dmarc
            ? L('dmarcValue', {
                p: s.dmarc.p ?? '—',
                pct: String(s.dmarc.pct),
                sp: s.dmarc.sp ? `, sp=${s.dmarc.sp}` : '',
              })
            : L('dmarcNone', { name: s.dmarcAt }),
          lang: s.dmarc ? 'en' : undefined,
        },
        { label: L('rReady'), value: L(problems.length ? 'no' : 'yes') },
      ],
      notesOut,
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('check') });
  form.noValidate = true;
  form.append(
    h(
      'aside',
      { class: 'net-notice', 'aria-labelledby': 'bimi-notice-title' },
      h('h3', { id: 'bimi-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
      h(
        'p',
        {},
        L('notice1', {
          endpoint: DOH_ENDPOINT,
          bimi: bimiName('<selector>', '<domain>'),
          dmarc: dmarcName('<domain>'),
        }),
      ),
      h('p', {}, L('notice2')),
      h('p', { class: 'net-notice-strong' }, L('nothingYet')),
      h(
        'p',
        {},
        h('a', { href: CLOUDFLARE_PRIVACY, rel: 'noopener noreferrer' }, L('privacyLink')),
      ),
    ),
    h('div', { class: 'field-grid' }, domain.el, selector.el),
    formActions(ctx, {
      submitLabel: L('check'),
      panel,
      onReset() {
        next().abort();
        domain.control.value = '';
        selector.control.value = DEFAULT_SELECTOR;
        Object.assign(ctx.memo, { domain: '', selector: DEFAULT_SELECTOR });
        ctx.session.delete('bimi');
        domain.setError(null);
        selector.setError(null);
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
    selector.setError(null);
    const d = normaliseDomain(domain.control.value);
    if (!d.ok) {
      domain.setError(L(`e_${d.error}`));
      domain.control.focus();
      return;
    }
    const sel = selector.control.value.trim() || DEFAULT_SELECTOR;
    if (!isSelector(sel)) {
      selector.setError(L('e_selector-invalid'));
      selector.control.focus();
      return;
    }
    const ctrl = next();
    busy(form, true);
    status.progress(L('looking'));
    const name = bimiName(sel.toLowerCase(), d.value);
    const dmarcAt = dmarcName(d.value);
    try {
      const [bimi, dmarc] = await Promise.all([
        dohJson(name, 'TXT', ctrl.signal),
        dohJson(dmarcAt, 'TXT', ctrl.signal),
      ]);
      const dmarcTexts = txtAnswers(dmarc)
        .map(parseDmarc)
        .filter((p) => p !== null);
      const session: BimiSession = {
        name,
        dmarcAt,
        records: bimiRecords(txtAnswers(bimi)),
        // Two DMARC records is itself a DMARC error; treat it as no usable policy.
        dmarc: dmarcTexts.length === 1 ? dmarcTexts[0]! : null,
      };
      ctx.session.set('bimi', session);
      render(session);
      status.progress(L('done'));
    } catch (err) {
      if (ctrl.signal.aborted && !(err instanceof NetFailure && err.kind === 'timeout')) return;
      status.error(errorText(L, err));
      panel.clear();
    } finally {
      if (!ctrl.signal.aborted) busy(form, false);
    }
  });

  const last = ctx.session.get('bimi') as BimiSession | undefined;
  if (last) render(last);

  const checker = h(
    'section',
    { class: 'tool-section', 'aria-labelledby': 'bimi-check-title' },
    h('h2', { id: 'bimi-check-title', class: 'tool-section-title' }, L('checkTitle')),
    h('div', { class: 'tool-layout' }, form, panel.el),
  );

  // ---------- Generator (offline) ----------
  const generator = toolForm(ctx, {
    prefix: 'bimigen',
    memoPrefix: 'gen.',
    resultLabel: L('gResult'),
    fields: [
      { key: 'domain', kind: 'text', label: L('gDomain'), hint: L('domainHint'), inputmode: 'url' },
      {
        key: 'logo',
        kind: 'text',
        label: L('gLogo'),
        hint: L('gLogoHint'),
        type: 'url',
        inputmode: 'url',
      },
      {
        key: 'cert',
        kind: 'text',
        label: L('gCert'),
        hint: L('gCertHint'),
        type: 'url',
        inputmode: 'url',
      },
      {
        key: 'selector',
        kind: 'text',
        label: L('gSelector'),
        hint: L('selectorHint'),
        default: DEFAULT_SELECTOR,
      },
    ],
    submit: L('generate'),
    compute(v) {
      const d = normaliseDomain(v.domain ?? '');
      if (!d.ok) return { field: 'domain', error: `e_${d.error}` };
      const r = buildBimi({
        domain: d.value,
        selector: v.selector ?? '',
        logo: v.logo ?? '',
        cert: v.cert ?? '',
      });
      if (!r.ok) {
        const fieldKey = r.error.startsWith('logo')
          ? 'logo'
          : r.error.startsWith('cert')
            ? 'cert'
            : 'selector';
        return {
          field: fieldKey,
          error: r.error === 'selector-invalid' ? 'e_selector-invalid' : `g_${r.error}`,
        };
      }
      return {
        rows: [
          { label: L('gName'), value: r.value.name, lang: 'en', copy: true },
          { label: L('gType'), value: 'TXT', lang: 'en' },
          { label: L('gValue'), value: r.value.value, lang: 'en', copy: true, primary: true },
        ],
        notes: [L('gNote1', { host: r.value.name.slice(0, -(d.value.length + 1)) }), L('gNote2')],
      };
    },
    errorText: (code) => L(code as Key),
    notesText: [L('n1'), L('n2'), L('n3')],
    notesTitle: L('notesTitle'),
  });

  return h(
    'div',
    { class: 'tool-stack' },
    checker,
    h('h2', { class: 'tool-section-title' }, L('generateTitle')),
    generator,
  );
};
