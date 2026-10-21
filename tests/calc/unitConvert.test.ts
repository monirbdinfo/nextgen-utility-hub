import { describe, expect, it } from 'vitest';
import { convertUnit, unitIds } from '../../src/calc/unitConvert';

describe('unit converter', () => {
  it('converts metric and imperial length', () => {
    expect(convertUnit(1, 'length', 'km', 'm')).toBe(1000);
  });

  it('converts mass', () => {
    expect(convertUnit(1, 'weight', 'kg', 'lb')).toBeCloseTo(2.20462262, 6);
  });

  it('converts temperatures both ways', () => {
    expect(convertUnit(0, 'temperature', 'c', 'f')).toBe(32);
    expect(convertUnit(32, 'temperature', 'f', 'c')).toBe(0);
    expect(convertUnit(0, 'temperature', 'c', 'k')).toBeCloseTo(273.15);
  });

  it('distinguishes decimal and binary storage units', () => {
    expect(convertUnit(1, 'data', 'GB', 'MB')).toBe(1000);
    expect(convertUnit(1, 'data', 'GiB', 'MiB')).toBe(1024);
  });

  it('rejects unsupported units and non-finite values', () => {
    expect(() => convertUnit(1, 'length', 'm', 'kg')).toThrow();
    expect(() => convertUnit(Infinity, 'length', 'm', 'km')).toThrow();
  });

  it('lists units for each category', () => {
    expect(unitIds('temperature')).toEqual(['c', 'f', 'k']);
  });
});
