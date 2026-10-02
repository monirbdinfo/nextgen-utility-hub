import { describe, expect, it } from 'vitest';
import { detectLang, formatNumber, messages, t } from '../src/i18n';

describe('i18n', () => {
  it('has identical keys in both languages', () => {
    expect(Object.keys(messages.bn).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it('has no empty strings', () => {
    for (const lang of ['en', 'bn'] as const) {
      for (const value of Object.values(messages[lang])) expect(value.trim()).not.toBe('');
    }
  });

  it('interpolates variables', () => {
    expect(t('en', 'toolCount', { n: 3 })).toBe('3 planned tools');
  });

  it('renders numbers with Bangla digits in Bangla', () => {
    expect(formatNumber('bn', 2026)).toBe('২০২৬');
    expect(t('bn', 'toolCount', { n: 12 })).toBe('১২টি পরিকল্পিত টুল');
  });

  it('prefers a stored language, then the browser language', () => {
    expect(detectLang('bn', 'en-US')).toBe('bn');
    expect(detectLang(null, 'bn-BD')).toBe('bn');
    expect(detectLang('xx', 'fr')).toBe('en');
  });
});
