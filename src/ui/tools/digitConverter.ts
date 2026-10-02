import { countDigits, toBanglaDigits, toEnglishDigits } from '../../calc/digits';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { icon } from '../icons';
import { bindMemo, copyText, field, notes, type ToolView } from './kit';

const S = defineStrings({
  en: {
    input: 'Text or numbers',
    inputHint:
      'Paste any text. Only the digits change; letters, punctuation and spacing stay exactly as they are.',
    direction: 'Convert to',
    toEnglish: 'English digits (0–9)',
    toBangla: 'Bangla digits (০–৯)',
    output: 'Converted text',
    changed: '{n} digits converted.',
    unchanged: 'No digits to convert.',
    swap: 'Use output as input',
    n1: 'Only the ten digits are replaced: ০১২৩৪৫৬৭৮৯ ⇄ 0123456789. Everything else, including Bangla letters, punctuation, line breaks and other scripts, is kept as is.',
    n2: 'The conversion happens as you type, entirely in your browser.',
  },
  bn: {
    input: 'লেখা বা সংখ্যা',
    inputHint:
      'যেকোনো লেখা পেস্ট করুন। শুধু অঙ্ক বদলাবে; অক্ষর, যতিচিহ্ন ও ফাঁকা জায়গা হুবহু থাকবে।',
    direction: 'যে অঙ্কে রূপান্তর',
    toEnglish: 'ইংরেজি অঙ্ক (0–9)',
    toBangla: 'বাংলা অঙ্ক (০–৯)',
    output: 'রূপান্তরিত লেখা',
    changed: '{n}টি অঙ্ক রূপান্তর হয়েছে।',
    unchanged: 'রূপান্তরের মতো কোনো অঙ্ক নেই।',
    swap: 'ফলাফলকে ইনপুট হিসেবে ব্যবহার করুন',
    n1: 'শুধু দশটি অঙ্ক বদলানো হয়: ০১২৩৪৫৬৭৮৯ ⇄ 0123456789। বাংলা অক্ষর, যতিচিহ্ন, লাইন ব্রেক ও অন্যান্য লিপি অপরিবর্তিত থাকে।',
    n2: 'লেখার সঙ্গে সঙ্গেই রূপান্তর হয়, সম্পূর্ণ আপনার ব্রাউজারে।',
  },
});

export const digitConverter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const input = field(
    L('input'),
    h('textarea', { id: 'digits-input', class: 'input textarea', rows: '5', spellcheck: 'false' }),
    {
      hint: L('inputHint'),
    },
  );
  bindMemo(input.control, ctx.memo, 'text');
  const dir = ctx.memo.dir === 'bn' ? 'bn' : 'en';

  const radio = (value: 'en' | 'bn', label: string): HTMLElement => {
    const r = h('input', {
      type: 'radio',
      name: 'digits-dir',
      id: `digits-dir-${value}`,
      value,
      class: 'check-input',
    });
    r.checked = dir === value;
    r.addEventListener('change', () => {
      ctx.memo.dir = value;
      update();
    });
    return h('div', { class: 'check' }, r, h('label', { for: r.id }, label));
  };
  const group = h(
    'fieldset',
    { class: 'radio-group' },
    h('legend', { class: 'field-label' }, L('direction')),
    radio('en', L('toEnglish')),
    radio('bn', L('toBangla')),
  );

  const output = field(
    L('output'),
    h('textarea', {
      id: 'digits-output',
      class: 'input textarea',
      rows: '5',
      readonly: '',
      spellcheck: 'false',
    }),
  );
  const status = h('p', { class: 'copy-status', role: 'status' });
  const info = h('p', { class: 'field-hint', id: 'digits-info' });

  function update(): void {
    const text = input.control.value;
    const toBn = (ctx.memo.dir ?? 'en') === 'bn';
    output.control.value = toBn ? toBanglaDigits(text) : toEnglishDigits(text);
    const c = countDigits(text);
    const n = toBn ? c.english : c.bangla;
    info.textContent = text ? (n ? L('changed', { n }) : L('unchanged')) : '';
    status.textContent = '';
  }
  input.control.addEventListener('input', update);

  const copyBtn = h(
    'button',
    { type: 'button', class: 'btn btn-primary' },
    icon('copy', 18),
    ctx.t('copyResult'),
  );
  copyBtn.addEventListener('click', async () => {
    if (!output.control.value) return;
    status.textContent = ctx.t((await copyText(output.control.value)) ? 'copied' : 'copyFailed');
  });
  const swapBtn = h('button', { type: 'button', class: 'btn' }, L('swap'));
  swapBtn.addEventListener('click', () => {
    input.control.value = output.control.value;
    ctx.memo.text = input.control.value;
    const other = (ctx.memo.dir ?? 'en') === 'bn' ? 'en' : 'bn';
    ctx.memo.dir = other;
    (group.querySelector<HTMLInputElement>(`#digits-dir-${other}`) as HTMLInputElement).checked =
      true;
    update();
    input.control.focus();
  });
  const resetBtn = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), ctx.t('reset'));
  resetBtn.addEventListener('click', () => {
    input.control.value = '';
    ctx.memo.text = '';
    update();
    input.control.focus();
  });

  update();
  return h(
    'div',
    { class: 'tool-layout' },
    h('div', { class: 'tool-form' }, input.el, group),
    h(
      'section',
      { class: 'result', 'aria-label': ctx.t('result') },
      output.el,
      info,
      h('div', { class: 'form-actions' }, copyBtn, swapBtn, resetBtn),
      status,
    ),
    notes(ctx, [L('n1'), L('n2')]),
  );
};
