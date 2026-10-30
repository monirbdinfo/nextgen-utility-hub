import {
  apiErrorKind,
  GLOBALPING_API,
  measurementBody,
  parseCreated,
  parseMeasurement,
  type ApiErrorKind,
  type Measurement,
  type MeasurementSpec,
} from '../calc/globalping';
import { NetFailure, request, type NetError } from './net';

/**
 * Runs a Globalping measurement: one POST to create it, then GET every 500 ms (the interval the
 * API asks for) until it is finished. Only the target and the chosen options are sent; no
 * cookies, no referrer and no API key.
 */

const REQUEST_TIMEOUT_MS = 10_000;
/** Give up waiting for results after this long; the API's own per-test timeout is 5–30 s. */
export const MEASUREMENT_TIMEOUT_MS = 60_000;
export const POLL_INTERVAL_MS = 500;

export type GlobalpingError = NetError | ApiErrorKind | 'parse' | 'gave-up';

export class GlobalpingFailure extends Error {
  constructor(
    readonly kind: GlobalpingError,
    readonly status?: number,
  ) {
    super(kind);
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new GlobalpingFailure('parse');
  }
}

/** request() rejects non-2xx answers; read the API's error body to classify them. */
async function call(
  url: string,
  init: { method?: 'GET' | 'POST'; body?: string },
  signal: AbortSignal,
): Promise<unknown> {
  try {
    const res = await request(url, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
      method: init.method,
      body: init.body,
      signal,
    });
    return await readJson(res);
  } catch (e) {
    if (e instanceof GlobalpingFailure) throw e;
    if (e instanceof NetFailure) {
      if (e.kind === 'http')
        throw new GlobalpingFailure(apiErrorKind(e.status ?? 0, null), e.status);
      throw new GlobalpingFailure(e.kind);
    }
    throw new GlobalpingFailure('blocked');
  }
}

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new GlobalpingFailure('aborted'));
    });
  });

/**
 * Create a measurement and wait for it. `onUpdate` receives each partial result. Rejects with
 * GlobalpingFailure only.
 */
export async function runMeasurement(
  spec: MeasurementSpec,
  signal: AbortSignal,
  onUpdate: (m: Measurement) => void = () => undefined,
  now: () => number = Date.now,
): Promise<Measurement> {
  const created = parseCreated(
    await call(
      GLOBALPING_API,
      { method: 'POST', body: JSON.stringify(measurementBody(spec)) },
      signal,
    ),
  );
  if (!created.ok) throw new GlobalpingFailure('parse');
  const url = `${GLOBALPING_API}/${encodeURIComponent(created.value)}`;
  const deadline = now() + MEASUREMENT_TIMEOUT_MS;
  for (;;) {
    await sleep(POLL_INTERVAL_MS, signal);
    const m = parseMeasurement(await call(url, {}, signal));
    if (!m.ok) throw new GlobalpingFailure('parse');
    onUpdate(m.value);
    if (m.value.finished) return m.value;
    if (now() > deadline) throw new GlobalpingFailure('gave-up');
  }
}
