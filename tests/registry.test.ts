import { describe, expect, it } from 'vitest';
import { categories, searchTools, tools, toolsByCategory } from '../src/registry';

describe('registry integrity', () => {
  it('defines exactly five categories', () => {
    expect(categories.map((c) => c.id)).toEqual(['general', 'jobs', 'bangla', 'files', 'network']);
  });

  it('has unique tool ids', () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
  });

  it('references only known categories and has both languages', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const t of tools) {
      expect(ids.has(t.category)).toBe(true);
      expect(t.name.en && t.name.bn && t.description.en && t.description.bn).toBeTruthy();
    }
  });

  it('requires a route for every available tool', () => {
    for (const t of tools) if (t.status === 'available') expect(t.route).toBeTruthy();
  });

  it('does not mark any tool implemented in the foundation milestone', () => {
    expect(tools.every((t) => t.status === 'planned')).toBe(true);
  });

  it('gives every category at least one tool', () => {
    for (const c of categories) expect(toolsByCategory(c.id).length).toBeGreaterThan(0);
  });
});

describe('searchTools', () => {
  it('returns nothing for blank queries', () => {
    expect(searchTools('   ', 'en')).toEqual([]);
  });

  it('matches English names case-insensitively', () => {
    expect(searchTools('PDF', 'en').map((t) => t.id)).toContain('pdf-merge');
  });

  it('matches Bangla text', () => {
    expect(searchTools('পিডিএফ', 'bn').map((t) => t.id)).toContain('pdf-merge');
  });

  it('requires all terms to match', () => {
    expect(searchTools('pdf zzzz', 'en')).toEqual([]);
  });

  it('ranks name matches before keyword-only matches', () => {
    const res = searchTools('image', 'en');
    expect(res[0]?.id).toBe('image-compressor');
  });
});
