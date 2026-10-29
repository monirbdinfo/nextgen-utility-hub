import { describe, expect, it } from 'vitest';
import {
  formatMB,
  formatMbps,
  mbps,
  MIN_SAMPLE_MS,
  percentile,
  PLAN_STEPS,
  planBytes,
  shouldContinue,
  SLOW_STEP_MS,
  speedUrl,
  summariseSpeed,
} from '../../src/calc/speedTest';

describe('speed test plan', () => {
  it('builds the Cloudflare download URL', () => {
    expect(speedUrl(0)).toBe('https://speed.cloudflare.com/__down?bytes=0');
    expect(speedUrl(1_000_000)).toBe('https://speed.cloudflare.com/__down?bytes=1000000');
  });

  it('discloses how much each plan can download', () => {
    expect(planBytes('quick')).toBe(4_200_000);
    expect(planBytes('standard')).toBe(34_200_000);
    expect(formatMB(planBytes('quick'))).toBe('4.2');
    expect(formatMB(planBytes('standard'))).toBe('34.2');
  });

  it('downloads small files first', () => {
    for (const steps of Object.values(PLAN_STEPS)) {
      const sizes = steps.map((s) => s.bytes);
      expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    }
  });

  it('stops moving to larger files on a slow connection', () => {
    expect(shouldContinue(SLOW_STEP_MS - 1)).toBe(true);
    expect(shouldContinue(SLOW_STEP_MS)).toBe(false);
  });
});

describe('speed arithmetic', () => {
  it('converts bytes and milliseconds to megabits per second', () => {
    expect(mbps(1_000_000, 1000)).toBe(8);
    expect(mbps(12_500_000, 1000)).toBe(100);
    expect(mbps(1_000_000, 80)).toBeCloseTo(100);
  });

  it('interpolates percentiles', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 90)).toBe(46);
    expect(percentile([7], 90)).toBe(7);
    expect(percentile([], 90)).toBeNaN();
  });

  it('reports the 90th percentile and median, ignoring transfers too quick to time', () => {
    const s = summariseSpeed([
      { bytes: 1_000_000, ms: 1000 }, // 8
      { bytes: 1_000_000, ms: 500 }, // 16
      { bytes: 1_000_000, ms: 250 }, // 32
      { bytes: 100_000, ms: MIN_SAMPLE_MS - 1 }, // ignored
      { bytes: 0, ms: 100 }, // ignored
    ]);
    expect(s.counted).toBe(3);
    expect(s.median).toBe(16);
    expect(s.download).toBeCloseTo(28.8);
  });

  it('has no result when nothing could be timed', () => {
    expect(summariseSpeed([{ bytes: 100_000, ms: 2 }])).toEqual({
      download: null,
      median: null,
      counted: 0,
    });
  });

  it('formats speeds with sensible precision', () => {
    expect(formatMbps(3.456)).toBe('3.46');
    expect(formatMbps(45.66)).toBe('45.7');
    expect(formatMbps(512.4)).toBe('512');
  });
});
