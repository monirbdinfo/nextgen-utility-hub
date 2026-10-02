/** localStorage wrapper that tolerates blocked storage (private mode, sandboxed frames). */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* preferences simply won't persist */
  }
}
