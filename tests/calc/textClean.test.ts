import { describe, expect, it } from 'vitest';
import {
  BIDI,
  cleanText,
  DEFAULT_CLEAN_OPTIONS,
  detectIssues,
  JOINERS,
  stats,
  UNUSUAL_SPACES,
  ZERO_WIDTH,
  type CleanOptions,
} from '../../src/calc/textClean';

/** Build a string from explicit code points, so every test input is unambiguous. */
const u = (...cps: number[]): string => String.fromCodePoint(...cps);
const hex = (s: string): string[] =>
  [...s].map((c) => (c.codePointAt(0) ?? 0).toString(16).toUpperCase());

/** Every operation off: the identity configuration. */
const NONE: CleanOptions = {
  trimEnds: false,
  trimLineEnds: false,
  collapseSpaces: false,
  convertUnusualSpaces: false,
  blankLines: 'keep',
  normalizeLineEndings: false,
  keepTabs: true,
  keepLineBreaks: true,
  removeZeroWidth: false,
  removeJoiners: false,
  removeBidi: false,
  removeControl: false,
  normalization: 'none',
};
const only = (o: Partial<CleanOptions>): CleanOptions => ({ ...NONE, ...o });
const clean = (text: string, o: Partial<CleanOptions> = {}): string =>
  cleanText(text, { ...DEFAULT_CLEAN_OPTIONS, ...o }).text;

// Code points used below.
const ZWSP = u(0x200b);
const WJ = u(0x2060);
const BOM = u(0xfeff);
const SHY = u(0x00ad);
const ZWNJ = u(0x200c);
const ZWJ = u(0x200d);
const LRM = u(0x200e);
const RLO = u(0x202e);
const NBSP = u(0x00a0);
const IDEO_SPACE = u(0x3000);
const LS = u(0x2028);
const PS = u(0x2029);
const NEL = u(0x0085);
const HASANTA = u(0x09cd);

// Bangla building blocks.
const KA = u(0x0995);
const SSA = u(0x09b7);
const RA = u(0x09b0);
const YA = u(0x09af);
const PA = u(0x09aa);
const BA = u(0x09ac);
const SA = u(0x09b8);
const NA = u(0x09a8);
const DA = u(0x09a6);
const NGA = u(0x0999);
const GA = u(0x0997);
const KARS = [0x09be, 0x09bf, 0x09c0, 0x09c1, 0x09c2, 0x09c3, 0x09c7, 0x09c8, 0x09cb, 0x09cc].map(
  (k) => KA + u(k),
);
const PHOLA = [PA + HASANTA + RA, BA + HASANTA + YA, SA + HASANTA + BA, RA + HASANTA + KA]; // র-ফলা, য-ফলা, ব-ফলা, রেফ
const JUKTO = [
  KA + HASANTA + SSA,
  NGA + HASANTA + GA,
  KA + HASANTA + u(0x09a4),
  NA + HASANTA + DA + HASANTA + RA,
];
const SIGNS = u(0x0981, 0x0982, 0x0983, 0x09ce, 0x0964); // চন্দ্রবিন্দু, অনুস্বার, বিসর্গ, খণ্ড ত, দাঁড়ি
const BANGLA = [...KARS, ...PHOLA, ...JUKTO, SIGNS].join(' ');

describe('character sets', () => {
  it('lists exactly the documented code points', () => {
    expect(ZERO_WIDTH.map(hex).flat()).toEqual(['200B', '2060', 'FEFF', 'AD']);
    expect(JOINERS.map(hex).flat()).toEqual(['200C', '200D']);
    expect(BIDI).toHaveLength(12);
    expect(UNUSUAL_SPACES).toHaveLength(16);
    expect(UNUSUAL_SPACES).not.toContain(' ');
  });

  it('never classifies Bangla letters, signs or combining marks', () => {
    const all = [...ZERO_WIDTH, ...JOINERS, ...BIDI, ...UNUSUAL_SPACES];
    for (let cp = 0x0980; cp <= 0x09ff; cp++) expect(all).not.toContain(u(cp));
  });
});

describe('whitespace', () => {
  it('trims the start and end of the text', () => {
    expect(cleanText(`  ${NBSP}\n\t hello world \n\n `, only({ trimEnds: true })).text).toBe(
      'hello world',
    );
  });

  it('keeps a BOM at the start unless zero-width removal is on', () => {
    expect(cleanText(`${BOM} hi`, only({ trimEnds: true })).text).toBe(`${BOM} hi`);
    expect(cleanText(`${BOM} hi`, only({ trimEnds: true, removeZeroWidth: true })).text).toBe('hi');
  });

  it('collapses repeated spaces but leaves tabs alone when tabs are kept', () => {
    expect(cleanText('a    b  c', only({ collapseSpaces: true })).text).toBe('a b c');
    expect(cleanText('a\t\tb  c', only({ collapseSpaces: true })).text).toBe('a\t\tb c');
  });

  it('removes spaces at line ends without touching indentation', () => {
    expect(cleanText('  one   \n\ttwo\t\nthree ', only({ trimLineEnds: true })).text).toBe(
      '  one\n\ttwo\nthree',
    );
  });

  it('converts unusual spaces to ordinary spaces', () => {
    const r = cleanText(
      `a${NBSP}b${IDEO_SPACE}c${u(0x2009)}d`,
      only({ convertUnusualSpaces: true }),
    );
    expect(r.text).toBe('a b c d');
    expect(r.changed.unusualSpacesConverted).toBe(3);
  });

  it('collapses blank lines to keep paragraph breaks', () => {
    const text = 'para 1\n\n\n\npara 2\n   \n\t\npara 3\n\npara 4';
    expect(cleanText(text, only({ blankLines: 'collapse' })).text).toBe(
      'para 1\n\npara 2\n\npara 3\n\npara 4',
    );
  });

  it('removes all blank lines when asked', () => {
    expect(
      cleanText('\n\nline 1\n\n\nline 2\n  \nline 3', only({ blankLines: 'remove' })).text,
    ).toBe('line 1\nline 2\nline 3');
  });

  it('keeps blank lines when set to keep', () => {
    expect(cleanText('a\n\n\nb', only({ blankLines: 'keep' })).text).toBe('a\n\n\nb');
  });
});

describe('line endings, tabs and line breaks', () => {
  it('normalizes CRLF, CR and Unicode line separators to LF', () => {
    const r = cleanText(`a\r\nb\rc${NEL}d${LS}e${PS}f`, only({ normalizeLineEndings: true }));
    expect(r.text).toBe('a\nb\nc\nd\ne\nf');
    expect(r.changed.lineEndingsConverted).toBe(5);
    expect(r.detected).toMatchObject({ crlf: 1, cr: 1, unicodeLineSeparators: 3 });
  });

  it('leaves line endings alone when not selected, but still sees them as lines', () => {
    const r = cleanText('a\r\n\r\n\r\nb', only({ blankLines: 'collapse' }));
    expect(r.text).toBe('a\r\n\r\nb');
    expect(stats('a\r\nb\rc').lines).toBe(3);
  });

  it('converts tabs to spaces only when tabs are not kept', () => {
    expect(cleanText('a\tb', only({ keepTabs: true })).text).toBe('a\tb');
    const r = cleanText('a\t\tb', only({ keepTabs: false, collapseSpaces: true }));
    expect(r.text).toBe('a b');
    expect(r.changed.tabsConverted).toBe(2);
  });

  it('joins lines only when line breaks are not kept', () => {
    expect(cleanText('one\ntwo', only({ keepLineBreaks: true })).text).toBe('one\ntwo');
    expect(cleanText('one  \n\n  two\r\nthree', only({ keepLineBreaks: false })).text).toBe(
      'one two three',
    );
  });
});

describe('invisible and control characters', () => {
  it('removes zero-width characters and reports them', () => {
    const input = `in${ZWSP}vis${WJ}ible${SHY} text${BOM}`;
    const r = cleanText(input, only({ removeZeroWidth: true }));
    expect(r.text).toBe('invisible text');
    expect(r.detected.zeroWidth).toBe(4);
    expect(r.changed.zeroWidthRemoved).toBe(4);
  });

  it('detects joiners and bidi marks but keeps them by default', () => {
    const input = `a${ZWJ}b${ZWNJ}c${LRM}d${RLO}e`;
    const r = cleanText(input, DEFAULT_CLEAN_OPTIONS);
    expect(r.text).toBe(input);
    expect(r.detected).toMatchObject({ joiners: 2, bidi: 2 });
    expect(r.changed).toMatchObject({ joinersRemoved: 0, bidiRemoved: 0 });
  });

  it('removes joiners and bidi marks only when selected', () => {
    expect(cleanText(`a${ZWJ}b${ZWNJ}c`, only({ removeJoiners: true })).text).toBe('abc');
    const r = cleanText(`${RLO}abc${u(0x202c)}${LRM}`, only({ removeBidi: true }));
    expect(r.text).toBe('abc');
    expect(r.changed.bidiRemoved).toBe(3);
  });

  it('removes control characters but keeps tab and line breaks', () => {
    const input = `a${u(0x00)}b${u(0x07)}c${u(0x1b)}d${u(0x7f)}e${u(0x9b)}f\tg\nh\r\ni${NEL}j`;
    const r = cleanText(input, only({ removeControl: true }));
    expect(r.text).toBe(`abcdef\tg\nh\r\ni${NEL}j`);
    expect(r.detected.control).toBe(5);
    expect(r.changed.controlRemoved).toBe(5);
  });

  it('distinguishes detected from removed', () => {
    const input = `x${ZWSP}y${ZWJ}z${u(0x01)}`;
    const r = cleanText(input, only({ removeZeroWidth: true }));
    expect(r.detected).toMatchObject({ zeroWidth: 1, joiners: 1, control: 1 });
    expect(r.changed).toMatchObject({ zeroWidthRemoved: 1, joinersRemoved: 0, controlRemoved: 0 });
    expect(r.text).toBe(`xy${ZWJ}z${u(0x01)}`);
  });
});

describe('Unicode normalization', () => {
  const compat = `${u(0xfb01)}ne ${u(0x2460)} ${u(0xff21)} x${u(0xb2)}`; // ﬁ ① Ａ ²

  it('is not applied unless selected', () => {
    const decomposed = `e${u(0x0301)}`;
    expect(clean(decomposed)).toBe(decomposed);
    expect(clean(compat, { collapseSpaces: false })).toBe(compat);
  });

  it('NFC composes canonical sequences but keeps compatibility characters', () => {
    expect(hex(clean(`e${u(0x0301)}`, { normalization: 'NFC' }))).toEqual(['E9']);
    expect(clean(compat, { normalization: 'NFC' })).toBe(compat);
  });

  it('NFKC also replaces compatibility characters', () => {
    expect(clean(compat, { normalization: 'NFKC' })).toBe('fine 1 A x2');
    expect(clean(`a${NBSP}b`, { normalization: 'NFKC', convertUnusualSpaces: false })).toBe('a b');
  });

  it('applies the Unicode rules for Bangla: ো composes, য় decomposes', () => {
    expect(hex(clean(KA + u(0x09c7, 0x09be), { normalization: 'NFC' }))).toEqual(['995', '9CB']);
    expect(hex(clean(u(0x09df), { normalization: 'NFC' }))).toEqual(['9AF', '9BC']);
    expect(hex(clean(u(0x09dc), { normalization: 'NFKC' }))).toEqual(['9A1', '9BC']);
  });

  it('reports whether input is in NFC and whether normalization changed it', () => {
    expect(detectIssues(`e${u(0x0301)}`).notNFC).toBe(true);
    expect(detectIssues('plain').notNFC).toBe(false);
    expect(cleanText(`e${u(0x0301)}`, only({ normalization: 'NFC' })).changed.normalized).toBe(
      true,
    );
    expect(cleanText('plain', only({ normalization: 'NFC' })).changed.normalized).toBe(false);
  });

  it('recomposes after removing an invisible character between a letter and its mark', () => {
    expect(hex(clean(`e${ZWSP}${u(0x0301)}`, { normalization: 'NFC' }))).toEqual(['E9']);
  });
});

describe('Bangla text preservation', () => {
  it('keeps কার, ফলা, যুক্তাক্ষর and signs exactly under default options', () => {
    expect(clean(BANGLA)).toBe(BANGLA);
    expect(cleanText(BANGLA, DEFAULT_CLEAN_OPTIONS).detected.notNFC).toBe(false);
  });

  it('keeps Bangla intact under NFC and NFKC (already normalized text)', () => {
    expect(clean(BANGLA, { normalization: 'NFC' })).toBe(BANGLA);
    expect(clean(BANGLA, { normalization: 'NFKC' })).toBe(BANGLA);
  });

  it('keeps ZWJ in ra-phala (RA + ZWJ + hasanta + YA) and ZWNJ in KA + hasanta + ZWNJ + SSA by default', () => {
    const rafala = RA + ZWJ + HASANTA + YA;
    const kssa = KA + HASANTA + ZWNJ + SSA;
    expect(clean(`${rafala} ${kssa}`)).toBe(`${rafala} ${kssa}`);
    expect(hex(clean(rafala, { removeJoiners: true }))).toEqual(['9B0', '9CD', '9AF']);
  });

  it('cleans spacing around Bangla punctuation and line breaks without changing letters', () => {
    const line1 = `${KA}${u(0x09bf)}  ${PA}${HASANTA}${RA}${u(0x09cb)}${ZWSP}${u(0x0964)}   `;
    const input = `  ${line1}\r\n\r\n\r\n${KA}${HASANTA}${SSA}${NBSP}${u(0x0981)}\n`;
    expect(clean(input)).toBe(
      `${KA}${u(0x09bf)} ${PA}${HASANTA}${RA}${u(0x09cb)}${u(0x0964)}\n\n${KA}${HASANTA}${SSA} ${u(0x0981)}`,
    );
  });

  it('handles mixed Bangla and English', () => {
    const input = `NextGen  ${KA}${u(0x09cb)}${ZWSP}d 2026 ,  OK${NBSP}${NBSP}${u(0x0964)}`;
    expect(clean(input)).toBe(`NextGen ${KA}${u(0x09cb)}d 2026 , OK ${u(0x0964)}`);
  });
});

describe('emoji and supplementary-plane characters', () => {
  const family = u(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467); // family emoji: man, ZWJ, woman, ZWJ, girl
  const thumbs = u(0x1f44d, 0x1f3fd); // 👍🏽
  const heart = u(0x2764, 0xfe0f); // ❤️ with variation selector
  const math = u(0x1d400); // 𝐀

  it('keeps emoji sequences, skin tones and variation selectors by default', () => {
    const s = `${family}  ${thumbs} ${heart} ${math}`;
    expect(clean(s)).toBe(`${family} ${thumbs} ${heart} ${math}`);
  });

  it('counts code points, not UTF-16 units', () => {
    expect(stats(thumbs).characters).toBe(2);
    expect(stats(math).characters).toBe(1);
    expect(math.length).toBe(2);
  });

  it('only splits a ZWJ emoji when joiner removal is chosen', () => {
    expect(clean(family, { removeJoiners: true })).toBe(u(0x1f468, 0x1f469, 0x1f467));
  });

  it('NFKC maps mathematical letters to plain letters', () => {
    expect(clean(math, { normalization: 'NFKC' })).toBe('A');
  });
});

describe('empty and whitespace-only input', () => {
  it('returns empty output and zero counts', () => {
    const r = cleanText('', DEFAULT_CLEAN_OPTIONS);
    expect(r.text).toBe('');
    expect(r.before).toEqual({ characters: 0, lines: 0 });
  });

  it('cleans whitespace-only input to nothing when trimming', () => {
    expect(clean(` \n\t${NBSP}\r\n `)).toBe('');
    expect(cleanText('   ', NONE).text).toBe('   ');
  });
});

describe('independent options', () => {
  const messy = `  a  b\t\tc${ZWSP}${ZWJ}${u(0x01)}${NBSP}\r\n\r\n\r\nd   \n`;

  it('changes nothing when every operation is off', () => {
    expect(cleanText(messy, NONE).text).toBe(messy);
  });

  it.each([
    ['trimEnds', { trimEnds: true }, `a  b\t\tc${ZWSP}${ZWJ}${u(0x01)}${NBSP}\r\n\r\n\r\nd`],
    [
      'collapseSpaces',
      { collapseSpaces: true },
      ` a b\t\tc${ZWSP}${ZWJ}${u(0x01)}${NBSP}\r\n\r\n\r\nd \n`,
    ],
    [
      'removeZeroWidth',
      { removeZeroWidth: true },
      `  a  b\t\tc${ZWJ}${u(0x01)}${NBSP}\r\n\r\n\r\nd   \n`,
    ],
    ['removeControl', { removeControl: true }, `  a  b\t\tc${ZWSP}${ZWJ}${NBSP}\r\n\r\n\r\nd   \n`],
    [
      'normalizeLineEndings',
      { normalizeLineEndings: true },
      `  a  b\t\tc${ZWSP}${ZWJ}${u(0x01)}${NBSP}\n\n\nd   \n`,
    ],
  ] as const)('%s changes only its own part of the text', (_name, opt, expected) => {
    expect(cleanText(messy, only(opt)).text).toBe(expected);
  });
});

describe('idempotency', () => {
  const samples = [
    `  a  b\t\tc${ZWSP}${ZWJ}${u(0x01)}${NBSP}\r\n\r\n\r\nd   \n`,
    `${BANGLA}\n\n\n  ${RA}${ZWJ}${HASANTA}${YA}  ${u(0x09df)}`,
    `e${ZWSP}${u(0x0301)}  ${u(0xfb01)}${NBSP}${u(0x3000)}x\r\r\r${LS}y`,
    ` \n \n `,
  ];
  const configs: CleanOptions[] = [
    DEFAULT_CLEAN_OPTIONS,
    { ...DEFAULT_CLEAN_OPTIONS, normalization: 'NFC' },
    { ...DEFAULT_CLEAN_OPTIONS, normalization: 'NFKC', removeJoiners: true, removeBidi: true },
    { ...DEFAULT_CLEAN_OPTIONS, keepLineBreaks: false, keepTabs: false },
    { ...DEFAULT_CLEAN_OPTIONS, blankLines: 'remove', trimEnds: false },
    { ...NONE, collapseSpaces: true, blankLines: 'collapse' },
  ];

  it('a second pass with the same options changes nothing', () => {
    for (const s of samples) {
      for (const o of configs) {
        const once = cleanText(s, o).text;
        expect(cleanText(once, o).text, JSON.stringify({ s, o })).toBe(once);
      }
    }
  });
});

describe('report', () => {
  it('counts characters and lines before and after', () => {
    const r = cleanText(`  one  \n\n\n two${ZWSP} `, DEFAULT_CLEAN_OPTIONS);
    expect(r.text).toBe('one\n\n two');
    expect(r.before).toEqual({ characters: 16, lines: 4 });
    expect(r.after).toEqual({ characters: 9, lines: 3 });
  });
});
