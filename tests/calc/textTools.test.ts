import { describe, expect, it } from 'vitest';
import {
  codePointLabel,
  findInvisible,
  fromMorse,
  INVISIBLE_CHARS,
  LOREM_LIMITS,
  loremIpsum,
  MAX_INVISIBLE,
  repeatInvisible,
  rot13,
  smallText,
  toMorse,
  toRunes,
} from '../../src/calc/textTools';

const lorem = (unit: 'paragraphs' | 'sentences' | 'words', n: number, start = true): string => {
  const r = loremIpsum(unit, n, start);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('loremIpsum', () => {
  it('starts with the classic opening, comma and all', () => {
    expect(
      lorem('sentences', 1).startsWith('Lorem ipsum dolor sit amet, consectetur adipiscing elit'),
    ).toBe(true);
    expect(
      lorem('paragraphs', 2).startsWith('Lorem ipsum dolor sit amet, consectetur adipiscing elit'),
    ).toBe(true);
    expect(lorem('words', 5)).toBe('lorem ipsum dolor sit amet');
  });

  it('does not start with the classic opening when asked not to', () => {
    expect(lorem('paragraphs', 1, false).startsWith('Lorem ipsum dolor sit amet')).toBe(false);
  });

  it('returns exactly the requested number of units', () => {
    expect(lorem('paragraphs', 4).split('\n\n')).toHaveLength(4);
    expect(lorem('words', 37).split(' ')).toHaveLength(37);
    expect(lorem('words', 300).split(' ')).toHaveLength(300);
    const sentences = lorem('sentences', 6);
    expect(sentences.match(/\./g)).toHaveLength(6);
    expect(sentences.endsWith('.')).toBe(true);
  });

  it('is deterministic: the same request always gives the same text', () => {
    expect(lorem('paragraphs', 3)).toBe(lorem('paragraphs', 3));
    expect(lorem('paragraphs', 3, false)).toBe(lorem('paragraphs', 3, false));
  });

  it('capitalises sentences and never leaves a trailing comma before the full stop', () => {
    for (const sentence of lorem('paragraphs', 5).split(/(?<=\.)\s+/)) {
      expect(sentence[0]).toBe(sentence[0]!.toUpperCase());
      expect(sentence).not.toMatch(/,\.$/);
    }
  });

  it('refuses counts outside the limits', () => {
    expect(loremIpsum('paragraphs', 0, true)).toEqual({ ok: false, error: 'count-invalid' });
    expect(loremIpsum('words', 1.5, true)).toEqual({ ok: false, error: 'count-invalid' });
    expect(loremIpsum('paragraphs', LOREM_LIMITS.paragraphs + 1, true)).toEqual({
      ok: false,
      error: 'count-range',
    });
    expect(loremIpsum('words', LOREM_LIMITS.words, true).ok).toBe(true);
  });
});

describe('rot13', () => {
  it('matches the standard examples and is its own inverse', () => {
    expect(rot13('Hello, World!')).toBe('Uryyb, Jbeyq!');
    expect(rot13('The Quick Brown Fox')).toBe('Gur Dhvpx Oebja Sbk');
    expect(rot13(rot13('Round trip 123, ক্ষ'))).toBe('Round trip 123, ক্ষ');
  });

  it('leaves digits, punctuation and other scripts alone unless digits are asked for', () => {
    expect(rot13('abc 012 কখগ')).toBe('nop 012 কখগ');
    expect(rot13('abc 012', true)).toBe('nop 567');
    expect(rot13(rot13('0123456789', true), true)).toBe('0123456789');
  });
});

describe('Morse', () => {
  it('encodes known words', () => {
    expect(toMorse('SOS').output).toBe('... --- ...');
    expect(toMorse('Hello World').output).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..');
    expect(toMorse('A1?').output).toBe('.- .---- ..--..');
  });

  it('decodes known words and accepts typographic dots and dashes', () => {
    expect(fromMorse('... --- ...').output).toBe('SOS');
    expect(fromMorse('.... . .-.. .-.. --- / .-- --- .-. .-.. -..').output).toBe('HELLO WORLD');
    expect(fromMorse('·−·· ·−').output).toBe('LA');
    expect(fromMorse('.-   -...').output).toBe('A B');
  });

  it('round-trips every supported character', () => {
    const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?\'!/()&:;=+-_"$@';
    expect(fromMorse(toMorse(all).output).output).toBe(all);
  });

  it('reports what it cannot translate instead of guessing', () => {
    expect(toMorse('a ক b')).toEqual({ output: '.- / -...', unsupported: ['ক'] });
    expect(fromMorse('.- ........ -...')).toEqual({ output: 'AB', unsupported: ['........'] });
  });
});

describe('smallText', () => {
  it('maps to superscript, subscript and small capitals', () => {
    expect(smallText('hello', 'superscript').output).toBe('ʰᵉˡˡᵒ');
    expect(smallText('x2+1', 'superscript').output).toBe('ˣ²⁺¹');
    // Letter case does not matter: these Unicode forms have no capitals.
    expect(smallText('H2O', 'subscript')).toEqual({ output: 'ₕ₂ₒ', unsupported: [] });
    expect(smallText('abc', 'subscript')).toEqual({ output: 'ₐbc', unsupported: ['b', 'c'] });
    expect(smallText('Hello World', 'small-caps').output).toBe('ʜᴇʟʟᴏ ᴡᴏʀʟᴅ');
  });

  it('keeps unsupported characters as typed and lists them once', () => {
    const r = smallText('quiz q', 'superscript');
    expect(r.output).toBe('qᵘⁱᶻ q');
    expect(r.unsupported).toEqual(['q']);
  });

  it('never reports spaces, punctuation or other scripts as unsupported', () => {
    expect(smallText('a, ক!', 'small-caps').unsupported).toEqual([]);
  });
});

describe('toRunes', () => {
  it('transliterates letter by letter with th and ng as single runes', () => {
    expect(toRunes('thing')).toBe('ᚦᛁᛜ');
    expect(toRunes('Odin')).toBe('ᛟᛞᛁᚾ');
    expect(toRunes('queen')).toBe('ᚲᚹᚢᛖᛖᚾ');
  });

  it('keeps punctuation and other scripts, and can use runic word dots', () => {
    expect(toRunes('a b, ক')).toBe('ᚨ ᛒ, ক');
    expect(toRunes('a b', true)).toBe('ᚨ᛫ᛒ');
  });
});

describe('invisible characters', () => {
  it('repeats a known character', () => {
    const r = repeatInvisible(0x200b, 3);
    expect(r).toEqual({ ok: true, value: '​​​' });
    expect(codePointLabel(0x200b)).toBe('U+200B');
    expect(codePointLabel(0xa0)).toBe('U+00A0');
  });

  it('refuses unknown characters and counts outside the limits', () => {
    expect(repeatInvisible(0x41, 1)).toEqual({ ok: false, error: 'unknown' });
    expect(repeatInvisible(0x200b, 0)).toEqual({ ok: false, error: 'count-invalid' });
    expect(repeatInvisible(0x200b, MAX_INVISIBLE + 1)).toEqual({ ok: false, error: 'count-range' });
    expect(repeatInvisible(0x200b, MAX_INVISIBLE).ok).toBe(true);
  });

  it('every listed character really is a single code unit with a name', () => {
    for (const c of INVISIBLE_CHARS) {
      expect(c.code).toBeLessThanOrEqual(0xffff);
      expect(c.name.length).toBeGreaterThan(3);
    }
  });

  it('finds hidden characters in text, grouped, in order of first appearance', () => {
    const text = 'a​b c​​d';
    expect(findInvisible(text)).toEqual([
      { code: 0x200b, name: 'Zero Width Space', count: 3, firstIndex: 1 },
      { code: 0x00a0, name: 'No-Break Space', count: 1, firstIndex: 3 },
    ]);
    expect(findInvisible('plain text')).toEqual([]);
  });
});
