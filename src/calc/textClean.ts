/**
 * Unicode text cleaning. Pure and deterministic: no DOM, no network, no logging.
 *
 * Design rules:
 * - Every transformation is opt-in through `CleanOptions`; nothing else changes the text.
 * - Characters that can carry meaning (ZWJ/ZWNJ used in Bangla and emoji, bidi marks used in
 *   right-to-left text) are only removed when the caller explicitly asks for it.
 * - Combining marks (Bangla vowel signs, hasanta, nukta, chandrabindu …) are never removed.
 * - Source code names code points as numbers, never as raw invisible characters.
 */

export type BlankLineMode = 'keep' | 'collapse' | 'remove';
export type NormalizationForm = 'none' | 'NFC' | 'NFKC';

export interface CleanOptions {
  /** Remove whitespace (including line breaks) at the very start and end of the text. */
  trimEnds: boolean;
  /** Remove spaces and tabs at the end of every line (indentation is not touched). */
  trimLineEnds: boolean;
  /** Replace runs of two or more spaces with one space. */
  collapseSpaces: boolean;
  /** Convert non-breaking and other unusual Unicode spaces to an ordinary space. */
  convertUnusualSpaces: boolean;
  /** keep = leave blank lines; collapse = at most one blank line (paragraphs kept); remove = none. */
  blankLines: BlankLineMode;
  /** Convert CRLF, CR, NEL (U+0085), LS (U+2028) and PS (U+2029) to LF. */
  normalizeLineEndings: boolean;
  /** When false, tabs become spaces. */
  keepTabs: boolean;
  /** When false, all lines are joined into one, separated by a space. */
  keepLineBreaks: boolean;
  /** Remove zero-width space, word joiner, BOM/ZWNBSP and soft hyphen. */
  removeZeroWidth: boolean;
  /** Remove ZWJ and ZWNJ (U+200D, U+200C). Can change Bangla rendering and break emoji. */
  removeJoiners: boolean;
  /** Remove direction marks and bidi embedding/isolate controls. Can affect RTL text. */
  removeBidi: boolean;
  /** Remove C0/C1 control characters except tab and line breaks. */
  removeControl: boolean;
  normalization: NormalizationForm;
}

export const DEFAULT_CLEAN_OPTIONS: Readonly<CleanOptions> = {
  trimEnds: true,
  trimLineEnds: true,
  collapseSpaces: true,
  convertUnusualSpaces: true,
  blankLines: 'collapse',
  normalizeLineEndings: true,
  keepTabs: true,
  keepLineBreaks: true,
  removeZeroWidth: true,
  removeJoiners: false,
  removeBidi: false,
  removeControl: true,
  normalization: 'none',
};

/** Longest input accepted (UTF-16 code units), to keep the browser responsive. */
export const MAX_INPUT_LENGTH = 1_000_000;

// ---------- Character classes ----------
// Code points are written as numbers so the source never contains raw invisible characters.

const chars = (...cps: number[]): string[] => cps.map((cp) => String.fromCodePoint(cp));
/** `\uXXXX` escape for a regex built from a string. */
const esc = (cp: number): string => `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const range = (from: number, to: number): string => `${esc(from)}-${esc(to)}`;

/**
 * Invisible characters with no meaning in normal text: zero-width space (U+200B), word joiner
 * (U+2060), BOM / zero-width no-break space (U+FEFF), soft hyphen (U+00AD). Deliberately
 * excludes U+034F (combining grapheme joiner, a combining mark) and U+180E (used in Mongolian).
 */
export const ZERO_WIDTH: readonly string[] = chars(0x200b, 0x2060, 0xfeff, 0x00ad);
/** ZWNJ (U+200C) and ZWJ (U+200D): meaningful in Bangla conjunct control and emoji sequences. */
export const JOINERS: readonly string[] = chars(0x200c, 0x200d);
/** Direction marks (U+200E, U+200F, U+061C) and bidi controls (U+202A–U+202E, U+2066–U+2069). */
export const BIDI: readonly string[] = chars(
  0x200e,
  0x200f,
  0x061c,
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
);
/** Spaces other than U+0020 that usually come from copy-paste (NBSP, en/em spaces, …). */
export const UNUSUAL_SPACES: readonly string[] = chars(
  0x00a0,
  0x1680,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200a,
  0x202f,
  0x205f,
  0x3000,
);

const classOf = (list: readonly string[]): string =>
  list.map((c) => esc(c.codePointAt(0) ?? 0)).join('');
const RE_ZERO_WIDTH = new RegExp(`[${classOf(ZERO_WIDTH)}]`, 'g');
const RE_JOINERS = new RegExp(`[${classOf(JOINERS)}]`, 'g');
const RE_BIDI = new RegExp(`[${classOf(BIDI)}]`, 'g');
const RE_UNUSUAL_SPACES = new RegExp(`[${classOf(UNUSUAL_SPACES)}]`, 'g');
/** C0 controls except TAB, LF, CR; DEL; C1 controls except NEL (U+0085, a line break). */
const RE_CONTROL = new RegExp(
  `[${range(0x00, 0x08)}${esc(0x0b)}${esc(0x0c)}${range(0x0e, 0x1f)}${range(0x7f, 0x84)}${range(0x86, 0x9f)}]`,
  'g',
);
/** NEL, LINE SEPARATOR, PARAGRAPH SEPARATOR. */
const UNICODE_LINE_SEPS = `${esc(0x85)}${esc(0x2028)}${esc(0x2029)}`;
const RE_CRLF = /\r\n/g;
const RE_LONE_CR = /\r(?!\n)/g;
const RE_UNICODE_LINE_SEP = new RegExp(`[${UNICODE_LINE_SEPS}]`, 'g');
const LINE_BREAK = `(?:\\r\\n|[\\n\\r${UNICODE_LINE_SEPS}])`;
const RE_LINE_BREAK = new RegExp(LINE_BREAK, 'g');
/** Whitespace trimmed at the ends of the whole text. Excludes U+FEFF (handled as zero-width). */
const WS = `[ \\t\\n\\r${esc(0x0b)}${esc(0x0c)}${UNICODE_LINE_SEPS}${classOf(UNUSUAL_SPACES)}]`;

const count = (text: string, re: RegExp): number => text.match(re)?.length ?? 0;

// ---------- Report ----------

export interface TextStats {
  /** Unicode code points (an emoji like 👍 is 1; 👍🏽 is 2). */
  characters: number;
  lines: number;
}

export interface Detected {
  zeroWidth: number;
  joiners: number;
  bidi: number;
  control: number;
  unusualSpaces: number;
  crlf: number;
  cr: number;
  unicodeLineSeparators: number;
  tabs: number;
  /** Input is not in Unicode Normalization Form C. */
  notNFC: boolean;
}

export interface Changed {
  zeroWidthRemoved: number;
  joinersRemoved: number;
  bidiRemoved: number;
  controlRemoved: number;
  unusualSpacesConverted: number;
  lineEndingsConverted: number;
  tabsConverted: number;
  /** The selected normalization form changes the input. */
  normalized: boolean;
}

export interface CleanResult {
  text: string;
  before: TextStats;
  after: TextStats;
  detected: Detected;
  changed: Changed;
}

export function stats(text: string): TextStats {
  return {
    characters: [...text].length,
    lines: text === '' ? 0 : count(text, RE_LINE_BREAK) + 1,
  };
}

/** Find issues without changing anything. */
export function detectIssues(text: string): Detected {
  return {
    zeroWidth: count(text, RE_ZERO_WIDTH),
    joiners: count(text, RE_JOINERS),
    bidi: count(text, RE_BIDI),
    control: count(text, RE_CONTROL),
    unusualSpaces: count(text, RE_UNUSUAL_SPACES),
    crlf: count(text, RE_CRLF),
    cr: count(text, RE_LONE_CR),
    unicodeLineSeparators: count(text, RE_UNICODE_LINE_SEP),
    tabs: count(text, /\t/g),
    notNFC: text !== text.normalize('NFC'),
  };
}

// ---------- Cleaning ----------

function removeAll(text: string, re: RegExp): [string, number] {
  const n = count(text, re);
  return [n ? text.replace(re, '') : text, n];
}

/** Apply the selected operations in a fixed, documented order. */
export function cleanText(
  input: string,
  options: CleanOptions = DEFAULT_CLEAN_OPTIONS,
): CleanResult {
  const o = options;
  const detected = detectIssues(input);
  const changed: Changed = {
    zeroWidthRemoved: 0,
    joinersRemoved: 0,
    bidiRemoved: 0,
    controlRemoved: 0,
    unusualSpacesConverted: 0,
    lineEndingsConverted: 0,
    tabsConverted: 0,
    normalized: false,
  };
  const form = o.normalization === 'none' ? null : o.normalization;
  let t = input;

  // 1. Normalization first, so later steps see canonical characters.
  if (form) t = t.normalize(form);

  // 2. Line endings.
  if (o.normalizeLineEndings) {
    const n = count(t, RE_CRLF) + count(t, RE_LONE_CR) + count(t, RE_UNICODE_LINE_SEP);
    if (n) t = t.replace(RE_LINE_BREAK, '\n');
    changed.lineEndingsConverted = n;
  }

  // 3. Control, invisible and bidi characters (only the selected groups).
  if (o.removeControl) [t, changed.controlRemoved] = removeAll(t, RE_CONTROL);
  if (o.removeZeroWidth) [t, changed.zeroWidthRemoved] = removeAll(t, RE_ZERO_WIDTH);
  if (o.removeJoiners) [t, changed.joinersRemoved] = removeAll(t, RE_JOINERS);
  if (o.removeBidi) [t, changed.bidiRemoved] = removeAll(t, RE_BIDI);

  // 4. Spaces and tabs.
  if (o.convertUnusualSpaces) {
    changed.unusualSpacesConverted = count(t, RE_UNUSUAL_SPACES);
    t = t.replace(RE_UNUSUAL_SPACES, ' ');
  }
  if (!o.keepTabs) {
    changed.tabsConverted = count(t, /\t/g);
    t = t.replace(/\t/g, ' ');
  }

  // 5. Joining lines: each break, with spaces/tabs around it, becomes one space.
  if (!o.keepLineBreaks) {
    t = t.replace(new RegExp(`[ \\t]*(?:${LINE_BREAK}[ \\t]*)+`, 'g'), ' ');
  }

  // 6. Per-line whitespace.
  if (o.trimLineEnds) t = t.replace(new RegExp(`[ \\t]+(?=${LINE_BREAK}|$)`, 'g'), '');
  if (o.collapseSpaces) t = t.replace(/ {2,}/g, ' ');

  // 7. Blank lines. A blank line holds nothing but spaces or tabs.
  if (o.blankLines !== 'keep') {
    const blankRun = new RegExp(`(${LINE_BREAK})(?:[ \\t]*${LINE_BREAK})+`, 'g');
    t = t.replace(blankRun, (_m, first: string) =>
      o.blankLines === 'collapse' ? first + first : first,
    );
    if (o.blankLines === 'remove') t = t.replace(new RegExp(`^(?:[ \\t]*${LINE_BREAK})+`), '');
  }

  // 8. Ends of the whole text.
  if (o.trimEnds) t = t.replace(new RegExp(`^${WS}+|${WS}+$`, 'g'), '');

  // 9. Normalize again: removing a character between a letter and a combining mark can
  //    leave a sequence that the selected form would compose.
  if (form) t = t.normalize(form);
  changed.normalized = form !== null && input.normalize(form) !== input;

  return { text: t, before: stats(input), after: stats(t), detected, changed };
}
