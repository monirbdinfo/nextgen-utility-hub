import { fail, ok, type Result } from './result';

/**
 * Small, deterministic text utilities (Lorem Ipsum, ROT13, Morse, small-text styles, runic
 * transliteration, invisible characters). Pure functions: no DOM, no network, no randomness.
 */

// ---------- Lorem Ipsum ----------

const CLASSIC =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
  'ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat ' +
  'duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur ' +
  'excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum';

const WORDS = CLASSIC.split(' ');

export type LoremUnit = 'paragraphs' | 'sentences' | 'words';
export const LOREM_LIMITS: Record<LoremUnit, number> = {
  paragraphs: 50,
  sentences: 200,
  words: 5000,
};
export type LoremError = 'count-invalid' | 'count-range';

/** A tiny fixed-seed generator so the same request always gives the same text. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Placeholder text. With `startWithLorem` the output begins "Lorem ipsum dolor sit amet,
 * consectetur adipiscing elit"; the rest is drawn from the classic word list with a fixed seed.
 */
export function loremIpsum(
  unit: LoremUnit,
  count: number,
  startWithLorem: boolean,
): Result<string, LoremError> {
  if (!Number.isInteger(count) || count < 1) return fail('count-invalid');
  if (count > LOREM_LIMITS[unit]) return fail('count-range');
  const rand = mulberry32(2026);
  const pick = (): string => WORDS[Math.floor(rand() * WORDS.length)]!;
  const sentence = (first: boolean): string => {
    const n = 8 + Math.floor(rand() * 9);
    const lead = first && startWithLorem;
    const words: string[] = lead ? WORDS.slice(0, 8) : [];
    while (words.length < n) words.push(pick());
    // A comma keeps longer sentences natural; the classic opening has its comma after "amet".
    if (lead) words[4] += ',';
    else if (words.length > 10) words[4 + Math.floor(rand() * 3)] += ',';
    return capitalise(words.join(' ')) + '.';
  };
  if (unit === 'words') {
    const words: string[] = startWithLorem ? WORDS.slice(0, Math.min(count, WORDS.length)) : [];
    while (words.length < count) words.push(pick());
    return ok(words.slice(0, count).join(' '));
  }
  if (unit === 'sentences') {
    return ok(Array.from({ length: count }, (_, i) => sentence(i === 0)).join(' '));
  }
  const paragraphs = Array.from({ length: count }, (_, p) => {
    const n = 4 + Math.floor(rand() * 4);
    return Array.from({ length: n }, (_, i) => sentence(p === 0 && i === 0)).join(' ');
  });
  return ok(paragraphs.join('\n\n'));
}

// ---------- ROT13 / ROT5 ----------

/** ROT13 on A–Z and a–z; with `digits` also ROT5 on 0–9. Everything else is unchanged. */
export function rot13(text: string, digits = false): string {
  return text.replace(/[A-Za-z0-9]/g, (c) => {
    if (/[0-9]/.test(c)) return digits ? String((Number(c) + 5) % 10) : c;
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// ---------- Morse (ITU-R M.1677-1) ----------

export const MORSE: Readonly<Record<string, string>> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
};

const MORSE_DECODE: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MORSE).map(([ch, code]) => [code, ch]),
);

export interface MorseResult {
  output: string;
  /** Characters (encode) or codes (decode) that have no Morse equivalent, once each. */
  unsupported: string[];
}

/** Text → Morse: letters separated by a space, words by ` / `. Letters are upper-cased. */
export function toMorse(text: string): MorseResult {
  const unsupported = new Set<string>();
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      [...word.toUpperCase()]
        .map((ch) => {
          const code = MORSE[ch];
          if (code) return code;
          unsupported.add(ch);
          return '';
        })
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean);
  return { output: words.join(' / '), unsupported: [...unsupported] };
}

/** Morse → text. Accepts `.` and `-` (also · and −/–), words separated by `/` or three+ spaces. */
export function fromMorse(code: string): MorseResult {
  const unsupported = new Set<string>();
  const normal = code.replace(/[·•]/g, '.').replace(/[−–—]/g, '-').trim();
  const words = normal.split(/\s*\/\s*|\s{3,}/).filter((w) => w.trim());
  const output = words
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((token) => {
          const ch = MORSE_DECODE[token];
          if (ch) return ch;
          unsupported.add(token);
          return '';
        })
        .join(''),
    )
    .join(' ');
  return { output, unsupported: [...unsupported] };
}

// ---------- Small text styles ----------

export type SmallStyle = 'superscript' | 'subscript' | 'small-caps';

const SUPERSCRIPT: Record<string, string> = {
  ...Object.fromEntries([...'0123456789'].map((d, i) => [d, '⁰¹²³⁴⁵⁶⁷⁸⁹'[i]!])),
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
};

const SUBSCRIPT: Record<string, string> = {
  ...Object.fromEntries([...'0123456789'].map((d, i) => [d, '₀₁₂₃₄₅₆₇₈₉'[i]!])),
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
};

const SMALL_CAPS: Record<string, string> = {
  a: 'ᴀ',
  b: 'ʙ',
  c: 'ᴄ',
  d: 'ᴅ',
  e: 'ᴇ',
  f: 'ꜰ',
  g: 'ɢ',
  h: 'ʜ',
  i: 'ɪ',
  j: 'ᴊ',
  k: 'ᴋ',
  l: 'ʟ',
  m: 'ᴍ',
  n: 'ɴ',
  o: 'ᴏ',
  p: 'ᴘ',
  q: 'ǫ',
  r: 'ʀ',
  s: 'ꜱ',
  t: 'ᴛ',
  u: 'ᴜ',
  v: 'ᴠ',
  w: 'ᴡ',
  x: 'x',
  y: 'ʏ',
  z: 'ᴢ',
};

export interface SmallTextResult {
  output: string;
  /** Letters, digits or symbols that have no character in this style (kept as typed). */
  unsupported: string[];
}

/**
 * Map characters to Unicode "small" forms. Characters with no equivalent are kept as typed and
 * listed in `unsupported` (spaces, line breaks and punctuation are never reported).
 */
export function smallText(text: string, style: SmallStyle): SmallTextResult {
  const map =
    style === 'superscript' ? SUPERSCRIPT : style === 'subscript' ? SUBSCRIPT : SMALL_CAPS;
  const unsupported = new Set<string>();
  const output = [...text]
    .map((ch) => {
      const key = ch.toLowerCase();
      const out = map[key];
      if (out) return out;
      if (/[A-Za-z0-9]/.test(ch)) unsupported.add(ch);
      return ch;
    })
    .join('');
  return { output, unsupported: [...unsupported] };
}

// ---------- Runic transliteration (Elder Futhark, decorative) ----------

const RUNES: Record<string, string> = {
  a: 'ᚨ',
  b: 'ᛒ',
  c: 'ᚲ',
  d: 'ᛞ',
  e: 'ᛖ',
  f: 'ᚠ',
  g: 'ᚷ',
  h: 'ᚺ',
  i: 'ᛁ',
  j: 'ᛃ',
  k: 'ᚲ',
  l: 'ᛚ',
  m: 'ᛗ',
  n: 'ᚾ',
  o: 'ᛟ',
  p: 'ᛈ',
  q: 'ᚲᚹ',
  r: 'ᚱ',
  s: 'ᛊ',
  t: 'ᛏ',
  u: 'ᚢ',
  v: 'ᚹ',
  w: 'ᚹ',
  x: 'ᚲᛊ',
  y: 'ᛃ',
  z: 'ᛉ',
};

/** The mapping used, for display: two-letter combinations first. */
export const RUNIC_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['th', 'ᚦ'],
  ['ng', 'ᛜ'],
  ...Object.entries(RUNES),
];

/**
 * Decorative letter-by-letter transliteration into Elder Futhark runes ("th" and "ng" use their
 * own runes). It is not a translation: the runes did not map one-to-one onto modern English.
 */
export function toRunes(text: string, wordDots = false): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2).toLowerCase();
    if (pair === 'th') {
      out += 'ᚦ';
      i++;
    } else if (pair === 'ng') {
      out += 'ᛜ';
      i++;
    } else {
      const ch = text[i]!;
      out += RUNES[ch.toLowerCase()] ?? (wordDots && ch === ' ' ? '᛫' : ch);
    }
  }
  return out;
}

// ---------- Invisible characters ----------

export interface InvisibleChar {
  code: number;
  name: string;
}

/** Characters that take no (or unusual) space on screen, with their Unicode names. */
export const INVISIBLE_CHARS: readonly InvisibleChar[] = [
  { code: 0x200b, name: 'Zero Width Space' },
  { code: 0x200c, name: 'Zero Width Non-Joiner' },
  { code: 0x200d, name: 'Zero Width Joiner' },
  { code: 0x2060, name: 'Word Joiner' },
  { code: 0xfeff, name: 'Zero Width No-Break Space (BOM)' },
  { code: 0x00a0, name: 'No-Break Space' },
  { code: 0x202f, name: 'Narrow No-Break Space' },
  { code: 0x00ad, name: 'Soft Hyphen' },
  { code: 0x200e, name: 'Left-to-Right Mark' },
  { code: 0x200f, name: 'Right-to-Left Mark' },
  { code: 0x3164, name: 'Hangul Filler' },
  { code: 0x2800, name: 'Braille Pattern Blank' },
];

export const MAX_INVISIBLE = 1000;

export const codePointLabel = (code: number): string =>
  `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

export function repeatInvisible(
  code: number,
  count: number,
): Result<string, 'count-invalid' | 'count-range' | 'unknown'> {
  if (!INVISIBLE_CHARS.some((c) => c.code === code)) return fail('unknown');
  if (!Number.isInteger(count) || count < 1) return fail('count-invalid');
  if (count > MAX_INVISIBLE) return fail('count-range');
  return ok(String.fromCodePoint(code).repeat(count));
}

export interface InvisibleFound {
  code: number;
  name: string;
  count: number;
  /** Zero-based UTF-16 index of the first occurrence. */
  firstIndex: number;
}

/** Find the known invisible characters in a text (grouped, in order of first appearance). */
export function findInvisible(text: string): InvisibleFound[] {
  const found = new Map<number, InvisibleFound>();
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const known = INVISIBLE_CHARS.find((c) => c.code === code);
    if (!known) continue;
    const entry = found.get(code);
    if (entry) entry.count++;
    else found.set(code, { code, name: known.name, count: 1, firstIndex: i });
  }
  return [...found.values()].sort((a, b) => a.firstIndex - b.firstIndex);
}
