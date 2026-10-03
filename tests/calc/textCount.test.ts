import { describe, expect, it } from 'vitest';
import {
  analyzeText,
  countLines,
  countParagraphs,
  countSentences,
  countWords,
  readingSeconds,
  utf8Length,
} from '../../src/calc/textCount';

describe('analyzeText', () => {
  it('returns zeros for empty text', () => {
    expect(analyzeText('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      approximateCharacters: false,
      words: 0,
      sentences: 0,
      lines: 0,
      paragraphs: 0,
      utf8Bytes: 0,
      readingSeconds: 0,
    });
  });

  it('counts a simple English text', () => {
    const s = analyzeText('Hello world. How are you?\n\nFine, thanks!');
    expect(s).toMatchObject({
      characters: 40,
      charactersNoSpaces: 33,
      words: 7,
      sentences: 3,
      lines: 3,
      paragraphs: 2,
      utf8Bytes: 40,
    });
  });

  it('counts Bangla conjuncts and vowel signs as one visible character each', () => {
    // "ক্ষ" is three code points (ক + ্ + ষ) but one grapheme cluster; "কি" is two code points.
    const s = analyzeText('ক্ষ কি');
    expect(s.characters).toBe(3); // ক্ষ, space, কি
    expect(s.words).toBe(2);
    expect(s.utf8Bytes).toBe(16); // 5 Bangla code points × 3 bytes + 1 space
  });

  it('counts emoji with modifiers and joiners as one character', () => {
    const s = analyzeText('👍🏽 👨‍👩‍👧');
    expect(s.characters).toBe(3);
    expect(s.charactersNoSpaces).toBe(2);
    expect(s.words).toBe(0);
  });

  it('falls back to code points and says so when Intl.Segmenter is missing', () => {
    const s = analyzeText('ক্ষ', null);
    expect(s.characters).toBe(3);
    expect(s.approximateCharacters).toBe(true);
  });

  it('treats every Unicode whitespace as space, including NBSP and tabs', () => {
    expect(analyzeText('a b\tc d').charactersNoSpaces).toBe(4);
  });
});

describe('countWords', () => {
  it('keeps apostrophes inside words and splits on hyphens and punctuation', () => {
    expect(countWords("don't stop—well-known, 3.14")).toBe(6); // don't stop well known 3 14
  });

  it('counts Bangla words with vowel signs and digits', () => {
    expect(countWords('আমার সোনার বাংলা, আমি তোমায় ভালোবাসি। ১৯৭১')).toBe(7);
  });

  it('does not count punctuation or symbols alone', () => {
    expect(countWords('— … ! ? । 😀')).toBe(0);
  });
});

describe('countSentences', () => {
  it('counts English and Bangla terminators', () => {
    expect(countSentences('One. Two! Three?')).toBe(3);
    expect(countSentences('আমি যাব। তুমি আসবে? হ্যাঁ!')).toBe(3);
  });

  it('counts a final sentence without a terminator', () => {
    expect(countSentences('First. Second without a stop')).toBe(2);
  });

  it('does not split decimals or ellipses inside a sentence', () => {
    expect(countSentences('Pi is 3.14 today')).toBe(1);
    expect(countSentences('Wait... what?')).toBe(2);
    expect(countSentences('...')).toBe(0);
  });

  it('handles closing quotes after the terminator', () => {
    expect(countSentences('He said "Go." Then he left.')).toBe(2);
  });

  it('documents that abbreviations count as sentence ends', () => {
    expect(countSentences('Dr. Rahman is here.')).toBe(2);
  });
});

describe('countLines and countParagraphs', () => {
  it('counts LF, CRLF and CR line breaks', () => {
    expect(countLines('a')).toBe(1);
    expect(countLines('a\nb\r\nc\rd')).toBe(4);
    expect(countLines('a\n')).toBe(2);
    expect(countLines('\n')).toBe(2);
  });

  it('counts paragraphs separated by blank (or whitespace-only) lines', () => {
    expect(countParagraphs('')).toBe(0);
    expect(countParagraphs('   \n\n  ')).toBe(0);
    expect(countParagraphs('a\nb')).toBe(1);
    expect(countParagraphs('a\n\nb\n \t \nc')).toBe(3);
    expect(countParagraphs('\r\n\r\na\r\n\r\n\r\nb\r\n')).toBe(2);
  });
});

describe('utf8Length', () => {
  it('matches TextEncoder for ASCII, Bangla, emoji and lone surrogates', () => {
    for (const s of ['abc', 'বাংলা', '😀', 'é', 'a\ud800b', '\udc00', 'x'.repeat(1000)]) {
      expect(utf8Length(s)).toBe(new TextEncoder().encode(s).length);
    }
  });
});

describe('readingSeconds', () => {
  it('uses 200 words per minute, with at least 1 second for any text', () => {
    expect(readingSeconds(0)).toBe(0);
    expect(readingSeconds(1)).toBe(1);
    expect(readingSeconds(200)).toBe(60);
    expect(readingSeconds(450)).toBe(135);
  });
});

describe('large input', () => {
  it('handles the 1,000,000-character limit in linear time', () => {
    const text = 'word. '.repeat(166_666);
    const s = analyzeText(text);
    expect(s.words).toBe(166_666);
    expect(s.sentences).toBe(166_666);
    expect(s.characters).toBe(text.length);
  });
});
