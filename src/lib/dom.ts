type Child = Node | string | null | undefined | false;

/** Minimal typed element builder. Text is always set via text nodes (no innerHTML). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Move focus to an element (making it programmatically focusable) and bring it into view. */
export function focusAndReveal(el: HTMLElement, opts: { focus?: boolean } = {}): void {
  if (!el.hasAttribute('tabindex') && !el.matches('a, button, input, select, textarea')) {
    el.setAttribute('tabindex', '-1');
  }
  el.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (opts.focus !== false) el.focus({ preventScroll: true });
}
