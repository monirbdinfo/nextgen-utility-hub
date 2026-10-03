import type { MessageKey, Vars } from '../../i18n';
import { h, prefersReducedMotion } from '../../lib/dom';
import type { Lang } from '../../registry';
import { icon } from '../icons';

/** What every tool view receives from the app. */
export interface ToolContext {
  lang: Lang;
  /** Site-wide strings (src/i18n/messages.ts). */
  t(key: MessageKey, vars?: Vars): string;
  /**
   * Field values kept in memory for this tool while the page is open, so a
   * language switch (which re-renders the page) does not wipe the user's input.
   * Never persisted to storage.
   */
  memo: Record<string, string>;
  /**
   * In-memory objects for this tool (such as a picked File) that survive a
   * language switch but are dropped when the user leaves the tool. Never persisted.
   */
  session: Map<string, unknown>;
  /** Register work to run when this view is removed (e.g. revoking object URLs). */
  onCleanup(fn: () => void): void;
}

export type ToolView = (ctx: ToolContext) => HTMLElement;

let uid = 0;
const nextId = (prefix: string): string => `${prefix}-${++uid}`;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface Field<C extends Control = Control> {
  el: HTMLElement;
  control: C;
  setError(message: string | null): void;
}

/** A labelled control with optional hint and an error slot wired up via aria-describedby. */
export function field<C extends Control>(
  label: string,
  control: C,
  opts: { hint?: string; suffix?: string } = {},
): Field<C> {
  const id = control.id || (control.id = nextId('f'));
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const error = h('p', { id: errorId, class: 'field-error', hidden: '' });
  const describedBy = (withError: boolean): string =>
    [opts.hint ? hintId : '', withError ? errorId : ''].filter(Boolean).join(' ');
  const by = describedBy(false);
  if (by) control.setAttribute('aria-describedby', by);

  const el = h(
    'div',
    { class: 'field' },
    h('label', { for: id, class: 'field-label' }, label),
    opts.suffix
      ? h(
          'div',
          { class: 'field-affix' },
          control,
          h('span', { class: 'affix', 'aria-hidden': 'true' }, opts.suffix),
        )
      : control,
    opts.hint ? h('p', { id: hintId, class: 'field-hint' }, opts.hint) : null,
    error,
  );
  return {
    el,
    control,
    setError(message) {
      error.textContent = message ?? '';
      error.hidden = !message;
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      const d = describedBy(!!message);
      if (d) control.setAttribute('aria-describedby', d);
      else control.removeAttribute('aria-describedby');
    },
  };
}

export function textInput(attrs: Record<string, string> = {}): HTMLInputElement {
  return h('input', {
    type: 'text',
    class: 'input',
    autocomplete: 'off',
    spellcheck: 'false',
    ...attrs,
  });
}

export function dateInput(attrs: Record<string, string> = {}): HTMLInputElement {
  return h('input', {
    type: 'date',
    class: 'input',
    min: '0001-01-01',
    max: '9999-12-31',
    ...attrs,
  });
}

export function select(
  options: Array<[value: string, label: string]>,
  attrs: Record<string, string> = {},
): HTMLSelectElement {
  return h(
    'select',
    { class: 'input', ...attrs },
    ...options.map(([v, l]) => h('option', { value: v }, l)),
  );
}

export function checkbox(
  label: string,
  attrs: Record<string, string> = {},
): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox', class: 'check-input', ...attrs });
  input.id ||= nextId('c');
  return { el: h('div', { class: 'check' }, input, h('label', { for: input.id }, label)), input };
}

/** Restore a control's value from memo and keep memo updated. */
export function bindMemo(
  control: Control,
  memo: Record<string, string>,
  key: string,
  fallback = '',
): void {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    control.checked = (memo[key] ?? fallback) === '1';
    control.addEventListener('change', () => (memo[key] = control.checked ? '1' : '0'));
    return;
  }
  control.value = memo[key] ?? fallback;
  control.addEventListener('input', () => (memo[key] = control.value));
  control.addEventListener('change', () => (memo[key] = control.value));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = h('textarea', { class: 'sr-only', readonly: '', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const done = document.execCommand('copy');
    ta.remove();
    return done;
  } catch {
    return false;
  }
}

export interface ResultRow {
  label: string;
  value: string;
  /** Larger, emphasised value (the headline answer). */
  primary?: boolean;
  /** Language of the value text, when it differs from the UI language. */
  lang?: Lang;
  /** Show a per-row copy button. */
  copy?: boolean;
}

export interface ResultPanel {
  el: HTMLElement;
  show(rows: ResultRow[], notes?: string[]): void;
  clear(): void;
  /** Plain-text version of the current result, for "Copy result". */
  text(): string;
}

/** Result area announced politely to screen readers when it changes. */
export function resultPanel(
  ctx: ToolContext,
  actionLabel: string,
  opts: { prepend?: HTMLElement } = {},
): ResultPanel {
  let current: ResultRow[] = [];
  let currentNotes: string[] = [];
  const body = h('div', { class: 'result-body', 'aria-live': 'polite' });
  const status = h('p', { class: 'copy-status', role: 'status' });
  const el = h(
    'section',
    { class: 'result', 'aria-label': ctx.t('result') },
    h('h2', { class: 'result-title' }, ctx.t('result')),
    opts.prepend ?? null,
    body,
    status,
  );

  async function doCopy(text: string): Promise<void> {
    const okCopy = await copyText(text);
    status.textContent = ctx.t(okCopy ? 'copied' : 'copyFailed');
  }

  function clear(): void {
    current = [];
    currentNotes = [];
    status.textContent = '';
    body.replaceChildren(
      h('p', { class: 'result-empty' }, ctx.t('resultEmpty', { action: actionLabel })),
    );
  }

  function show(rows: ResultRow[], notes: string[] = []): void {
    current = rows;
    currentNotes = notes;
    status.textContent = '';
    const dl = h('dl', { class: 'result-list' });
    for (const row of rows) {
      const copyBtn = row.copy
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-small',
              'aria-label': `${ctx.t('copy')}: ${row.label}`,
            },
            icon('copy', 16),
            ctx.t('copy'),
          )
        : null;
      copyBtn?.addEventListener('click', () => void doCopy(row.value));
      dl.append(
        h(
          'div',
          { class: `result-row${row.primary ? ' result-row-primary' : ''}` },
          h('dt', {}, row.label),
          h('dd', {}, h('span', { class: 'result-value', lang: row.lang }, row.value), copyBtn),
        ),
      );
    }
    body.replaceChildren(
      dl,
      ...(notes.length
        ? [h('ul', { class: 'result-notes', role: 'list' }, ...notes.map((n) => h('li', {}, n)))]
        : []),
    );
  }

  clear();
  return {
    el,
    show,
    clear,
    text: () => [...current.map((r) => `${r.label}: ${r.value}`), ...currentNotes].join('\n'),
  };
}

/** Calculate / Reset / Copy result buttons. */
export function formActions(
  ctx: ToolContext,
  opts: {
    submitLabel: string;
    onReset(): void;
    panel?: ResultPanel;
    /** Copy this instead of the result summary (e.g. a tool's output text). */
    copy?: { label: string; text(): string; emptyMessage: string };
  },
): HTMLElement {
  const reset = h('button', { type: 'button', class: 'btn' }, icon('reset', 18), ctx.t('reset'));
  reset.addEventListener('click', opts.onReset);
  const copy = opts.panel
    ? h(
        'button',
        { type: 'button', class: 'btn' },
        icon('copy', 18),
        opts.copy?.label ?? ctx.t('copyResult'),
      )
    : null;
  copy?.addEventListener('click', async () => {
    const status = opts.panel?.el.querySelector('.copy-status');
    const text = opts.copy ? opts.copy.text() : (opts.panel?.text() ?? '');
    if (!text) {
      if (status && opts.copy) status.textContent = opts.copy.emptyMessage;
      return;
    }
    const okCopy = await copyText(text);
    if (status) status.textContent = ctx.t(okCopy ? 'copied' : 'copyFailed');
  });
  return h(
    'div',
    { class: 'form-actions' },
    h('button', { type: 'submit', class: 'btn btn-primary' }, opts.submitLabel),
    reset,
    copy,
  );
}

/** "How this is calculated" disclosure. */
export function notes(ctx: ToolContext, items: string[], title?: string): HTMLElement {
  return h(
    'details',
    { class: 'tool-notes' },
    h('summary', {}, title ?? ctx.t('notesTitle')),
    h('ul', {}, ...items.map((i) => h('li', {}, i))),
  );
}

/**
 * Wire a form: on submit, `run` returns field errors (first one is focused) or
 * null on success. If the tool was already calculated (e.g. before a language
 * switch), the result is recomputed immediately.
 */
export function wireForm(
  form: HTMLFormElement,
  memo: Record<string, string>,
  run: () => Array<[Field, string]> | null,
  fields: Field[],
): void {
  const submit = (byUser: boolean): void => {
    fields.forEach((f) => f.setError(null));
    const errors = run();
    if (errors?.length) {
      for (const [f, msg] of errors) f.setError(msg);
      errors[0]?.[0].control.focus();
      memo.__done = '';
      return;
    }
    memo.__done = '1';
    // On small screens the result sits below the form: if it is cut off at the bottom and does
    // not already start near the top of the screen, scroll it into view.
    const result = form.parentElement?.querySelector<HTMLElement>('.result');
    const rect = result?.getBoundingClientRect();
    if (
      byUser &&
      result &&
      rect &&
      rect.bottom > window.innerHeight &&
      rect.top > window.innerHeight * 0.25
    ) {
      result.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };
  form.noValidate = true;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(true);
  });
  if (memo.__done === '1') queueMicrotask(() => submit(false));
}

/** English plural helper; Bangla nouns do not change with number. */
export function plural(lang: Lang, n: number, one: string, many: string): string {
  return lang === 'en' && n === 1 ? one : many;
}
