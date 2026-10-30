import { describe, expect, it } from 'vitest';
import {
  categories,
  searchTools,
  sortByAvailability,
  tools,
  toolsByCategory,
  type Tool,
} from '../src/registry';
import { parseHash } from '../src/router/router';
import { toolViews } from '../src/ui/tools';

describe('registry integrity', () => {
  it('defines the utility categories', () => {
    expect(categories.map((c) => c.id)).toEqual([
      'general',
      'jobs',
      'bangla',
      'files',
      'network',
      'productivity',
    ]);
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

  it('marks exactly the implemented tools as available', () => {
    expect(tools.filter((t) => t.status === 'available').map((t) => t.id)).toEqual([
      'age-calculator',
      'date-difference',
      'emi-calculator',
      'bandwidth-calculator',
      'unit-converter',
      'text-counter',
      'cv-templates',
      'cover-letter-templates',
      'cv-checklist',
      'digit-converter',
      'number-to-words-bn',
      'taka-in-words',
      'date-formatter',
      'unicode-cleaner',
      'image-compressor',
      'image-converter',
      'image-resizer',
      'image-cropper',
      'job-photo-resizer',
      'pdf-create',
      'pdf-merge',
      'pdf-tools',
      'pdf-compress',
      'subnet-calculator',
      'cidr-calculator',
      'my-ip-info',
      'dns-lookup',
      'latency-test',
      'email-header-analyzer',
      'ip-to-decimal',
      'ip-to-hostname',
      'ipv4-to-ipv6',
      'local-ipv6-generator',
      'ipv6-cidr-range',
      'ipv6-range-cidr',
      'ipv6-compression',
      'ipv6-expand',
      'ip-subnet-calculator',
      'ipv6-to-ipv4',
      'domain-to-ip',
      'lorem-ipsum',
      'time-card-calculator',
      'credit-card-checker',
      'notepad-online',
      'small-text-generator',
      'rot13-decoder',
      'morse-translator',
      'runic-translator',
      'invisible-character',
      'qr-code-generator',
      'qr-scanner',
      'wifi-qr-scanner',
      'reverse-image-search',
      'internet-speed-test',
      'image-to-text',
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
    // A synthetic list, so the test does not depend on which tools are still planned.
    const base = tools[0]!;
    const make = (id: string, status: Tool['status']): Tool => ({ ...base, id, status });
    const mixed = [
      make('p1', 'planned'),
      make('a1', 'available'),
      make('p2', 'planned'),
      make('a2', 'available'),
      make('a3', 'available'),
    ];
    // Available first; within each status the original order is kept.
    expect(sortByAvailability(mixed).map((t) => t.id)).toEqual(['a1', 'a2', 'a3', 'p1', 'p2']);
    expect(mixed.map((t) => t.id)).toEqual(['p1', 'a1', 'p2', 'a2', 'a3']); // input untouched
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
