export type UnitKind = 'length' | 'weight' | 'temperature' | 'data';

const UNITS: Record<UnitKind, Record<string, number>> = {
  length: {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,
  },
  weight: {
    mg: 0.000001,
    g: 0.001,
    kg: 1,
    t: 1000,
    oz: 0.028349523125,
    lb: 0.45359237,
  },
  temperature: { c: 1, f: 1, k: 1 },
  data: {
    B: 1,
    KB: 1e3,
    MB: 1e6,
    GB: 1e9,
    TB: 1e12,
    KiB: 1024,
    MiB: 1024 ** 2,
    GiB: 1024 ** 3,
    TiB: 1024 ** 4,
  },
};

export function unitIds(kind: UnitKind): string[] {
  return Object.keys(UNITS[kind]);
}

export function convertUnit(
  value: number,
  kind: UnitKind,
  from: string,
  to: string,
): number {
  if (!Number.isFinite(value)) throw new RangeError('Value must be finite');
  if (!(from in UNITS[kind]) || !(to in UNITS[kind])) {
    throw new RangeError('Unsupported unit');
  }
  if (kind === 'temperature') {
    const c =
      from === 'c'
        ? value
        : from === 'f'
          ? ((value - 32) * 5) / 9
          : value - 273.15;
    return to === 'c' ? c : to === 'f' ? (c * 9) / 5 + 32 : c + 273.15;
  }
  return (value * UNITS[kind][from]!) / UNITS[kind][to]!;
}
