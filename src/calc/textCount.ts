/**
 * Pure text statistics for the Word & Character Counter. No DOM or network access.
 *
 * Counting rules are deliberately simple and the same in every browser (regular
 * expressions, not locale dictionaries), so results are predictable and testable:
 *
 * - Characters: user-perceived characters (grapheme clusters) via `Intl.Segmenter` where
 *   available, so a Bangla conjunct such as "ক্ষ" or an emoji with a skin tone counts once
 *   per visible unit. Without `Intl.Segmenter` (older Firefox) code points are counted and
 *   the result is flagged as approximate.
 * - Words: runs of letters, combining marks and digits, optionally joined by an apostrophe
 *   ("don't") — this keeps Bangla words with vowel signs whole. Hyphens split words. Scripts
 *   written without spaces (Chinese, Japanese, Thai) are not split into words.
 * - Sentences: text ending in . ! ? … । or ॥ (followed by a space, a quote or the end), plus a
 *   final unterminated sentence. Abbreviations such as "Dr." are counted as sentence ends.
 * - Lines: line breaks (LF, CRLF, CR) plus one; empty text has 0 lines.
 * - Paragraphs: blocks of non-blank lines separated by at least one blank line.
 */

/** The same input limit as the Unicode Text Cleaner (UTF-16 code units). */
export const MAX_TEXT_LENGTH = 1_000_000;

/** Words per minute used for the reading-time estimate (a common silent-reading average). */
export const READING_WPM = 200;

export interface TextStats {
  characters: number;
  /** Characters excluding all Unicode whitespace (spaces, tabs, line breaks, NBSP, …). */
  charactersNoSpaces: number;
  /** `true` when characters were counted as code points (no `Intl.Segmenter`). */
  approximateCharacters: boolean;
  words: number;
  sentences: number;
  lines: number;
  paragraphs: number;
  /** Size of the text encoded as UTF-8, in bytes. */
  utf8Bytes: number;
  /** Estimated silent reading time in whole seconds (0 for no words). */
  readingSeconds: number;
}

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
const SPACE = /\s/u;
// A sentence ends at a run of terminators, optionally followed by closing quotes or brackets,
// then whitespace or the end of the text.
const SENTENCE_END = /[.!?…।॥]+["'”’)\]]*(?=\s|$)/gu;

type Segmenter = { segment(input: string): Iterable<unknown> };
type SegmenterCtor = new (locale?: string, opts?: { granularity: 'grapheme' }) => Segmenter;

/** `Intl.Segmenter` if this engine has it (Firefox before 125 does not). */
function graphemeSegmenter(): Segmenter | null {
  const Ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return Ctor ? new Ctor(undefined, { granularity: 'grapheme' }) : null;
}

function countIterable(items: Iterable<unknown>): number {
  let n = 0;
  const it = items[Symbol.iterator]();
  while (!it.next().done) n++;
  return n;
}

export function countWords(text: string): number {
  return countIterable(text.matchAll(WORD));
}

export function countSentences(text: string): number {
  let count = 0;
  let last = 0;
  for (const m of text.matchAll(SENTENCE_END)) {
    // Only count a terminator that ends some words ("..." on its own is not a sentence).
    if (countWords(text.slice(last, m.index)) > 0) count++;
    last = (m.index ?? 0) + m[0].length;
  }
  if (countWords(text.slice(last)) > 0) count++;
  return count;
}

export function countLines(text: string): number {
  if (text === '') return 0;
  return text.split(/\r\n|\r|\n/).length;
}

export function countParagraphs(text: string): number {
  let count = 0;
  let inParagraph = false;
  for (const line of text.split(/\r\n|\r|\n/)) {
    const blank = line.trim() === '';
    if (!blank && !inParagraph) count++;
    inParagraph = !blank;
  }
  return count;
}

export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4; // a surrogate pair is one 4-byte code point
        i++;
      } else bytes += 3; // lone surrogate: encoded as U+FFFD (3 bytes)
    } else bytes += 3;
  }
  return bytes;
}

export function readingSeconds(words: number, wpm: number = READING_WPM): number {
  return words > 0 ? Math.max(1, Math.round((words / wpm) * 60)) : 0;
}

export function analyzeText(
  text: string,
  segmenter: Segmenter | null = graphemeSegmenter(),
): TextStats {
  let characters = 0;
  let charactersNoSpaces = 0;
  const units: Iterable<unknown> = segmenter ? segmenter.segment(text) : text;
  for (const u of units) {
    characters++;
    const s = typeof u === 'string' ? u : (u as { segment: string }).segment;
    if (!SPACE.test(s)) charactersNoSpaces++;
  }
  const words = countWords(text);
  return {
    characters,
    charactersNoSpaces,
    approximateCharacters: !segmenter,
    words,
    sentences: countSentences(text),
    lines: countLines(text),
    paragraphs: countParagraphs(text),
    utf8Bytes: utf8Length(text),
    readingSeconds: readingSeconds(words),
  };
}
