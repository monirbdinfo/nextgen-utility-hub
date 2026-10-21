import { convertUnit, unitIds, type UnitKind } from '../../calc/unitConvert';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { bindMemo, copyText, field, select, textInput, type ToolView } from './kit';

const S = defineStrings({
  en: {
    kind: 'Category',
    value: 'Value',
    from: 'From',
    to: 'To',
    result: 'Converted value',
    copy: 'Copy result',
    invalid: 'Enter a valid number.',
    length: 'Length',
    weight: 'Weight',
    temperature: 'Temperature',
    data: 'Digital storage',
  },
  bn: {
    kind: 'ধরন',
    value: 'মান',
    from: 'যে একক থেকে',
    to: 'যে এককে',
    result: 'রূপান্তরিত মান',
    copy: 'ফলাফল কপি',
    invalid: 'সঠিক সংখ্যা লিখুন।',
    length: 'দৈর্ঘ্য',
    weight: 'ওজন',
    temperature: 'তাপমাত্রা',
    data: 'ডিজিটাল স্টোরেজ',
  },
});

const LABEL: Record<string, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  km: 'km',
  in: 'in',
  ft: 'ft',
  yd: 'yd',
  mi: 'mi',
  mg: 'mg',
  g: 'g',
  kg: 'kg',
  t: 'tonne',
  oz: 'oz',
  lb: 'lb',
  c: '°C',
  f: '°F',
  k: 'K',
  B: 'B',
  KB: 'KB',
  MB: 'MB',
  GB: 'GB',
  TB: 'TB',
  KiB: 'KiB',
  MiB: 'MiB',
  GiB: 'GiB',
  TiB: 'TiB',
};

export const unitConverter: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const kind = select(
    [
      ['length', L('length')],
      ['weight', L('weight')],
      ['temperature', L('temperature')],
      ['data', L('data')],
    ],
    { id: 'unit-kind' },
  );
  const value = textInput({ id: 'unit-value', inputmode: 'decimal' });
  const from = select([], { id: 'unit-from' });
  const to = select([], { id: 'unit-to' });
  const result = h('output', { class: 'result-value', 'aria-live': 'polite' });
  const status = h('p', { class: 'copy-status', role: 'status' });

  bindMemo(kind, ctx.memo, 'kind', 'length');
  bindMemo(value, ctx.memo, 'value', '1');
  bindMemo(from, ctx.memo, 'from', 'm');
  bindMemo(to, ctx.memo, 'to', 'km');

  function update() {
    const number = Number(value.value);
    if (!value.value.trim() || !Number.isFinite(number)) {
      result.textContent = '—';
      status.textContent = L('invalid');
      return;
    }

    try {
      const converted = convertUnit(
        number,
        kind.value as UnitKind,
        from.value,
        to.value,
      );
      result.textContent = `${new Intl.NumberFormat(
        ctx.lang === 'bn' ? 'bn-BD' : 'en-US',
        {
          maximumSignificantDigits: 12,
        },
      ).format(converted)} ${LABEL[to.value] ?? to.value}`;
      status.textContent = '';
    } catch {
      result.textContent = '—';
      status.textContent = L('invalid');
    }
  }

  function options() {
    const ids = unitIds(kind.value as UnitKind);
    const oldFrom = from.value;
    const oldTo = to.value;

    from.replaceChildren(
      ...ids.map((id) => h('option', { value: id }, LABEL[id] ?? id)),
    );
    to.replaceChildren(
      ...ids.map((id) => h('option', { value: id }, LABEL[id] ?? id)),
    );
    from.value = ids.includes(oldFrom) ? oldFrom : ids[0]!;
    to.value = ids.includes(oldTo) ? oldTo : ids[Math.min(1, ids.length - 1)]!;
    ctx.memo.from = from.value;
    ctx.memo.to = to.value;
    update();
  }

  kind.addEventListener('change', options);
  for (const control of [value, from, to]) {
    control.addEventListener('input', update);
    control.addEventListener('change', update);
  }

  const copy = h('button', { type: 'button', class: 'btn btn-primary' }, L('copy'));
  copy.addEventListener('click', async () => {
    status.textContent = (await copyText(result.textContent ?? ''))
      ? ctx.t('copied')
      : ctx.t('copyFailed');
  });

  options();
  return h(
    'div',
    { class: 'tool-layout' },
    h(
      'div',
      { class: 'tool-form' },
      field(L('kind'), kind).el,
      field(L('value'), value).el,
      field(L('from'), from).el,
      field(L('to'), to).el,
    ),
    h(
      'section',
      { class: 'result' },
      h('h2', { class: 'result-title' }, L('result')),
      result,
      h('div', { class: 'form-actions' }, copy),
      status,
    ),
  );
};
