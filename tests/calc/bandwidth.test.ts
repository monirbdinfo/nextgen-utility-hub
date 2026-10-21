import { describe, expect, it } from 'vitest';
import {
  dataUsageGB,
  downloadSeconds,
  formatDuration,
} from '../../src/calc/bandwidth';

describe('bandwidth calculator', () => {
  it('estimates download time using bits and decimal bytes', () => {
    expect(downloadSeconds(1, 'GB', 100)).toBe(80);
  });

  it('estimates data used at a steady rate', () => {
    expect(dataUsageGB(10, 1)).toBe(4.5);
  });

  it('formats duration clearly', () => {
    expect(formatDuration(45)).toBe('45.0 s');
    expect(formatDuration(3661)).toBe('1 h 1 min 1 s');
  });

  it('rejects invalid download inputs', () => {
    expect(() => downloadSeconds(0, 'GB', 10)).toThrow();
    expect(() => downloadSeconds(1, 'MB', 0)).toThrow();
  });

  it('rejects negative usage inputs', () => {
    expect(() => dataUsageGB(-1, 2)).toThrow();
  });
});
