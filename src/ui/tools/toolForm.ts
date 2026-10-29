import { h } from '../../lib/dom';
import {
  bindMemo,
  checkbox,
  field,
  formActions,
  notes,
  resultPanel,
  select,
  textInput,
  wireForm,
  type Field,
  type ResultRow,
  type ToolContext,
} from './kit';

/**
 * One form for the simple tools: labelled inputs, a result panel, Copy and Reset, and a notes
 * list. A tool describes its fields and a `compute` function; the shared behaviour (focus on the
 * first error, aria wiring, restoring input after a language switch, optional live updating)
 * lives here.
 */

export interface FieldSpec {
  key: string;
  kind: 'text' | 'textarea' | 'select' | 'checkbox';
  label: string;
  hint?: string;
  /** Options for a select: [value, label]. */
  options?: Array<[value: string, label: string]>;
  /** Initial value; a checkbox uses '1' (checked) or '0'. */
  default?: string;
  inputmode?: string;
  /** Native input type for `text` fields, such as `time`. */
  type?: string;
  rows?: number;
  /** Show this field only while this returns true (for example, only for one chosen type). */
  showWhen?: (values: Record<string, string>) => boolean;
}

export type Outcome =
  { rows: ResultRow[]; notes?: string[]; extra?: HTMLElement } | { field: string; error: string };

export interface ToolFormOptions {
  /** Prefix for element ids (`<prefix>-<key>`); must be unique on the page. */
  prefix: string;
  fields: FieldSpec[];
  /** Label of the submit button, also used in the empty-result message. */
  submit: string;
  compute(values: Record<string, string>): Outcome;
  /** Message for the error code `compute` returned. */
  errorText(code: string): string;
  notesText: string[];
  notesTitle?: string;
  /** Recompute on every change. An `empty` error then clears the result instead of showing it. */
  live?: boolean;
  /** Keep this form's remembered values apart from another form on the same page. */
  memoPrefix?: string;
  /** Name of the result area, when a page has more than one (landmarks need unique names). */
  resultLabel?: string;
}

interface Control {
  spec: FieldSpec;
  el: HTMLElement;
  /** The element that fires input/change events. */
  target: HTMLElement;
  read(): string;
  write(value: string): void;
  field: Field | null;
}

const defaultOf = (spec: FieldSpec): string =>
  spec.default ??
  (spec.kind === 'select' ? (spec.options?.[0]?.[0] ?? '') : spec.kind === 'checkbox' ? '0' : '');

/** Remembered values live in the tool's memo; a prefix keeps two forms from sharing keys. */
function scopedMemo(memo: Record<string, string>, prefix: string): Record<string, string> {
  if (!prefix) return memo;
  return new Proxy(memo, {
    get: (t, k) => t[prefix + String(k)],
    set: (t, k, v: string) => {
      t[prefix + String(k)] = v;
      return true;
    },
  });
}

export function toolForm(ctx: ToolContext, opts: ToolFormOptions): HTMLElement {
  const memo = scopedMemo(ctx.memo, opts.memoPrefix ?? '');

  const controls: Control[] = opts.fields.map((spec): Control => {
    const id = `${opts.prefix}-${spec.key}`;
    if (spec.kind === 'checkbox') {
      const c = checkbox(spec.label, { id });
      bindMemo(c.input, memo, spec.key, defaultOf(spec));
      return {
        spec,
        el: c.el,
        target: c.input,
        read: () => (c.input.checked ? '1' : '0'),
        write: (v) => {
          c.input.checked = v === '1';
        },
        field: null,
      };
    }
    const control =
      spec.kind === 'select'
        ? select(spec.options ?? [], { id })
        : spec.kind === 'textarea'
          ? h('textarea', {
              id,
              class: 'input textarea',
              rows: String(spec.rows ?? 6),
              spellcheck: 'false',
              autocapitalize: 'off',
            })
          : textInput({
              id,
              inputmode: spec.inputmode ?? 'text',
              ...(spec.type ? { type: spec.type } : {}),
            });
    bindMemo(control, memo, spec.key, defaultOf(spec));
    const f = field(spec.label, control, { hint: spec.hint });
    return {
      spec,
      el: f.el,
      target: control,
      read: () => control.value,
      write: (v) => {
        control.value = v;
      },
      field: f,
    };
  });

  const fields = controls.flatMap((c) => (c.field ? [c.field] : []));
  const byKey = new Map(controls.flatMap((c) => (c.field ? [[c.spec.key, c.field] as const] : [])));
  const values = (): Record<string, string> =>
    Object.fromEntries(controls.map((c) => [c.spec.key, c.read()]));
  const fieldFor = (key: string): Field | undefined => byKey.get(key) ?? fields[0];

  const panel = resultPanel(ctx, opts.submit);
  // Extra content under the result rows (such as a picture with its own buttons).
  const slot = h('div', { class: 'result-extra' });
  panel.el.querySelector('.result-body')?.after(slot);
  const showResult = (out: { rows: ResultRow[]; notes?: string[]; extra?: HTMLElement }): void => {
    panel.show(out.rows, out.notes ?? []);
    slot.replaceChildren(...(out.extra ? [out.extra] : []));
  };
  const clearResult = (): void => {
    panel.clear();
    slot.replaceChildren();
  };
  if (opts.resultLabel) {
    panel.el.setAttribute('aria-label', opts.resultLabel);
    const title = panel.el.querySelector('.result-title');
    if (title) title.textContent = opts.resultLabel;
  }
  const form = h('form', { class: 'tool-form', 'aria-label': opts.submit });
  form.append(
    h('div', { class: 'field-grid' }, ...controls.map((c) => c.el)),
    formActions(ctx, {
      submitLabel: opts.submit,
      panel,
      onReset() {
        for (const c of controls) {
          c.write(defaultOf(c.spec));
          memo[c.spec.key] = c.read();
        }
        fields.forEach((f) => f.setError(null));
        memo.__done = '';
        clearResult();
        applyVisibility();
        (fields[0]?.control ?? controls[0]?.target)?.focus();
      },
    }),
  );

  wireForm(
    form,
    memo,
    () => {
      const out = opts.compute(values());
      if ('error' in out) {
        const f = fieldFor(out.field);
        return f ? [[f, opts.errorText(out.error)]] : [];
      }
      showResult(out);
      return null;
    },
    fields,
  );

  function applyVisibility(): void {
    const current = values();
    for (const c of controls) c.el.hidden = c.spec.showWhen ? !c.spec.showWhen(current) : false;
  }
  applyVisibility();
  for (const c of controls) {
    c.target.addEventListener('input', applyVisibility);
    c.target.addEventListener('change', applyVisibility);
  }

  if (opts.live) {
    const update = (): void => {
      fields.forEach((f) => f.setError(null));
      const out = opts.compute(values());
      if ('error' in out) {
        clearResult();
        memo.__done = '';
        // An empty input is just "nothing to show yet"; anything else is worth saying.
        if (out.error !== 'empty') fieldFor(out.field)?.setError(opts.errorText(out.error));
        return;
      }
      showResult(out);
      memo.__done = '1';
    };
    for (const c of controls) {
      c.target.addEventListener('input', update);
      c.target.addEventListener('change', update);
    }
  }

  return h(
    'div',
    { class: 'tool-layout' },
    form,
    panel.el,
    notes(ctx, opts.notesText, opts.notesTitle),
  );
}
