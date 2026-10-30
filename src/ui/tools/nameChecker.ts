import { toBanglaDigits } from '../../calc/digits';
import {
  checkAllPlatforms,
  MAX_INPUT,
  PLATFORMS,
  type CharSet,
  type NameProblem,
} from '../../calc/nameRules';
import { defineStrings } from '../../i18n';
import { toolForm } from './toolForm';
import type { ToolView } from './kit';

const S = defineStrings({
  en: {
    name: 'Username to check',
    nameHint: 'Without spaces. A leading @ is ignored.',
    submit: 'Check format',
    summary: 'Fits the format on',
    summaryValue: '{n} of {total} platforms',
    fits: 'Fits the format',
    notFit: 'Does not fit: {reasons}',
    reported: '{name} *',
    p_tooShort: 'at least {min} characters',
    p_tooLong: 'at most {max} characters',
    p_chars: 'not allowed: {bad} (only {allowed})',
    p_edge: 'cannot start or end with {chars}',
    p_end: 'cannot end with {chars}',
    p_double: 'no {chars} twice in a row',
    p_startLetter: 'must start with a letter',
    p_reserved: 'cannot contain “{word}”',
    p_domain: 'cannot end in a domain extension such as .com',
    c_alnumHyphen: 'letters, digits and -',
    c_alnumUnderscore: 'letters, digits and _',
    c_alnumPeriodUnderscore: 'letters, digits, . and _',
    c_alnumPeriod: 'letters, digits and .',
    c_alnumUnderscoreHyphen: 'letters, digits, _ and -',
    c_youtube: 'letters and digits of any language, and . _ - ·',
    e_empty: 'Enter a username.',
    e_spaces: 'Usernames cannot contain spaces.',
    'e_too-long-input': 'That is longer than any platform here allows (at most {max} characters).',
    notesTitle: 'About this check',
    n1: 'This checks only whether the name has an allowed format. It does not check whether the name is free, and it is not an official verification: only the platform can say whether you can register a name.',
    n2: 'Nothing is sent anywhere. The check runs in your browser with no request to any platform.',
    n3: 'Platforms also refuse names that are taken, reserved, offensive or impersonating someone, and they change their rules. A name that fits here can still be refused.',
    n4: 'Rules marked * are widely reported but not published in the platform’s own help pages; the others (X and YouTube handles) follow the platform’s help pages. Letters means A–Z only, except for YouTube handles.',
  },
  bn: {
    name: 'যে ইউজারনেম পরীক্ষা করবেন',
    nameHint: 'স্পেস ছাড়া। শুরুর @ উপেক্ষা করা হয়।',
    submit: 'ফরম্যাট পরীক্ষা করুন',
    summary: 'যতগুলো প্ল্যাটফর্মের ফরম্যাটে মেলে',
    summaryValue: '{total}টির মধ্যে {n}টি',
    fits: 'ফরম্যাটে মেলে',
    notFit: 'মেলে না: {reasons}',
    reported: '{name} *',
    p_tooShort: 'কমপক্ষে {min} অক্ষর',
    p_tooLong: 'সর্বোচ্চ {max} অক্ষর',
    p_chars: 'অনুমোদিত নয়: {bad} (শুধু {allowed})',
    p_edge: '{chars} দিয়ে শুরু বা শেষ হতে পারে না',
    p_end: '{chars} দিয়ে শেষ হতে পারে না',
    p_double: 'পরপর দুটি {chars} চলবে না',
    p_startLetter: 'অবশ্যই অক্ষর দিয়ে শুরু হতে হবে',
    p_reserved: '“{word}” থাকতে পারে না',
    p_domain: '.com-এর মতো ডোমেইন এক্সটেনশন দিয়ে শেষ হতে পারে না',
    c_alnumHyphen: 'অক্ষর, সংখ্যা ও -',
    c_alnumUnderscore: 'অক্ষর, সংখ্যা ও _',
    c_alnumPeriodUnderscore: 'অক্ষর, সংখ্যা, . ও _',
    c_alnumPeriod: 'অক্ষর, সংখ্যা ও .',
    c_alnumUnderscoreHyphen: 'অক্ষর, সংখ্যা, _ ও -',
    c_youtube: 'যেকোনো ভাষার অক্ষর ও সংখ্যা, এবং . _ - ·',
    e_empty: 'একটি ইউজারনেম লিখুন।',
    e_spaces: 'ইউজারনেমে স্পেস থাকতে পারে না।',
    'e_too-long-input': 'এখানকার কোনো প্ল্যাটফর্ম এত লম্বা নাম দেয় না (সর্বোচ্চ {max} অক্ষর)।',
    notesTitle: 'এই পরীক্ষা সম্পর্কে',
    n1: 'এটি শুধু নামটির ফরম্যাট অনুমোদিত কি না তা দেখে। নামটি খালি আছে কি না তা দেখে না, এবং এটি কোনো অফিশিয়াল যাচাই নয়: নামটি নিবন্ধন করা যাবে কি না তা শুধু প্ল্যাটফর্মই বলতে পারে।',
    n2: 'কোথাও কিছু পাঠানো হয় না। কোনো প্ল্যাটফর্মে রিকোয়েস্ট ছাড়াই পরীক্ষাটি আপনার ব্রাউজারে চলে।',
    n3: 'প্ল্যাটফর্মগুলো নেওয়া, সংরক্ষিত, আপত্তিকর বা অন্যের ছদ্মবেশী নামও প্রত্যাখ্যান করে, এবং তারা নিয়ম বদলায়। এখানে মেলে এমন নামও প্রত্যাখ্যাত হতে পারে।',
    n4: '* চিহ্নিত নিয়মগুলো ব্যাপকভাবে প্রচলিত, কিন্তু প্ল্যাটফর্মের নিজস্ব সহায়তা পেজে প্রকাশিত নয়; বাকিগুলো (X ও YouTube হ্যান্ডেল) প্ল্যাটফর্মের সহায়তা পেজ অনুসরণ করে। YouTube হ্যান্ডেল ছাড়া অক্ষর মানে শুধু A–Z।',
  },
});

type L = ReturnType<typeof S>;
type Key = Parameters<L>[0];

const CHARSET_KEY: Record<CharSet, Key> = {
  'alnum-hyphen': 'c_alnumHyphen',
  'alnum-underscore': 'c_alnumUnderscore',
  'alnum-period-underscore': 'c_alnumPeriodUnderscore',
  'alnum-period': 'c_alnumPeriod',
  'alnum-underscore-hyphen': 'c_alnumUnderscoreHyphen',
  youtube: 'c_youtube',
};

export const nameChecker: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const num = (n: number): string => (ctx.lang === 'bn' ? toBanglaDigits(String(n)) : String(n));
  const problemText = (p: NameProblem): string => {
    switch (p.code) {
      case 'too-short':
        return L('p_tooShort', { min: num(p.min) });
      case 'too-long':
        return L('p_tooLong', { max: num(p.max) });
      case 'chars':
        return L('p_chars', { bad: p.bad, allowed: L(CHARSET_KEY[p.chars]) });
      case 'edge':
        return L('p_edge', { chars: [...p.chars].join(' ') });
      case 'end':
        return L('p_end', { chars: p.chars });
      case 'double':
        return L('p_double', { chars: p.chars });
      case 'start-letter':
        return L('p_startLetter');
      case 'reserved':
        return L('p_reserved', { word: p.word });
      case 'domain-ending':
        return L('p_domain');
    }
  };

  return toolForm(ctx, {
    prefix: 'name',
    fields: [{ key: 'name', kind: 'text', label: L('name'), hint: L('nameHint') }],
    submit: L('submit'),
    live: true,
    compute(v) {
      const r = checkAllPlatforms(v.name ?? '');
      if (!r.ok) return { field: 'name', error: r.error };
      const fitting = r.value.results.filter((x) => !x.problems.length).length;
      return {
        rows: [
          {
            label: L('summary'),
            value: L('summaryValue', { n: num(fitting), total: num(PLATFORMS.length) }),
            primary: true,
          },
          ...r.value.results.map(({ platform, problems }) => ({
            label:
              platform.source === 'reported'
                ? L('reported', { name: platform.name })
                : platform.name,
            value: problems.length
              ? L('notFit', { reasons: problems.map(problemText).join('; ') })
              : L('fits'),
          })),
        ],
      };
    },
    errorText: (code) => L(`e_${code}` as Key, { max: num(MAX_INPUT) }),
    notesText: [L('n1'), L('n2'), L('n3'), L('n4')],
    notesTitle: L('notesTitle'),
  });
};
