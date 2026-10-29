/**
 * Internet speed test arithmetic. The browser downloads test data from Cloudflare's speed test
 * service (the same endpoint speed.cloudflare.com uses) and times it; this module holds the plan
 * of what to download and how the timings become a speed. No network code here.
 */

export const SPEED_HOST = 'speed.cloudflare.com';
export const SPEED_ENDPOINT = `https://${SPEED_HOST}/__down`;

/** URL for one download of `bytes` bytes (0 is used to time a round trip). */
export const speedUrl = (bytes: number): string => `${SPEED_ENDPOINT}?bytes=${bytes}`;

export type SpeedPlan = 'quick' | 'standard';
export const SPEED_PLANS: readonly SpeedPlan[] = ['quick', 'standard'];

export interface SpeedStep {
  bytes: number;
  count: number;
}

/** Round trips timed with empty downloads before any data is fetched. */
export const LATENCY_ROUNDS = 5;

/**
 * Downloads per plan, smallest first. Small files mostly measure the round trip, so the larger
 * ones decide a fast connection's result; a slow connection stops early (see `shouldContinue`).
 */
export const PLAN_STEPS: Record<SpeedPlan, readonly SpeedStep[]> = {
  quick: [
    { bytes: 100_000, count: 2 },
    { bytes: 1_000_000, count: 4 },
  ],
  standard: [
    { bytes: 100_000, count: 2 },
    { bytes: 1_000_000, count: 4 },
    { bytes: 10_000_000, count: 3 },
  ],
};

/** The most a plan can download, in bytes (the figure the notice discloses). */
export const planBytes = (plan: SpeedPlan): number =>
  PLAN_STEPS[plan].reduce((sum, s) => sum + s.bytes * s.count, 0);

/** Stop moving to larger files once one download takes this long: the connection is slow. */
export const SLOW_STEP_MS = 4000;

/** Whether to go on to the next, larger step after a step whose slowest download took `ms`. */
export const shouldContinue = (slowestMs: number): boolean => slowestMs < SLOW_STEP_MS;

/** A transfer shorter than this is too quick to time reliably and is not counted. */
export const MIN_SAMPLE_MS = 10;

export interface Transfer {
  /** Bytes received after the first chunk arrived. */
  bytes: number;
  /** Milliseconds from the first chunk to the last. */
  ms: number;
}

/** Megabits per second. */
export const mbps = (bytes: number, ms: number): number => (bytes * 8) / (ms / 1000) / 1e6;

/** Linear-interpolated percentile (0–100) of an ascending list. */
export function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return NaN;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

export interface SpeedSummary {
  /** Headline result: the 90th percentile of the counted downloads (as Cloudflare reports). */
  download: number | null;
  median: number | null;
  /** Downloads long enough to count. */
  counted: number;
}

export function summariseSpeed(transfers: readonly Transfer[]): SpeedSummary {
  const speeds = transfers
    .filter((t) => t.ms >= MIN_SAMPLE_MS && t.bytes > 0)
    .map((t) => mbps(t.bytes, t.ms))
    .sort((a, b) => a - b);
  if (!speeds.length) return { download: null, median: null, counted: 0 };
  return {
    download: percentile(speeds, 90),
    median: percentile(speeds, 50),
    counted: speeds.length,
  };
}

/** Speed with sensible precision: 2 decimals under 10 Mbps, 1 under 100, none above. */
export function formatMbps(value: number): string {
  return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0);
}

/** Bytes as megabytes (decimal, as data plans count them), one decimal. */
export const formatMB = (bytes: number): string => (bytes / 1e6).toFixed(1);
