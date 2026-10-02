/**
 * Regression tests for the linear-time whitespace operations in src/calc/textClean.ts.
 * They replaced three regexes that backtracked quadratically on long runs of spaces/tabs.
 * The original regexes are kept here, verbatim, as the reference behaviour.
 */
import { describe, expect, it } from 'vitest';
import {
  cleanText,
  DEFAULT_CLEAN_OPTIONS,
  joinLinesLinear,
  trimEndsLinear,
  trimLineEndsLinear,
  UNUSUAL_SPACES,
  type CleanOptions,
} from '../../src/calc/textClean';

const u = (...cps: number[]): string => String.fromCodePoint(...cps);
const esc = (cp: number): string => `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;

// ---------- Reference: the regexes used before this change (textClean.ts at 9d0ed68) ----------
const UNICODE_LINE_SEPS = `${esc(0x85)}${esc(0x2028)}${esc(0x2029)}`;
const LINE_BREAK = `(?:\\r\\n|[\\n\\r${UNICODE_LINE_SEPS}])`;
const WS = `[ \\t\\n\\r${esc(0x0b)}${esc(0x0c)}${UNICODE_LINE_SEPS}${UNUSUAL_SPACES.map((c) => esc(c.codePointAt(0) ?? 0)).join('')}]`;
const ref = {
  join: (t: string) => t.replace(new RegExp(`[ \\t]*(?:${LINE_BREAK}[ \\t]*)+`, 'g'), ' '),
  trimLineEnds: (t: string) => t.replace(new RegExp(`[ \\t]+(?=${LINE_BREAK}|$)`, 'g'), ''),
  trimEnds: (t: string) => t.replace(new RegExp(`^${WS}+|${WS}+$`, 'g'), ''),
};

const NBSP = u(0x00a0);
const LS = u(0x2028);
const PS = u(0x2029);
const NEL = u(0x0085);
const BOM = u(0xfeff);
const ZWSP = u(0x200b);
const ZWJ = u(0x200d);
const IDEO = u(0x3000);
// কোড ক্ষ। (KA + O-kar + DDA, KA + hasanta + SSA, dari)
const BN = `${u(0x0995, 0x09cb, 0x09a1)} ${u(0x0995, 0x09cd, 0x09b7, 0x0964)}`;
const FAMILY = u(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);

describe('trimLineEndsLinear', () => {
  it.each([
    ['a  \n\tb\t \r\nc ', 'a\n\tb\r\nc'],
    ['  indented  \n\tkept', '  indented\n\tkept'],
    [`x ${LS}y\t${PS}z ${NEL}w `, `x${LS}y${PS}z${NEL}w`],
    [`a${NBSP}\nb${IDEO}`, `a${NBSP}\nb${IDEO}`], // only spaces and tabs are trimmed
    [`${BN}   \n${FAMILY}\t`, `${BN}\n${FAMILY}`],
    ['   ', ''],
    ['', ''],
    ['a\r\r\n\n', 'a\r\r\n\n'],
  ])('%j → %j', (input, expected) => {
    expect(trimLineEndsLinear(input)).toBe(expected);
    expect(ref.trimLineEnds(input)).toBe(expected);
  });
});

describe('joinLinesLinear', () => {
  it.each([
    ['one  \n\n  two\r\nthree', 'one two three'],
    ['no break  here', 'no break  here'],
    ['\n\na', ' a'],
    ['a\n\n', 'a '],
    ['  \nb', ' b'],
    ['a\n   ', 'a '],
    ['a\n \t \n\t b', 'a b'],
    [`a${LS}${PS}${NEL}b`, 'a b'],
    ['  lead\ntrail  ', '  lead trail  '],
    [`${BN}\n\n${FAMILY}`, `${BN} ${FAMILY}`],
    [`${u(0x09b0)}${ZWJ}\n${u(0x09cd, 0x09af)}`, `${u(0x09b0)}${ZWJ} ${u(0x09cd, 0x09af)}`],
    ['\n', ' '],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(joinLinesLinear(input)).toBe(expected);
    expect(ref.join(input)).toBe(expected);
  });
});

describe('trimEndsLinear', () => {
  it.each([
    [` \n\t${NBSP}hello world${IDEO}\r\n${LS} `, 'hello world'],
    [`${BOM} hi `, `${BOM} hi`], // U+FEFF is not whitespace here
    [`${ZWSP} hi ${ZWSP}`, `${ZWSP} hi ${ZWSP}`],
    [`  ${BN}  `, BN],
    [` ${FAMILY} `, FAMILY],
    [`${u(0x0b, 0x0c)}x${NEL}`, 'x'],
    ['   ', ''],
    ['', ''],
    ['a', 'a'],
  ])('%j → %j', (input, expected) => {
    expect(trimEndsLinear(input)).toBe(expected);
    expect(ref.trimEnds(input)).toBe(expected);
  });
});

describe('fixed-seed differential test against the original regexes', () => {
  const ALPHABET = [
    ' ',
    ' ',
    ' ',
    '\t',
    '\t',
    '\n',
    '\n',
    '\r',
    '\r\n',
    LS,
    PS,
    NEL,
    u(0x0b),
    u(0x0c),
    NBSP,
    IDEO,
    u(0x2009),
    ZWSP,
    BOM,
    ZWJ,
    'a',
    'b',
    u(0x0995),
    u(0x09cd),
    u(0x09b7),
    u(0x1f44d),
    u(0x01),
  ];
  let seed = 20261002;
  const rand = (n: number): number => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) % n;
  const randomText = (): string =>
    Array.from({ length: rand(40) }, () => ALPHABET[rand(ALPHABET.length)]).join('');

  // Compares directly and records mismatches instead of calling expect() 300,000 times, and
  // has a generous timeout: a slow CI runner once exceeded Vitest's 5 s default here.
  it('matches on 100,000 random inputs for each operation', { timeout: 60_000 }, () => {
    const mismatches: Array<{ op: string; input: string; got: string; want: string }> = [];
    let compared = 0;
    for (let i = 0; i < 100_000; i++) {
      const t = randomText();
      const checks: Array<[string, string, string]> = [
        ['trimLineEnds', trimLineEndsLinear(t), ref.trimLineEnds(t)],
        ['join', joinLinesLinear(t), ref.join(t)],
        ['trimEnds', trimEndsLinear(t), ref.trimEnds(t)],
      ];
      for (const [op, got, want] of checks) {
        compared++;
        if (got !== want && mismatches.length < 5) mismatches.push({ op, input: t, got, want });
      }
    }
    expect(mismatches).toEqual([]);
    expect(compared).toBe(300_000);
  });
});

describe('very long whitespace runs (1,000,000 characters)', () => {
  // Correctness only: timing is measured separately so CI never depends on machine speed.
  // Before this change the first case alone was projected to take tens of minutes.
  const M = 1_000_000;
  const joinOpts: CleanOptions = { ...DEFAULT_CLEAN_OPTIONS, keepLineBreaks: false };
  const keepEverything: CleanOptions = {
    ...DEFAULT_CLEAN_OPTIONS,
    trimEnds: false,
    collapseSpaces: false,
  };

  it('cleans long runs of spaces and tabs', { timeout: 60_000 }, () => {
    expect(cleanText(' '.repeat(M) + 'x', DEFAULT_CLEAN_OPTIONS).text).toBe('x');
    expect(cleanText('x' + ' '.repeat(M) + 'x', DEFAULT_CLEAN_OPTIONS).text).toBe('x x');
    expect(cleanText('\t'.repeat(M) + 'x', DEFAULT_CLEAN_OPTIONS).text).toBe('x');
    expect(cleanText('x' + '\t'.repeat(M), DEFAULT_CLEAN_OPTIONS).text).toBe('x');
    const tabs = 'a' + '\t'.repeat(M) + 'b';
    expect(cleanText(tabs, DEFAULT_CLEAN_OPTIONS).text).toBe(tabs); // tabs are kept by default
  });

  it('trims long trailing whitespace on each line', { timeout: 60_000 }, () => {
    const r = cleanText(`a${' '.repeat(M)}\nb${'\t'.repeat(M)}`, keepEverything);
    expect(r.text).toBe('a\nb');
  });

  it('joins lines around long whitespace runs', { timeout: 60_000 }, () => {
    expect(cleanText(`${' '.repeat(M)}\nx`, joinOpts).text).toBe('x');
    expect(cleanText(`a${' '.repeat(M)}\n${'\t'.repeat(M)}b`, joinOpts).text).toBe('a b');
    expect(cleanText(`a${'\n '.repeat(M / 2)}b`, joinOpts).text).toBe('a b');
  });

  it('keeps Bangla and emoji intact inside large inputs', { timeout: 60_000 }, () => {
    const big = `${' '.repeat(M)}${BN} ${FAMILY}${'\t'.repeat(M)}`;
    expect(cleanText(big, DEFAULT_CLEAN_OPTIONS).text).toBe(`${BN} ${FAMILY}`);
  });
});
