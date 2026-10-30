import { describe, expect, it } from 'vitest';
import { checkCard, groupCard, luhn, networkForPrefix, parseBin } from '../../src/calc/cardCheck';

const check = (s: string) => {
  const r = checkCard(s);
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return r.value;
};

describe('luhn', () => {
  it('accepts the standard test numbers and rejects a changed digit', () => {
    for (const n of [
      '4111111111111111',
      '5555555555554444',
      '378282246310005',
      '6011111111111117',
      '30569309025904',
      '3530111333300000',
    ])
      expect(luhn(n), n).toBe(true);
    expect(luhn('4111111111111112')).toBe(false);
    expect(luhn('79927398713')).toBe(true); // the example in the Luhn algorithm description
    expect(luhn('79927398710')).toBe(false);
  });
});

describe('checkCard', () => {
  it.each([
    ['4111 1111 1111 1111', 'visa'],
    ['5555-5555-5555-4444', 'mastercard'],
    ['378282246310005', 'amex'],
    ['6011111111111117', 'discover'],
    ['30569309025904', 'diners'],
    ['3530111333300000', 'jcb'],
  ])('%s is %s with a valid checksum and length', (n, network) => {
    const c = check(n);
    expect(c.network).toBe(network);
    expect(c.luhnValid).toBe(true);
    expect(c.lengthMatchesNetwork).toBe(true);
  });

  it('recognises the whole Mastercard 2-series range (2221 to 2720)', () => {
    for (const prefix of ['2221', '2230', '2299', '2300', '2500', '2699', '2700', '2720'])
      expect(check(`${prefix}000000000000`).network, prefix).toBe('mastercard');
    for (const prefix of ['2220', '2721'])
      expect(check(`${prefix}000000000000`).network, prefix).toBeNull();
  });

  it('flags a bad checksum and a length that the network does not issue', () => {
    expect(check('4111111111111112').luhnValid).toBe(false);
    const short = check('41111111111111'); // 14-digit Visa-looking number
    expect(short.network).toBe('visa');
    expect(short.lengthMatchesNetwork).toBe(false);
    expect(short.expectedLengths).toEqual([13, 16, 19]);
  });

  it('gives no network for an unknown prefix', () => {
    const c = check('9999999999999995');
    expect(c.network).toBeNull();
    expect(c.lengthMatchesNetwork).toBeNull();
    expect(c.expectedLengths).toEqual([]);
  });

  it('accepts Bangla digits and strips spaces and hyphens', () => {
    expect(check('৪১১১ ১১১১ ১১১১ ১১১১').digits).toBe('4111111111111111');
  });

  it('refuses empty input, letters and wrong lengths', () => {
    expect(checkCard('')).toEqual({ ok: false, error: 'empty' });
    expect(checkCard('4111 1111 abcd 1111')).toEqual({ ok: false, error: 'characters' });
    expect(checkCard('411111111')).toEqual({ ok: false, error: 'length' });
    expect(checkCard('4'.repeat(20))).toEqual({ ok: false, error: 'length' });
  });
});

describe('groupCard', () => {
  it('groups 4-4-4-4, and 4-6-5 for 15-digit numbers', () => {
    expect(groupCard('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(groupCard('378282246310005')).toBe('3782 822463 10005');
  });
});

describe('BIN checks', () => {
  it('accepts 6 to 8 digits only, so a full card number is refused', () => {
    expect(parseBin('411111')).toEqual({ ok: true, value: '411111' });
    expect(parseBin(' 5555-5555 ')).toEqual({ ok: true, value: '55555555' });
    expect(parseBin('৪১১১১১')).toEqual({ ok: true, value: '411111' });
    expect(parseBin('')).toEqual({ ok: false, error: 'empty' });
    expect(parseBin('4111a1')).toEqual({ ok: false, error: 'characters' });
    expect(parseBin('41111')).toEqual({ ok: false, error: 'too-short' });
    expect(parseBin('411111111')).toEqual({ ok: false, error: 'too-long' });
    expect(parseBin('4111 1111 1111 1111')).toEqual({ ok: false, error: 'too-long' });
  });

  it('names the network from published ranges, or nothing', () => {
    expect(networkForPrefix('411111')?.network).toBe('visa');
    expect(networkForPrefix('222100')?.network).toBe('mastercard');
    expect(networkForPrefix('378282')).toEqual({ network: 'amex', lengths: [15] });
    expect(networkForPrefix('621234')?.network).toBe('unionpay');
    expect(networkForPrefix('999999')).toBeNull();
  });
});
