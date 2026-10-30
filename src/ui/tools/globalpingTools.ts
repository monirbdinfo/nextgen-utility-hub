import { toBanglaDigits } from '../../calc/digits';
import {
  LOCATIONS,
  PACKET_COUNTS,
  PROBE_COUNTS,
  parseTarget,
  type IpFamily,
  type LocationChoice,
  type Measurement,
  type MeasurementType,
  type ProbeResult,
} from '../../calc/globalping';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { GlobalpingFailure, MEASUREMENT_TIMEOUT_MS, runMeasurement } from '../../lib/globalping';
import {
  bindMemo,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  type ToolView,
} from './kit';
import { abortOnCleanup, busy, statusArea } from './networkOnline';

const GLOBALPING_SITE = 'https://globalping.io';

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notice1:
      'Browsers cannot send ping (ICMP) or traceroute probes. This tool asks Globalping (api.globalping.io), a free public measurement network, to run the test from its probes: servers run by volunteers and companies around the world.',
    notice2:
      'When you press “{button}”, your browser sends the target you entered and the options below to Globalping, which also receives your IP address and basic browser details. Globalping keeps measurements and may show them publicly by their ID. No cookies, no page address (referrer) and no account are used, and this site does not receive or store anything.',
    notice3:
      'The results show the path and timing from Globalping’s probes to the target, not from your own device or network.',
    nothingYet: 'Nothing is sent until you press the button.',
    siteLink: 'About Globalping',
    target4: 'IPv4 address or host name',
    target6: 'IPv6 address or host name',
    hint4: 'For example 8.8.8.8 or example.com (a host name is resolved to its IPv4 address).',
    hint6: 'For example 2001:4860:4860::8888 or example.com (resolved to its IPv6 address).',
    location: 'Probe location',
    loc_world: 'Anywhere in the world',
    loc_Bangladesh: 'Bangladesh',
    loc_Asia: 'Asia',
    loc_Europe: 'Europe',
    'loc_North America': 'North America',
    probes: 'Number of probes',
    packets: 'Packets per probe',
    ping: 'Run ping',
    traceroute: 'Run traceroute',
    starting: 'Asking Globalping to start the test…',
    waiting: 'Waiting for results ({done} of {total} probes done)…',
    done: 'Done. {n} probe(s) answered.',
    resultsTitle: 'Results by probe',
    probeHeading: 'Probe {n}: {where}',
    unknownPlace: 'unknown location',
    network: 'Probe network',
    resolved: 'Target address',
    status: 'Status',
    st_finished: 'Finished',
    st_failed: 'Failed (the probe could not complete the test)',
    st_offline: 'Probe went offline',
    'st_in-progress': 'Still running',
    rtt: 'Round trip (min / avg / max)',
    loss: 'Packet loss',
    lossValue: '{loss}% ({rcv} of {total} received)',
    noReply: 'No replies',
    lineRtt: 'average {avg} ms, {loss}% loss',
    lineHops: '{n} hop(s)',
    hopsCaption: 'Network path from this probe',
    colHop: 'Hop',
    colHost: 'Host',
    colRtt: 'Round trips (ms)',
    noAnswer: '* (no answer)',
    raw: 'Raw output from the probe',
    rSummary: 'Probes',
    rSummaryValue: '{ok} finished, {failed} failed, of {total}',
    rTarget: 'Target',
    rWhere: 'Measured from',
    rSource: 'Source',
    sourceValue: 'Globalping measurement {id}',
    e_empty: 'Enter an address or host name.',
    e_invalid: 'Enter a valid IP address or host name.',
    'e_wrong-family4': 'That is an IPv6 address. Use Ping IPv6 Address, or enter an IPv4 address.',
    'e_wrong-family6': 'That is an IPv4 address. Use Ping IPv4 Address, or enter an IPv6 address.',
    'e_wrong-familyT':
      'That is an IPv6 address; this traceroute uses IPv4. Enter an IPv4 address or a host name.',
    'e_not-public':
      'That is a private, local or special-purpose address. Probes on the internet cannot reach it.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout: 'Globalping did not answer in time. Try again later.',
    err_blocked:
      'Globalping could not be reached. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it.',
    err_http: 'Globalping answered with an error (HTTP {status}). Try again later.',
    err_validation: 'Globalping did not accept this target or these options.',
    'err_no-probes':
      'Globalping has no available probes in that location right now. Choose another location.',
    'err_rate-limited':
      'Globalping’s hourly limit for your IP address has been reached (about 250 tests per hour). Try again later.',
    'err_not-found': 'Globalping no longer has this measurement.',
    err_other: 'Globalping returned an unexpected error. Try again later.',
    err_parse: 'Globalping’s answer was not in the expected format, so it is not shown.',
    'err_gave-up':
      'The test did not finish within {seconds} seconds. Try fewer probes or try again.',
    err_aborted: 'The test was cancelled.',
    notesTitle: 'About these results',
    n1: 'Ping and traceroute here run on Globalping’s probes, not on your computer. They show how the target is reached from the probes’ locations; your own connection may behave differently.',
    n2: 'A target that does not answer ping may still be working: many servers and firewalls ignore ping and traceroute packets.',
    n3: 'Probes are chosen by Globalping within the location you pick. Times are round-trip times in milliseconds as reported by each probe.',
    n4: 'Free use is limited by Globalping to about 250 tests per hour per IP address; each probe counts as one test.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      'ব্রাউজার পিং (ICMP) বা ট্রেসরুট প্রোব পাঠাতে পারে না। এই টুল Globalping (api.globalping.io)-কে বলে তাদের প্রোব থেকে পরীক্ষাটি চালাতে; Globalping একটি বিনামূল্যের পাবলিক পরিমাপ নেটওয়ার্ক, যার প্রোব হলো বিশ্বজুড়ে স্বেচ্ছাসেবক ও প্রতিষ্ঠানের চালানো সার্ভার।',
    notice2:
      '“{button}” চাপলে আপনার দেওয়া টার্গেট ও নিচের অপশনগুলো Globalping-এ পাঠানো হয়, এবং তারা আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্যও পায়। Globalping পরিমাপগুলো রেখে দেয় এবং আইডি দিয়ে প্রকাশ্যে দেখাতে পারে। কুকি, পেজের ঠিকানা (রেফারার) বা অ্যাকাউন্ট ব্যবহার হয় না, এবং এই সাইট কিছুই গ্রহণ বা সংরক্ষণ করে না।',
    notice3:
      'ফলাফলে Globalping-এর প্রোব থেকে টার্গেট পর্যন্ত পথ ও সময় দেখায়, আপনার নিজের ডিভাইস বা নেটওয়ার্ক থেকে নয়।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই পাঠানো হয় না।',
    siteLink: 'Globalping সম্পর্কে',
    target4: 'IPv4 অ্যাড্রেস বা হোস্ট নাম',
    target6: 'IPv6 অ্যাড্রেস বা হোস্ট নাম',
    hint4: 'যেমন 8.8.8.8 বা example.com (হোস্ট নাম তার IPv4 অ্যাড্রেসে রূপান্তরিত হয়)।',
    hint6: 'যেমন 2001:4860:4860::8888 বা example.com (তার IPv6 অ্যাড্রেসে রূপান্তরিত হয়)।',
    location: 'প্রোবের অবস্থান',
    loc_world: 'বিশ্বের যেকোনো জায়গা',
    loc_Bangladesh: 'বাংলাদেশ',
    loc_Asia: 'এশিয়া',
    loc_Europe: 'ইউরোপ',
    'loc_North America': 'উত্তর আমেরিকা',
    probes: 'প্রোবের সংখ্যা',
    packets: 'প্রতি প্রোবে প্যাকেট',
    ping: 'পিং চালান',
    traceroute: 'ট্রেসরুট চালান',
    starting: 'Globalping-কে পরীক্ষা শুরু করতে বলা হচ্ছে…',
    waiting: 'ফলাফলের অপেক্ষা ({total}টির মধ্যে {done}টি প্রোব শেষ)…',
    done: 'সম্পন্ন। {n}টি প্রোব উত্তর দিয়েছে।',
    resultsTitle: 'প্রোব অনুযায়ী ফলাফল',
    probeHeading: 'প্রোব {n}: {where}',
    unknownPlace: 'অজানা অবস্থান',
    network: 'প্রোবের নেটওয়ার্ক',
    resolved: 'টার্গেটের অ্যাড্রেস',
    status: 'অবস্থা',
    st_finished: 'সম্পন্ন',
    st_failed: 'ব্যর্থ (প্রোব পরীক্ষাটি শেষ করতে পারেনি)',
    st_offline: 'প্রোব অফলাইন হয়ে গেছে',
    'st_in-progress': 'এখনও চলছে',
    rtt: 'রাউন্ড ট্রিপ (সর্বনিম্ন / গড় / সর্বোচ্চ)',
    loss: 'প্যাকেট লস',
    lossValue: '{loss}% ({total}টির মধ্যে {rcv}টি পাওয়া গেছে)',
    noReply: 'কোনো উত্তর নেই',
    lineRtt: 'গড় {avg} ms, {loss}% লস',
    lineHops: '{n}টি হপ',
    hopsCaption: 'এই প্রোব থেকে নেটওয়ার্ক পথ',
    colHop: 'হপ',
    colHost: 'হোস্ট',
    colRtt: 'রাউন্ড ট্রিপ (ms)',
    noAnswer: '* (উত্তর নেই)',
    raw: 'প্রোবের মূল আউটপুট',
    rSummary: 'প্রোব',
    rSummaryValue: '{total}টির মধ্যে {ok}টি সম্পন্ন, {failed}টি ব্যর্থ',
    rTarget: 'টার্গেট',
    rWhere: 'যেখান থেকে মাপা হয়েছে',
    rSource: 'উৎস',
    sourceValue: 'Globalping পরিমাপ {id}',
    e_empty: 'একটি অ্যাড্রেস বা হোস্ট নাম লিখুন।',
    e_invalid: 'একটি সঠিক আইপি অ্যাড্রেস বা হোস্ট নাম লিখুন।',
    'e_wrong-family4':
      'এটি একটি IPv6 অ্যাড্রেস। IPv6 পিং ব্যবহার করুন, অথবা একটি IPv4 অ্যাড্রেস লিখুন।',
    'e_wrong-family6':
      'এটি একটি IPv4 অ্যাড্রেস। IPv4 পিং ব্যবহার করুন, অথবা একটি IPv6 অ্যাড্রেস লিখুন।',
    'e_wrong-familyT':
      'এটি একটি IPv6 অ্যাড্রেস; এই ট্রেসরুট IPv4 ব্যবহার করে। একটি IPv4 অ্যাড্রেস বা হোস্ট নাম লিখুন।',
    'e_not-public':
      'এটি একটি প্রাইভেট, লোকাল বা বিশেষ-উদ্দেশ্যের অ্যাড্রেস। ইন্টারনেটের প্রোব এটিতে পৌঁছাতে পারে না।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout: 'Globalping সময়মতো উত্তর দেয়নি। পরে আবার চেষ্টা করুন।',
    err_blocked:
      'Globalping-এ পৌঁছানো যায়নি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে।',
    err_http: 'Globalping একটি ত্রুটি দিয়েছে (HTTP {status})। পরে আবার চেষ্টা করুন।',
    err_validation: 'Globalping এই টার্গেট বা অপশন গ্রহণ করেনি।',
    'err_no-probes': 'ওই অবস্থানে এখন Globalping-এর কোনো প্রোব নেই। অন্য অবস্থান বেছে নিন।',
    'err_rate-limited':
      'আপনার আইপি অ্যাড্রেসের জন্য Globalping-এর ঘণ্টাপ্রতি সীমা (প্রায় ২৫০টি পরীক্ষা) পূর্ণ হয়েছে। পরে আবার চেষ্টা করুন।',
    'err_not-found': 'Globalping-এর কাছে এই পরিমাপটি আর নেই।',
    err_other: 'Globalping একটি অপ্রত্যাশিত ত্রুটি দিয়েছে। পরে আবার চেষ্টা করুন।',
    err_parse: 'Globalping-এর উত্তর প্রত্যাশিত ফরম্যাটে ছিল না, তাই দেখানো হচ্ছে না।',
    'err_gave-up':
      '{seconds} সেকেন্ডের মধ্যে পরীক্ষা শেষ হয়নি। কম প্রোব দিয়ে বা আবার চেষ্টা করুন।',
    err_aborted: 'পরীক্ষাটি বাতিল করা হয়েছে।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    n1: 'এখানে পিং ও ট্রেসরুট Globalping-এর প্রোবে চলে, আপনার কম্পিউটারে নয়। এগুলো দেখায় প্রোবের অবস্থান থেকে টার্গেটে কীভাবে পৌঁছানো যায়; আপনার নিজের সংযোগ ভিন্নভাবে আচরণ করতে পারে।',
    n2: 'যে টার্গেট পিংয়ের উত্তর দেয় না সেটিও চালু থাকতে পারে: অনেক সার্ভার ও ফায়ারওয়াল পিং ও ট্রেসরুট প্যাকেট উপেক্ষা করে।',
    n3: 'আপনার বেছে নেওয়া অবস্থানের মধ্যে Globalping প্রোব বেছে নেয়। সময়গুলো প্রতিটি প্রোবের জানানো রাউন্ড-ট্রিপ সময়, মিলিসেকেন্ডে।',
    n4: 'বিনামূল্যে ব্যবহারে Globalping আইপি অ্যাড্রেসপ্রতি ঘণ্টায় প্রায় ২৫০টি পরীক্ষার সীমা দেয়; প্রতিটি প্রোব একটি পরীক্ষা হিসেবে গণ্য হয়।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

interface Session {
  target: string;
  location: LocationChoice;
  measurement: Measurement;
}

function globalpingView(type: MeasurementType, family: IpFamily): ToolView {
  return (ctx) => {
    const L = S(ctx.lang);
    const id = type === 'traceroute' ? 'trace' : `ping${family}`;
    const local = (s: string | number): string =>
      ctx.lang === 'bn' ? toBanglaDigits(String(s)) : String(s);
    const button = L(type === 'ping' ? 'ping' : 'traceroute');

    const target = field(
      L(family === 4 ? 'target4' : 'target6'),
      textInput({ id: `${id}-target`, autocapitalize: 'off', inputmode: 'url' }),
      { hint: L(family === 4 ? 'hint4' : 'hint6') },
    );
    const location = field(
      L('location'),
      select(
        LOCATIONS.map((l) => [l, L(`loc_${l}` as Key)]),
        { id: `${id}-location` },
      ),
    );
    const probes = field(
      L('probes'),
      select(
        PROBE_COUNTS.map((n) => [String(n), local(n)]),
        { id: `${id}-probes` },
      ),
    );
    const packets =
      type === 'ping'
        ? field(
            L('packets'),
            select(
              PACKET_COUNTS.map((n) => [String(n), local(n)]),
              { id: `${id}-packets` },
            ),
          )
        : null;
    bindMemo(target.control, ctx.memo, 'target');
    bindMemo(location.control, ctx.memo, 'location', 'world');
    bindMemo(probes.control, ctx.memo, 'probes', '1');
    if (packets) bindMemo(packets.control, ctx.memo, 'packets', '3');

    const status = statusArea();
    const panel = resultPanel(ctx, button);
    const details = h('div', { class: 'gp-results' });
    panel.el.querySelector('.result-body')?.after(details);
    const next = abortOnCleanup(ctx);

    const where = (r: ProbeResult): string =>
      [r.probe.city, r.probe.country, r.probe.continent].filter(Boolean).join(', ') ||
      L('unknownPlace');
    const ms = (v: number | null): string => (v === null ? '—' : local(v.toFixed(1)));

    function probeBlock(r: ProbeResult, n: number): HTMLElement {
      const rows: Array<[string, string]> = [
        [L('status'), L(`st_${r.status}` as Key)],
        [
          L('network'),
          [r.probe.network, r.probe.asn !== null ? `AS${r.probe.asn}` : null]
            .filter(Boolean)
            .join(' — ') || '—',
        ],
        [L('resolved'), [r.resolvedAddress, r.resolvedHostname].filter(Boolean).join(' — ') || '—'],
      ];
      if (type === 'ping' && r.stats) {
        rows.push([L('rtt'), `${ms(r.stats.min)} / ${ms(r.stats.avg)} / ${ms(r.stats.max)} ms`]);
        rows.push([
          L('loss'),
          r.stats.rcv === 0
            ? L('noReply')
            : L('lossValue', {
                loss: local(r.stats.loss ?? '—'),
                rcv: local(r.stats.rcv ?? '—'),
                total: local(r.stats.total ?? '—'),
              }),
        ]);
      }
      const block = h(
        'section',
        { class: 'gp-probe' },
        h('h3', { class: 'gp-probe-title' }, L('probeHeading', { n: local(n), where: where(r) })),
        h(
          'dl',
          { class: 'gp-facts' },
          ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', { lang: 'en' }, v)]),
        ),
      );
      if (type === 'traceroute' && r.hops.length) {
        block.append(
          h(
            'div',
            {
              class: 'dns-table-wrap',
              role: 'region',
              tabindex: '0',
              'aria-label': L('hopsCaption'),
            },
            h(
              'table',
              { class: 'dns-table' },
              h('caption', { class: 'sr-only' }, L('hopsCaption')),
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  ...(['colHop', 'colHost', 'colRtt'] as const).map((k) =>
                    h('th', { scope: 'col' }, L(k)),
                  ),
                ),
              ),
              h(
                'tbody',
                {},
                ...r.hops.map((hop, i) =>
                  h(
                    'tr',
                    {},
                    h('td', {}, local(i + 1)),
                    h(
                      'td',
                      { lang: 'en' },
                      hop.address
                        ? [hop.hostname, hop.address].filter(Boolean).join(' — ')
                        : L('noAnswer'),
                    ),
                    h(
                      'td',
                      {},
                      hop.rtts.length ? hop.rtts.map((t) => local(t.toFixed(1))).join(', ') : '*',
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
      if (r.rawOutput)
        block.append(
          h(
            'details',
            { class: 'gp-raw' },
            h('summary', {}, L('raw')),
            h('pre', { lang: 'en', tabindex: '0' }, r.rawOutput),
          ),
        );
      return block;
    }

    /** One line per probe for the summary (and for "Copy result"). */
    function probeLine(r: ProbeResult, n: number): string {
      const head = L('probeHeading', { n: local(n), where: where(r) });
      if (r.status !== 'finished') return `${head} — ${L(`st_${r.status}` as Key)}`;
      if (type === 'ping')
        return r.stats && r.stats.rcv
          ? `${head} — ${L('lineRtt', { avg: ms(r.stats.avg), loss: local(r.stats.loss ?? '—') })}`
          : `${head} — ${L('noReply')}`;
      return `${head} — ${L('lineHops', { n: local(r.hops.length) })}`;
    }

    const render = (s: Session): void => {
      const m = s.measurement;
      const ok = m.results.filter((r) => r.status === 'finished').length;
      panel.show(
        [
          {
            label: L('rSummary'),
            value: L('rSummaryValue', {
              ok: local(ok),
              failed: local(m.results.length - ok),
              total: local(m.results.length),
            }),
            primary: true,
          },
          { label: L('rTarget'), value: s.target, lang: 'en' },
          { label: L('rWhere'), value: L(`loc_${s.location}` as Key) },
          { label: L('rSource'), value: L('sourceValue', { id: m.id }), lang: 'en' },
        ],
        m.results.map((r, i) => probeLine(r, i + 1)),
      );
      details.replaceChildren(
        h('h3', { class: 'tool-section-title' }, L('resultsTitle')),
        ...m.results.map((r, i) => probeBlock(r, i + 1)),
      );
    };

    const clear = (): void => {
      panel.clear();
      details.replaceChildren();
    };

    const form = h('form', { class: 'tool-form', 'aria-label': button });
    form.noValidate = true;
    form.append(
      h(
        'aside',
        { class: 'net-notice', 'aria-labelledby': `${id}-notice-title` },
        h('h2', { id: `${id}-notice-title`, class: 'net-notice-title' }, L('noticeTitle')),
        h('p', {}, L('notice1')),
        h('p', {}, L('notice2', { button })),
        h('p', {}, L('notice3')),
        h('p', { class: 'net-notice-strong' }, L('nothingYet')),
        h('p', {}, h('a', { href: GLOBALPING_SITE, rel: 'noopener noreferrer' }, L('siteLink'))),
      ),
      h(
        'div',
        { class: 'field-grid' },
        target.el,
        location.el,
        probes.el,
        ...(packets ? [packets.el] : []),
      ),
      formActions(ctx, {
        submitLabel: button,
        panel,
        onReset() {
          next().abort();
          target.control.value = '';
          target.setError(null);
          Object.assign(ctx.memo, { target: '', location: 'world', probes: '1', packets: '3' });
          location.control.value = 'world';
          probes.control.value = '1';
          if (packets) packets.control.value = '3';
          ctx.session.delete('gp');
          busy(form, false);
          status.clear();
          clear();
          target.control.focus();
        },
      }),
      status.el,
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;
      target.setError(null);
      const t = parseTarget(target.control.value, family);
      if (!t.ok) {
        const key =
          t.error === 'wrong-family'
            ? `e_wrong-family${type === 'traceroute' ? 'T' : family}`
            : `e_${t.error}`;
        target.setError(L(key as Key));
        target.control.focus();
        return;
      }
      const loc = location.control.value as LocationChoice;
      const ctrl = next();
      busy(form, true);
      clear();
      status.progress(L('starting'));
      try {
        const m = await runMeasurement(
          {
            type,
            target: t.value,
            family,
            location: loc,
            probes: Number(probes.control.value) || 1,
            packets: packets ? Number(packets.control.value) || 3 : undefined,
          },
          ctrl.signal,
          (partial) =>
            status.progress(
              L('waiting', {
                done: local(partial.results.filter((r) => r.status !== 'in-progress').length),
                total: local(partial.results.length),
              }),
            ),
        );
        const session: Session = { target: t.value.value, location: loc, measurement: m };
        ctx.session.set('gp', session);
        render(session);
        status.progress(L('done', { n: local(m.results.length) }));
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const f = err instanceof GlobalpingFailure ? err : new GlobalpingFailure('blocked');
        status.error(
          L(`err_${f.kind}` as Key, {
            status: f.status ? String(f.status) : '?',
            seconds: local(MEASUREMENT_TIMEOUT_MS / 1000),
          }),
        );
      } finally {
        if (!ctrl.signal.aborted) busy(form, false);
      }
    });

    const last = ctx.session.get('gp') as Session | undefined;
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

export const pingIpv4: ToolView = globalpingView('ping', 4);
export const pingIpv6: ToolView = globalpingView('ping', 6);
export const traceroute: ToolView = globalpingView('traceroute', 4);
