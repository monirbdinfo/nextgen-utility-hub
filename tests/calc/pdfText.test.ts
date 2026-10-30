import { describe, expect, it } from 'vitest';
import { wrapLines } from '../../src/calc/pdfText';

// One unit per character keeps the arithmetic obvious.
const w = (s: string): number => s.length;

describe('wrapLines', () => {
  it('wraps at word boundaries and keeps every word', () => {
    expect(wrapLines('the quick brown fox jumps', 10, w)).toEqual([
      'the quick',
      'brown fox',
      'jumps',
    ]);
  });

  it('keeps blank lines and existing line breaks', () => {
    expect(wrapLines('a\n\nb\r\nc', 10, w)).toEqual(['a', '', 'b', 'c']);
  });

  it('breaks a word longer than a line instead of cutting it off', () => {
    const lines = wrapLines('x'.repeat(25), 10, w);
    expect(lines).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
    expect(lines.join('')).toBe('x'.repeat(25));
  });

  it('lets measurement errors through so the caller can explain them', () => {
    expect(() =>
      wrapLines('ক', 10, () => {
        throw new Error('WinAnsi cannot encode');
      }),
    ).toThrow();
  });
});
