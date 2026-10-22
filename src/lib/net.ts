/**
 * The only place the app talks to the network. Used solely by the online Network tools,
 * and only after the user presses their button. No cookies or credentials are sent.
 */

export type NetError = 'offline' | 'timeout' | 'blocked' | 'http' | 'parse' | 'aborted';

export class NetFailure extends Error {
  constructor(
    readonly kind: NetError,
    readonly status?: number,
  ) {
    super(kind);
  }
}

export interface FetchOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
  /** Cancels the request (e.g. when the user leaves the tool). */
  signal?: AbortSignal;
}

/** fetch() with a timeout, no credentials, no cache and no referrer, and classified errors. */
export async function request(url: string, opts: FetchOptions): Promise<Response> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    throw new NetFailure('offline');
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, opts.timeoutMs);
  const onAbort = (): void => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: opts.headers,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new NetFailure('http', res.status);
    return res;
  } catch (e) {
    if (e instanceof NetFailure) throw e;
    if (timedOut) throw new NetFailure('timeout');
    if (opts.signal?.aborted) throw new NetFailure('aborted');
    // A TypeError from fetch means the request never completed: no connection, a CORS
    // refusal, or a blocker (extension, firewall). Browsers do not say which.
    throw new NetFailure('blocked');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
