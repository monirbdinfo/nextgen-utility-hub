import { describe, expect, it } from 'vitest';
import { checkAllPlatforms, PLATFORMS, type PlatformId } from '../../src/calc/nameRules';

/** Problem codes per platform for a name. */
function codes(name: string): Record<PlatformId, string[]> {
  const r = checkAllPlatforms(name);
  if (!r.ok) throw new Error(r.error);
  return Object.fromEntries(
    r.value.results.map((x) => [x.platform.id, x.problems.map((p) => p.code)]),
  ) as Record<PlatformId, string[]>;
}
const fitting = (name: string): PlatformId[] =>
  (Object.entries(codes(name)) as Array<[PlatformId, string[]]>)
    .filter(([, c]) => !c.length)
    .map(([id]) => id);

describe('checkAllPlatforms', () => {
  it('accepts a plain name everywhere and ignores a leading @', () => {
    expect(fitting('rahim2026')).toEqual(PLATFORMS.map((p) => p.id));
    expect(checkAllPlatforms('@rahim2026')).toMatchObject({
      ok: true,
      value: { name: 'rahim2026' },
    });
  });

  it('refuses empty input, spaces and absurd lengths', () => {
    expect(checkAllPlatforms('  ')).toEqual({ ok: false, error: 'empty' });
    expect(checkAllPlatforms('@')).toEqual({ ok: false, error: 'empty' });
    expect(checkAllPlatforms('two words')).toEqual({ ok: false, error: 'spaces' });
    expect(checkAllPlatforms('a'.repeat(101))).toEqual({ ok: false, error: 'too-long-input' });
  });
});

describe('platform rules', () => {
  it('GitHub: letters, digits and single inner hyphens, up to 39', () => {
    expect(codes('my-name').github).toEqual([]);
    expect(codes('-myname').github).toEqual(['edge']);
    expect(codes('my--name').github).toEqual(['double']);
    expect(codes('my_name').github).toEqual(['chars']);
    expect(codes('a'.repeat(40)).github).toEqual(['too-long']);
  });

  it('X: 5 to 15 letters, digits or _, without "twitter" or "admin"', () => {
    expect(codes('abcd').x).toEqual(['too-short']);
    expect(codes('abcde').x).toEqual([]);
    expect(codes('a'.repeat(16)).x).toEqual(['too-long']);
    expect(codes('the_admin').x).toEqual(['reserved']);
    expect(codes('TwitterFan').x).toEqual(['reserved']);
    expect(codes('my.name').x).toEqual(['chars']);
  });

  it('Instagram: up to 30, periods not at the edges or doubled', () => {
    expect(codes('my.name_1').instagram).toEqual([]);
    expect(codes('_name_').instagram).toEqual([]);
    expect(codes('.name').instagram).toEqual(['edge']);
    expect(codes('my..name').instagram).toEqual(['double']);
    expect(codes('a'.repeat(31)).instagram).toEqual(['too-long']);
  });

  it('TikTok: 2 to 24, not ending with a period', () => {
    expect(codes('a').tiktok).toEqual(['too-short']);
    expect(codes('name.').tiktok).toEqual(['end']);
    expect(codes('.name').tiktok).toEqual([]);
  });

  it('YouTube handles: 3 to 30, any script, separators not at the edges', () => {
    expect(codes('রহিম_ভাই').youtube).toEqual([]);
    expect(codes('রহিম_ভাই').instagram).toEqual(['chars']);
    expect(codes('ab').youtube).toEqual(['too-short']);
    expect(codes('_name').youtube).toEqual(['edge']);
    expect(codes('na·me').youtube).toEqual([]);
    expect(codes('name!').youtube).toEqual(['chars']);
  });

  it('Facebook: at least 5 letters, digits or periods, not ending in .com', () => {
    expect(codes('rahim.uddin').facebook).toEqual([]);
    expect(codes('abcd').facebook).toEqual(['too-short']);
    expect(codes('mybrand.com').facebook).toEqual(['domain-ending']);
    expect(codes('my_name').facebook).toEqual(['chars']);
  });

  it('Telegram: 5 to 32, starts with a letter, not ending with _', () => {
    expect(codes('rahim_bd').telegram).toEqual([]);
    expect(codes('1rahim').telegram).toEqual(['start-letter']);
    expect(codes('rahim_').telegram).toEqual(['end']);
    expect(codes('a'.repeat(33)).telegram).toEqual(['too-long']);
  });

  it('Reddit: 3 to 20 letters, digits, _ or -', () => {
    expect(codes('my-name_1').reddit).toEqual([]);
    expect(codes('ab').reddit).toEqual(['too-short']);
    expect(codes('my.name').reddit).toEqual(['chars']);
  });

  it('reports each disallowed character once', () => {
    const r = checkAllPlatforms('a!b!c#');
    if (!r.ok) throw new Error(r.error);
    expect(r.value.results[0]!.problems).toContainEqual({
      code: 'chars',
      chars: 'alnum-hyphen',
      bad: '! #',
    });
  });

  it('marks which rule sets come from the platform itself', () => {
    expect(PLATFORMS.filter((p) => p.source === 'official').map((p) => p.id)).toEqual([
      'x',
      'youtube',
    ]);
  });
});
