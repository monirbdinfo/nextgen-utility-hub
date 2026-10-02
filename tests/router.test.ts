import { describe, expect, it } from 'vitest';
import { parseHash, toHash } from '../src/router/router';

describe('router', () => {
  it('treats empty hashes and #/ as home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
  });

  it('parses valid category routes', () => {
    expect(parseHash('#/category/files')).toEqual({ name: 'category', id: 'files' });
    expect(parseHash('#/category/jobs/')).toEqual({ name: 'category', id: 'jobs' });
  });

  it('falls back to home for unknown routes', () => {
    expect(parseHash('#/category/nope')).toEqual({ name: 'home' });
    expect(parseHash('#/tool/pdf-merge')).toEqual({ name: 'home' }); // planned tool
    expect(parseHash('#/tool/does-not-exist')).toEqual({ name: 'home' });
    expect(parseHash('#/tool/age-calculator/extra')).toEqual({ name: 'home' });
    expect(parseHash('#/category/files/extra')).toEqual({ name: 'home' });
  });

  it('parses routes for available tools', () => {
    expect(parseHash('#/tool/age-calculator')).toEqual({ name: 'tool', id: 'age-calculator' });
    expect(toHash({ name: 'tool', id: 'taka-in-words' })).toBe('#/tool/taka-in-words');
  });

  it('ignores plain in-page anchors', () => {
    expect(parseHash('#main')).toBeNull();
    expect(parseHash('#about')).toBeNull();
  });

  it('round-trips routes', () => {
    expect(toHash({ name: 'home' })).toBe('#/');
    expect(parseHash(toHash({ name: 'category', id: 'network' }))).toEqual({
      name: 'category',
      id: 'network',
    });
  });
});
