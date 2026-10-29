import { toBanglaDigits } from '../../calc/digits';
import { summariseLatency } from '../../calc/netDiag';
import {
  formatMB,
  formatMbps,
  LATENCY_ROUNDS,
  PLAN_STEPS,
  planBytes,
  shouldContinue,
  SLOW_STEP_MS,
  SPEED_ENDPOINT,
  SPEED_HOST,
  SPEED_PLANS,
  speedUrl,
  summariseSpeed,
  type SpeedPlan,
  type Transfer,
} from '../../calc/speedTest';
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
  type ToolContext,
  type ToolView,
} from './kit';
import { abortOnCleanup, busy, statusArea } from './networkOnline';

const CLOUDFLARE_PRIVACY = 'https://www.cloudflare.com/privacypolicy/';
/** Time allowed for the server to start answering one request. */
const HEADER_TIMEOUT_MS = 8000;
/** Time allowed for one file to finish downloading. */
const BODY_TIMEOUT_MS = 30000;

const S = defineStrings({
  en: {
    noticeTitle: 'Before you use this tool',
    notice1:
      'When you press “Start test”, your browser downloads test data from Cloudflare’s speed test service ({endpoint}) and times it.',
    notice2:
      'The quick test downloads about {quick} MB and the standard test up to {standard} MB. On mobile data this counts against your allowance.',
    notice3:
      'As with any website, Cloudflare receives your IP address and basic browser details with each request. No cookies and no page address (referrer) are sent. This site does not receive or store the results.',
    nothingYet: 'Nothing is downloaded until you press the button.',
    privacyLink: 'Cloudflare privacy policy',
    plan: 'Test size',
    plan_quick: 'Quick (about {mb} MB)',
    plan_standard: 'Standard (up to {mb} MB, more accurate on fast connections)',
    start: 'Start test',
    stop: 'Stop',
    latency: 'Measuring the round trip ({i} of {n})…',
    downloading: 'Downloading {mb} MB ({i} of {n})…',
    done: 'Done.',
    stopped: 'Stopped. Results show the downloads completed so far.',
    download: 'Download speed',
    downloadValue: '{v} Mbps',
    median: 'Median download speed',
    rtt: 'Round trip (median)',
    jitter: 'Jitter',
    ms: '{v} ms',
    counted: 'Downloads timed',
    data: 'Data downloaded',
    dataValue: '{v} MB',
    server: 'Test service',
    tooFast:
      'The files downloaded too quickly to time. Your connection is faster than the quick test can measure; try the standard test.',
    noDownloads: 'No download finished, so there is no speed to show.',
    err_offline: 'Your browser reports that it is offline. Connect to the internet and try again.',
    err_timeout:
      'Cloudflare did not answer in time. The service may be slow or unreachable; try again later.',
    err_blocked:
      'The test could not reach Cloudflare. Your connection, a firewall, a browser extension (such as an ad or tracker blocker) or the browser’s cross-origin rules may have blocked it.',
    err_http:
      'The test service answered with an error (HTTP {status}). It may be limiting requests; wait a moment and try again.',
    err_parse: 'The answer was not in the expected format.',
    err_aborted: 'The test was cancelled.',
    notesTitle: 'About these results',
    n1: 'Only download speed and round-trip time are measured. Upload speed is not measured.',
    n2: 'The download speed is the 90th percentile of the timed downloads, the way Cloudflare’s own test reports it, so one slow download does not hide what your connection can do. The median is shown too.',
    n3: 'The round trip is HTTPS request time to the nearest Cloudflare data centre, not ICMP ping. Jitter is the average change between consecutive round trips.',
    n4: 'Results depend on Wi-Fi signal, other devices and apps using the connection, VPNs, and the browser. Run the test a few times; it is an estimate, not a certified measurement of your internet plan.',
    n5: 'If a download takes longer than {seconds} seconds the test does not move on to larger files, to save your data on slow connections.',
  },
  bn: {
    noticeTitle: 'এই টুল ব্যবহারের আগে',
    notice1:
      '“টেস্ট শুরু করুন” চাপলে আপনার ব্রাউজার Cloudflare-এর স্পিড টেস্ট সার্ভিস ({endpoint}) থেকে টেস্ট ডেটা ডাউনলোড করে এবং সময় মাপে।',
    notice2:
      'দ্রুত টেস্টে প্রায় {quick} MB এবং স্ট্যান্ডার্ড টেস্টে সর্বোচ্চ {standard} MB ডাউনলোড হয়। মোবাইল ডেটায় এটি আপনার ডেটা থেকে কাটা যাবে।',
    notice3:
      'যেকোনো ওয়েবসাইটের মতোই, প্রতিটি রিকোয়েস্টের সঙ্গে Cloudflare আপনার আইপি অ্যাড্রেস ও ব্রাউজারের সাধারণ তথ্য পায়। কুকি বা পেজের ঠিকানা (রেফারার) পাঠানো হয় না। এই সাইট ফলাফল গ্রহণ বা সংরক্ষণ করে না।',
    nothingYet: 'বোতাম না চাপা পর্যন্ত কিছুই ডাউনলোড হয় না।',
    privacyLink: 'Cloudflare প্রাইভেসি নীতি',
    plan: 'টেস্টের আকার',
    plan_quick: 'দ্রুত (প্রায় {mb} MB)',
    plan_standard: 'স্ট্যান্ডার্ড (সর্বোচ্চ {mb} MB, দ্রুত সংযোগে বেশি নির্ভুল)',
    start: 'টেস্ট শুরু করুন',
    stop: 'থামান',
    latency: 'রাউন্ড ট্রিপ মাপা হচ্ছে ({n}টির মধ্যে {i})…',
    downloading: '{mb} MB ডাউনলোড হচ্ছে ({n}টির মধ্যে {i})…',
    done: 'সম্পন্ন।',
    stopped: 'থামানো হয়েছে। এ পর্যন্ত শেষ হওয়া ডাউনলোডের ফলাফল দেখানো হচ্ছে।',
    download: 'ডাউনলোড গতি',
    downloadValue: '{v} Mbps',
    median: 'মধ্যমা ডাউনলোড গতি',
    rtt: 'রাউন্ড ট্রিপ (মধ্যমা)',
    jitter: 'জিটার',
    ms: '{v} ms',
    counted: 'সময় মাপা ডাউনলোড',
    data: 'ডাউনলোড হওয়া ডেটা',
    dataValue: '{v} MB',
    server: 'টেস্ট সার্ভিস',
    tooFast:
      'ফাইলগুলো এত দ্রুত ডাউনলোড হয়েছে যে সময় মাপা যায়নি। আপনার সংযোগ দ্রুত টেস্টের মাপার সীমার চেয়ে দ্রুত; স্ট্যান্ডার্ড টেস্ট চালান।',
    noDownloads: 'কোনো ডাউনলোড শেষ হয়নি, তাই দেখানোর মতো গতি নেই।',
    err_offline: 'আপনার ব্রাউজার বলছে এটি অফলাইনে আছে। ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।',
    err_timeout:
      'Cloudflare সময়মতো উত্তর দেয়নি। সার্ভিসটি ধীর বা নাগালের বাইরে থাকতে পারে; পরে আবার চেষ্টা করুন।',
    err_blocked:
      'টেস্টটি Cloudflare-এ পৌঁছাতে পারেনি। আপনার সংযোগ, ফায়ারওয়াল, ব্রাউজার এক্সটেনশন (যেমন অ্যাড বা ট্র্যাকার ব্লকার) অথবা ব্রাউজারের ক্রস-অরিজিন নিয়ম এটি আটকে থাকতে পারে।',
    err_http:
      'টেস্ট সার্ভিস একটি ত্রুটি দিয়েছে (HTTP {status})। এটি রিকোয়েস্ট সীমিত করছে হতে পারে; একটু অপেক্ষা করে আবার চেষ্টা করুন।',
    err_parse: 'উত্তরটি প্রত্যাশিত ফরম্যাটে ছিল না।',
    err_aborted: 'টেস্টটি বাতিল করা হয়েছে।',
    notesTitle: 'এই ফলাফল সম্পর্কে',
    n1: 'শুধু ডাউনলোড গতি ও রাউন্ড-ট্রিপ সময় মাপা হয়। আপলোড গতি মাপা হয় না।',
    n2: 'ডাউনলোড গতি হলো সময় মাপা ডাউনলোডগুলোর ৯০তম পার্সেন্টাইল, Cloudflare-এর নিজস্ব টেস্ট যেভাবে দেখায়; তাই একটি ধীর ডাউনলোড আপনার সংযোগের সক্ষমতা লুকিয়ে ফেলে না। মধ্যমাও দেখানো হয়।',
    n3: 'রাউন্ড ট্রিপ হলো নিকটতম Cloudflare ডেটা সেন্টার পর্যন্ত HTTPS রিকোয়েস্টের সময়, ICMP পিং নয়। জিটার হলো পরপর দুটি রাউন্ড ট্রিপের গড় পার্থক্য।',
    n4: 'ফলাফল নির্ভর করে ওয়াই-ফাই সিগন্যাল, একই সংযোগে চলা অন্য ডিভাইস ও অ্যাপ, ভিপিএন এবং ব্রাউজারের ওপর। কয়েকবার টেস্ট চালান; এটি একটি অনুমান, আপনার ইন্টারনেট প্যাকেজের প্রত্যয়িত পরিমাপ নয়।',
    n5: 'কোনো ডাউনলোডে {seconds} সেকেন্ডের বেশি লাগলে ধীর সংযোগে ডেটা বাঁচাতে টেস্টটি বড় ফাইলে যায় না।',
  },
});

type L = ReturnType<typeof S>;

interface SpeedSession {
  plan: SpeedPlan;
  transfers: Transfer[];
  rtts: number[];
  received: number;
}

const local = (ctx: ToolContext, s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);

function errorText(L: L, e: unknown): string {
  const kind: NetError = e instanceof NetFailure ? e.kind : 'blocked';
  return L(`err_${kind}`, {
    status: e instanceof NetFailure && e.status ? String(e.status) : '?',
  });
}

interface Download {
  /** Bytes and time from the server's first answer to the last byte. */
  transfer: Transfer;
  /** Milliseconds from sending the request to the server's first answer. */
  ttfb: number;
  /** Milliseconds from sending the request to the last byte. */
  total: number;
}

/** Download `bytes` from the test service and time it. Cancels the body on abort or timeout. */
async function timedDownload(bytes: number, signal: AbortSignal): Promise<Download> {
  const t0 = performance.now();
  const res = await request(speedUrl(bytes), { timeoutMs: HEADER_TIMEOUT_MS, signal });
  const headersAt = performance.now();
  let received = 0;
  let last = headersAt;
  const reader = res.body?.getReader();
  if (!reader) {
    received = (await res.arrayBuffer()).byteLength;
    last = performance.now();
  } else {
    let timedOut = false;
    const cancel = (): void => void reader.cancel().catch(() => undefined);
    const timer = setTimeout(() => {
      timedOut = true;
      cancel();
    }, BODY_TIMEOUT_MS);
    signal.addEventListener('abort', cancel);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        last = performance.now();
      }
    } catch {
      if (!signal.aborted && !timedOut) throw new NetFailure('blocked');
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
    if (signal.aborted) throw new NetFailure('aborted');
    if (timedOut) throw new NetFailure('timeout');
  }
  return {
    transfer: { bytes: received, ms: last - headersAt },
    ttfb: headersAt - t0,
    total: last - t0,
  };
}

export const internetSpeedTest: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const mb = (bytes: number): string => local(ctx, formatMB(bytes));
  const plan = field(
    L('plan'),
    select(
      SPEED_PLANS.map((p) => [p, L(`plan_${p}`, { mb: mb(planBytes(p)) })]),
      { id: 'speed-plan' },
    ),
  );
  bindMemo(plan.control, ctx.memo, 'plan', 'quick');

  const panel = resultPanel(ctx, L('start'));
  const status = statusArea();
  const next = abortOnCleanup(ctx);
  const stopBtn = h(
    'button',
    { type: 'button', class: 'btn', id: 'speed-stop', hidden: '' },
    L('stop'),
  );
  let stopped = false;

  const render = (s: SpeedSession): void => {
    const speed = summariseSpeed(s.transfers);
    const rtt = summariseLatency(s.rtts);
    const ms = (v: number | null): string =>
      v === null ? '—' : L('ms', { v: local(ctx, v.toFixed(0)) });
    const rate = (v: number | null): string =>
      v === null ? '—' : L('downloadValue', { v: local(ctx, formatMbps(v)) });
    const notesOut: string[] = [];
    if (!speed.counted) notesOut.push(s.transfers.length ? L('tooFast') : L('noDownloads'));
    panel.show(
      [
        { label: L('download'), value: rate(speed.download), primary: true },
        { label: L('median'), value: rate(speed.median) },
        { label: L('rtt'), value: ms(rtt.median) },
        { label: L('jitter'), value: ms(rtt.jitter) },
        { label: L('counted'), value: local(ctx, String(speed.counted)) },
        { label: L('data'), value: L('dataValue', { v: mb(s.received) }) },
        { label: L('server'), value: SPEED_HOST, lang: 'en' },
      ],
      notesOut,
    );
  };

  const form = h('form', { class: 'tool-form', 'aria-label': L('start') });
  form.noValidate = true;
  const actions = formActions(ctx, {
    submitLabel: L('start'),
    panel,
    onReset() {
      next().abort();
      plan.control.value = 'quick';
      ctx.memo.plan = 'quick';
      ctx.session.delete('speed');
      finish();
      status.clear();
      panel.clear();
    },
  });
  actions.querySelector('button[type="submit"]')?.after(stopBtn);
  form.append(
    h(
      'aside',
      { class: 'net-notice', 'aria-labelledby': 'speed-notice-title' },
      h('h2', { id: 'speed-notice-title', class: 'net-notice-title' }, L('noticeTitle')),
      h('p', {}, L('notice1', { endpoint: SPEED_ENDPOINT })),
      h(
        'p',
        {},
        L('notice2', { quick: mb(planBytes('quick')), standard: mb(planBytes('standard')) }),
      ),
      h('p', {}, L('notice3')),
      h('p', { class: 'net-notice-strong' }, L('nothingYet')),
      h(
        'p',
        {},
        h('a', { href: CLOUDFLARE_PRIVACY, rel: 'noopener noreferrer' }, L('privacyLink')),
      ),
    ),
    h('div', { class: 'field-grid' }, plan.el),
    actions,
    status.el,
  );

  function finish(): void {
    busy(form, false);
    stopBtn.hidden = true;
    plan.control.disabled = false;
  }

  stopBtn.addEventListener('click', () => {
    stopped = true;
    next().abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chosen: SpeedPlan = plan.control.value === 'standard' ? 'standard' : 'quick';
    const ctrl = next();
    stopped = false;
    busy(form, true);
    plan.control.disabled = true;
    stopBtn.hidden = false;
    stopBtn.focus();
    panel.clear();
    const session: SpeedSession = { plan: chosen, transfers: [], rtts: [], received: 0 };
    try {
      // The first request opens the connection and is not counted.
      status.progress(L('latency', { i: local(ctx, '1'), n: local(ctx, String(LATENCY_ROUNDS)) }));
      await timedDownload(0, ctrl.signal);
      for (let i = 1; i <= LATENCY_ROUNDS; i++) {
        status.progress(
          L('latency', { i: local(ctx, String(i)), n: local(ctx, String(LATENCY_ROUNDS)) }),
        );
        session.rtts.push((await timedDownload(0, ctrl.signal)).ttfb);
      }
      for (const step of PLAN_STEPS[chosen]) {
        let slowest = 0;
        for (let i = 1; i <= step.count; i++) {
          status.progress(
            L('downloading', {
              mb: mb(step.bytes),
              i: local(ctx, String(i)),
              n: local(ctx, String(step.count)),
            }),
          );
          const d = await timedDownload(step.bytes, ctrl.signal);
          session.transfers.push(d.transfer);
          session.received += d.transfer.bytes;
          slowest = Math.max(slowest, d.total);
        }
        if (!shouldContinue(slowest)) break;
      }
      status.progress(L('done'));
    } catch (err) {
      if (!(err instanceof NetFailure && err.kind === 'aborted')) status.error(errorText(L, err));
    }
    if (stopped) status.progress(L('stopped'));
    else if (ctrl.signal.aborted) return; // left the tool or reset
    if (session.rtts.length || session.transfers.length) {
      ctx.session.set('speed', session);
      render(session);
    }
    finish();
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  });

  const last = ctx.session.get('speed') as SpeedSession | undefined;
  if (last) render(last);

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(
      ctx,
      [
        L('n1'),
        L('n2'),
        L('n3'),
        L('n4'),
        L('n5', { seconds: local(ctx, String(SLOW_STEP_MS / 1000)) }),
      ],
      L('notesTitle'),
    ),
  );
};
