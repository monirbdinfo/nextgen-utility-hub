import { describe, expect, it } from 'vitest';
import {
  categories,
  searchTools,
  sortByAvailability,
  tools,
  toolsByCategory,
} from '../src/registry';
import { parseHash } from '../src/router/router';
import { toolViews } from '../src/ui/tools';

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

  it('gives every available tool a working route and view', () => {
    for (const t of tools.filter((x) => x.status === 'available')) {
      expect(t.route, t.id).toBe(`#/tool/${t.id}`);
      expect(parseHash(t.route!), t.id).toEqual({ name: 'tool', id: t.id });
      expect(toolViews[t.id], `view for ${t.id}`).toBeTypeOf('function');
    }
  });

  it('never routes or renders planned tools', () => {
    for (const t of tools.filter((x) => x.status !== 'available')) {
      expect(t.route, t.id).toBeUndefined();
      expect(parseHash(`#/tool/${t.id}`), t.id).toEqual({ name: 'home' });
      expect(toolViews[t.id], t.id).toBeUndefined();
    }
  });

  it('marks exactly the Milestone 3–6 tools as available', () => {
    expect(tools.filter((t) => t.status === 'available').map((t) => t.id)).toEqual([
      'age-calculator',
      'date-difference',
      'emi-calculator',
      'digit-converter',
      'number-to-words-bn',
      'taka-in-words',
      'date-formatter',
      'unicode-cleaner',
      'image-compressor',
      'image-resizer',
      'image-cropper',
    ]);
  });

  it('keeps every tool id from Milestone 1', () => {
    const ids = new Set(tools.map((t) => t.id));
    for (const id of [
      'unit-converter',
      'text-counter',
      'job-photo-resizer',
      'cv-checklist',
      'number-to-words-bn',
      'digit-converter',
      'image-compressor',
      'pdf-merge',
      'my-ip-info',
      'dns-lookup',
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('has Bangla and English search keywords for every tool', () => {
    for (const t of tools) {
      expect(
        t.keywords.some((k) => /[\u0980-\u09FF]/.test(k)),
        `${t.id} bn keyword`,
      ).toBe(true);
      expect(
        t.keywords.some((k) => /[a-z]/i.test(k)),
        `${t.id} en keyword`,
      ).toBe(true);
    }
  });

  it('sorts available tools first without reordering otherwise', () => {
    const sorted = sortByAvailability(toolsByCategory('general')).map((t) => t.status);
    expect(sorted.indexOf('planned')).toBeGreaterThan(sorted.lastIndexOf('available'));
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
