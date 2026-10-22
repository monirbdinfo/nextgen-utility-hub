import { h } from '../../lib/dom';
import {
  bindMemo,
  copyText,
  field,
  select,
  textInput,
  type ToolContext,
  type ToolView,
} from './kit';

const tr = (ctx: ToolContext, en: string, bn: string): string => (ctx.lang === 'bn' ? bn : en);
const area = (placeholder: string, rows = 3): HTMLTextAreaElement =>
  h('textarea', { class: 'input', placeholder, rows: String(rows), spellcheck: 'true' });
const add = (
  form: HTMLElement,
  ctx: ToolContext,
  label: string,
  key: string,
  control: HTMLInputElement | HTMLTextAreaElement,
): void => {
  bindMemo(control, ctx.memo, key);
  form.append(field(label, control).el);
};
const action = (label: string, fn: () => void): HTMLButtonElement => {
  const b = h('button', { type: 'button', class: 'button-secondary' }, label);
  b.addEventListener('click', fn);
  return b;
};
const val = (ctx: ToolContext, key: string): string => (ctx.memo[key] ?? '').trim();
export const cvTemplates: ToolView = (ctx) => {
  const root = h('div', { class: 'tool-content job-tool' });
  const form = h('form', { class: 'tool-form' });
  const template = select(
    [
      ['classic', tr(ctx, 'Classic professional', 'ক্লাসিক প্রফেশনাল')],
      ['modern', tr(ctx, 'Modern concise', 'আধুনিক সংক্ষিপ্ত')],
      ['graduate', tr(ctx, 'Graduate / entry-level', 'নতুন চাকরিপ্রার্থী')],
    ],
    { id: 'cv-template' },
  );
  bindMemo(template, ctx.memo, 'cv-template', 'classic');
  form.append(field(tr(ctx, 'Template style', 'টেমপ্লেটের ধরন'), template).el);
  const fields = [
    [
      'cv-name',
      tr(ctx, 'Full name *', 'পুরো নাম *'),
      textInput({
        id: 'cv-name',
        required: '',
        placeholder: tr(ctx, 'Your full name', 'আপনার পুরো নাম'),
      }),
    ],
    [
      'cv-contact',
      tr(ctx, 'Email, phone and city', 'ইমেইল, ফোন ও শহর'),
      textInput({ id: 'cv-contact', placeholder: 'email@example.com · +880 · Dhaka' }),
    ],
    [
      'cv-role',
      tr(ctx, 'Target role', 'কাঙ্ক্ষিত পদ'),
      textInput({ id: 'cv-role', placeholder: tr(ctx, 'Job title', 'পদের নাম') }),
    ],
    [
      'cv-summary',
      tr(ctx, 'Professional summary', 'পেশাগত পরিচিতি'),
      area(tr(ctx, 'A short, truthful summary', 'সংক্ষিপ্ত ও সত্য পেশাগত পরিচিতি')),
    ],
    [
      'cv-experience',
      tr(ctx, 'Work experience', 'কর্ম-অভিজ্ঞতা'),
      area(
        tr(
          ctx,
          'Role, employer, dates and achievements; one per line',
          'পদ, প্রতিষ্ঠান, তারিখ ও অর্জন; প্রতি লাইনে একটি',
        ),
        5,
      ),
    ],
    [
      'cv-education',
      tr(ctx, 'Education', 'শিক্ষাগত যোগ্যতা'),
      area(
        tr(
          ctx,
          'Degree, institution and year; one per line',
          'ডিগ্রি, প্রতিষ্ঠান ও সাল; প্রতি লাইনে একটি',
        ),
      ),
    ],
    [
      'cv-skills',
      tr(ctx, 'Skills', 'দক্ষতা'),
      area(
        tr(ctx, 'Separate skills with commas or new lines', 'কমা বা নতুন লাইনে দক্ষতা লিখুন'),
        2,
      ),
    ],
  ] as const;
  for (const [key, label, control] of fields) add(form, ctx, label, key, control);
  const output = h('pre', { class: 'result-body document-preview-body', 'aria-live': 'polite' });
  const build = (): string => {
    const section = (label: string, key: string): string =>
      val(ctx, key) ? '\n\n' + label.toUpperCase() + '\n' + val(ctx, key) : '';
    return (
      val(ctx, 'cv-name') +
      '\n' +
      val(ctx, 'cv-role') +
      '\n' +
      val(ctx, 'cv-contact') +
      section(tr(ctx, 'Professional summary', 'পেশাগত পরিচিতি'), 'cv-summary') +
      section(tr(ctx, 'Work experience', 'কর্ম-অভিজ্ঞতা'), 'cv-experience') +
      section(tr(ctx, 'Education', 'শিক্ষাগত যোগ্যতা'), 'cv-education') +
      section(tr(ctx, 'Skills', 'দক্ষতা'), 'cv-skills')
    );
  };
  const status = h('p', { class: 'copy-status', role: 'status' });
  const generate = (): void => {
    if (!val(ctx, 'cv-name')) {
      fields[0][2].focus();
      status.textContent = tr(ctx, 'Enter your name first.', 'আগে আপনার নাম লিখুন।');
      return;
    }
    output.textContent = build();
    status.textContent = tr(
      ctx,
      'Preview updated. Check details before applying.',
      'প্রিভিউ তৈরি হয়েছে। আবেদনের আগে তথ্য যাচাই করুন।',
    );
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
  });
  root.append(
    h(
      'p',
      { class: 'tool-intro' },
      tr(
        ctx,
        'Create a simple CV, then print or save it as PDF. Details stay in this browser session.',
        'সহজ সিভি তৈরি করে প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন। তথ্য এই ব্রাউজার সেশনেই থাকে।',
      ),
    ),
    form,
    h(
      'div',
      { class: 'tool-actions' },
      h(
        'button',
        { type: 'submit', class: 'button-primary' },
        tr(ctx, 'Generate CV', 'সিভি তৈরি করুন'),
      ),
    ),
    h(
      'section',
      { class: 'result document-preview' },
      h('h2', { class: 'result-title' }, tr(ctx, 'CV preview', 'সিভি প্রিভিউ')),
      output,
    ),
    status,
  );
  root.append(
    action(tr(ctx, 'Copy CV', 'সিভি কপি করুন'), () => {
      void copyText(build()).then((ok) => {
        status.textContent = ok
          ? tr(ctx, 'CV copied.', 'সিভি কপি হয়েছে।')
          : tr(ctx, 'Copy unavailable.', 'কপি করা যায়নি।');
      });
    }),
  );
  root.append(
    action(tr(ctx, 'Print / Save PDF', 'প্রিন্ট / PDF সংরক্ষণ'), () => {
      generate();
      window.print();
    }),
  );
  return root;
};

export const coverLetterTemplates: ToolView = (ctx) => {
  const root = h('div', { class: 'tool-content job-tool' });
  const form = h('form', { class: 'tool-form' });
  const template = select(
    [
      ['professional', tr(ctx, 'Professional', 'পেশাদার')],
      ['graduate', tr(ctx, 'Entry-level', 'নতুন চাকরিপ্রার্থী')],
      ['career', tr(ctx, 'Career change', 'ক্যারিয়ার পরিবর্তন')],
    ],
    { id: 'letter-template' },
  );
  bindMemo(template, ctx.memo, 'letter-template', 'professional');
  form.append(field(tr(ctx, 'Letter style', 'চিঠির ধরন'), template).el);
  const fields = [
    [
      'letter-name',
      tr(ctx, 'Your full name *', 'আপনার পুরো নাম *'),
      textInput({ id: 'letter-name', required: '', placeholder: tr(ctx, 'Full name', 'পুরো নাম') }),
    ],
    [
      'letter-contact',
      tr(ctx, 'Contact details', 'যোগাযোগের তথ্য'),
      textInput({ id: 'letter-contact', placeholder: 'email@example.com · phone' }),
    ],
    [
      'letter-company',
      tr(ctx, 'Company / hiring manager', 'প্রতিষ্ঠান / নিয়োগকর্তা'),
      textInput({ id: 'letter-company', placeholder: tr(ctx, 'Company name', 'প্রতিষ্ঠানের নাম') }),
    ],
    [
      'letter-role',
      tr(ctx, 'Job title', 'পদের নাম'),
      textInput({
        id: 'letter-role',
        placeholder: tr(ctx, 'Position applied for', 'যে পদের জন্য আবেদন'),
      }),
    ],
    [
      'letter-motivation',
      tr(ctx, 'Why this role and company?', 'এই পদ ও প্রতিষ্ঠানে আগ্রহের কারণ'),
      area(tr(ctx, 'Explain your interest in your own words', 'নিজের ভাষায় আগ্রহের কারণ লিখুন')),
    ],
    [
      'letter-skills',
      tr(ctx, 'Relevant skills and achievements', 'প্রাসঙ্গিক দক্ষতা ও অর্জন'),
      area(tr(ctx, 'Use specific, truthful examples', 'নির্দিষ্ট ও সত্য উদাহরণ দিন')),
    ],
    [
      'letter-closing',
      tr(ctx, 'Closing note (optional)', 'সমাপ্তির বক্তব্য (ঐচ্ছিক)'),
      area(tr(ctx, 'Availability or a polite closing', 'যোগদানের সময় বা ভদ্র সমাপ্তি'), 2),
    ],
  ] as const;
  for (const [key, label, control] of fields) add(form, ctx, label, key, control);
  const output = h('pre', { class: 'result-body document-preview-body', 'aria-live': 'polite' });
  const build = (): string => {
    const name = val(ctx, 'letter-name');
    const company = val(ctx, 'letter-company') || tr(ctx, 'Hiring Manager', 'নিয়োগ ব্যবস্থাপক');
    const role = val(ctx, 'letter-role') || tr(ctx, 'the advertised position', 'বিজ্ঞাপিত পদ');
    const motivation =
      val(ctx, 'letter-motivation') ||
      tr(
        ctx,
        'I am interested in this opportunity and would welcome the chance to contribute to your team.',
        'আমি এই সুযোগে আগ্রহী এবং আপনার দলে অবদান রাখতে আগ্রহী।',
      );
    const skills = val(ctx, 'letter-skills') ? '\n\n' + val(ctx, 'letter-skills') : '';
    const closing =
      val(ctx, 'letter-closing') ||
      tr(
        ctx,
        'I would welcome an opportunity to discuss my suitability. Thank you for your consideration.',
        'আমার যোগ্যতা নিয়ে আলোচনার সুযোগ পেলে কৃতজ্ঞ থাকব। বিবেচনার জন্য ধন্যবাদ।',
      );
    return (
      name +
      '\n' +
      val(ctx, 'letter-contact') +
      '\n\n' +
      tr(ctx, 'Dear', 'প্রিয়') +
      ' ' +
      company +
      ',\n\n' +
      tr(ctx, 'I am writing to apply for the position of', 'আমি আবেদন করছি') +
      ' ' +
      role +
      '.\n\n' +
      motivation +
      skills +
      '\n\n' +
      closing +
      '\n\n' +
      tr(ctx, 'Sincerely,', 'বিনীত,') +
      '\n' +
      name
    );
  };
  const status = h('p', { class: 'copy-status', role: 'status' });
  const generate = (): void => {
    if (!val(ctx, 'letter-name')) {
      fields[0][2].focus();
      status.textContent = tr(ctx, 'Enter your name first.', 'আগে আপনার নাম লিখুন।');
      return;
    }
    output.textContent = build();
    status.textContent = tr(
      ctx,
      'Preview updated. Personalize and proofread before sending.',
      'প্রিভিউ তৈরি হয়েছে। পাঠানোর আগে সম্পাদনা ও প্রুফরিড করুন।',
    );
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
  });
  root.append(
    h(
      'p',
      { class: 'tool-intro' },
      tr(
        ctx,
        'Draft a tailored cover letter. Replace generic wording with your own accurate examples before sending.',
        'উপযোগী কভার লেটারের খসড়া তৈরি করুন। পাঠানোর আগে সাধারণ বাক্যগুলো নিজের সঠিক উদাহরণ দিয়ে বদলান।',
      ),
    ),
    form,
    h(
      'div',
      { class: 'tool-actions' },
      h(
        'button',
        { type: 'submit', class: 'button-primary' },
        tr(ctx, 'Generate letter', 'চিঠি তৈরি করুন'),
      ),
    ),
    h(
      'section',
      { class: 'result document-preview' },
      h('h2', { class: 'result-title' }, tr(ctx, 'Letter preview', 'চিঠির প্রিভিউ')),
      output,
    ),
    status,
  );
  root.append(
    action(tr(ctx, 'Copy letter', 'চিঠি কপি করুন'), () => {
      void copyText(build()).then((ok) => {
        status.textContent = ok
          ? tr(ctx, 'Letter copied.', 'চিঠি কপি হয়েছে।')
          : tr(ctx, 'Copy unavailable.', 'কপি করা যায়নি।');
      });
    }),
  );
  root.append(
    action(tr(ctx, 'Print / Save PDF', 'প্রিন্ট / PDF সংরক্ষণ'), () => {
      generate();
      window.print();
    }),
  );
  return root;
};

const checklistItems = [
  ['cv', 'CV / Resume tailored to this job', 'চাকরির জন্য উপযোগী সিভি'],
  ['letter', 'Cover letter / application letter', 'কভার লেটার / আবেদনপত্র'],
  ['contact', 'Phone number and email checked', 'ফোন নম্বর ও ইমেইল যাচাই'],
  [
    'education',
    'Education certificates / transcripts (if requested)',
    'শিক্ষাগত সনদ / ট্রান্সক্রিপ্ট (চাওয়া হলে)',
  ],
  [
    'training',
    'Training and professional certificates (if relevant)',
    'প্রশিক্ষণ ও পেশাগত সনদ (প্রযোজ্য হলে)',
  ],
  ['experience', 'Experience, dates and references checked', 'অভিজ্ঞতা, তারিখ ও রেফারেন্স যাচাই'],
  ['photo', 'Photo / signature (only if requested)', 'ছবি / স্বাক্ষর (চাওয়া হলে)'],
  [
    'portfolio',
    'Portfolio or work samples (if relevant)',
    'পোর্টফোলিও বা কাজের নমুনা (প্রযোজ্য হলে)',
  ],
  ['eligibility', 'Job requirements and eligibility checked', 'চাকরির শর্ত ও যোগ্যতা যাচাই'],
  ['proofread', 'Spelling, dates and file formats reviewed', 'বানান, তারিখ ও ফাইল ফরম্যাট যাচাই'],
  ['submit', 'Application submitted and confirmation saved', 'আবেদন জমা ও নিশ্চিতকরণ সংরক্ষণ'],
] as const;

export const applicationChecklist: ToolView = (ctx) => {
  const root = h('div', { class: 'tool-content checklist-tool' });
  const role = textInput({
    id: 'checklist-role',
    placeholder: tr(ctx, 'Job title / reference (optional)', 'পদের নাম / রেফারেন্স (ঐচ্ছিক)'),
  });
  bindMemo(role, ctx.memo, 'checklist-role');
  const progress = h('p', { class: 'checklist-progress', role: 'status', 'aria-live': 'polite' });
  const status = h('p', { class: 'copy-status', role: 'status', 'aria-live': 'polite' });
  const inputs: HTMLInputElement[] = [];
  const update = (): void => {
    const done = inputs.filter((input) => input.checked).length;
    progress.textContent = tr(
      ctx,
      done +
        ' of ' +
        inputs.length +
        ' complete (' +
        Math.round((done / inputs.length) * 100) +
        '%)',
      inputs.length +
        'টির মধ্যে ' +
        done +
        'টি সম্পন্ন (' +
        Math.round((done / inputs.length) * 100) +
        '%)',
    );
  };
  const list = h(
    'fieldset',
    { class: 'checklist-group' },
    h(
      'legend',
      {},
      tr(ctx, 'Application documents and final review', 'আবেদনের নথি ও চূড়ান্ত যাচাই'),
    ),
  );
  for (const [id, en, bn] of checklistItems) {
    const input = h('input', { type: 'checkbox', id: 'application-' + id, class: 'check-input' });
    input.checked = ctx.memo['application-' + id] === '1';
    input.addEventListener('change', () => {
      ctx.memo['application-' + id] = input.checked ? '1' : '0';
      update();
    });
    inputs.push(input);
    list.append(
      h('div', { class: 'check' }, input, h('label', { for: input.id }, tr(ctx, en, bn))),
    );
  }
  const summary = (): string =>
    tr(ctx, 'Application checklist', 'আবেদন চেকলিস্ট') +
    (val(ctx, 'checklist-role') ? ' — ' + val(ctx, 'checklist-role') : '') +
    '\n' +
    progress.textContent +
    '\n\n' +
    checklistItems
      .map(
        ([id, en, bn]) =>
          (ctx.memo['application-' + id] === '1' ? '[x] ' : '[ ] ') + tr(ctx, en, bn),
      )
      .join('\n');
  update();
  root.append(
    h(
      'p',
      { class: 'tool-intro' },
      tr(
        ctx,
        'Track application preparation. Only provide sensitive identity documents when the employer or official process legitimately requests them. Checklist state stays in memory for this page session.',
        'আবেদনের প্রস্তুতি ট্র্যাক করুন। নিয়োগকর্তা বা সরকারি প্রক্রিয়ায় বৈধভাবে চাওয়া হলেই সংবেদনশীল পরিচয়পত্র দিন। চেকলিস্টের অবস্থা শুধু এই পেজ সেশনে থাকে।',
      ),
    ),
    field(tr(ctx, 'Job / application', 'চাকরি / আবেদন'), role).el,
    progress,
    list,
    h(
      'div',
      { class: 'tool-actions' },
      action(tr(ctx, 'Copy checklist', 'চেকলিস্ট কপি করুন'), () => {
        void copyText(summary()).then((ok) => {
          status.textContent = ok
            ? tr(ctx, 'Checklist copied.', 'চেকলিস্ট কপি হয়েছে।')
            : tr(ctx, 'Copy unavailable.', 'কপি করা যায়নি।');
        });
      }),
      action(tr(ctx, 'Print / Save PDF', 'প্রিন্ট / PDF সংরক্ষণ'), () => window.print()),
      action(tr(ctx, 'Reset checklist', 'চেকলিস্ট রিসেট'), () => {
        for (const input of inputs) {
          input.checked = false;
          delete ctx.memo['application-' + input.id.replace('application-', '')];
        }
        update();
        status.textContent = tr(ctx, 'Checklist reset.', 'চেকলিস্ট রিসেট হয়েছে।');
      }),
    ),
    status,
  );
  return root;
};
