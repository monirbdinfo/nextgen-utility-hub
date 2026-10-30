/**
 * Word wrapping for the Create PDF tool. `width` measures a string in the font being used; words
 * longer than a whole line are broken by character so nothing is cut off. Empty input lines are
 * kept as blank lines.
 */
export function wrapLines(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const words = raw.replace(/\t/g, '    ').split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = '';
      // A single word wider than the line: break it by character.
      let rest = word;
      while (width(rest) > maxWidth) {
        let n = rest.length - 1;
        while (n > 1 && width(rest.slice(0, n)) > maxWidth) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}
