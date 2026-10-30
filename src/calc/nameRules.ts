import { fail, ok, type Result } from './result';

/**
 * Username format rules for popular platforms. These describe only what each platform's sign-up
 * form accepts as a *format*; whether a name is free, reserved or allowed by policy is decided
 * by the platform itself, which this offline check never contacts.
 *
 * `source` records where a rule set comes from: `official` when the platform's own help pages
 * state it, `reported` when it is widely documented by others but not by the platform.
 */

export type PlatformId =
  'github' | 'x' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'telegram' | 'reddit';

export type CharSet =
  | 'alnum-hyphen'
  | 'alnum-underscore'
  | 'alnum-period-underscore'
  | 'alnum-period'
  | 'alnum-underscore-hyphen'
  | 'youtube';

interface RuleSet {
  min: number;
  /** Maximum length; null when the platform documents none. */
  max: number | null;
  chars: CharSet;
  /** Characters a name may not start or end with. */
  noEdge?: string;
  /** Characters a name may not end with (when only the end is restricted). */
  noEnd?: string;
  /** Characters that may not appear twice in a row. */
  noDouble?: string;
  startLetter?: boolean;
  /** Words a name may not contain (case-insensitive). */
  reserved?: string[];
  /** Names ending in a domain extension such as .com are refused. */
  noDomainEnding?: boolean;
}

export interface Platform {
  id: PlatformId;
  name: string;
  source: 'official' | 'reported';
  rules: RuleSet;
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'github',
    name: 'GitHub',
    source: 'reported',
    rules: { min: 1, max: 39, chars: 'alnum-hyphen', noEdge: '-', noDouble: '-' },
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    source: 'official',
    rules: { min: 5, max: 15, chars: 'alnum-underscore', reserved: ['twitter', 'admin'] },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    source: 'reported',
    rules: { min: 1, max: 30, chars: 'alnum-period-underscore', noEdge: '.', noDouble: '.' },
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    source: 'reported',
    rules: { min: 2, max: 24, chars: 'alnum-period-underscore', noEnd: '.' },
  },
  {
    id: 'youtube',
    name: 'YouTube handle',
    source: 'official',
    rules: { min: 3, max: 30, chars: 'youtube', noEdge: '._-·' },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    source: 'reported',
    rules: { min: 5, max: null, chars: 'alnum-period', noDomainEnding: true },
  },
  {
    id: 'telegram',
    name: 'Telegram',
    source: 'reported',
    rules: { min: 5, max: 32, chars: 'alnum-underscore', startLetter: true, noEnd: '_' },
  },
  {
    id: 'reddit',
    name: 'Reddit',
    source: 'reported',
    rules: { min: 3, max: 20, chars: 'alnum-underscore-hyphen' },
  },
];

const CHAR_TESTS: Record<CharSet, RegExp> = {
  'alnum-hyphen': /^[A-Za-z0-9-]$/,
  'alnum-underscore': /^[A-Za-z0-9_]$/,
  'alnum-period-underscore': /^[A-Za-z0-9._]$/,
  'alnum-period': /^[A-Za-z0-9.]$/,
  'alnum-underscore-hyphen': /^[A-Za-z0-9_-]$/,
  // Letters and digits of any script, plus the separators YouTube lists.
  youtube: /^[\p{L}\p{M}\p{N}._\-·]$/u,
};

export type NameProblem =
  | { code: 'too-short'; min: number }
  | { code: 'too-long'; max: number }
  | { code: 'chars'; chars: CharSet; bad: string }
  | { code: 'edge'; chars: string }
  | { code: 'end'; chars: string }
  | { code: 'double'; chars: string }
  | { code: 'start-letter' }
  | { code: 'reserved'; word: string }
  | { code: 'domain-ending' };

/** Format problems of a name on one platform; an empty list means the format fits. */
export function checkName(name: string, rules: RuleSet): NameProblem[] {
  const chars = [...name];
  const out: NameProblem[] = [];
  if (chars.length < rules.min) out.push({ code: 'too-short', min: rules.min });
  if (rules.max !== null && chars.length > rules.max)
    out.push({ code: 'too-long', max: rules.max });
  const test = CHAR_TESTS[rules.chars];
  const bad = [...new Set(chars.filter((c) => !test.test(c)))];
  if (bad.length) out.push({ code: 'chars', chars: rules.chars, bad: bad.join(' ') });
  const first = chars[0] ?? '';
  const last = chars[chars.length - 1] ?? '';
  if (rules.noEdge && chars.length && (rules.noEdge.includes(first) || rules.noEdge.includes(last)))
    out.push({ code: 'edge', chars: rules.noEdge });
  if (rules.noEnd && chars.length && rules.noEnd.includes(last))
    out.push({ code: 'end', chars: rules.noEnd });
  if (rules.noDouble && [...rules.noDouble].some((c) => name.includes(c + c)))
    out.push({ code: 'double', chars: rules.noDouble });
  if (rules.startLetter && chars.length && !/^[A-Za-z]$/.test(first))
    out.push({ code: 'start-letter' });
  for (const word of rules.reserved ?? [])
    if (name.toLowerCase().includes(word)) out.push({ code: 'reserved', word });
  if (rules.noDomainEnding && /\.(com|net|org|info|biz|bd|co|io)$/i.test(name))
    out.push({ code: 'domain-ending' });
  return out;
}

export interface PlatformResult {
  platform: Platform;
  problems: NameProblem[];
}

export type NameInputError = 'empty' | 'spaces' | 'too-long-input';

/** Longest input accepted; no platform here allows anywhere near this many characters. */
export const MAX_INPUT = 100;

/** Check a name against every platform. A leading @ is ignored, as people often type it. */
export function checkAllPlatforms(
  text: string,
): Result<{ name: string; results: PlatformResult[] }, NameInputError> {
  const name = text.trim().replace(/^@/, '');
  if (!name) return fail('empty');
  if (/\s/u.test(name)) return fail('spaces');
  if ([...name].length > MAX_INPUT) return fail('too-long-input');
  return ok({
    name,
    results: PLATFORMS.map((platform) => ({
      platform,
      problems: checkName(name, platform.rules),
    })),
  });
}
