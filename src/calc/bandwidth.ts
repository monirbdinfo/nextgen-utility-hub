export function downloadSeconds(size: number, unit: 'MB' | 'GB' | 'TB', speedMbps: number): number {
  if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(speedMbps) || speedMbps <= 0) {
    throw new RangeError('Size and speed must be positive');
  }
  return (size * (unit === 'MB' ? 1e6 : unit === 'GB' ? 1e9 : 1e12) * 8) / (speedMbps * 1e6);
}

export function dataUsageGB(speedMbps: number, hours: number): number {
  if (!Number.isFinite(speedMbps) || speedMbps < 0 || !Number.isFinite(hours) || hours < 0) {
    throw new RangeError('Values must be non-negative');
  }
  return (speedMbps * 1e6 * hours * 3600) / 8 / 1e9;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('Invalid duration');
  }
  if (seconds < 60) return `${seconds.toFixed(1)} s`;

  const n = Math.round(seconds);
  const d = Math.floor(n / 86400);
  const h = Math.floor((n % 86400) / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return (
    [d ? `${d} d` : '', h ? `${h} h` : '', m ? `${m} min` : '', s ? `${s} s` : '']
      .filter(Boolean)
      .join(' ') || '0 s'
  );
}
